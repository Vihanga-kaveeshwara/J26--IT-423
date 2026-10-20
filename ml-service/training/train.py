"""
M2 Component: Refuse-Tea Prediction & System Integration
Model Training Pipeline (train.py)

This module implements the model training, time-aware cross-validation, baseline
benchmarking, and model persistence according to the methodology specifications
(Section 3.1 & 3.2, Table 3):
- Enforces strictly chronological time-series splitting (random k-fold prohibited).
- Benchmarks against the National Static Baseline (6.0%) and Random Forest.
- Fits primary model (XGBRegressor) with focused regularization.
- Measures single-row inference latency against the <2.0s production threshold.
- Saves model artifact (.joblib), metadata (.json), and comparison metrics (.csv).

Usage:
    cd ml-service/training
    python train.py
"""

import os
import sys
import time
import json
from datetime import datetime, timezone
from typing import Tuple, Dict, Any, List

import numpy as np
import pandas as pd
import joblib

import xgboost as xgb
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

# -----------------------------------------------------------------------------
# Path Configurations
# -----------------------------------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PROCESSED_DIR = os.path.join(SCRIPT_DIR, 'dataset', 'processed')
TRAINED_MODELS_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '..', 'trained_models'))
os.makedirs(TRAINED_MODELS_DIR, exist_ok=True)

# -----------------------------------------------------------------------------
# Proposal Benchmark Thresholds (Table 3)
# -----------------------------------------------------------------------------
THRESHOLDS = {
    'rmse': 1.0,        # RMSE < 1.0%
    'mae': 0.75,        # MAE < 0.75%
    'r2': 0.85,         # R^2 > 0.85
    'mape': 8.0,        # MAPE < 8.0%
    'latency_s': 2.0    # Single-row inference latency < 2.0 seconds
}


