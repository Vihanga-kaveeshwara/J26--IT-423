"""Multi-Year Rolling-Origin Backtest and Advanced Statistical Significance Evaluation.

Implements Step 3 requirements on cleaned M1 dataset:
1. Models evaluated:
   - Seasonal Naive (12-month lag)
   - Seasonal Naive with Drift (last-year value + average yearly change)
   - Seasonal Mean of last 3 same-month values
   - ETS (additive error, trend, seasonality, seasonal_periods=12)
   - Theta (deseasonalized ThetaModel, period=12)
   - SARIMA ((1,1,1)(1,1,1)12)
   - XGBoost (Selected Features: 8 features from cleaned feature selection)
2. Multi-year rolling-origin backtest:
   - Forecast years 2012..2024 (13 years, 150+ monthly forecast points)
   - Direct 12-month horizon protocol (origin t = target - 12m)
   - Leakage-safe: training partition uses rows with feature origin <= t and label date <= t
3. Statistical Evaluation:
   - Per-year MAE table
   - Pooled MAE, RMSE, MAPE, and Mean Signed Error (Bias)
   - Moving-Block Bootstrap (MBB) 95% CIs (block lengths L=3 and L=6)
   - Diebold-Mariano test with HAC (Newey-West, h=12) variance vs Seasonal Naive
   - Metrics and Bias per phase (2012-2020 pre-validation, 2021-2022 validation, 2023-2024 test)
4. Persists all outputs to reports/backtest_cleaned/
"""

from __future__ import annotations

import argparse
import json
import time
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from statsmodels.tsa.exponential_smoothing.ets import ETSModel
from statsmodels.tsa.forecasting.theta import ThetaModel
from statsmodels.tsa.statespace.sarimax import SARIMAX
from xgboost import XGBRegressor

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DATASET = BASE_DIR / "dataset" / "M1_combined_monthly_cleaned.csv"
DEFAULT_REPORTS = BASE_DIR / "reports" / "backtest_cleaned"
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


def _hac_covariance(d: np.ndarray, max_lag: int = 11) -> float:
    """Compute Newey-West HAC variance of the sample mean of d."""
    n = len(d)
    d_centered = d - np.mean(d)
    gamma_0 = float(np.mean(d_centered**2))
    gamma_sum = 0.0
    for k in range(1, min(max_lag + 1, n)):
        weight = 1.0 - (k / (max_lag + 1))
        cov_k = float(np.mean(d_centered[k:] * d_centered[:-k]))
        gamma_sum += 2.0 * weight * cov_k
    lr_var = gamma_0 + gamma_sum
    return max(1e-12, lr_var)


def diebold_mariano_test(loss_model: np.ndarray, loss_naive: np.ndarray, h: int = 12) -> dict[str, float]:
    """Diebold-Mariano test with HAC variance and Harvey-Leybourne-Newey small sample correction."""
    d = loss_model - loss_naive
    n = len(d)
    if n < 5:
        return {"dm_stat": np.nan, "p_value": np.nan, "mean_diff": np.nan}
    mean_d = float(np.mean(d))
    lr_var = _hac_covariance(d, max_lag=h - 1)
    dm_stat = mean_d / np.sqrt(lr_var / n)
    # HLN correction factor
    hln_factor = np.sqrt((n + 1 - 2 * h + h * (h - 1) / n) / n)
    dm_stat_hln = dm_stat * hln_factor
    p_value = 2.0 * (1.0 - stats.t.cdf(np.abs(dm_stat_hln), df=n - 1))
    return {
        "mean_diff": mean_d,
        "dm_stat": float(dm_stat),
        "dm_stat_hln": float(dm_stat_hln),
        "p_value": float(p_value),
        "hac_lr_std": float(np.sqrt(lr_var)),
    }


def moving_block_bootstrap(
    data: np.ndarray,
    block_length: int = 3,
    n_boot: int = 5000,
    seed: int = 42,
    func=np.mean,
) -> tuple[float, float]:
    """Moving-block bootstrap (MBB) percentile 95% confidence interval."""
    rng = np.random.default_rng(seed)
    n = len(data)
    if n <= block_length:
        return float(np.min(data)), float(np.max(data))
    
    # Generate all overlapping blocks
    num_blocks = n - block_length + 1
    blocks = [data[i : i + block_length] for i in range(num_blocks)]
    k_blocks = int(np.ceil(n / block_length))
    
    boot_stats = np.empty(n_boot, dtype=float)
    for b in range(n_boot):
        sampled_block_indices = rng.integers(0, num_blocks, size=k_blocks)
        sample = np.concatenate([blocks[idx] for idx in sampled_block_indices])[:n]
        boot_stats[b] = func(sample)
        
    return float(np.percentile(boot_stats, 2.5)), float(np.percentile(boot_stats, 97.5))


