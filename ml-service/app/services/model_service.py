"""
M2 Component: Refuse-Tea Prediction & System Integration
Model Service Singleton (model_service.py)

Manages in-memory lifecycle of:
1. Persisted XGBoost Model (m2_refuse_tea_xgb_v1.joblib)
2. Model Metadata JSON (m2_refuse_tea_xgb_v1_metadata.json)
3. SHAP TreeExplainer instance (pre-computed once at startup)
4. Domain logic modules (mitigation templates, economic calculator, what-if simulator)
"""

import os
import sys
import json
import joblib
from typing import Dict, Any, Optional

import shap

# Ensure training module is discoverable on python path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))               # app/services
APP_DIR = os.path.abspath(os.path.join(CURRENT_DIR, '..'))            # app
ML_SERVICE_DIR = os.path.abspath(os.path.join(APP_DIR, '..'))         # ml-service
TRAINING_DIR = os.path.join(ML_SERVICE_DIR, 'training')
TRAINED_MODELS_DIR = os.path.join(ML_SERVICE_DIR, 'trained_models')

if TRAINING_DIR not in sys.path:
    sys.path.insert(0, TRAINING_DIR)

# Import validated domain modules from training/
from explain.mitigation_templates import generate_batch_mitigations, MITIGATION_RULES
from economic_impact.economic_calculator import (
    calculate_economic_impact,
    DEFAULT_GRADE_PRICES,
    DEFAULT_YIELD_RATIO,
)
from whatif_simulator.whatif_engine import (
    simulate_whatif,
    simulate_whatif_with_economics,
    CONTROLLABLE_LEVERS,
    SAFE_OPERATING_RANGES,
    MANDATORY_DISCLAIMER,
)


class ModelService:
    """Singleton service maintaining cached ML model and explanation engines."""
    _instance: Optional["ModelService"] = None

    def __init__(self):
        self.model: Any = None
        self.metadata: Dict[str, Any] = {}
        self.explainer: Optional[shap.TreeExplainer] = None
        self.is_loaded: bool = False

    @classmethod
    def get_instance(cls) -> "ModelService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_artifacts(self) -> None:
        """Loads trained XGBoost model, metadata, and initializes TreeExplainer."""
        if self.is_loaded:
            return

        model_path = os.path.join(TRAINED_MODELS_DIR, "m2_refuse_tea_xgb_v1.joblib")
        meta_path = os.path.join(TRAINED_MODELS_DIR, "m2_refuse_tea_xgb_v1_metadata.json")

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model artifact not found: {model_path}")
        if not os.path.exists(meta_path):
            raise FileNotFoundError(f"Model metadata not found: {meta_path}")

        print(f"[MODEL_SERVICE] Loading XGBoost model from: {model_path}")
        self.model = joblib.load(model_path)

        with open(meta_path, "r", encoding="utf-8") as f:
            self.metadata = json.load(f)

        print("[MODEL_SERVICE] Initializing SHAP TreeExplainer...")
        self.explainer = shap.TreeExplainer(self.model)

        self.is_loaded = True
        print(f"[MODEL_SERVICE] Startup complete: Model '{self.metadata.get('model_name')}' ready.")


# Helper accessor
def get_model_service() -> ModelService:
    service = ModelService.get_instance()
    if not service.is_loaded:
        service.load_artifacts()
    return service
