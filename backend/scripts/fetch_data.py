"""Data ingestion script for GridBricks Wind Procurement Dashboard.

Fetches wind generation actuals (FUELHH) and forecasts (WINDFOR) from the
Elexon BMRS public API and saves them as Parquet snapshots in ``backend/data/``.

Usage
-----
    python -m backend.scripts.fetch_data           # use cached snapshot if present
    python -m backend.scripts.fetch_data --refresh # always re-fetch from API

Design notes
------------
* FUELHH  – filtered by settlementDate (2026-01-01 → 2026-01-31) and fuelType=WIND.
* WINDFOR – filtered by publishDateTime window (2025-12-28 → 2026-01-31T23:59:59Z)
  then post-filtered to startTime within January 2026.
* Chunk size starts at ``settings.bmrs_chunk_days`` days; halved on HTTP 400/413.
* Up to ``settings.bmrs_max_retries`` retries with exponential back-off.
* ``settings.bmrs_rate_limit_s`` sleep between chunks (polite rate limiting).
* Tests MUST NOT import this module with live network calls – they mock httpx.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any

import httpx
import pandas as pd
from pydantic import BaseModel, ValidationError, field_validator

# ── Make sure the repo root is on sys.path when run as __main__ ──────────────
_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from backend.app.config import settings  # noqa: E402

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

# ── Constants ─────────────────────────────────────────────────────────────────
FUELHH_ENDPOINT = f"{settings.bmrs_base_url}/datasets/FUELHH/stream"
WINDFOR_ENDPOINT = f"{settings.bmrs_base_url}/datasets/WINDFOR/stream"

DATA_START = date(2026, 1, 1)
DATA_END = date(2026, 1, 31)

WINDFOR_PUB_START = datetime(2025, 12, 28, 0, 0, 0, tzinfo=UTC)
WINDFOR_PUB_END = datetime(2026, 1, 31, 23, 59, 59, tzinfo=UTC)

ACTUALS_FILE = "actuals_wind_2026-01.parquet"
FORECASTS_FILE = "windfor_forecasts_2026-01.parquet"
META_FILE = "snapshot_meta.json"


# ── Pydantic validation models ────────────────────────────────────────────────


class ActualRecord(BaseModel):
    """Validated row from the FUELHH endpoint."""

    publishTime: datetime
    startTime: datetime
    settlementDate: date
    settlementPeriod: int
    fuelType: str
    generation: float

    @field_validator("publishTime", "startTime", mode="before")
    @classmethod
    def parse_utc(cls, v: Any) -> datetime:
        if isinstance(v, datetime):
            return v if v.tzinfo else v.replace(tzinfo=UTC)
        dt = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=UTC)

    @field_validator("generation")
    @classmethod
    def must_be_finite(cls, v: float) -> float:
        import math

        if math.isnan(v) or math.isinf(v):
            raise ValueError("generation must be a finite number")
        return v


class ForecastRecord(BaseModel):
    """Validated row from the WINDFOR endpoint."""

    publishTime: datetime
    startTime: datetime
    generation: float

    @field_validator("publishTime", "startTime", mode="before")
    @classmethod
    def parse_utc(cls, v: Any) -> datetime:
        if isinstance(v, datetime):
            return v if v.tzinfo else v.replace(tzinfo=UTC)
        dt = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=UTC)

    @field_validator("generation")
    @classmethod
    def must_be_finite(cls, v: float) -> float:
        import math

        if math.isnan(v) or math.isinf(v):
            raise ValueError("generation must be a finite number")
        return v


# ── HTTP helpers ──────────────────────────────────────────────────────────────


def _fetch_with_retry(
    client: httpx.Client,
    url: str,
    params: dict[str, Any],
    *,
    max_retries: int = 3,
    timeout: float = 30.0,
) -> list[dict[str, Any]]:
    """GET ``url`` with ``params``, retry on transient errors, return parsed JSON list.

    Raises
    ------
    httpx.HTTPStatusError
        On unrecoverable HTTP errors (after exhausting retries for 5xx).
    RuntimeError
        If the response is not a JSON array.
    """
    last_exc: Exception | None = None
    for attempt in range(max_retries):
        try:
            logger.debug("GET %s params=%s (attempt %d)", url, params, attempt + 1)
            response = client.get(url, params=params, timeout=timeout)

            if response.status_code in (400, 413, 422):
                # Caller interprets these as "chunk too large"
                response.raise_for_status()

            response.raise_for_status()
            data = response.json()

            if not isinstance(data, list):
                raise RuntimeError(
                    f"Expected a JSON array from {url}, got {type(data).__name__}. "
                    f"First 200 chars: {str(data)[:200]}"
                )
            return data  # type: ignore[return-value]

        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            wait = 2**attempt
            logger.warning(
                "Transient error (attempt %d/%d): %s. Retrying in %ds.",
                attempt + 1,
                max_retries,
                exc,
                wait,
            )
            last_exc = exc
            time.sleep(wait)

        except httpx.HTTPStatusError as exc:
            if exc.response.status_code >= 500:
                wait = 2**attempt
                logger.warning(
                    "HTTP %d (attempt %d/%d). Retrying in %ds.",
                    exc.response.status_code,
                    attempt + 1,
                    max_retries,
                    wait,
                )
                last_exc = exc
                time.sleep(wait)
            else:
                raise  # 4xx are caller-handled

    raise RuntimeError(f"All {max_retries} attempts failed for {url}") from last_exc


def _dt_to_iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _date_to_iso(d: date) -> str:
    return d.isoformat()


# ── FUELHH ingestion ──────────────────────────────────────────────────────────


def fetch_actuals(client: httpx.Client) -> pd.DataFrame:
    """Fetch all FUELHH WIND rows for Jan 2026 and return a cleaned DataFrame.

    Deduplicates on ``startTime`` keeping the row with the latest ``publishTime``.
    Defensively re-filters to fuelType == "WIND".
    """
    logger.info("Fetching FUELHH actuals for %s → %s …", DATA_START, DATA_END)

    params: dict[str, Any] = {
        "settlementDateFrom": _date_to_iso(DATA_START),
        "settlementDateTo": _date_to_iso(DATA_END),
        "fuelType": "WIND",
        "format": "json",
    }

    chunk_days = settings.bmrs_chunk_days
    all_records: list[ActualRecord] = []
    rejected = 0

    # Chunk by settlementDate to stay within any undocumented API limits.
    current = DATA_START
    while current <= DATA_END:
        chunk_end = min(current + timedelta(days=chunk_days - 1), DATA_END)
        chunk_params = {
            **params,
            "settlementDateFrom": _date_to_iso(current),
            "settlementDateTo": _date_to_iso(chunk_end),
        }

        while True:
            try:
                raw = _fetch_with_retry(
                    client,
                    FUELHH_ENDPOINT,
                    chunk_params,
                    max_retries=settings.bmrs_max_retries,
                    timeout=settings.bmrs_timeout_s,
                )
                break  # success
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code in (400, 413, 422) and chunk_days > 1:
                    chunk_days = max(1, chunk_days // 2)
                    logger.warning(
                        "HTTP %d – shrinking chunk to %d day(s) and retrying.",
                        exc.response.status_code,
                        chunk_days,
                    )
                    chunk_end = min(current + timedelta(days=chunk_days - 1), DATA_END)
                    chunk_params = {
                        **params,
                        "settlementDateFrom": _date_to_iso(current),
                        "settlementDateTo": _date_to_iso(chunk_end),
                    }
                else:
                    raise

        for row in raw:
            try:
                rec = ActualRecord.model_validate(row)
                all_records.append(rec)
            except ValidationError as exc:
                rejected += 1
                logger.warning("Rejected FUELHH row (validation): %s | row: %s", exc, row)

        logger.info(
            "  FUELHH chunk %s→%s: %d raw rows, %d cumulative valid",
            current,
            chunk_end,
            len(raw),
            len(all_records),
        )
        current = chunk_end + timedelta(days=1)
        time.sleep(settings.bmrs_rate_limit_s)

    if rejected:
        logger.warning("Total FUELHH rows rejected by validation: %d", rejected)

    if not all_records:
        logger.error("No valid FUELHH rows fetched – check API response.")
        return pd.DataFrame()

    df = pd.DataFrame([r.model_dump() for r in all_records])
    df = df.rename(
        columns={
            "publishTime": "publish_time",
            "startTime": "start_time",
            "settlementDate": "settlement_date",
            "settlementPeriod": "settlement_period",
            "fuelType": "fuel_type",
        }
    )

    # Defensive re-filter
    df = df[df["fuel_type"] == "WIND"].copy()

    # Parse timestamps as UTC-aware
    for col in ("publish_time", "start_time"):
        df[col] = pd.to_datetime(df[col], utc=True)

    # Deduplicate: for each startTime, keep the row with the latest publishTime
    df = df.sort_values("publish_time", ascending=False)
    df = df.drop_duplicates(subset=["start_time"], keep="first")
    df = df.sort_values("start_time").reset_index(drop=True)

    logger.info("FUELHH actuals final shape: %s", df.shape)
    return df


# ── WINDFOR ingestion ─────────────────────────────────────────────────────────


def fetch_forecasts(client: httpx.Client) -> pd.DataFrame:
    """Fetch all WINDFOR rows with publishTime in the configured window.

    Post-filters to rows where ``startTime`` falls within Jan 2026.
    Keeps ALL (publishTime, startTime) pairs (multi-vintage).
    Deduplicates exact (publishTime, startTime) duplicate rows.
    """
    logger.info(
        "Fetching WINDFOR forecasts (publish window %s → %s) …",
        _dt_to_iso(WINDFOR_PUB_START),
        _dt_to_iso(WINDFOR_PUB_END),
    )

    chunk_days = settings.bmrs_chunk_days
    all_records: list[ForecastRecord] = []
    rejected = 0

    current = WINDFOR_PUB_START
    while current < WINDFOR_PUB_END:
        chunk_end = min(
            current + timedelta(days=chunk_days) - timedelta(seconds=1),
            WINDFOR_PUB_END,
        )
        chunk_params: dict[str, Any] = {
            "publishDateTimeFrom": _dt_to_iso(current),
            "publishDateTimeTo": _dt_to_iso(chunk_end),
            "format": "json",
        }

        while True:
            try:
                raw = _fetch_with_retry(
                    client,
                    WINDFOR_ENDPOINT,
                    chunk_params,
                    max_retries=settings.bmrs_max_retries,
                    timeout=settings.bmrs_timeout_s,
                )
                break
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code in (400, 413, 422) and chunk_days > 1:
                    chunk_days = max(1, chunk_days // 2)
                    logger.warning(
                        "HTTP %d – shrinking WINDFOR chunk to %d day(s).",
                        exc.response.status_code,
                        chunk_days,
                    )
                    chunk_end = min(
                        current + timedelta(days=chunk_days) - timedelta(seconds=1),
                        WINDFOR_PUB_END,
                    )
                    chunk_params = {
                        "publishDateTimeFrom": _dt_to_iso(current),
                        "publishDateTimeTo": _dt_to_iso(chunk_end),
                        "format": "json",
                    }
                else:
                    raise

        for row in raw:
            try:
                rec = ForecastRecord.model_validate(row)
                all_records.append(rec)
            except ValidationError as exc:
                rejected += 1
                logger.warning("Rejected WINDFOR row (validation): %s | row: %s", exc, row)

        logger.info(
            "  WINDFOR chunk %s→%s: %d raw rows, %d cumulative valid",
            _dt_to_iso(current),
            _dt_to_iso(chunk_end),
            len(raw),
            len(all_records),
        )
        current = chunk_end + timedelta(seconds=1)
        time.sleep(settings.bmrs_rate_limit_s)

    if rejected:
        logger.warning("Total WINDFOR rows rejected by validation: %d", rejected)

    if not all_records:
        logger.error("No valid WINDFOR rows fetched – check API response.")
        return pd.DataFrame()

    df = pd.DataFrame([r.model_dump() for r in all_records])
    df = df.rename(
        columns={
            "publishTime": "publish_time",
            "startTime": "start_time",
        }
    )

    for col in ("publish_time", "start_time"):
        df[col] = pd.to_datetime(df[col], utc=True)

    # Post-filter: keep only rows where startTime is in Jan 2026
    jan_start = datetime(2026, 1, 1, tzinfo=UTC)
    jan_end = datetime(2026, 2, 1, tzinfo=UTC)
    df = df[(df["start_time"] >= jan_start) & (df["start_time"] < jan_end)].copy()

    # Deduplicate exact (publishTime, startTime) pairs
    df = df.drop_duplicates(subset=["publish_time", "start_time"], keep="first")
    df = df.sort_values(["start_time", "publish_time"]).reset_index(drop=True)

    logger.info("WINDFOR forecasts final shape: %s", df.shape)
    return df


# ── Data quality report ───────────────────────────────────────────────────────


def _expected_half_hours() -> set[datetime]:
    """All 48 × 31 = 1488 half-hour startTimes for January 2026 UTC."""
    result = set()
    current = datetime(2026, 1, 1, 0, 0, tzinfo=UTC)
    end = datetime(2026, 2, 1, 0, 0, tzinfo=UTC)
    while current < end:
        result.add(current)
        current += timedelta(minutes=30)
    return result


def build_quality_report(
    actuals: pd.DataFrame,
    forecasts: pd.DataFrame,
) -> dict[str, Any]:
    """Build a data-quality report dict.  Logged to console and saved to meta JSON."""

    expected = _expected_half_hours()

    # ── Actuals ───────────────────────────────────────────────────────────────
    actual_starts: set[datetime] = set()
    if not actuals.empty:
        actual_starts = set(actuals["start_time"].dt.to_pydatetime())

    missing_actual_half_hours = sorted(t.isoformat() for t in expected - actual_starts)
    negative_actuals = int((actuals["generation"] < 0).sum()) if not actuals.empty else 0
    null_actuals = int(actuals["generation"].isna().sum()) if not actuals.empty else 0

    # ── Forecasts ─────────────────────────────────────────────────────────────
    forecast_starts: set[datetime] = set()
    if not forecasts.empty:
        forecast_starts = set(forecasts["start_time"].dt.to_pydatetime())

    missing_forecast_start_times = sorted(t.isoformat() for t in expected - forecast_starts)
    negative_forecasts = int((forecasts["generation"] < 0).sum()) if not forecasts.empty else 0
    null_forecasts = int(forecasts["generation"].isna().sum()) if not forecasts.empty else 0

    vintages_per_starttime: dict[str, float] = {}
    if not forecasts.empty:
        counts = forecasts.groupby("start_time")["publish_time"].nunique()
        vintages_per_starttime = {
            "min": float(counts.min()),
            "p50": float(counts.quantile(0.5)),
            "max": float(counts.max()),
        }

    report = {
        "actuals": {
            "rows": len(actuals),
            "unique_start_times": len(actual_starts),
            "expected_half_hours": len(expected),
            "missing_half_hours_count": len(missing_actual_half_hours),
            "missing_half_hours": missing_actual_half_hours[:20],  # truncate for readability
            "negative_generation_rows": negative_actuals,
            "null_generation_rows": null_actuals,
        },
        "forecasts": {
            "rows": len(forecasts),
            "unique_start_times": len(forecast_starts),
            "expected_half_hours": len(expected),
            "missing_start_times_count": len(missing_forecast_start_times),
            "missing_start_times": missing_forecast_start_times[:20],
            "negative_generation_rows": negative_forecasts,
            "null_generation_rows": null_forecasts,
            "vintages_per_starttime": vintages_per_starttime,
        },
    }

    # Log summary
    logger.info("=== DATA QUALITY REPORT ===")
    logger.info(
        "Actuals: %d rows | %d unique half-hours | %d missing | %d negative | %d null",
        report["actuals"]["rows"],
        report["actuals"]["unique_start_times"],
        report["actuals"]["missing_half_hours_count"],
        report["actuals"]["negative_generation_rows"],
        report["actuals"]["null_generation_rows"],
    )
    logger.info(
        "Forecasts: %d rows | %d unique startTimes | %d missing | %d negative | %d null",
        report["forecasts"]["rows"],
        report["forecasts"]["unique_start_times"],
        report["forecasts"]["missing_start_times_count"],
        report["forecasts"]["negative_generation_rows"],
        report["forecasts"]["null_generation_rows"],
    )
    if vintages_per_starttime:
        logger.info(
            "Forecast vintages per startTime: min=%.0f p50=%.0f max=%.0f",
            vintages_per_starttime["min"],
            vintages_per_starttime["p50"],
            vintages_per_starttime["max"],
        )

    return report


# ── Save / load helpers ───────────────────────────────────────────────────────


def save_snapshot(
    actuals: pd.DataFrame,
    forecasts: pd.DataFrame,
    quality_report: dict[str, Any],
    data_dir: Path,
) -> None:
    """Write Parquet files and metadata JSON to ``data_dir``."""
    data_dir.mkdir(parents=True, exist_ok=True)

    actuals_path = data_dir / ACTUALS_FILE
    forecasts_path = data_dir / FORECASTS_FILE
    meta_path = data_dir / META_FILE

    actuals.to_parquet(actuals_path, index=False)
    forecasts.to_parquet(forecasts_path, index=False)

    meta: dict[str, Any] = {
        "fetch_time_utc": datetime.now(UTC).isoformat(),
        "endpoints": {
            "actuals": FUELHH_ENDPOINT,
            "forecasts": WINDFOR_ENDPOINT,
        },
        "params": {
            "actuals": {
                "settlementDateFrom": _date_to_iso(DATA_START),
                "settlementDateTo": _date_to_iso(DATA_END),
                "fuelType": "WIND",
            },
            "forecasts": {
                "publishDateTimeFrom": _dt_to_iso(WINDFOR_PUB_START),
                "publishDateTimeTo": _dt_to_iso(WINDFOR_PUB_END),
                "post_filter_startTime_from": "2026-01-01T00:00:00Z",
                "post_filter_startTime_to": "2026-01-31T23:30:00Z",
            },
        },
        "row_counts": {
            "actuals": len(actuals),
            "forecasts": len(forecasts),
        },
        "quality": quality_report,
    }

    with meta_path.open("w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2, default=str)

    logger.info("Snapshot saved: %s (%d rows)", actuals_path, len(actuals))
    logger.info("Snapshot saved: %s (%d rows)", forecasts_path, len(forecasts))
    logger.info("Metadata saved: %s", meta_path)


def snapshot_exists(data_dir: Path) -> bool:
    """Return True if both Parquet snapshots exist."""
    return (
        (data_dir / ACTUALS_FILE).exists()
        and (data_dir / FORECASTS_FILE).exists()
        and (data_dir / META_FILE).exists()
    )


# ── Entry point ───────────────────────────────────────────────────────────────


def run(refresh: bool = False) -> None:
    """Main ingestion entry point.

    Parameters
    ----------
    refresh:
        If False and snapshots already exist, skip the API fetch.
        If True, always re-fetch from the Elexon API.
    """
    data_dir = Path(settings.data_dir)

    if not refresh and snapshot_exists(data_dir):
        logger.info("Snapshots already present in %s. Use --refresh to re-fetch.", data_dir)
        return

    if refresh:
        logger.info("--refresh flag set; re-fetching from Elexon BMRS …")

    with httpx.Client(
        headers={"Accept": "application/json"},
        follow_redirects=True,
    ) as client:
        actuals = fetch_actuals(client)
        forecasts = fetch_forecasts(client)

    if actuals.empty:
        logger.error("FUELHH returned no data – aborting without saving.")
        sys.exit(1)

    if forecasts.empty:
        logger.error("WINDFOR returned no data – aborting without saving.")
        sys.exit(1)

    quality_report = build_quality_report(actuals, forecasts)
    save_snapshot(actuals, forecasts, quality_report, data_dir)

    logger.info("Done. Snapshot ready in %s", data_dir)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fetch Elexon BMRS wind data and save Parquet snapshots."
    )
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="Re-fetch from the API even if snapshots already exist.",
    )
    args = parser.parse_args()
    run(refresh=args.refresh)


if __name__ == "__main__":
    main()
