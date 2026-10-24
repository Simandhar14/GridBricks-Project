"""Data loader for Parquet snapshots.

Loads snapshots into memory at app startup and serves cached DataFrames to routers.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import pandas as pd
from backend.app.config import settings

logger = logging.getLogger(__name__)

ACTUALS_FILE = "actuals_wind_2026-01.parquet"
FORECASTS_FILE = "windfor_forecasts_2026-01.parquet"
META_FILE = "snapshot_meta.json"


class DataLoader:
    """In-memory cache for actuals, forecasts, and snapshot metadata."""

    def __init__(self, data_dir: Path | str | None = None) -> None:
        self.data_dir = Path(data_dir or settings.data_dir)
        self.actuals: pd.DataFrame = pd.DataFrame()
        self.forecasts: pd.DataFrame = pd.DataFrame()
        self.meta: dict[str, Any] = {}
        self.is_loaded: bool = False

    def load(self) -> None:
        """Load Parquet files and metadata JSON into memory."""
        actuals_path = self.data_dir / ACTUALS_FILE
        forecasts_path = self.data_dir / FORECASTS_FILE
        meta_path = self.data_dir / META_FILE

        if not actuals_path.exists() or not forecasts_path.exists():
            logger.warning(
                "Snapshots not found in %s. If running in tests, inject fixtures via set_data().",
                self.data_dir,
            )
            return

        logger.info("Loading actuals from %s ...", actuals_path)
        self.actuals = pd.read_parquet(actuals_path)
        for col in ("publish_time", "start_time"):
            if col in self.actuals.columns:
                self.actuals[col] = pd.to_datetime(self.actuals[col], utc=True)

        logger.info("Loading forecasts from %s ...", forecasts_path)
        self.forecasts = pd.read_parquet(forecasts_path)
        for col in ("publish_time", "start_time"):
            if col in self.forecasts.columns:
                self.forecasts[col] = pd.to_datetime(self.forecasts[col], utc=True)

        if meta_path.exists():
            with meta_path.open("r", encoding="utf-8") as f:
                self.meta = json.load(f)

        self.is_loaded = True
        logger.info(
            "DataLoader ready: %d actuals, %d forecasts.",
            len(self.actuals),
            len(self.forecasts),
        )

    def set_data(
        self,
        actuals: pd.DataFrame,
        forecasts: pd.DataFrame,
        meta: dict[str, Any] | None = None,
    ) -> None:
        """Inject DataFrames directly (useful for testing with small fixtures)."""
        self.actuals = actuals.copy()
        self.forecasts = forecasts.copy()
        self.meta = meta or {}
        self.is_loaded = True

    def get_actuals(self) -> pd.DataFrame:
        return self.actuals

    def get_forecasts(self) -> pd.DataFrame:
        return self.forecasts

    def get_meta(self) -> dict[str, Any]:
        return self.meta


# Global loader instance
data_loader = DataLoader()