def mape_score(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Computes Mean Absolute Percentage Error (MAPE) in percentage."""
    return float(np.mean(np.abs((y_true - y_pred) / y_true)) * 100.0)


def load_processed_data() -> Tuple[pd.DataFrame, pd.Series, pd.DataFrame]:
    """
    Loads the Stage 2 selected feature matrix, target, and metadata.
    Enforces positional alignment and chronological ordering.
    """
    x_path = os.path.join(DATASET_PROCESSED_DIR, 'X_features_selected.csv')
    y_path = os.path.join(DATASET_PROCESSED_DIR, 'y_target.csv')
    meta_path = os.path.join(DATASET_PROCESSED_DIR, 'metadata.csv')

    for p in [x_path, y_path, meta_path]:
        if not os.path.exists(p):
            raise FileNotFoundError(
                f"Required processed input file not found: {p}. "
                f"Run 'python preprocessing.py' first."
            )

    print(f"[TRAIN] Loading processed datasets from: {DATASET_PROCESSED_DIR}")
    X = pd.read_csv(x_path)
    y = pd.read_csv(y_path)['refuse_tea_pct']
    metadata = pd.read_csv(meta_path)

    # Sanity checks
    assert len(X) == len(y) == len(metadata), "Row count mismatch across processed files."
    print(f" -> Loaded {len(X)} records across {X.shape[1]} selected features.")

    return X, y, metadata


def prepare_chronological_data(
    X: pd.DataFrame,
    y: pd.Series,
    metadata: pd.DataFrame,
    test_ratio: float = 0.20
) -> Dict[str, Any]:
    """
    Sorts all rows chronologically using metadata['batch_date'] to guarantee
    temporal causality (no future information in past splits).
    
    Splits into:
    - Train/Validation set (earliest ~80% of chronological timeline)
    - Untouched Hold-out Test set (most recent ~20% of chronological timeline)
    """
    print("\n[TRAIN] Applying chronological sort order based on metadata['batch_date']...")
    batch_dates = pd.to_datetime(metadata['batch_date'])
    sort_indices = batch_dates.argsort()

    # Apply identical sort index across all three structures simultaneously
    X_sorted = X.iloc[sort_indices].reset_index(drop=True)
    y_sorted = y.iloc[sort_indices].reset_index(drop=True)
    metadata_sorted = metadata.iloc[sort_indices].reset_index(drop=True)

    n_total = len(X_sorted)
    test_size = int(n_total * test_ratio)
    train_val_size = n_total - test_size

    X_train_val = X_sorted.iloc[:train_val_size].copy()
    y_train_val = y_sorted.iloc[:train_val_size].copy()
    meta_train_val = metadata_sorted.iloc[:train_val_size].copy()

    X_test = X_sorted.iloc[train_val_size:].copy()
    y_test = y_sorted.iloc[train_val_size:].copy()
    meta_test = metadata_sorted.iloc[train_val_size:].copy()

    print(f" -> Total records: {n_total} (Full chronological span: {metadata_sorted['batch_date'].min()} to {metadata_sorted['batch_date'].max()})")
    print(f" -> Train/Val set: {len(X_train_val)} batches ({meta_train_val['batch_date'].min()} to {meta_train_val['batch_date'].max()})")
    print(f" -> Held-out Test: {len(X_test)} batches ({meta_test['batch_date'].min()} to {meta_test['batch_date'].max()})")

    # Verify no date leakage from test into train_val
    assert meta_train_val['batch_date'].max() <= meta_test['batch_date'].min(), (
        "Temporal leakage detected: Train/Val date exceeds Test set start date."
    )

    return {
        'X_train_val': X_train_val,
        'y_train_val': y_train_val,
        'meta_train_val': meta_train_val,
        'X_test': X_test,
        'y_test': y_test,
        'meta_test': meta_test,
        'feature_names': list(X_sorted.columns)
    }


def run_time_series_cv(
    X_tv: pd.DataFrame,
    y_tv: pd.Series,
    xgb_params: Dict[str, Any],
    n_splits: int = 5
) -> Dict[str, Dict[str, List[float]]]:
    """
    Executes Time-Aware expanding-window cross-validation (TimeSeriesSplit)
    on the train/val split for:
    1. Static National 6.0% Baseline
    2. Random Forest Regressor
    3. Primary XGBoost Regressor

    Enforces fold-isolated StandardScaler via scikit-learn Pipeline.
    """
    print(f"\n[TRAIN] Running {n_splits}-fold Time-Aware Cross-Validation (TimeSeriesSplit)...")
    tscv = TimeSeriesSplit(n_splits=n_splits)

    models = {
        'Static_6.0_Baseline': None,
        'RandomForest': RandomForestRegressor(
            n_estimators=100, max_depth=6, min_samples_leaf=3, random_state=42
        ),
        'XGBoost': xgb.XGBRegressor(**xgb_params)
    }

    cv_results = {
        name: {'rmse': [], 'mae': [], 'r2': [], 'mape': []}
        for name in models
    }

    for fold, (tr_idx, val_idx) in enumerate(tscv.split(X_tv), 1):
        X_tr = X_tv.iloc[tr_idx]
        y_tr = y_tv.iloc[tr_idx].values
        X_val = X_tv.iloc[val_idx]
        y_val = y_tv.iloc[val_idx].values

        # Scaling inside fold via Pipeline to prevent test-fold snooping
        for name, model in models.items():
            if name == 'Static_6.0_Baseline':
                y_pred = np.full_like(y_val, 6.0)
            else:
                pipeline = Pipeline([
                    ('scaler', StandardScaler()),
                    ('regressor', model)
                ])
                pipeline.fit(X_tr, y_tr)
                y_pred = pipeline.predict(X_val)

            fold_rmse = float(np.sqrt(mean_squared_error(y_val, y_pred)))
            fold_mae = float(mean_absolute_error(y_val, y_pred))
            fold_r2 = float(r2_score(y_val, y_pred))
            fold_mape = float(mape_score(y_val, y_pred))

            cv_results[name]['rmse'].append(fold_rmse)
            cv_results[name]['mae'].append(fold_mae)
            cv_results[name]['r2'].append(fold_r2)
            cv_results[name]['mape'].append(fold_mape)

        print(
            f"  Fold {fold}/{n_splits} (Train={len(tr_idx)}, Val={len(val_idx)}): "
            f"XGBoost RMSE={cv_results['XGBoost']['rmse'][-1]:.4f}, "
            f"RF RMSE={cv_results['RandomForest']['rmse'][-1]:.4f}, "
            f"Static RMSE={cv_results['Static_6.0_Baseline']['rmse'][-1]:.4f}"
        )

    print("\n[TRAIN] Cross-Validation Mean Scores (across 5 temporal folds):")
    for name in models:
        mean_rmse = np.mean(cv_results[name]['rmse'])
        mean_mae = np.mean(cv_results[name]['mae'])
        mean_r2 = np.mean(cv_results[name]['r2'])
        mean_mape = np.mean(cv_results[name]['mape'])
        print(f"  {name:<22}: CV RMSE={mean_rmse:.4f}%, MAE={mean_mae:.4f}%, R²={mean_r2:.4f}, MAPE={mean_mape:.2f}%")

    return cv_results


def evaluate_final_test_set(
    X_tv: pd.DataFrame,
    y_tv: pd.Series,
    X_test: pd.DataFrame,
    y_test: pd.Series,
    xgb_params: Dict[str, Any]
) -> Tuple[Dict[str, Dict[str, float]], xgb.XGBRegressor, RandomForestRegressor]:
    """
    Fits final models on all data up to the held-out test split, evaluates once
    on the final chronological test set, and formats metrics against proposal thresholds.
    """
    print("\n[TRAIN] Fitting final models and evaluating on held-out chronological test set...")

    y_tv_arr = y_tv.values
    y_test_arr = y_test.values

    # 1. Static 6.0% Baseline
    y_pred_static = np.full_like(y_test_arr, 6.0)

    # 2. Random Forest Baseline
    rf_model = RandomForestRegressor(
        n_estimators=100, max_depth=6, min_samples_leaf=3, random_state=42
    )
    rf_model.fit(X_tv, y_tv_arr)
    y_pred_rf = rf_model.predict(X_test)

    # 3. Primary XGBoost Model
    # Fit directly on unscaled features: Tree splits are monotonic rank-invariant,
    # and unscaled features allow downstream SHAP to explain native physical units.
    xgb_model = xgb.XGBRegressor(**xgb_params)
    xgb_model.fit(X_tv, y_tv_arr)
    y_pred_xgb = xgb_model.predict(X_test)

    predictions = {
        'Static_6.0_Baseline': y_pred_static,
        'RandomForest': y_pred_rf,
        'XGBoost': y_pred_xgb
    }

    test_metrics = {}
    for name, pred in predictions.items():
        rmse = float(np.sqrt(mean_squared_error(y_test_arr, pred)))
        mae = float(mean_absolute_error(y_test_arr, pred))
        r2 = float(r2_score(y_test_arr, pred))
        mape = float(mape_score(y_test_arr, pred))

        test_metrics[name] = {
            'rmse': rmse,
            'mae': mae,
            'r2': r2,
            'mape': mape
        }

    return test_metrics, xgb_model, rf_model


def benchmark_inference_latency(
    model: xgb.XGBRegressor,
    sample_row: pd.DataFrame,
    n_runs: int = 100
) -> Dict[str, float]:
    """
    Measures single-row predict latency over n_runs independent iterations.
    Checks against the < 2.0 seconds requirement.
    """
    print(f"\n[TRAIN] Benchmarking single-row inference latency ({n_runs} individual predict calls)...")
    latencies_ms = []

    # Warmup
    for _ in range(5):
        _ = model.predict(sample_row)

    # Timing loop
    for _ in range(n_runs):
        t0 = time.perf_counter()
        _ = model.predict(sample_row)
        t1 = time.perf_counter()
        latencies_ms.append((t1 - t0) * 1000.0)

    mean_ms = float(np.mean(latencies_ms))
    p95_ms = float(np.percentile(latencies_ms, 95))
    max_ms = float(np.max(latencies_ms))

    print(f" -> Latency: Mean = {mean_ms:.3f} ms, P95 = {p95_ms:.3f} ms, Max = {max_ms:.3f} ms")
    print(f" -> Threshold check (< 2000 ms): {'PASS' if (p95_ms < THRESHOLDS['latency_s']*1000) else 'FAIL'}")

    return {
        'mean_ms': mean_ms,
        'p95_ms': p95_ms,
        'max_ms': max_ms,
        'threshold_ms': THRESHOLDS['latency_s'] * 1000.0,
        'pass': bool(p95_ms < THRESHOLDS['latency_s'] * 1000.0)
    }


def save_artifacts(
    xgb_model: xgb.XGBRegressor,
    feature_names: List[str],
    xgb_params: Dict[str, Any],
    test_metrics: Dict[str, Dict[str, float]],
    latency_results: Dict[str, Any],
    meta_info: Dict[str, Any]
) -> Tuple[str, str, str]:
    """
    Persists:
    1. m2_refuse_tea_xgb_v1.joblib
    2. m2_refuse_tea_xgb_v1_metadata.json
    3. model_comparison_metrics.csv
    """
    # 1. Joblib Model
    model_path = os.path.join(TRAINED_MODELS_DIR, 'm2_refuse_tea_xgb_v1.joblib')
    joblib.dump(xgb_model, model_path)
    print(f"[TRAIN] Saved fitted XGBoost model: {model_path} ({os.path.getsize(model_path):,} bytes)")

    # 2. Sibling Metadata JSON
    meta_json_path = os.path.join(TRAINED_MODELS_DIR, 'm2_refuse_tea_xgb_v1_metadata.json')
    xgb_test = test_metrics['XGBoost']

    metadata_payload = {
        'model_name': 'm2_refuse_tea_xgb_v1',
        'model_class': 'xgboost.XGBRegressor',
        'training_date_utc': datetime.now(timezone.utc).isoformat(),
        'dataset': {
            'total_samples': meta_info['n_total'],
            'train_val_samples': meta_info['n_train_val'],
            'test_samples': meta_info['n_test'],
            'test_date_range': [meta_info['test_start_date'], meta_info['test_end_date']],
            'validation_strategy': 'TimeSeriesSplit (n_splits=5) + Chronological 20% Holdout'
        },
        'feature_list': feature_names,
        'num_features': len(feature_names),
        'hyperparameters': xgb_params,
        'final_test_metrics': {
            'rmse': xgb_test['rmse'],
            'mae': xgb_test['mae'],
            'r2': xgb_test['r2'],
            'mape': xgb_test['mape']
        },
        'threshold_evaluations': {
            'rmse_lt_1_0': {'target': '< 1.0%', 'observed': f"{xgb_test['rmse']:.4f}%", 'pass': bool(xgb_test['rmse'] < THRESHOLDS['rmse'])},
            'mae_lt_0_75': {'target': '< 0.75%', 'observed': f"{xgb_test['mae']:.4f}%", 'pass': bool(xgb_test['mae'] < THRESHOLDS['mae'])},
            'r2_gt_0_85':  {'target': '> 0.85',  'observed': f"{xgb_test['r2']:.4f}",   'pass': bool(xgb_test['r2'] > THRESHOLDS['r2'])},
            'mape_lt_8_0': {'target': '< 8.0%',  'observed': f"{xgb_test['mape']:.2f}%", 'pass': bool(xgb_test['mape'] < THRESHOLDS['mape'])},
            'latency_lt_2_0s': {'target': '< 2.0s', 'observed': f"{latency_results['p95_ms']:.3f}ms", 'pass': latency_results['pass']}
        },
        'inference_latency_ms': latency_results,
        'notes': (
            'Trained on native unscaled feature values: Decision tree splits are scale-invariant, '
            'allowing SHAP analysis in evaluate.py to operate directly on native physical units.'
        )
    }

    with open(meta_json_path, 'w', encoding='utf-8') as f:
        json.dump(metadata_payload, f, indent=2)
    print(f"[TRAIN] Saved model metadata JSON: {meta_json_path}")

    # 3. Model Comparison Metrics CSV
    comparison_rows = []
    for model_name, m in test_metrics.items():
        rmse_pass = 'PASS' if m['rmse'] < THRESHOLDS['rmse'] else 'FAIL'
        mae_pass = 'PASS' if m['mae'] < THRESHOLDS['mae'] else 'FAIL'
        r2_pass = 'PASS' if m['r2'] > THRESHOLDS['r2'] else 'FAIL'
        mape_pass = 'PASS' if m['mape'] < THRESHOLDS['mape'] else 'FAIL'

        comparison_rows.append({
            'model': model_name,
            'rmse': round(m['rmse'], 4),
            'rmse_target (<1.0%)': rmse_pass,
            'mae': round(m['mae'], 4),
            'mae_target (<0.75%)': mae_pass,
            'r2': round(m['r2'], 4),
            'r2_target (>0.85)': r2_pass,
            'mape': round(m['mape'], 2),
            'mape_target (<8.0%)': mape_pass
        })

    comp_df = pd.DataFrame(comparison_rows)
    metrics_csv_path = os.path.join(DATASET_PROCESSED_DIR, 'model_comparison_metrics.csv')
    comp_df.to_csv(metrics_csv_path, index=False)
    print(f"[TRAIN] Saved model comparison metrics table: {metrics_csv_path}")

    return model_path, meta_json_path, metrics_csv_path


def train_model() -> Dict[str, Any]:
    """
    Main orchestration entry point for train.py.
    """
    print("\n" + "="*80)
    print("M2 REFUSE-TEA MODEL TRAINING & BENCHMARK PIPELINE")
    print("="*80)

    # 1. Load Data
    X, y, metadata = load_processed_data()

    # 2. Chronological Split
    split_data = prepare_chronological_data(X, y, metadata, test_ratio=0.20)
    X_tv = split_data['X_train_val']
    y_tv = split_data['y_train_val']
    X_test = split_data['X_test']
    y_test = split_data['y_test']
    feature_names = split_data['feature_names']

    # 3. Selected Hyperparameters for XGBoost
    # Focused parameter choices based on dataset properties (n=496, 19 features):
    # - max_depth=2: Shallow trees prevent high-variance overfitting.
    # - learning_rate=0.05: Conservative shrinkage to stabilize boosting progression.
    # - n_estimators=100: Ample boosting rounds with early plateau.
    # - subsample=0.8, colsample_bytree=0.8: Stochastic row & feature bagging.
    # - reg_lambda=2.0: L2 leaf weight penalty to restrain outlier sensitivity.
    xgb_params = {
        'max_depth': 2,
        'learning_rate': 0.05,
        'n_estimators': 100,
        'subsample': 0.8,
        'colsample_bytree': 0.8,
        'reg_lambda': 2.0,
        'random_state': 42,
        'n_jobs': -1
    }

    # 4. Cross-Validation
    cv_results = run_time_series_cv(X_tv, y_tv, xgb_params, n_splits=5)

    # 5. Final Evaluation on Held-out Test Set
    test_metrics, xgb_model, rf_model = evaluate_final_test_set(
        X_tv, y_tv, X_test, y_test, xgb_params
    )

    # 6. Latency Benchmark
    single_sample = X_test.iloc[0:1]
    latency_results = benchmark_inference_latency(xgb_model, single_sample, n_runs=100)

    # 7. Save Artifacts
    meta_info = {
        'n_total': len(X),
        'n_train_val': len(X_tv),
        'n_test': len(X_test),
        'test_start_date': split_data['meta_test']['batch_date'].min(),
        'test_end_date': split_data['meta_test']['batch_date'].max()
    }
    model_p, json_p, csv_p = save_artifacts(
        xgb_model, feature_names, xgb_params, test_metrics, latency_results, meta_info
    )

    # 8. Print Executive Summary Table
    print("\n" + "="*80)
    print("FINAL MODEL BENCHMARK RESULTS (Held-Out Chronological Test Set, N=124)")
    print("="*80)
    print(f"{'Model':<22} | {'RMSE':<9} | {'MAE':<9} | {'R²':<8} | {'MAPE':<8} | {'Status'}")
    print("-" * 80)
    for name, m in test_metrics.items():
        rmse_str = f"{m['rmse']:.3f}%"
        mae_str = f"{m['mae']:.3f}%"
        r2_str = f"{m['r2']:.3f}"
        mape_str = f"{m['mape']:.2f}%"

        # Check all 4 thresholds
        p_count = sum([
            m['rmse'] < THRESHOLDS['rmse'],
            m['mae'] < THRESHOLDS['mae'],
            m['r2'] > THRESHOLDS['r2'],
            m['mape'] < THRESHOLDS['mape']
        ])
        status = "ALL PASS" if p_count == 4 else f"{p_count}/4 PASS"
        print(f"{name:<22} | {rmse_str:<9} | {mae_str:<9} | {r2_str:<8} | {mape_str:<8} | {status}")

    print("\nTarget Metric Threshold Verification (Proposal Table 3):")
    xgb_m = test_metrics['XGBoost']
    print(f"  • RMSE:  {xgb_m['rmse']:.4f}% vs < 1.000%  -> {'PASS' if xgb_m['rmse'] < THRESHOLDS['rmse'] else 'FAIL'}")
    print(f"  • MAE:   {xgb_m['mae']:.4f}% vs < 0.750%  -> {'PASS' if xgb_m['mae'] < THRESHOLDS['mae'] else 'FAIL'}")
    print(f"  • R²:    {xgb_m['r2']:.4f}  vs > 0.850   -> {'PASS' if xgb_m['r2'] > THRESHOLDS['r2'] else 'FAIL'}")
    print(f"  • MAPE:  {xgb_m['mape']:.2f}%  vs < 8.00%   -> {'PASS' if xgb_m['mape'] < THRESHOLDS['mape'] else 'FAIL'}")
    print(f"  • Latency (P95): {latency_results['p95_ms']:.3f} ms vs < 2,000 ms -> {'PASS' if latency_results['pass'] else 'FAIL'}")
    print("="*80 + "\n")

    return {
        'model': xgb_model,
        'rf_model': rf_model,
        'test_metrics': test_metrics,
        'latency': latency_results,
        'paths': {
            'model': model_p,
            'metadata': json_p,
            'metrics_csv': csv_p
        }
    }


if __name__ == '__main__':
    train_model()
