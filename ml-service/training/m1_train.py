"""Training script for M1 Tea Export Demand Forecast Champion Model.

Champion Architecture:
- Ensemble mean of:
  1. Seasonal Mean (3-year same-month average)
  2. Statsmodels ETS(A, A, A, 12)
  3. Direct 12-month XGBoost with 8 frozen pre-2012 features
- Direct 12-month forecasting protocol: target T is forecast from data up to origin T - 12 months.
- Trained on verified cleaned dataset through 2024-12
- Saves m1_demand_forecast_v1.joblib and m1_demand_forecast_v1_metadata.json
"""

from __future__ import annotations

import datetime
import hashlib
import json
import warnings
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from statsmodels.tsa.exponential_smoothing.ets import ETSModel
from xgboost import XGBRegressor

BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR / "dataset" / "M1_combined_monthly_cleaned.csv"
BACKTEST_PREDS_PATH = BASE_DIR / "reports" / "backtest_cleaned_v2" / "backtest_predictions.csv"
MODELS_DIR = BASE_DIR.parent / "trained_models"
MODEL_FILE = MODELS_DIR / "m1_demand_forecast_v1.joblib"
METADATA_FILE = MODELS_DIR / "m1_demand_forecast_v1_metadata.json"

HORIZON = 12
SELECTED_FEATURES = [
    "target_lag_1",
    "target_lag_12",
    "target_rolling_std_6",
    "target_change_1",
    "target_pct_change_1",
    "target_month",
    "target_month_sin",
    "target_month_cos",
]


def predict_direct_12m(
    bundle: dict[str, Any],
    target_month_str: str,
    recent_history: pd.Series | None = None,
) -> dict[str, Any]:
    """Generate direct 12-month-ahead point forecast and intervals for target month T.

    Under direct 12-month forecasting:
    - Forecast origin = T - 12 months.
    - Historical data cutoff used = T - 12 months.
    """
    target_date = pd.Timestamp(f"{target_month_str}-01")
    forecast_origin_date = target_date - pd.DateOffset(months=12)
    forecast_origin_str = forecast_origin_date.strftime("%Y-%m")

    history_series = bundle["history_series"]
    ets_model_fit = bundle["ets_model_fit"]
    xgb_pipeline = bundle["xgb_pipeline"]
    empirical_quantiles = bundle["empirical_quantiles"]
    features = bundle["features"]

    # Merge recent observations if provided
    history = history_series.copy()
    if recent_history is not None and len(recent_history) > 0:
        for dt, val in recent_history.items():
            history.loc[pd.Timestamp(dt)] = float(val)
    history = history.sort_index()

    # Verify origin date is available in history
    if forecast_origin_date not in history.index:
        latest_avail = history.index[-1].strftime("%Y-%m")
        max_target = (history.index[-1] + pd.DateOffset(months=12)).strftime("%Y-%m")
        raise ValueError(
            f"Forecast origin {forecast_origin_str} (for target {target_month_str}) is not present in data history. "
            f"Latest available data is {latest_avail}; maximum forecastable target month without updating model is {max_target}."
        )

    # Slice history strictly up to forecast origin date (T - 12 months)
    origin_history = history.loc[:forecast_origin_date]
    if len(origin_history) < 36:
        raise ValueError(f"Insufficient history through origin {forecast_origin_str} (need at least 36 months).")

    # 1. Component 1: Seasonal Mean 3-year (same month in T-12, T-24, T-36)
    same_dates = [
        target_date - pd.DateOffset(months=12),
        target_date - pd.DateOffset(months=24),
        target_date - pd.DateOffset(months=36),
    ]
    same_vals = [history.loc[d] for d in same_dates if d in history.index and pd.notna(history.loc[d])]
    if len(same_vals) > 0:
        pred_s_mean3 = float(np.mean(same_vals))
    else:
        pred_s_mean3 = float(origin_history.iloc[-1])

    # 2. Component 2: ETS 12-step forecast from origin T - 12
    try:
        # Fit local ETS on history through origin (or forecast 12 steps)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            local_ets = ETSModel(
                origin_history.to_numpy(float),
                error="add",
                trend="add",
                seasonal="add",
                seasonal_periods=12,
            ).fit(disp=False, maxiter=100)
            ets_forecasts = np.asarray(local_ets.forecast(steps=12))
            pred_ets = float(ets_forecasts[-1])
    except Exception:
        pred_ets = pred_s_mean3

    # 3. Component 3: XGBoost with 8 frozen features constructed at origin T - 12
    origin_val = float(origin_history.loc[forecast_origin_date])
    lag_12_dt = forecast_origin_date - pd.DateOffset(months=12)
    lag_12_val = float(origin_history.loc[lag_12_dt]) if lag_12_dt in origin_history.index else origin_val

    past_6 = origin_history.iloc[-6:].to_numpy(float)
    rolling_std_6 = float(np.std(past_6, ddof=1)) if len(past_6) >= 2 else 0.0

    prev_val = float(origin_history.iloc[-2]) if len(origin_history) >= 2 else origin_val
    change_1 = origin_val - prev_val
    pct_change_1 = (change_1 / prev_val) if prev_val != 0 else 0.0

    tgt_m = target_date.month
    tgt_sin = float(np.sin(2 * np.pi * tgt_m / 12))
    tgt_cos = float(np.cos(2 * np.pi * tgt_m / 12))

    feat_df = pd.DataFrame([{
        "target_lag_1": origin_val,
        "target_lag_12": lag_12_val,
        "target_rolling_std_6": rolling_std_6,
        "target_change_1": change_1,
        "target_pct_change_1": pct_change_1,
        "target_month": tgt_m,
        "target_month_sin": tgt_sin,
        "target_month_cos": tgt_cos,
    }])[features]

    pred_xgb = float(xgb_pipeline.predict(feat_df)[0])

    # Champion Point Forecast: Simple Mean of the 3 components
    point_pred = float(np.mean([pred_s_mean3, pred_ets, pred_xgb]))

    # Empirical Prediction Intervals (signed error quantiles from backtest)
    q10 = empirical_quantiles["q10"]
    q25 = empirical_quantiles["q25"]
    q75 = empirical_quantiles["q75"]
    q90 = empirical_quantiles["q90"]

    pi_50_low = max(0.0, point_pred + q25)
    pi_50_high = max(0.0, point_pred + q75)
    pi_80_low = max(0.0, point_pred + q10)
    pi_80_high = max(0.0, point_pred + q90)

    return {
        "target_month": target_month_str,
        "forecast_origin_month": forecast_origin_str,
        "data_cutoff_used": forecast_origin_date.strftime("%Y-%m-%d"),
        "horizon_months": 12,
        "point_forecast_mn_kg": round(point_pred, 4),
        "interval_50": {
            "lower_mn_kg": round(pi_50_low, 4),
            "upper_mn_kg": round(pi_50_high, 4),
            "width_mn_kg": round(pi_50_high - pi_50_low, 4),
            "nominal_coverage_pct": 50,
        },
        "interval_80": {
            "lower_mn_kg": round(pi_80_low, 4),
            "upper_mn_kg": round(pi_80_high, 4),
            "width_mn_kg": round(pi_80_high - pi_80_low, 4),
            "nominal_coverage_pct": 80,
        },
        "component_forecasts": {
            "seasonal_mean_3yr_mn_kg": round(pred_s_mean3, 4),
            "ets_mn_kg": round(pred_ets, 4),
            "xgboost_mn_kg": round(pred_xgb, 4),
        },
    }


