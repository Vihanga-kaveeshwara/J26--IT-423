"""Multi-Year Rolling-Origin Backtest v2, Model Combinations, and DSS Empirical Prediction Intervals.

Step 1:
- Forecast combinations:
  * combo_mean_3: mean of (seasonal_mean_3yr, ets, seasonal_naive)
  * combo_median_3: median of (seasonal_mean_3yr, ets, seasonal_naive)
  * combo_mean_xgb: mean of (seasonal_mean_3yr, ets, xgboost_selected)
  * combo_mean_all_no_sarima: mean of all models except SARIMA
- Trend-aware naive:
  * trend_naive_phi_05: y_t * r^0.5 where r = sum(last 12m) / sum(prev 12m) at origin
  * trend_naive_phi_10: y_t * r^1.0
- Seasonal naive with local drift:
  * local_drift_3yr: y_t + (y_t - y_{t-36}) / 3
  * local_drift_5yr: y_t + (y_t - y_{t-60}) / 5
- Statistical evaluation:
  * Pooled & per-phase MAE, RMSE, MAPE, bias
  * Moving-block-bootstrap CIs (L=6)
  * Diebold-Mariano tests vs Seasonal Naive with Holm-adjusted p-values across all models

Step 2:
- Empirical prediction intervals from past backtest errors only (2018 to 2024)
- Out-of-sample coverage (target 80% and 50%) and average interval width
- Coverage by phase (2018-2020 pre-validation, 2021-2022 validation, 2023-2024 test)
- Calendar month error breakdown (Jan..Dec)

Writes all outputs to reports/backtest_cleaned_v2/
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
DEFAULT_REPORTS = BASE_DIR / "reports" / "backtest_cleaned_v2"
HORIZON = 12

# Features strictly frozen on pre-2012 data
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
    """Diebold-Mariano test with HAC variance and Harvey-Leybourne-Newey small-sample adjustment."""
    d = loss_model - loss_naive
    n = len(d)
    if n < 5:
        return {"mean_diff": np.nan, "dm_stat": np.nan, "dm_stat_hln": np.nan, "p_value": np.nan, "hac_lr_std": np.nan}
    mean_d = float(np.mean(d))
    lr_var = _hac_covariance(d, max_lag=h - 1)
    dm_stat = mean_d / np.sqrt(lr_var / n)
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


def holm_adjust(p_values: list[float]) -> list[float]:
    """Apply Holm-Bonferroni step-down adjustment to a list of p-values."""
    m = len(p_values)
    indexed = sorted(enumerate(p_values), key=lambda x: x[1])
    adjusted = [0.0] * m
    running_max = 0.0
    for rank, (orig_idx, p) in enumerate(indexed):
        adj = (m - rank) * p
        running_max = max(running_max, adj)
        adjusted[orig_idx] = min(1.0, running_max)
    return adjusted


def moving_block_bootstrap(
    data: np.ndarray,
    block_length: int = 6,
    n_boot: int = 5000,
    seed: int = 42,
    func=np.mean,
) -> tuple[float, float]:
    """Moving-block bootstrap (MBB) percentile 95% confidence interval."""
    rng = np.random.default_rng(seed)
    n = len(data)
    if n <= block_length:
        return float(np.min(data)), float(np.max(data))
    
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
            res = mod.fit(disp=False, maxiter=100)
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
            res = mod.fit(disp=False, maxiter=100)
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
                res = mod.fit(disp=False, maxiter=100)
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


def _generate_predictions(frame: pd.DataFrame) -> pd.DataFrame:
    print("Starting rolling-origin backtest v2 for years 2012..2024...")
    t_start = time.time()
    backtest_rows: list[dict[str, object]] = []
    
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
                
            # History series through origin
            history_series = frame.loc[frame.index <= origin_date, "_target_model_mn_kg"].dropna()
            history = history_series.to_numpy(float)
            
            # --- MODEL 1: Seasonal Naive ---
            pred_s_naive = float(origin_val)
            
            # --- MODEL 2: Seasonal Naive with Global Drift ---
            hist_df = pd.DataFrame({"y": history_series}, index=history_series.index)
            hist_df["diff_12"] = hist_df["y"].diff(12)
            avg_drift = float(hist_df["diff_12"].mean()) if hist_df["diff_12"].notna().any() else 0.0
            pred_s_drift = pred_s_naive + avg_drift
            
            # --- MODEL 3: Seasonal Mean of Last 3 Same-Month Values ---
            same_months_3 = [origin_date, origin_date - pd.DateOffset(months=12), origin_date - pd.DateOffset(months=24)]
            same_vals_3 = [frame.loc[d, "_target_model_mn_kg"] for d in same_months_3 if d in frame.index and pd.notna(frame.loc[d, "_target_model_mn_kg"])]
            pred_s_mean3 = float(np.mean(same_vals_3)) if len(same_vals_3) > 0 else pred_s_naive
            
            # --- MODEL 4: Seasonal Naive with Local Drift (3yr and 5yr) ---
            # 3yr local drift: (y_t - y_{t-36}) / 3
            origin_m36 = origin_date - pd.DateOffset(months=36)
            if origin_m36 in frame.index and pd.notna(frame.loc[origin_m36, "_target_model_mn_kg"]):
                drift_3yr = (origin_val - frame.loc[origin_m36, "_target_model_mn_kg"]) / 3.0
                pred_s_local_drift_3yr = float(origin_val + drift_3yr)
            else:
                pred_s_local_drift_3yr = pred_s_naive
                
            # 5yr local drift: (y_t - y_{t-60}) / 5
            origin_m60 = origin_date - pd.DateOffset(months=60)
            if origin_m60 in frame.index and pd.notna(frame.loc[origin_m60, "_target_model_mn_kg"]):
                drift_5yr = (origin_val - frame.loc[origin_m60, "_target_model_mn_kg"]) / 5.0
                pred_s_local_drift_5yr = float(origin_val + drift_5yr)
            else:
                pred_s_local_drift_5yr = pred_s_naive
                
            # --- MODEL 5: Trend-Aware Naive (r^phi) ---
            # r = sum(last 12m) / sum(prev 12m) at origin
            last_12m_dates = [origin_date - pd.DateOffset(months=i) for i in range(12)]
            prev_12m_dates = [origin_date - pd.DateOffset(months=i) for i in range(12, 24)]
            last_12m_vals = [frame.loc[d, "_target_model_mn_kg"] for d in last_12m_dates if d in frame.index and pd.notna(frame.loc[d, "_target_model_mn_kg"])]
            prev_12m_vals = [frame.loc[d, "_target_model_mn_kg"] for d in prev_12m_dates if d in frame.index and pd.notna(frame.loc[d, "_target_model_mn_kg"])]
            
            if len(last_12m_vals) == 12 and len(prev_12m_vals) == 12 and sum(prev_12m_vals) > 0:
                r_ratio = sum(last_12m_vals) / sum(prev_12m_vals)
            else:
                r_ratio = 1.0
                
            pred_trend_phi_05 = float(origin_val * (r_ratio ** 0.5))
            pred_trend_phi_10 = float(origin_val * (r_ratio ** 1.0))
            
            # --- STATISTICAL / ML MODELS ---
            pred_sarima = fit_sarima(history)
            pred_ets = fit_ets(history)
            pred_theta = fit_theta(history)
            
            row = frame.loc[[origin_date]]
            pred_xgb = fit_xgb(train, row)
            
            # --- MODEL COMBINATIONS ---
            # Combo 1: Mean of (Seasonal Mean 3yr, ETS, Seasonal Naive)
            combo_m3 = float(np.mean([pred_s_mean3, pred_ets, pred_s_naive]))
            # Combo 2: Median of (Seasonal Mean 3yr, ETS, Seasonal Naive)
            combo_med3 = float(np.median([pred_s_mean3, pred_ets, pred_s_naive]))
            # Combo 3: Mean of (Seasonal Mean 3yr, ETS, XGBoost)
            combo_m_xgb = float(np.mean([pred_s_mean3, pred_ets, pred_xgb]))
            # Combo 4: Mean of all models except SARIMA
            models_no_sarima = [pred_s_naive, pred_s_drift, pred_s_mean3, pred_ets, pred_theta, pred_xgb]
            combo_all_no_sarima = float(np.mean(models_no_sarima))
            
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
                # Standalone Models & Baselines
                "seasonal_naive": pred_s_naive,
                "seasonal_naive_drift": pred_s_drift,
                "seasonal_mean_3yr": pred_s_mean3,
                "local_drift_3yr": pred_s_local_drift_3yr,
                "local_drift_5yr": pred_s_local_drift_5yr,
                "trend_naive_phi_05": pred_trend_phi_05,
                "trend_naive_phi_10": pred_trend_phi_10,
                "sarima": pred_sarima,
                "ets": pred_ets,
                "theta": pred_theta,
                "xgboost_selected": pred_xgb,
                # Ensembles
                "combo_mean_3": combo_m3,
                "combo_median_3": combo_med3,
                "combo_mean_xgb": combo_m_xgb,
                "combo_mean_all_no_sarima": combo_all_no_sarima,
            })
            
    df_pred = pd.DataFrame(backtest_rows)
    print(f"Generated {len(df_pred)} predictions across {df_pred['forecast_year'].nunique()} years in {time.time() - t_start:.1f}s.")
    return df_pred


def run_backtest_v2(
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
    
    pred_file = reports_dir / "backtest_predictions.csv"
    if pred_file.exists():
        df_pred = pd.read_csv(pred_file)
        if len(df_pred) == 152:
            print(f"Loaded existing {len(df_pred)} predictions from {pred_file}")
        else:
            df_pred = _generate_predictions(frame)
            df_pred.to_csv(pred_file, index=False)
    else:
        df_pred = _generate_predictions(frame)
        df_pred.to_csv(pred_file, index=False)

    # Model names list
    all_models = [
        "seasonal_naive",
        "seasonal_naive_drift",
        "seasonal_mean_3yr",
        "local_drift_3yr",
        "local_drift_5yr",
        "trend_naive_phi_05",
        "trend_naive_phi_10",
        "sarima",
        "ets",
        "theta",
        "xgboost_selected",
        "combo_mean_3",
        "combo_median_3",
        "combo_mean_xgb",
        "combo_mean_all_no_sarima",
    ]
    
    # 2. Per-Year MAE Table
    per_year_rows = []
    for yr, group in df_pred.groupby("forecast_year"):
        y_true = group["actual"].to_numpy()
        row_dict = {"year": yr, "n": len(group)}
        for m in all_models:
            p = group[m].to_numpy()
            res = compute_metrics(y_true, p)
            row_dict[f"{m}_mae"] = res["mae"]
        per_year_rows.append(row_dict)
    df_per_year = pd.DataFrame(per_year_rows)
    df_per_year.to_csv(reports_dir / "per_year_metrics.csv", index=False)
    
    # 3. Pooled Metrics with MBB CIs (L=6) and DM test vs Seasonal Naive
    y_all = df_pred["actual"].to_numpy()
    ae_naive = np.abs(y_all - df_pred["seasonal_naive"].to_numpy())
    
    dm_raw_pvals = []
    dm_results = []
    
    for m in all_models:
        if m == "seasonal_naive":
            dm_results.append({"dm_stat_hln": 0.0, "p_value": 1.0, "mean_diff": 0.0, "hac_lr_std": 0.0})
            continue
        p_all = df_pred[m].to_numpy()
        ae_m = np.abs(p_all - y_all)
        res_dm = diebold_mariano_test(ae_m, ae_naive, h=12)
        dm_results.append(res_dm)
        dm_raw_pvals.append(res_dm["p_value"])
        
    # Holm adjustment across the 14 competing models
    holm_pvals = holm_adjust(dm_raw_pvals)
    holm_map = dict(zip([m for m in all_models if m != "seasonal_naive"], holm_pvals))
    holm_map["seasonal_naive"] = 1.0
    
    pooled_rows = []
    for idx, m in enumerate(all_models):
        p_all = df_pred[m].to_numpy()
        err_all = p_all - y_all
        ae_m = np.abs(err_all)
        base_res = compute_metrics(y_all, p_all)
        
        mbb_l6_low, mbb_l6_high = moving_block_bootstrap(ae_m, block_length=6)
        
        # Paired difference vs naive
        diff_vs_naive = ae_m - ae_naive
        mbb_diff_l6_low, mbb_diff_l6_high = moving_block_bootstrap(diff_vs_naive, block_length=6)
        
        dm_info = dm_results[idx]
        
        pooled_rows.append({
            "model": m,
            "n": base_res["n"],
            "mae": base_res["mae"],
            "mbb_l6_mae_95ci": f"[{mbb_l6_low:.4f}, {mbb_l6_high:.4f}]",
            "rmse": base_res["rmse"],
            "mape_pct": base_res["mape"],
            "bias_mn_kg": base_res["bias"],
            "diff_vs_naive_mae": float(np.mean(diff_vs_naive)),
            "mbb_l6_diff_95ci": f"[{mbb_diff_l6_low:.4f}, {mbb_diff_l6_high:.4f}]",
            "dm_stat_hln": dm_info["dm_stat_hln"],
            "dm_p_value_raw": dm_info["p_value"],
            "dm_p_value_holm": holm_map[m],
            "statistically_significant_5pct": holm_map[m] < 0.05,
        })
        
    df_pooled = pd.DataFrame(pooled_rows).sort_values("mae").reset_index(drop=True)
    df_pooled.to_csv(reports_dir / "pooled_metrics.csv", index=False)
    
    # 4. Metrics & Bias per phase
    phase_rows = []
    for ph in ["pre_validation", "validation", "test"]:
        group = df_pred[df_pred["phase"] == ph]
        y_ph = group["actual"].to_numpy()
        ae_ph_naive = np.abs(y_ph - group["seasonal_naive"].to_numpy())
        for m in all_models:
            p_ph = group[m].to_numpy()
            ae_ph_m = np.abs(p_ph - y_ph)
            res = compute_metrics(y_ph, p_ph)
            dm_ph = diebold_mariano_test(ae_ph_m, ae_ph_naive, h=12)
            mbb_l6_low, mbb_l6_high = moving_block_bootstrap(ae_ph_m, block_length=6)
            phase_rows.append({
                "phase": ph,
                "model": m,
                "n": res["n"],
                "mae": res["mae"],
                "mbb_l6_mae_95ci": f"[{mbb_l6_low:.4f}, {mbb_l6_high:.4f}]",
                "rmse": res["rmse"],
                "mape_pct": res["mape"],
                "bias_mn_kg": res["bias"],
                "dm_stat_hln": dm_ph["dm_stat_hln"],
                "dm_p_value": dm_ph["p_value"],
            })
    df_phase = pd.DataFrame(phase_rows)
    df_phase.to_csv(reports_dir / "phase_metrics.csv", index=False)
    
    # =========================================================================
    # STEP 2: EMPIRICAL PREDICTION INTERVALS (2018 - 2024)
    # =========================================================================
    # Select top 3 models by pooled MAE
    top_3_models = df_pooled.head(3)["model"].tolist()
    print(f"\nTop 3 Models by Pooled MAE for Prediction Intervals: {top_3_models}")
    
    df_pred_dates = df_pred.copy()
    df_pred_dates["target_date_dt"] = pd.to_datetime(df_pred_dates["target_date"] + "-01")
    df_pred_dates["origin_date_dt"] = pd.to_datetime(df_pred_dates["origin_date"] + "-01")

    pi_eval_rows: list[dict[str, object]] = []

    for m in top_3_models:
        eval_preds = df_pred_dates[df_pred_dates["forecast_year"] >= 2018]
        for _, r in eval_preds.iterrows():
            orig_dt = r["origin_date_dt"]
            actual = r["actual"]
            point_pred = r[m]
            
            # Causal leak-free error set: only past forecasts whose target date <= current origin date
            # (equivalent to forecast origins <= origin_date - 12 months)
            avail = df_pred_dates[df_pred_dates["target_date_dt"] <= orig_dt]
            past_signed_errors = (avail["actual"] - avail[m]).dropna().to_numpy()
            
            # Empirical percentiles
            q10 = float(np.percentile(past_signed_errors, 10))
            q25 = float(np.percentile(past_signed_errors, 25))
            q75 = float(np.percentile(past_signed_errors, 75))
            q90 = float(np.percentile(past_signed_errors, 90))
            
            # 80% interval: [point + q10, point + q90]
            pi_80_low = point_pred + q10
            pi_80_high = point_pred + q90
            cov_80 = int(pi_80_low <= actual <= pi_80_high)
            width_80 = pi_80_high - pi_80_low
            
            # 50% interval: [point + q25, point + q75]
            pi_50_low = point_pred + q25
            pi_50_high = point_pred + q75
            cov_50 = int(pi_50_low <= actual <= pi_50_high)
            width_50 = pi_50_high - pi_50_low
            
            pi_eval_rows.append({
                "model": m,
                "forecast_year": int(r["forecast_year"]),
                "forecast_month": int(r["forecast_month"]),
                "target_date": r["target_date"],
                "origin_date": r["origin_date"],
                "phase": r["phase"],
                "actual": actual,
                "point_pred": point_pred,
                "abs_error": abs(actual - point_pred),
                "pi_80_low": pi_80_low,
                "pi_80_high": pi_80_high,
                "covered_80": cov_80,
                "width_80": width_80,
                "pi_50_low": pi_50_low,
                "pi_50_high": pi_50_high,
                "covered_50": cov_50,
                "width_50": width_50,
            })
            
    df_pi = pd.DataFrame(pi_eval_rows)
    df_pi.to_csv(reports_dir / "prediction_intervals_evaluation.csv", index=False)

    
    # Summarize PI Coverage Overall and by Phase
    pi_summary_rows = []
    for m in top_3_models:
        sub_m = df_pi[df_pi["model"] == m]
        # Overall 2018-2024
        pi_summary_rows.append({
            "model": m,
            "period": "overall_2018_2024",
            "n": len(sub_m),
            "cov_80_pct": float(sub_m["covered_80"].mean() * 100),
            "avg_width_80": float(sub_m["width_80"].mean()),
            "cov_50_pct": float(sub_m["covered_50"].mean() * 100),
            "avg_width_50": float(sub_m["width_50"].mean()),
        })
        for ph in ["pre_validation", "validation", "test"]:
            sub_ph = sub_m[sub_m["phase"] == ph]
            pi_summary_rows.append({
                "model": m,
                "period": ph,
                "n": len(sub_ph),
                "cov_80_pct": float(sub_ph["covered_80"].mean() * 100),
                "avg_width_80": float(sub_ph["width_80"].mean()),
                "cov_50_pct": float(sub_ph["covered_50"].mean() * 100),
                "avg_width_50": float(sub_ph["width_50"].mean()),
            })
    df_pi_summary = pd.DataFrame(pi_summary_rows)
    df_pi_summary.to_csv(reports_dir / "prediction_intervals_summary.csv", index=False)
    
    # Calendar Month Difficulty Analysis
    cal_rows = []
    for m in range(1, 13):
        sub_m = df_pi[df_pi["forecast_month"] == m]
        row_m = {"month": m, "month_name": pd.to_datetime(f"2020-{m:02d}-01").strftime("%b"), "n_samples": len(sub_m) // len(top_3_models)}
        for model in top_3_models:
            sub_model = sub_m[sub_m["model"] == model]
            row_m[f"{model}_mae"] = float(sub_model["abs_error"].mean())
        # Overall average MAE across top models for this month
        row_m["mean_mae"] = float(sub_m["abs_error"].mean())
        cal_rows.append(row_m)
    df_cal = pd.DataFrame(cal_rows).sort_values("mean_mae", ascending=False).reset_index(drop=True)
    df_cal.to_csv(reports_dir / "calendar_month_difficulty.csv", index=False)
    
    print("\nBacktest v2 complete! Reports written to:", reports_dir)
    return {
        "pooled": df_pooled,
        "per_year": df_per_year,
        "phase": df_phase,
        "pi_summary": df_pi_summary,
        "calendar_difficulty": df_cal,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run rolling backtest v2.")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--reports", type=Path, default=DEFAULT_REPORTS)
    args = parser.parse_args()
    res = run_backtest_v2(args.dataset, args.reports)
