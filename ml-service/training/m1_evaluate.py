"""Evaluation verification script for M1 Demand Forecast Champion Model.

Reproduces the pooled backtest metrics for the champion (combo_mean_xgb)
from backtest_predictions.csv and verifies they match the saved metadata
within a 1e-6 tolerance.
"""

from __future__ import annotations

import json
from pathlib import Path
import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
METADATA_PATH = BASE_DIR.parent / "trained_models" / "m1_demand_forecast_v1_metadata.json"
PREDICTIONS_PATH = BASE_DIR / "reports" / "backtest_cleaned_v2" / "backtest_predictions.csv"


def evaluate_model() -> dict[str, float]:
    """Reproduce pooled backtest metrics and verify against saved metadata."""
    if not METADATA_PATH.exists():
        raise FileNotFoundError(f"Metadata file not found at {METADATA_PATH}")
    if not PREDICTIONS_PATH.exists():
        raise FileNotFoundError(f"Predictions file not found at {PREDICTIONS_PATH}")

    with open(METADATA_PATH, "r", encoding="utf-8") as f:
        metadata = json.load(f)

    meta_metrics = metadata["backtest_metrics"]
    
    # Load 152 backtest predictions
    df = pd.read_csv(PREDICTIONS_PATH)
    if "actual" not in df.columns or "combo_mean_xgb" not in df.columns:
        raise KeyError("Required columns 'actual' or 'combo_mean_xgb' missing from predictions file")

    actual = df["actual"].to_numpy(float)
    predicted = df["combo_mean_xgb"].to_numpy(float)

    mask = np.isfinite(actual) & np.isfinite(predicted)
    y = actual[mask]
    p = predicted[mask]
    n = len(y)

    error = p - y
    ae = np.abs(error)
    nonzero = y != 0

    reproduced_metrics = {
        "n_origins": n,
        "mae": float(np.mean(ae)),
        "rmse": float(np.sqrt(np.mean(error**2))),
        "mape_pct": float(np.mean(ae[nonzero] / y[nonzero]) * 100),
        "bias_mn_kg": float(np.mean(error)),
    }

    # Verify each metric against metadata within 1e-6 tolerance
    tolerances = {
        "mae": 1e-6,
        "rmse": 1e-6,
        "mape_pct": 1e-6,
        "bias_mn_kg": 1e-6,
    }

    for metric_name, tol in tolerances.items():
        expected = float(meta_metrics[metric_name])
        actual_val = reproduced_metrics[metric_name]
        diff = abs(actual_val - expected)
        if diff > tol:
            raise AssertionError(
                f"Metric '{metric_name}' mismatch: reproduced {actual_val:.10f} vs "
                f"metadata {expected:.10f} (diff {diff:.2e} > tol {tol:.2e})"
            )

    print("=== M1 EVALUATION VERIFICATION PASSED ===")
    print(f"Origins evaluated: {n}")
    print(f"MAE:  {reproduced_metrics['mae']:.6f} mn kg (expected: {meta_metrics['mae']:.6f})")
    print(f"RMSE: {reproduced_metrics['rmse']:.6f} mn kg (expected: {meta_metrics['rmse']:.6f})")
    print(f"MAPE: {reproduced_metrics['mape_pct']:.4f}% (expected: {meta_metrics['mape_pct']:.4f}%)")
    print(f"Bias: {reproduced_metrics['bias_mn_kg']:+.6f} mn kg (expected: {meta_metrics['bias_mn_kg']:+.6f})")
    print("All reproduced metrics match metadata within 1e-6 tolerance.")

    return reproduced_metrics


if __name__ == "__main__":
    evaluate_model()