def fit_sarima(history: np.ndarray) -> float:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        try:
            mod = SARIMAX(
                history,
                order=(1, 1, 1),
                seasonal_order=(1, 1, 1, 12),
                enforce_stationarity=False,
                enforce_invertibility=False,
            )
            res = mod.fit(disp=False, maxiter=80)
            return float(res.forecast(steps=HORIZON)[-1])
        except Exception:
            return np.nan


def fit_ets(history: np.ndarray) -> float:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        try:
            mod = ETSModel(
                history,
                error="add",
                trend="add",
                seasonal="add",
                seasonal_periods=12,
            )
            res = mod.fit(disp=False, maxiter=80)
            return float(np.asarray(res.forecast(steps=HORIZON))[-1])
        except Exception:
            try:
                mod = ETSModel(
                    history,
                    error="add",
                    trend=None,
                    seasonal="add",
                    seasonal_periods=12,
                )
                res = mod.fit(disp=False, maxiter=80)
                return float(np.asarray(res.forecast(steps=HORIZON))[-1])
            except Exception:
                return np.nan


def fit_theta(history: np.ndarray) -> float:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        try:
            mod = ThetaModel(history, period=12)
            res = mod.fit()
            return float(res.forecast(HORIZON).iloc[-1])
        except Exception:
            return np.nan


