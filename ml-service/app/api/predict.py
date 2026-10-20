"""
Refuse Tea Prediction API Route
"""

import time
import pandas as pd
from fastapi import APIRouter, Depends

from app.schemas.predict import PredictRequest, PredictResponse
from app.feature_engineering import build_feature_vector, EXPECTED_FEATURE_COLUMNS
from app.services.model_service import ModelService, get_model_service

router = APIRouter(tags=["Prediction"])


@router.post(
    "/predict",
    response_model=PredictResponse,
    summary="Predict Refuse Tea Percentage",
    description=(
        "Transforms raw operational batch fields into the canonical 19-column feature vector "
        "and executes forward inference using the trained XGBoost model. If trailing rolling weather "
        "averages are omitted, the historical dataset mean is applied and flagged in the response."
    )
)
def predict_refuse_tea(
    request: PredictRequest,
    service: ModelService = Depends(get_model_service)
) -> PredictResponse:
    t0 = time.perf_counter()

    # 1. Shared Feature Engineering (Task 0 Single Source of Truth)
    raw_dict = request.model_dump()
    feature_vector, used_fallback = build_feature_vector(raw_dict)

    # 2. Convert to aligned DataFrame for model
    df_input = pd.DataFrame(
        [[feature_vector[col] for col in EXPECTED_FEATURE_COLUMNS]],
        columns=EXPECTED_FEATURE_COLUMNS
    )

    # 3. Model Prediction
    pred = float(service.model.predict(df_input)[0])

    latency_ms = round((time.perf_counter() - t0) * 1000.0, 3)

    return PredictResponse(
        success=True,
        predicted_refuse_tea_pct=round(pred, 4),
        latency_ms=latency_ms,
        used_fallback_rolling_features=used_fallback,
        feature_vector=feature_vector
    )