def train_champion_model(
    dataset_path: Path = DATASET_PATH,
    models_dir: Path = MODELS_DIR,
) -> tuple[Path, Path]:
    """Train champion model on full cleaned dataset through 2024-12 and write joblib + metadata."""
    models_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. Hash cleaned dataset
    sha256_hash = hashlib.sha256(dataset_path.read_bytes()).hexdigest()
    
    # 2. Load dataset
    raw = pd.read_csv(dataset_path, low_memory=False)
    raw["_date"] = pd.to_datetime(raw["Date"], format="mixed")
    raw = raw.sort_values("_date").reset_index(drop=True)
    raw["_target_model_mn_kg"] = raw["TB_Total_Exports_model_mn_kg"]
    
    series = raw.set_index("_date")["_target_model_mn_kg"].dropna()
    data_cutoff_str = series.index[-1].strftime("%Y-%m-%d")
    
    # 3. Fit ETS on full series
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        try:
            ets_mod = ETSModel(
                series.to_numpy(float),
                error="add",
                trend="add",
                seasonal="add",
                seasonal_periods=12,
            )
            ets_fit = ets_mod.fit(disp=False, maxiter=100)
        except Exception:
            ets_mod = ETSModel(
                series.to_numpy(float),
                error="add",
                trend=None,
                seasonal="add",
                seasonal_periods=12,
            )
            ets_fit = ets_mod.fit(disp=False, maxiter=100)

    # 4. Fit XGBoost on full feature engineered frame
    from feature_engineering import build_forecast_features
    frame, _ = build_forecast_features(raw.set_index("_date"), HORIZON)
    
    missing_feats = set(SELECTED_FEATURES) - set(frame.columns)
    if missing_feats:
        raise ValueError(f"Required features missing from frame: {missing_feats}")
        
    usable = frame.dropna(subset=["_label"])
    xgb_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median", add_indicator=True)),
        ("model", XGBRegressor(
            n_estimators=160,
            max_depth=2,
            learning_rate=0.05,
            subsample=0.9,
            colsample_bytree=0.9,
            objective="reg:squarederror",
            random_state=42,
            n_jobs=1,
        )),
    ])
    xgb_pipeline.fit(usable[SELECTED_FEATURES], usable["_label"])

    # 5. Load empirical quantiles from backtest predictions
    df_pred = pd.read_csv(BACKTEST_PREDS_PATH)
    errs = (df_pred["actual"] - df_pred["combo_mean_xgb"]).dropna().to_numpy()
    q05, q10, q25, q75, q90, q95 = np.percentile(errs, [5, 10, 25, 75, 90, 95])
    empirical_quantiles = {
        "q05": float(q05),
        "q10": float(q10),
        "q25": float(q25),
        "q75": float(q75),
        "q90": float(q90),
        "q95": float(q95),
    }

    # 6. Save Model Bundle
    model_bundle = {
        "version": "1.0.0",
        "data_cutoff": data_cutoff_str,
        "features": SELECTED_FEATURES,
        "history_series": series,
        "ets_model_fit": ets_fit,
        "xgb_pipeline": xgb_pipeline,
        "empirical_quantiles": empirical_quantiles,
    }

    joblib.dump(model_bundle, MODEL_FILE)
    print(f"Saved model bundle to {MODEL_FILE}")

    # 7. Compile Metadata JSON with exact observed backtest coverage numbers
    metadata = {
        "model_name": "m1_demand_forecast_v1",
        "model_version": "1.0.0",
        "model_architecture": "Ensemble Mean (Seasonal Mean 3yr, ETS(A,A,A), XGBoost)",
        "training_date_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "data_cutoff_date": data_cutoff_str,
        "cleaned_data_sha256": sha256_hash,
        "features": SELECTED_FEATURES,
        "hyperparameters": {
            "xgboost": {
                "n_estimators": 160,
                "max_depth": 2,
                "learning_rate": 0.05,
                "subsample": 0.9,
                "colsample_bytree": 0.9,
                "objective": "reg:squarederror",
                "random_state": 42,
                "n_jobs": 1,
            },
            "ets": {
                "error": "add",
                "trend": "add",
                "seasonal": "add",
                "seasonal_periods": 12,
            },
            "seasonal_mean_3yr": {
                "window_years": 3,
                "aggregation": "mean",
            },
        },
        "backtest_metrics": {
            "evaluation_protocol": "Direct 12-month-ahead rolling origin (2012-2024, 152 origins)",
            "n_origins": 152,
            "mae": 1.734264712050597,
            "rmse": 2.236599057130248,
            "mape_pct": 8.04955161545447,
            "bias_mn_kg": 0.7476622873203896,
        },
        "interval_calibration": {
            "variant": "a_expanding_window_empirical_quantiles",
            "empirical_signed_error_quantiles": empirical_quantiles,
            "observed_backtest_coverage": {
                "nominal_80_overall_pct": 67.90123456790124,
                "nominal_80_test_phase_pct": 60.86956521739131,
                "nominal_90_test_phase_pct": 78.26086956521739,
                "nominal_50_overall_pct": 51.85185185185185,
                "nominal_50_test_phase_pct": 39.130434782608695,
            },
            "selection_window_2018_2022": {
                "n": 58,
                "nominal_50_pct": {
                    "observed_coverage_pct": 56.89655172413793,
                    "avg_width_mn_kg": 2.629817757989912,
                    "pinball_loss": 0.695313,
                },
                "nominal_80_pct": {
                    "observed_coverage_pct": 70.6896551724138,
                    "avg_width_mn_kg": 4.625983796349377,
                    "pinball_loss": 0.415232,
                },
                "nominal_90_pct": {
                    "observed_coverage_pct": 79.3103448275862,
                    "avg_width_mn_kg": 5.470972,
                    "pinball_loss": 0.275527,
                },
            },
            "held_out_test_2023_2024": {
                "n": 23,
                "nominal_50_pct": {
                    "observed_coverage_pct": 39.130434782608695,
                    "avg_width_mn_kg": 2.539203350087989,
                    "pinball_loss": 0.858298,
                },
                "nominal_80_pct": {
                    "observed_coverage_pct": 60.86956521739131,
                    "avg_width_mn_kg": 4.937683937860098,
                    "pinball_loss": 0.499089,
                },
                "nominal_90_pct": {
                    "observed_coverage_pct": 78.26086956521739,
                    "avg_width_mn_kg": 6.227293,
                    "pinball_loss": 0.322026,
                },
            },
            "overall_2018_2024": {
                "n": 81,
                "nominal_50_observed_coverage_pct": 51.85185185185185,
                "nominal_50_avg_width_mn_kg": 2.604087719765799,
                "nominal_80_observed_coverage_pct": 67.90123456790124,
                "nominal_80_avg_width_mn_kg": 4.714491034088273,
            },
        },
        "known_limitations": [
            "Direct 12-month model: forecasts for target month T are produced from origin T - 12 months (horizon = 12 months).",
            "With historical data through 2024-12, target months up to 2025-12 are forecastable. Targets up to data_end + 12 months become available only when fresh actuals are appended or the model is updated.",
            "Prediction intervals assume historical error distributions. During macroeconomic shocks or unprecedented supply disruptions (such as 2021-2022), realized coverage may drop below nominal targets.",
            "Export volumes are in million kilograms (mn_kg); negative predictions are bounded at zero.",
        ],
    }

    with open(METADATA_FILE, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata to {METADATA_FILE}")

    return MODEL_FILE, METADATA_FILE


if __name__ == "__main__":
    train_champion_model()
