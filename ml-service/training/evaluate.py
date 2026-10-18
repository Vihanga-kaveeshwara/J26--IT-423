"""Model evaluation scaffold.

Future implementation locations:
- Load a versioned trained model.
- Evaluate predictions against the held-out test set.
- Report and persist evaluation metrics.
"""

from typing import Any, Dict, Optional
import numpy as np
from sklearn.metrics import (
    r2_score,
    mean_absolute_error,
    mean_squared_error,
    mean_absolute_percentage_error,
    explained_variance_score,
)


def compute_regression_metrics(y_true, y_pred) -> Dict[str, float]:
    """Computes standard academic and industry regression performance metrics."""
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)

    # Avoid div by zero
    non_zero_mask = y_true != 0
    mape = (
        float(np.mean(np.abs((y_true[non_zero_mask] - y_pred[non_zero_mask]) / y_true[non_zero_mask])) * 100.0)
        if np.any(non_zero_mask)
        else 0.0
    )

    mse = float(mean_squared_error(y_true, y_pred))
    rmse = float(np.sqrt(mse))
    mae = float(mean_absolute_error(y_true, y_pred))
    r2 = float(r2_score(y_true, y_pred))
    ev = float(explained_variance_score(y_true, y_pred))

    return {
        "r2_score": round(r2, 4),
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "mape_pct": round(mape, 2),
        "explained_variance": round(ev, 4),
        "sample_count": int(len(y_true)),
    }


def evaluate_model(model: Any = None, X_test: Any = None, y_test: Any = None) -> Dict[str, Any]:
    """Evaluates a fitted scikit-learn model or pipeline on a test set."""
    if model is None or X_test is None or y_test is None:
        return {
            "status": "UNTESTED",
            "message": "Model or test split not provided for evaluation",
            "metrics": {
                "r2_score": 0.0,
                "mae": 0.0,
                "rmse": 0.0,
                "mape_pct": 0.0,
            },
        }

    y_pred = model.predict(X_test)
    metrics = compute_regression_metrics(y_test, y_pred)

    return {
        "status": "EVALUATED",
        "metrics": metrics,
        "sample_predictions": [
            {
                "actual": round(float(act), 2),
                "predicted": round(float(pred), 2),
                "error": round(float(pred - act), 2),
            }
            for act, pred in list(zip(y_test, y_pred))[:10]
        ],
    }
