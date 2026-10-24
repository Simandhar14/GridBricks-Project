"""Forecast series and revisions router."""

from __future__ import annotations

from datetime import date

from backend.app.analytics import (
    build_daily_decision_view,
    compute_what_if_procurement,
    get_forecast_revisions,
)
from backend.app.config import settings
from backend.app.data_loader import data_loader
from backend.app.schemas import (
    DecisionForecastResponse,
    RevisionsResponse,
    WhatIfRequest,
    WhatIfResponse,
)
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/forecast", tags=["Forecast"])

JAN_START = date(2026, 1, 1)
JAN_END = date(2026, 1, 31)


def validate_jan_date(d_str: str) -> date:
    """Validate that the date string is YYYY-MM-DD and falls within January 2026."""
    try:
        d = date.fromisoformat(d_str)
    except ValueError as exc:
        raise HTTPException(
            status_code=400, detail=f"Invalid date format: {d_str}. Expected YYYY-MM-DD."
        ) from exc

    if d < JAN_START or d > JAN_END:
        raise HTTPException(
            status_code=400,
            detail=f"Date {d_str} is out of bounds. Permitted range: 2026-01-01 to 2026-01-31.",
        )
    return d


def validate_cutoff(cutoff_str: str) -> str:
    """Validate cutoff format HH:MM."""
    parts = cutoff_str.split(":")
    if len(parts) != 2 or not all(p.isdigit() for p in parts):
        raise HTTPException(
            status_code=400, detail=f"Cutoff must be formatted as HH:MM, got: {cutoff_str!r}"
        )
    hh, mm = int(parts[0]), int(parts[1])
    if not (0 <= hh <= 23 and 0 <= mm <= 59):
        raise HTTPException(
            status_code=400, detail=f"Cutoff {cutoff_str!r} is out of 24-hour range."
        )
    return cutoff_str


@router.get("/decision", response_model=DecisionForecastResponse)
def get_decision_forecast(
    date: str = Query(..., description="Target delivery day (YYYY-MM-DD in Jan 2026)"),
    cutoff: str = Query(
        default=settings.decision_cutoff_local, description="D-1 cutoff local time (HH:MM)"
    ),
) -> DecisionForecastResponse:
    """Return latest wind generation forecast available at decision cutoff for delivery day D."""
    d = validate_jan_date(date)
    c = validate_cutoff(cutoff)

    actuals = data_loader.get_actuals()
    forecasts = data_loader.get_forecasts()

    payload = build_daily_decision_view(
        actuals_df=actuals,
        forecasts_df=forecasts,
        delivery_date=d,
        cutoff_time_local=c,
    )
    return DecisionForecastResponse(**payload)


@router.get("/revisions", response_model=RevisionsResponse)
def get_revisions(
    date: str = Query(..., description="Target delivery day (YYYY-MM-DD in Jan 2026)"),
    cutoff: str = Query(
        default=settings.decision_cutoff_local, description="D-1 cutoff local time (HH:MM)"
    ),
) -> RevisionsResponse:
    """Return all forecast vintages published for delivery day D, highlighting the decision vintage."""
    d = validate_jan_date(date)
    c = validate_cutoff(cutoff)

    actuals = data_loader.get_actuals()
    forecasts = data_loader.get_forecasts()

    payload = get_forecast_revisions(
        forecasts_df=forecasts,
        actuals_df=actuals,
        delivery_date=d,
        cutoff_time_local=c,
    )
    return RevisionsResponse(**payload)


@router.post("/what-if", response_model=WhatIfResponse)
def calculate_what_if(req: WhatIfRequest) -> WhatIfResponse:
    """Calculate procurement requirement and conservative buffer from user scenario demand."""
    calc = compute_what_if_procurement(
        expected_demand_mw=req.expected_demand_mw,
        forecast_wind_mw=req.forecast_wind_mw,
        lower_wind_bound_mw=req.lower_wind_bound_mw,
    )
    return WhatIfResponse(**calc)
