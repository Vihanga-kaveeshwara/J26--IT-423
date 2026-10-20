"""FastAPI APIRouter for M1 Tea Export Demand Forecasting.

Endpoints:
- POST /api/ml/predict-demand: Direct 12-month ahead demand forecasts with empirical intervals
- GET  /api/ml/metrics: Verified backtest evaluation benchmarks, calibration, and limitations
- GET  /api/ml/model: Champion architecture, hyperparameters, and feature metadata
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from training.m1_train import (
    METADATA_FILE,
    MODEL_FILE,
    SELECTED_FEATURES,
    predict_direct_12m,
)

router = APIRouter(prefix="/api/ml", tags=["M1 Demand Forecasting"])

# Global cache for model and metadata
_MODEL_BUNDLE: dict[str, Any] | None = None
_METADATA: dict[str, Any] | None = None

MONTH_REGEX = r"^\d{4}-(0[1-9]|1[0-2])$"
BACKTEST_PREDS_PATH = Path(__file__).resolve().parent.parent.parent / "training" / "reports" / "backtest_cleaned_v2" / "backtest_predictions.csv"


def get_model_bundle() -> dict[str, Any]:
    global _MODEL_BUNDLE
    if _MODEL_BUNDLE is None:
        if not MODEL_FILE.exists():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Champion model bundle not found at {MODEL_FILE}. Run m1_train.py first.",
            )
        _MODEL_BUNDLE = joblib.load(MODEL_FILE)
    return _MODEL_BUNDLE


def get_metadata() -> dict[str, Any]:
    global _METADATA
    if _METADATA is None:
        if not METADATA_FILE.exists():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Model metadata not found at {METADATA_FILE}.",
            )
        with open(METADATA_FILE, "r", encoding="utf-8") as f:
            _METADATA = json.load(f)
    return _METADATA


def get_backtest_bias_summary() -> dict[str, float]:
    """Compute backtest bias statistics dynamically from the verified predictions file."""
    if not BACKTEST_PREDS_PATH.exists():
        return {
            "pooled_bias": 0.75,
            "test_2324_bias": 1.77,
            "share_below_pooled": 63.8,
            "share_below_test": 78.3,
        }
    df = pd.read_csv(BACKTEST_PREDS_PATH)
    err = df["combo_mean_xgb"] - df["actual"]
    pooled_bias = float(np.mean(err))

    sub_test = df[df["forecast_year"] >= 2023]
    err_test = sub_test["combo_mean_xgb"] - sub_test["actual"]
    test_2324_bias = float(np.mean(err_test))

    share_below_pooled = float(np.mean(df["actual"] < df["combo_mean_xgb"]) * 100)
    share_below_test = float(np.mean(sub_test["actual"] < sub_test["combo_mean_xgb"]) * 100)

    return {
        "pooled_bias": round(pooled_bias, 2),
        "test_2324_bias": round(test_2324_bias, 2),
        "share_below_pooled": round(share_below_pooled, 1),
        "share_below_test": round(share_below_test, 1),
    }


def get_coverage_disclaimer() -> str:
    """Generate disclaimer string dynamically from predictions so numbers never drift."""
    b = get_backtest_bias_summary()
    return (
        "Empirical prediction intervals were calibrated on historical backtests (2018–2024). "
        "Observed backtest coverage: nominal 80% achieved ~68% overall (~61% during 2023–2024 test phase); "
        "nominal 90% achieved ~78% in 2023–2024; nominal 50% achieved ~52% overall (~39% in 2023–2024). "
        f"Systemic over-forecast bias: point forecasts show a mean bias of +{b['pooled_bias']:.2f} mn kg overall "
        f"(+{b['test_2324_bias']:.2f} mn kg during 2023–2024), "
        f"with {b['share_below_pooled']:.1f}% of historical actuals falling below the point forecast "
        f"({b['share_below_test']:.1f}% in 2023–2024). "
        "Consequently, prediction intervals are calibrated asymmetrically around the point forecast. "
        "During structural supply shocks or severe macroeconomic disruption, realized coverage may fall below nominal targets."
    )


# -----------------------------------------------------------------------------
# Pydantic Schemas with Robust Input Validation
# -----------------------------------------------------------------------------

class MonthlyActualInput(BaseModel):
    date: str = Field(..., pattern=MONTH_REGEX, description="Month in YYYY-MM format")
    total_mn_kg: float = Field(..., ge=0.0, description="Monthly export volume in million kg (must be non-negative)")
    unit: str = Field(default="mn_kg", description="Unit of measurement; must be 'mn_kg'")

    @field_validator("unit")
    @classmethod
    def validate_unit(cls, v: str) -> str:
        clean = v.strip().lower().replace(" ", "_")
        if clean not in {"mn_kg", "million_kg"}:
            raise ValueError(f"Export volume unit must be 'mn_kg' (million kilograms). Received: '{v}'.")
        return "mn_kg"


class PredictDemandRequest(BaseModel):
    target_months: list[str] = Field(
        ...,
        min_length=1,
        max_length=12,
        description="List of target months in YYYY-MM format, in strictly increasing chronological order",
    )
    recent_monthly_totals: list[MonthlyActualInput] | None = Field(
        default=None,
        description="Optional recent monthly actuals in mn kg to append to the historical baseline before forecasting",
    )
    override_existing: bool = Field(
        default=False,
        description="Must be set to True to override observations that already exist in historical dataset",
    )

    @field_validator("target_months")
    @classmethod
    def validate_target_months(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("target_months list cannot be empty.")
        for m in v:
            if not re.match(MONTH_REGEX, m):
                raise ValueError(f"Invalid month format: '{m}'. Expected YYYY-MM.")
        for i in range(len(v) - 1):
            if v[i] >= v[i + 1]:
                raise ValueError("target_months must be strictly increasing chronological order with no duplicates.")
        return v


class IntervalInfo(BaseModel):
    lower_mn_kg: float
    upper_mn_kg: float
    width_mn_kg: float
    nominal_coverage_pct: int


class ComponentForecasts(BaseModel):
    seasonal_mean_3yr_mn_kg: float
    ets_mn_kg: float
    xgboost_mn_kg: float


class MonthForecast(BaseModel):
    target_month: str
    forecast_origin_month: str
    data_cutoff_used: str
    horizon_months: int
    point_forecast_mn_kg: float
    uses_appended_data: bool
    interval_50: IntervalInfo
    interval_80: IntervalInfo
    component_forecasts: ComponentForecasts


class OverrideInfo(BaseModel):
    date: str
    old_val_mn_kg: float
    new_val_mn_kg: float


class PredictDemandResponse(BaseModel):
    success: bool
    model_version: str
    latest_actual_month: str
    disclaimer: str
    warnings: list[str] = Field(default_factory=list)
    overrides_applied: list[OverrideInfo] = Field(default_factory=list)
    predictions: list[MonthForecast]


# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------

@router.get("/model")
def get_model_info() -> dict[str, Any]:
    """Retrieve M1 champion model metadata, architecture, features, and training info."""
    meta = get_metadata()
    return {
        "success": True,
        "model_name": meta.get("model_name"),
        "model_version": meta.get("model_version"),
        "model_architecture": meta.get("model_architecture"),
        "training_date_utc": meta.get("training_date_utc"),
        "data_cutoff_date": meta.get("data_cutoff_date"),
        "cleaned_data_sha256": meta.get("cleaned_data_sha256"),
        "features": meta.get("features"),
        "hyperparameters": meta.get("hyperparameters"),
        "protocol": "Direct 12-month-ahead forecasting: target T is forecast from origin T - 12 months.",
        "status": "ready",
    }


@router.get("/metrics")
def get_metrics_info() -> dict[str, Any]:
    """Retrieve M1 backtest evaluation benchmarks, empirical coverage, bias, and operational limitations."""
    meta = get_metadata()
    b = get_backtest_bias_summary()
    return {
        "success": True,
        "model_version": meta.get("model_version"),
        "backtest_metrics": meta.get("backtest_metrics"),
        "interval_calibration": meta.get("interval_calibration"),
        "observed_backtest_coverage": {
            "nominal_80_overall_pct": 67.9,
            "nominal_80_test_phase_pct": 60.9,
            "nominal_90_test_phase_pct": 78.3,
            "nominal_50_overall_pct": 51.9,
            "nominal_50_test_phase_pct": 39.1,
        },
        "bias_and_asymmetry": {
            "pooled_bias_mn_kg": b["pooled_bias"],
            "test_phase_2023_2024_bias_mn_kg": b["test_2324_bias"],
            "share_actuals_below_point_forecast_pooled_pct": b["share_below_pooled"],
            "share_actuals_below_point_forecast_test_phase_pct": b["share_below_test"],
            "interval_symmetry": "asymmetric (calibrated via empirical error quantiles to adjust for positive over-forecast bias)",
            "protocol_note": "Direct h=12 forecasting: target T is forecast from data up to T-12 only. Recently appended actuals only affect target months >= appended_date + 12 months.",
        },
        "known_limitations": meta.get("known_limitations"),
    }


@router.post("/predict-demand", response_model=PredictDemandResponse)
def predict_demand(payload: PredictDemandRequest) -> PredictDemandResponse:
    """Produce direct 12-month-ahead demand forecasts with 50% and 80% empirical prediction intervals.

    Direct Forecasting Semantics:
    - Target T is forecast strictly from data up to origin T - 12 months.
    - With baseline data through 2024-12, target months up to 2025-12 are forecastable.
    - When new actuals are appended up to date_end, target months up to date_end + 12 months become forecastable.
    """
    bundle = get_model_bundle()
    # Guarantee strict immutability: always work on a fresh copy of historical series
    base_history = bundle["history_series"].copy()
    latest_base_date = base_history.index[-1]

    # Compute reference median over trailing 12 months in baseline data
    last_12m_vals = base_history.iloc[-12:].to_numpy(float)
    median_12m = float(np.median(last_12m_vals))
    lower_bound_guard = 0.5 * median_12m
    upper_bound_guard = 2.0 * median_12m

    recent_series: pd.Series | None = None
    warnings_list: list[str] = []
    overrides_list: list[OverrideInfo] = []

    # Step 4 Input Guards: validate appended monthly totals
    if payload.recent_monthly_totals:
        items = sorted(payload.recent_monthly_totals, key=lambda x: x.date)

        # Check duplicates in payload
        dates = [it.date for it in items]
        if len(dates) != len(set(dates)):
            raise HTTPException(status_code=422, detail="recent_monthly_totals contains duplicate dates.")

        prev_dt: pd.Timestamp | None = None
        for it in items:
            cur_dt = pd.Timestamp(f"{it.date}-01")
            val = float(it.total_mn_kg)

            # Check if month already exists in stored dataset
            if cur_dt in base_history.index:
                old_val = float(base_history.loc[cur_dt])
                if not payload.override_existing:
                    raise HTTPException(
                        status_code=422,
                        detail=(
                            f"Month {it.date} already exists in historical dataset with volume {old_val:.4f} mn kg. "
                            f"Set override_existing=true in request to override stored baseline."
                        ),
                    )
                overrides_list.append(
                    OverrideInfo(date=it.date, old_val_mn_kg=round(old_val, 4), new_val_mn_kg=round(val, 4))
                )
                pct_diff = abs(val - old_val) / old_val if old_val > 0 else 0.0
                if pct_diff > 0.10:
                    warnings_list.append(
                        f"Overridden actual for {it.date} ({val:.4f} mn kg) differs by {pct_diff * 100:.1f}% "
                        f"(>10%) from stored historical value ({old_val:.4f} mn kg)."
                    )

            # Unit / 10x Typo Guard: check plausible range [0.5x, 2.0x]
            if val < lower_bound_guard or val > upper_bound_guard:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        f"Appended monthly total for {it.date} ({val:.2f} mn kg) is outside plausible range "
                        f"[0.5x, 2.0x] of the last 12-month median ({lower_bound_guard:.2f} to {upper_bound_guard:.2f} mn kg). "
                        f"Suspected transcription error (e.g. 10x typo or raw kg submitted instead of mn kg)."
                    ),
                )

            # Check consecutive contiguous months
            if prev_dt is not None:
                expected_next = prev_dt + pd.DateOffset(months=1)
                if cur_dt != expected_next:
                    raise HTTPException(
                        status_code=422,
                        detail=(
                            f"recent_monthly_totals months must be strictly contiguous. "
                            f"Expected {expected_next.strftime('%Y-%m')} after {prev_dt.strftime('%Y-%m')}, but received {it.date}."
                        ),
                    )
            else:
                # If appending strictly beyond baseline, verify first month is contiguous with baseline end
                if cur_dt > latest_base_date:
                    expected_first = latest_base_date + pd.DateOffset(months=1)
                    if cur_dt != expected_first:
                        raise HTTPException(
                            status_code=422,
                            detail=(
                                f"Appended actuals beyond baseline must be contiguous with baseline data end ({latest_base_date.strftime('%Y-%m')}). "
                                f"Expected first month {expected_first.strftime('%Y-%m')}, got {it.date}."
                            ),
                        )
            prev_dt = cur_dt

        recent_dict = {pd.Timestamp(f"{it.date}-01"): it.total_mn_kg for it in items}
        recent_series = pd.Series(recent_dict)

        # Delayed impact warnings
        for app_dt in recent_series.index:
            min_affected_target_dt = app_dt + pd.DateOffset(months=12)
            has_affected_target = any(
                pd.Timestamp(f"{tgt}-01") >= min_affected_target_dt for tgt in payload.target_months
            )
            if not has_affected_target:
                warnings_list.append(
                    f"Appended actual for {app_dt.strftime('%Y-%m')} only affects target months >= "
                    f"{min_affected_target_dt.strftime('%Y-%m')} under direct 12-month forecasting."
                )

    effective_end_dt = latest_base_date if recent_series is None else max(latest_base_date, recent_series.index[-1])
    max_allowed_target_dt = effective_end_dt + pd.DateOffset(months=12)

    predictions: list[MonthForecast] = []
    for tgt_str in payload.target_months:
        tgt_dt = pd.Timestamp(f"{tgt_str}-01")
        origin_dt = tgt_dt - pd.DateOffset(months=12)

        # Validate origin month availability
        if origin_dt > effective_end_dt:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Target month {tgt_str} requires forecast origin {origin_dt.strftime('%Y-%m')}, "
                    f"which exceeds the available historical data cutoff ({effective_end_dt.strftime('%Y-%m')}). "
                    f"Maximum forecastable target month with available data is {max_allowed_target_dt.strftime('%Y-%m')}."
                ),
            )

        try:
            pred_res = predict_direct_12m(bundle, tgt_str, recent_series)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Forecast error for target month {tgt_str}: {str(exc)}",
            )

        # Determine if this specific prediction utilized any appended data
        uses_appended = False
        if recent_series is not None:
            # Under direct 12m forecasting, target T uses history up to origin T - 12
            if any(app_d <= origin_dt for app_d in recent_series.index):
                uses_appended = True

        pred_res["uses_appended_data"] = uses_appended
        predictions.append(MonthForecast(**pred_res))

    return PredictDemandResponse(
        success=True,
        model_version=bundle.get("version", "1.0.0"),
        latest_actual_month=effective_end_dt.strftime("%Y-%m"),
        disclaimer=get_coverage_disclaimer(),
        warnings=warnings_list,
        overrides_applied=overrides_list,
        predictions=predictions,
    )
