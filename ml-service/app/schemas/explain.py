"""
Pydantic Schemas for Explainability & Root-Cause Mitigation Endpoint
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from app.schemas.predict import BatchOperationalData


class ExplainRequest(BatchOperationalData):
    """Explainability request schema (identical to PredictRequest)."""
    pass


class FeatureAttribution(BaseModel):
    """SHAP attribution for a single feature."""
    feature: str = Field(..., description="Feature column name.")
    feature_value: float = Field(..., description="Observed feature value.")
    shap_value_pp: float = Field(..., description="SHAP attribution impact in percentage points (pp).")
    contribution: str = Field(..., description="'INCREASES_REFUSE' or 'DECREASES_REFUSE'.")


class MitigationAdvice(BaseModel):
    """Rule-based operational recommendation for a primary refuse driver."""
    feature: str = Field(..., description="Target operational lever or environmental driver.")
    feature_value: float = Field(..., description="Observed feature value.")
    shap_value_pp: float = Field(..., description="Adverse SHAP impact in percentage points (pp).")
    severity: str = Field(..., description="Severity tier ('HIGH', 'MEDIUM', 'LOW').")
    category: str = Field(..., description="Operational category (e.g. 'Mechanical / Maintenance').")
    recommendation: str = Field(..., description="Actionable guideline for factory floor operators.")


class ExplainResponse(BaseModel):
    """Explainability response schema."""
    success: bool = True
    predicted_refuse_tea_pct: float = Field(..., description="Predicted refuse tea percentage.")
    base_value_pct: float = Field(..., description="SHAP expected baseline value across training set.")
    top_features: List[FeatureAttribution] = Field(..., description="Top 5 features ranked by |SHAP| impact.")
    mitigations: List[MitigationAdvice] = Field(..., description="Auto-generated rule-based mitigation recommendations.")
    latency_ms: float = Field(..., description="End-to-end processing latency in milliseconds.")
    used_fallback_rolling_features: bool = Field(..., description="Indicates if rolling weather fallback was used.")
