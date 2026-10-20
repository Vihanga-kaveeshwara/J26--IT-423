from app.api.predict import router as predict_router
from app.api.explain import router as explain_router
from app.api.economic import router as economic_router
from app.api.whatif import router as whatif_router

__all__ = [
    "predict_router",
    "explain_router",
    "economic_router",
    "whatif_router",
]
