"""
M2 Component: Refuse-Tea Prediction & System Integration
M1 Component: Tea Export Demand Forecasting
FastAPI Serving Layer (main.py)
"""

import logging
import os
from contextlib import asynccontextmanager
from typing import Dict, Any, List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logger = logging.getLogger("uvicorn.error")

try:
    from app.services.model_service import get_model_service
    from app.api.predict import router as predict_router
    from app.api.explain import router as explain_router
    from app.api.economic import router as economic_router
    from app.api.whatif import router as whatif_router
    HAS_M2 = True
except ImportError as exc:
    HAS_M2 = False
    logger.warning("M2 Refuse-Tea modules not available on this branch: %s", exc)

from app.routers.m1_demand import router as m1_demand_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan event handler: Loads model, metadata, and TreeExplainer once
    at application startup to eliminate per-request overhead.
    """
    if HAS_M2:
        print("[FASTAPI LIFESPAN] Initializing M2 Serving Layer...")
        service = get_model_service()
        service.load_artifacts()
        print("[FASTAPI LIFESPAN] Model and explanation engines loaded and ready.")
    yield
    if HAS_M2:
        print("[FASTAPI LIFESPAN] Shutting down M2 Serving Layer.")


app = FastAPI(
    title="Tea DSS ML Service (M1 Demand & M2 Refuse Tea)",
    description=(
        "FastAPI Serving Layer for the Sri Lankan Tea Export Decision Support System. "
        "Exposes M1 export demand forecasting and M2 refuse tea prediction & decision support."
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
    description="Returns the serving health status and metadata for the loaded models."
)
def health_check() -> Dict[str, Any]:
    if HAS_M2:
        service = get_model_service()
        meta = service.metadata
        return {
            "status": "healthy",
            "service": "m2_refuse_tea_prediction",
            "m1_loaded": True,
            "m2_loaded": True,
            "model_name": meta.get("model_name", "unknown"),
            "model_class": meta.get("model_class", "unknown"),
            "training_date_utc": meta.get("training_date_utc", "unknown"),
            "features_count": meta.get("num_features", 19),
            "test_rmse_pp": meta.get("final_test_metrics", {}).get("rmse", 1.4539),
            "test_mae_pp": meta.get("final_test_metrics", {}).get("mae", 1.0594),
            "test_r2": meta.get("final_test_metrics", {}).get("r2", 0.2047),
        }
    return {
        "status": "healthy",
        "service": "m1_tea_export_demand_forecasting",
        "m1_model_name": "m1_demand_forecast_v1",
        "m1_loaded": True,
        "m2_loaded": False,
        "version": "1.0.0",
    }


@app.get(
    "/api/ml/health",
    tags=["System"],
    summary="Backend Integration Health Check",
    description="Maintains backward compatibility with MERN backend mlService client."
)
def backend_compat_health() -> Dict[str, Any]:
    return {
        "success": True,
        "status": "healthy",
        "message": "ML service is running",
        "m1_loaded": True,
        "m2_loaded": HAS_M2,
        "model_name": "m1_demand_forecast_v1" if not HAS_M2 else "m2_refuse_tea_xgb_v1",
    }


# -----------------------------------------------------------------------------
# Register Routers (Both canonical root paths and /api/ml/ prefixed aliases)
# -----------------------------------------------------------------------------
if HAS_M2:
    for prefix in ["", "/api/ml"]:
        app.include_router(predict_router, prefix=prefix)
        app.include_router(explain_router, prefix=prefix)
        app.include_router(economic_router, prefix=prefix)
        app.include_router(whatif_router, prefix=prefix)

# Include M1 Demand Forecasting Router (mounted at /api/ml)
app.include_router(m1_demand_router)
