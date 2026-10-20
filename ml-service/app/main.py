"""
M2 Component: Refuse-Tea Prediction & System Integration
FastAPI Serving Layer (main.py)

Exposes the trained machine learning model and decision-support engines:
- POST /predict: Refuse tea percentage regression inference
- POST /explain: Local TreeExplainer SHAP attribution & rule-based mitigations
- POST /economic-impact: Monetary (LKR) revenue-loss conversion
- POST /whatif: Constrained counterfactual simulator on 4 controllable levers
- GET /health: Health status and model version audit

All endpoints share the identical single-source-of-truth feature engineering
pipeline (app/feature_engineering.py) and reuse memory-cached model artifacts.
"""

import os
from contextlib import asynccontextmanager
from typing import Dict, Any, List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.services.model_service import get_model_service
from app.api.predict import router as predict_router
from app.api.explain import router as explain_router
from app.api.economic import router as economic_router
from app.api.whatif import router as whatif_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan event handler: Loads model, metadata, and TreeExplainer once
    at application startup to eliminate per-request overhead.
    """
    print("[FASTAPI LIFESPAN] Initializing M2 Serving Layer...")
    service = get_model_service()
    service.load_artifacts()
    print("[FASTAPI LIFESPAN] Model and explanation engines loaded and ready.")
    yield
    print("[FASTAPI LIFESPAN] Shutting down M2 Serving Layer.")


app = FastAPI(
    title="M2 Refuse Tea Prediction & DSS Service",
    description=(
        "FastAPI Serving Layer for the M2 component of the Sri Lankan Tea Export Decision Support System. "
        "Provides real-time continuous refuse_tea_pct prediction, SHAP TreeExplainer root-cause attribution, "
        "rule-based operational mitigations, auction-anchored economic impact calculation, and constrained "
        "what-if counterfactual simulation."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# -----------------------------------------------------------------------------
# CORS Middleware Configuration
# -----------------------------------------------------------------------------
# Configurable via CORS_ORIGINS environment variable. Default to allow-all for
# local development; in production, configure explicitly to the frontend origin
# (e.g., http://localhost:5173 or https://tea-dss.example.lk).
cors_env = os.getenv("CORS_ORIGINS", "*")
if cors_env.strip() == "*":
    origins = ["*"]
else:
    origins = [o.strip() for o in cors_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------------------------------------------------------
# Health Check Endpoints
# -----------------------------------------------------------------------------
@app.get(
    "/health",
    tags=["System"],
    summary="Service Health & Model Audit",
    description="Returns the serving health status and metadata for the loaded XGBoost model."
)
def health_check() -> Dict[str, Any]:
    service = get_model_service()
    meta = service.metadata
    return {
        "status": "healthy",
        "service": "m2_refuse_tea_prediction",
        "model_name": meta.get("model_name", "unknown"),
        "model_class": meta.get("model_class", "unknown"),
        "training_date_utc": meta.get("training_date_utc", "unknown"),
        "features_count": meta.get("num_features", 19),
        "test_rmse_pp": meta.get("final_test_metrics", {}).get("rmse", 1.4539),
        "test_mae_pp": meta.get("final_test_metrics", {}).get("mae", 1.0594),
        "test_r2": meta.get("final_test_metrics", {}).get("r2", 0.2047),
    }


@app.get(
    "/api/ml/health",
    tags=["System"],
    summary="Backend Integration Health Check",
    description="Maintains backward compatibility with MERN backend mlService client."
)
def backend_compat_health() -> Dict[str, Any]:
    service = get_model_service()
    return {
        "success": True,
        "status": "healthy",
        "message": "ML service is running",
        "model_name": service.metadata.get("model_name", "m2_refuse_tea_xgb_v1")
    }


# -----------------------------------------------------------------------------
# Register Routers (Both canonical root paths and /api/ml/ prefixed aliases)
# -----------------------------------------------------------------------------
for prefix in ["", "/api/ml"]:
    app.include_router(predict_router, prefix=prefix)
    app.include_router(explain_router, prefix=prefix)
    app.include_router(economic_router, prefix=prefix)
    app.include_router(whatif_router, prefix=prefix)
