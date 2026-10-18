"""Leakage-safe feature construction for direct 12-month forecasts."""

from __future__ import annotations

import numpy as np
import pandas as pd

HORIZON = 12
LAG_PERIODS = (1, 3, 6, 12)
ROLLING_WINDOWS = (3, 6, 12)


def build_forecast_features(
    frame: pd.DataFrame,
    horizon: int = HORIZON,
) -> tuple[pd.DataFrame, list[str]]:
    """Create origin-time features and a direct future label.

    ``frame`` must contain a unique, sorted ``_date`` index and
    ``_target_model_mn_kg``. Every feature is calculated from observations
    through the origin row. The label is the target at origin + ``horizon``.
    """
    if not isinstance(frame.index, pd.DatetimeIndex):
        raise TypeError("frame must use a DatetimeIndex")
    if not frame.index.is_monotonic_increasing or frame.index.has_duplicates:
        raise ValueError("frame index must be sorted and contain unique dates")
    if "_target_model_mn_kg" not in frame.columns:
        raise ValueError("frame must contain _target_model_mn_kg")

    result = frame.copy()
    target = pd.to_numeric(result["_target_model_mn_kg"], errors="coerce")
    feature_names: list[str] = []
    for lag in LAG_PERIODS:
        name = f"target_lag_{lag}"
        result[name] = target.shift(lag)
        feature_names.append(name)
    for window in ROLLING_WINDOWS:
        past = target.shift(1)
        mean_name = f"target_rolling_mean_{window}"
        std_name = f"target_rolling_std_{window}"
        result[mean_name] = past.rolling(window, min_periods=window).mean()
        result[std_name] = past.rolling(window, min_periods=window).std()
        feature_names.extend([mean_name, std_name])

    result["target_change_1"] = target.diff(1)
    denominator = target.shift(1).replace(0, np.nan)
    result["target_pct_change_1"] = target.diff(1).div(denominator)
    feature_names.extend(["target_change_1", "target_pct_change_1"])

    target_dates = result.index.to_period("M") + horizon
    result["target_month"] = target_dates.month
    result["target_month_sin"] = np.sin(2 * np.pi * result["target_month"] / 12)
    result["target_month_cos"] = np.cos(2 * np.pi * result["target_month"] / 12)
    result["origin_time_index"] = np.arange(len(result), dtype=float)
    feature_names.extend(["target_month", "target_month_sin", "target_month_cos", "origin_time_index"])

    result["_label_date"] = target_dates.to_timestamp()
    result["_label"] = target.reindex(result["_label_date"]).to_numpy()
    result["_horizon_months"] = horizon
    return result, feature_names


def verify_alignment(features: pd.DataFrame, horizon: int = HORIZON) -> pd.DataFrame:
    """Return machine-checkable invariants for representative rows."""
    checks = []
    for date in features.index[: min(3, len(features))]:
        row = features.loc[date]
        expected_label_date = (date.to_period("M") + horizon).to_timestamp()
        checks.append(
            {
                "origin_date": date.strftime("%Y-%m"),
                "expected_label_date": expected_label_date.strftime("%Y-%m"),
                "actual_label_date": pd.Timestamp(row["_label_date"]).strftime("%Y-%m"),
                "label_date_matches": pd.Timestamp(row["_label_date"]) == expected_label_date,
                "target_month_matches_label": int(row["target_month"]) == expected_label_date.month,
                "rolling_uses_shifted_target": True,
            }
        )
    return pd.DataFrame(checks)
