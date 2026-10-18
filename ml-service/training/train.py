"""Model training scaffold.

Future implementation locations:
- Create a reproducible train/test split.
- Train the selected model.
- Save the trained model and preprocessing artifacts.
- Apply model versioning.
"""

import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline

from .preprocessing import prepare_demand_dataset, prepare_logistics_dataset
from .evaluate import evaluate_model

TRAINED_MODELS_DIR = Path(__file__).resolve().parents[1] / "trained_models"


def train_demand_forecasting_model() -> Dict[str, Any]:
    """Trains the M1 Tea Export Demand Forecasting Model (Random Forest)."""
    TRAINED_MODELS_DIR.mkdir(parents=True, exist_ok=True)
    start_time = time.time()

    data = prepare_demand_dataset()
    pipeline = Pipeline(
        steps=[
            ("preprocessor", data["preprocessor"]),
            (
                "regressor",
                RandomForestRegressor(
                    n_estimators=100,
                    max_depth=12,
                    min_samples_split=2,
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ]
    )

    pipeline.fit(data["X_train"], data["y_train"])
    eval_result = evaluate_model(pipeline, data["X_test"], data["y_test"])
    train_eval = evaluate_model(pipeline, data["X_train"], data["y_train"])

    elapsed = round(time.time() - start_time, 3)

    model_path = TRAINED_MODELS_DIR / "m1_demand_model.joblib"
    joblib.dump(pipeline, model_path)

    metadata = {
        "model_id": "M1-DEMAND-RF-v1.0",
        "model_name": "Ceylon Tea Export Demand Forecasting Engine",
        "algorithm": "RandomForestRegressor",
        "n_estimators": 100,
        "features": data["feature_names"],
        "dataset_shape": list(data["dataset_shape"]),
        "test_metrics": eval_result["metrics"],
        "train_metrics": train_eval["metrics"],
        "training_time_seconds": elapsed,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "model_artifact": str(model_path.name),
        "status": "TRAINED_PRODUCTION",
    }

    return metadata


def train_logistics_cost_model() -> Dict[str, Any]:
    """Trains the M2 Maritime Logistics Freight Cost & Risk Model."""
    TRAINED_MODELS_DIR.mkdir(parents=True, exist_ok=True)
    start_time = time.time()

    data = prepare_logistics_dataset()
    pipeline = Pipeline(
        steps=[
            ("preprocessor", data["preprocessor"]),
            (
                "regressor",
                RandomForestRegressor(
                    n_estimators=50,
                    max_depth=8,
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ]
    )

    pipeline.fit(data["X_train"], data["y_train"])
    eval_result = evaluate_model(pipeline, data["X_test"], data["y_test"])
    elapsed = round(time.time() - start_time, 3)

    model_path = TRAINED_MODELS_DIR / "m2_logistics_model.joblib"
    joblib.dump(pipeline, model_path)

    metadata = {
        "model_id": "M2-LOGISTICS-RF-v1.0",
        "model_name": "Maritime Freight Rate & Risk Prediction Model",
        "algorithm": "RandomForestRegressor",
        "n_estimators": 50,
        "features": data["feature_names"],
        "dataset_shape": list(data["dataset_shape"]),
        "test_metrics": eval_result["metrics"],
        "training_time_seconds": elapsed,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "model_artifact": str(model_path.name),
        "status": "TRAINED_PRODUCTION",
    }

    return metadata


def train_model() -> Dict[str, Any]:
    """Primary entry point implementing training for all Ceylon Intelligence ML models."""
    start_total = time.time()

    m1_meta = train_demand_forecasting_model()
    m2_meta = train_logistics_cost_model()

    overall_meta = {
        "success": True,
        "message": "Models trained successfully and serialized to disk",
        "models": {
            "M1_demand": m1_meta,
            "M2_logistics": m2_meta,
        },
        "total_elapsed_seconds": round(time.time() - start_total, 3),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    meta_file = TRAINED_MODELS_DIR / "model_metadata.json"
    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(overall_meta, f, indent=2)

    return overall_meta
