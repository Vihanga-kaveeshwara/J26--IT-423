"""
Explainability & Root-Cause Analysis API Route
"""

import time
import pandas as pd
from fastapi import APIRouter, Depends

from app.schemas.explain import ExplainRequest, ExplainResponse, FeatureAttribution, MitigationAdvice
from app.feature_engineering import build_feature_vector, EXPECTED_FEATURE_COLUMNS
from app.services.model_service import ModelService, get_model_service
from explain.mitigation_templates import generate_batch_mitigations

router = APIRouter(tags=["Explainability"])


@router.post(
    "/explain",
    response_model=ExplainResponse,
    summary="Explain Prediction & Generate Root-Cause Mitigations",
    description=(
        "Computes local SHAP attributions using TreeExplainer for the input batch, "
        "identifies the top 5 influential features by magnitude, and auto-generates "
        "SLTB-compliant operational mitigation advice for top refuse-increasing drivers."
    )
)
def explain_refuse_tea(
    request: ExplainRequest,
    service: ModelService = Depends(get_model_service)
) -> ExplainResponse:
    t0 = time.perf_counter()

    # 1. Shared Feature Engineering
    raw_dict = request.model_dump()
    feature_vector, used_fallback = build_feature_vector(raw_dict)

    df_input = pd.DataFrame(
        [[feature_vector[col] for col in EXPECTED_FEATURE_COLUMNS]],
        columns=EXPECTED_FEATURE_COLUMNS
    )

    # 2. Prediction and SHAP calculation
    pred = float(service.model.predict(df_input)[0])
    shap_vals = service.explainer.shap_values(df_input)[0]  # shape: (19,)
    base_val = float(service.explainer.expected_value)

    # 3. Create mapping of feature -> shap
    shap_dict = {col: float(shap_vals[idx]) for idx, col in enumerate(EXPECTED_FEATURE_COLUMNS)}

    # 4. Extract Top-5 features by absolute SHAP impact
    sorted_features = sorted(
        shap_dict.items(),
        key=lambda item: abs(item[1]),
        reverse=True
    )[:5]

    top_features_list = []
    for col, s_val in sorted_features:
        contrib = "INCREASES_REFUSE" if s_val > 0 else "DECREASES_REFUSE"
        top_features_list.append(
            FeatureAttribution(
                feature=col,
                feature_value=round(float(feature_vector[col]), 4),
                shap_value_pp=round(float(s_val), 4),
                contribution=contrib
            )
        )

    # 5. Generate rule-based mitigations for top positive (refuse-increasing) drivers
    raw_context = {
        "withering_duration_hrs": request.withering_duration_hrs,
        "dryer_temperature_c": request.dryer_temperature_c,
        "machine_downtime_hrs": request.machine_downtime_hrs,
    }
    mitigation_dicts = generate_batch_mitigations(
        row_features=feature_vector,
        row_shap_values=shap_dict,
        top_n=2,
        min_shap_threshold=0.03,
        context=raw_context
    )

    mitigations_list = [
        MitigationAdvice(
            feature=m["feature"],
            feature_value=m["feature_value"],
            shap_value_pp=m["shap_value_pp"],
            severity=m["severity"],
            category=m["category"],
            recommendation=m["recommendation"]
        )
        for m in mitigation_dicts
    ]

    latency_ms = round((time.perf_counter() - t0) * 1000.0, 3)

    return ExplainResponse(
        success=True,
        predicted_refuse_tea_pct=round(pred, 4),
        base_value_pct=round(base_val, 4),
        top_features=top_features_list,
        mitigations=mitigations_list,
        latency_ms=latency_ms,
        used_fallback_rolling_features=used_fallback
    )
