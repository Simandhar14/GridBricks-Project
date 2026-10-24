"""Application configuration loaded from environment / .env file."""

from __future__ import annotations

from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All configuration values for the GridBricks backend.

    Values are read (in order of priority) from:
      1. Environment variables
      2. A ``.env`` file at the repo root
      3. The defaults defined here
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── General ───────────────────────────────────────────────────────────────
    app_env: str = "development"
    log_level: str = "INFO"
    app_version: str = "0.1.0"

    # ── Data ──────────────────────────────────────────────────────────────────
    data_dir: Path = Path("backend/data")
    """Directory containing Parquet snapshots.  Relative paths are resolved
    from the repository root (where the process is launched from)."""

    # ── Domain defaults ───────────────────────────────────────────────────────
    decision_cutoff_local: str = "09:00"
    """Default decision cutoff time in HH:MM, Europe/London, on D-1."""

    cutoff_options: list[str] = ["06:00", "09:00", "12:00"]
    """UI dropdown options for the cutoff time."""

    # ── Server ────────────────────────────────────────────────────────────────
    port: int = 8000

    # ── CORS ──────────────────────────────────────────────────────────────────
    cors_origins: list[str] = ["http://localhost:5173"]

    # ── Elexon BMRS ───────────────────────────────────────────────────────────
    bmrs_base_url: str = "https://data.elexon.co.uk/bmrs/api/v1"
    bmrs_timeout_s: float = 30.0
    bmrs_max_retries: int = 3
    bmrs_chunk_days: int = 7
    bmrs_rate_limit_s: float = 0.5

    # ── Data scope ────────────────────────────────────────────────────────────
    data_start_date: str = "2026-01-01"
    data_end_date: str = "2026-01-31"
    windfor_fetch_start: str = "2025-12-28T00:00:00Z"
    """WINDFOR publish-time window start (early to catch late-Dec forecasts)."""

    @field_validator("decision_cutoff_local")
    @classmethod
    def validate_cutoff_format(cls, v: str) -> str:
        """Ensure the cutoff is HH:MM."""
        parts = v.split(":")
        if len(parts) != 2 or not all(p.isdigit() for p in parts):
            raise ValueError(f"decision_cutoff_local must be HH:MM, got: {v!r}")
        hh, mm = int(parts[0]), int(parts[1])
        if not (0 <= hh <= 23 and 0 <= mm <= 59):
            raise ValueError(f"decision_cutoff_local out of range: {v!r}")
        return v


# Module-level singleton – import this everywhere.
settings = Settings()