def fit_xgb(train: pd.DataFrame, row: pd.DataFrame) -> float:
    missing = set(SELECTED_FEATURES) - set(train.columns)
    if missing:
        raise ValueError(f"Requested feature column(s) not found in training frame: {missing}")
    usable = train.dropna(subset=["_label"])
    model = Pipeline([
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
    model.fit(usable[SELECTED_FEATURES], usable["_label"])
    return float(model.predict(row[SELECTED_FEATURES])[0])


def compute_metrics(actual: np.ndarray, pred: np.ndarray) -> dict[str, float]:
    mask = np.isfinite(actual) & np.isfinite(pred)
    y = actual[mask]
    p = pred[mask]
    n = len(y)
    if n == 0:
        return {"n": 0, "mae": np.nan, "rmse": np.nan, "mape": np.nan, "bias": np.nan}
    err = p - y
    ae = np.abs(err)
    nonzero = y != 0
    return {
        "n": n,
        "mae": float(np.mean(ae)),
        "rmse": float(np.sqrt(np.mean(err**2))),
        "mape": float(np.mean(ae[nonzero] / y[nonzero]) * 100) if nonzero.any() else np.nan,
        "bias": float(np.mean(err)),
    }


def run_backtest(
    dataset_path: Path = DEFAULT_DATASET,
    reports_dir: Path = DEFAULT_REPORTS,
) -> dict[str, object]:
    reports_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. Load data and build features
    raw = pd.read_csv(dataset_path, low_memory=False)
    raw["_date"] = pd.to_datetime(raw["Date"], format="mixed")
    raw = raw.sort_values("_date").reset_index(drop=True)
    raw["_target_model_mn_kg"] = raw["TB_Total_Exports_model_mn_kg"]
    
    from feature_engineering import build_forecast_features
    frame, _ = build_forecast_features(raw.set_index("_date"), HORIZON)
    
    backtest_rows: list[dict[str, object]] = []
    
    print(f"Starting rolling-origin backtest for years 2012..2024...")
    t_start = time.time()
    
    # Loop over target years 2012..2024
    for year in range(2012, 2025):
        for month in range(1, 13):
            target_str = f"{year}-{month:02d}"
            target_date = pd.Timestamp(f"{target_str}-01")
            origin_date = target_date - pd.DateOffset(months=HORIZON)
            origin_str = origin_date.strftime("%Y-%m")
            
            if target_date not in frame.index or origin_date not in frame.index:
                continue
                
            actual_val = frame.loc[target_date, "_target_model_mn_kg"]
            if pd.isna(actual_val):
                continue
                
            origin_val = frame.loc[origin_date, "_target_model_mn_kg"]
            if pd.isna(origin_val):
                continue
                
            # Training set: history through origin date where label date <= origin date
            train = frame[(frame.index <= origin_date) & (frame["_label_date"] <= origin_date)].copy()
            if train["_label"].notna().sum() < 24:
                continue
                
            # History array of target series through origin
            history_series = frame.loc[frame.index <= origin_date, "_target_model_mn_kg"].dropna()
            history = history_series.to_numpy(float)
            
            # --- BASELINE 1: Seasonal Naive ---
            pred_s_naive = float(origin_val)
            
            # --- BASELINE 2: Seasonal Naive with Drift ---
            # Average annual change over all available 12-month pairs in history
            hist_df = pd.DataFrame({"y": history_series}, index=history_series.index)
            hist_df["diff_12"] = hist_df["y"].diff(12)
            avg_drift = float(hist_df["diff_12"].mean()) if hist_df["diff_12"].notna().any() else 0.0
            pred_s_drift = pred_s_naive + avg_drift
            
            # --- BASELINE 3: Seasonal Mean of Last 3 Same-Month Values ---
            same_months = [origin_date, origin_date - pd.DateOffset(months=12), origin_date - pd.DateOffset(months=24)]
            same_vals = [frame.loc[d, "_target_model_mn_kg"] for d in same_months if d in frame.index and pd.notna(frame.loc[d, "_target_model_mn_kg"])]
            pred_s_mean3 = float(np.mean(same_vals)) if len(same_vals) > 0 else pred_s_naive
            
            # --- STATISTICAL / ML MODELS ---
            pred_sarima = fit_sarima(history)
            pred_ets = fit_ets(history)
            pred_theta = fit_theta(history)
            
            row = frame.loc[[origin_date]]
            pred_xgb = fit_xgb(train, row)
            
            phase = (
                "pre_validation" if year <= 2020 else ("validation" if year in [2021, 2022] else "test")
            )
            
            backtest_rows.append({
                "forecast_year": year,
                "forecast_month": month,
                "target_date": target_str,
                "origin_date": origin_str,
                "phase": phase,
                "actual": float(actual_val),
                "seasonal_naive": pred_s_naive,
                "seasonal_naive_drift": pred_s_drift,
                "seasonal_mean_3yr": pred_s_mean3,
                "sarima": pred_sarima,
                "ets": pred_ets,
                "theta": pred_theta,
                "xgboost_selected": pred_xgb,
            })
            
    df_pred = pd.DataFrame(backtest_rows)
    df_pred.to_csv(reports_dir / "backtest_predictions.csv", index=False)
    print(f"Generated {len(df_pred)} predictions across {df_pred['forecast_year'].nunique()} years in {time.time() - t_start:.1f}s.")
    
    # 2. Per-Year MAE Table
    model_names = [
        "seasonal_naive",
        "seasonal_naive_drift",
        "seasonal_mean_3yr",
        "sarima",
        "ets",
        "theta",
        "xgboost_selected",
    ]
    
    per_year_rows = []
    for yr, group in df_pred.groupby("forecast_year"):
        y_true = group["actual"].to_numpy()
        row_dict = {"year": yr, "n": len(group)}
        for m in model_names:
            p = group[m].to_numpy()
            res = compute_metrics(y_true, p)
            row_dict[f"{m}_mae"] = res["mae"]
        per_year_rows.append(row_dict)
    df_per_year = pd.DataFrame(per_year_rows)
    df_per_year.to_csv(reports_dir / "per_year_metrics.csv", index=False)
    
    # 3. Pooled Metrics with MBB CIs (L=3, L=6) and DM test
    y_all = df_pred["actual"].to_numpy()
    ae_naive = np.abs(y_all - df_pred["seasonal_naive"].to_numpy())
    
    pooled_rows = []
    dm_rows = []
    
    for m in model_names:
        p_all = df_pred[m].to_numpy()
        err_all = p_all - y_all
        ae_m = np.abs(err_all)
        base_res = compute_metrics(y_all, p_all)
        
        # Moving block bootstrap for MAE
        mbb_l3_low, mbb_l3_high = moving_block_bootstrap(ae_m, block_length=3)
        mbb_l6_low, mbb_l6_high = moving_block_bootstrap(ae_m, block_length=6)
        
        # Paired difference vs naive
        diff_vs_naive = ae_m - ae_naive
        mbb_diff_l3_low, mbb_diff_l3_high = moving_block_bootstrap(diff_vs_naive, block_length=3)
        mbb_diff_l6_low, mbb_diff_l6_high = moving_block_bootstrap(diff_vs_naive, block_length=6)
        
        # DM test
        dm_res = diebold_mariano_test(ae_m, ae_naive, h=12)
        
        pooled_rows.append({
            "model": m,
            "n": base_res["n"],
            "mae": base_res["mae"],
            "mbb_l3_mae_95ci": f"[{mbb_l3_low:.4f}, {mbb_l3_high:.4f}]",
            "mbb_l6_mae_95ci": f"[{mbb_l6_low:.4f}, {mbb_l6_high:.4f}]",
            "rmse": base_res["rmse"],
            "mape_pct": base_res["mape"],
            "bias_mn_kg": base_res["bias"],
            "diff_vs_naive_mae": np.mean(diff_vs_naive),
            "mbb_l3_diff_95ci": f"[{mbb_diff_l3_low:.4f}, {mbb_diff_l3_high:.4f}]",
            "mbb_l6_diff_95ci": f"[{mbb_diff_l6_low:.4f}, {mbb_diff_l6_high:.4f}]",
            "dm_stat_hln": dm_res["dm_stat_hln"],
            "dm_p_value": dm_res["p_value"],
        })
        
        dm_rows.append({
            "model": m,
            "n": base_res["n"],
            "mean_ae_diff_vs_naive": dm_res["mean_diff"],
            "hac_lr_std": dm_res["hac_lr_std"],
            "dm_stat_raw": dm_res["dm_stat"],
            "dm_stat_hln": dm_res["dm_stat_hln"],
            "p_value": dm_res["p_value"],
            "statistically_significant_5pct": dm_res["p_value"] < 0.05 if np.isfinite(dm_res["p_value"]) else False,
        })
        
    df_pooled = pd.DataFrame(pooled_rows)
    df_pooled.to_csv(reports_dir / "pooled_metrics.csv", index=False)
    
    df_dm = pd.DataFrame(dm_rows)
    df_dm.to_csv(reports_dir / "diebold_mariano_tests.csv", index=False)
    
    # 4. Metrics & Bias per phase
    phase_rows = []
    for ph, group in df_pred.groupby("phase"):
        y_ph = group["actual"].to_numpy()
        ae_ph_naive = np.abs(y_ph - group["seasonal_naive"].to_numpy())
        for m in model_names:
            p_ph = group[m].to_numpy()
            ae_ph_m = np.abs(p_ph - y_ph)
            res = compute_metrics(y_ph, p_ph)
            dm_ph = diebold_mariano_test(ae_ph_m, ae_ph_naive, h=12)
            mbb3_low, mbb3_high = moving_block_bootstrap(ae_ph_m, block_length=3)
            phase_rows.append({
                "phase": ph,
                "model": m,
                "n": res["n"],
                "mae": res["mae"],
                "mbb_l3_mae_ci": f"[{mbb3_low:.4f}, {mbb3_high:.4f}]",
                "rmse": res["rmse"],
                "mape_pct": res["mape"],
                "bias_mn_kg": res["bias"],
                "dm_stat_hln": dm_ph["dm_stat_hln"],
                "dm_p_value": dm_ph["p_value"],
            })
    df_phase = pd.DataFrame(phase_rows)
    df_phase.to_csv(reports_dir / "phase_metrics.csv", index=False)
    
    # Generate markdown report
    report_lines = [
        "# Multi-Year Rolling-Origin Backtest & Advanced Statistical Evaluation",
        "",
        "## Overview",
        f"- **Dataset**: Reconciled and cleaned monthly exports (2000-01 to 2024-12, SHA-256: `ffab3b37...`).",
        f"- **Backtest Period**: 2012 to 2024 ({df_pred['forecast_year'].nunique()} years, {len(df_pred)} forecast points).",
        f"- **Direct Forecast Horizon**: 12 months ahead.",
        "",
        "## Pooled Results (2012–2024)",
        "```text",
        df_pooled[["model", "n", "mae", "mbb_l3_mae_95ci", "rmse", "mape_pct", "bias_mn_kg", "dm_p_value"]].to_string(index=False),
        "```",
        "",
        "## Per-Year MAE (mn kg)",
        "```text",
        df_per_year.to_string(index=False),
        "```",
        "",
        "## Performance by Phase",
        "```text",
        df_phase[["phase", "model", "n", "mae", "rmse", "mape_pct", "bias_mn_kg", "dm_p_value"]].to_string(index=False),
        "```",
    ]
    (reports_dir / "backtest_report.md").write_text("\n".join(report_lines) + "\n", encoding="utf-8")
    
    return {
        "pooled": df_pooled,
        "per_year": df_per_year,
        "phase": df_phase,
        "dm_tests": df_dm,
        "predictions": df_pred,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run rolling-origin backtest on cleaned data.")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--reports", type=Path, default=DEFAULT_REPORTS)
    args = parser.parse_args()
    res = run_backtest(args.dataset, args.reports)
    print("Backtest completed successfully!")
