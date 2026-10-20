"""
Pydantic Schemas for What-If Counterfactual Simulator Endpoint
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from app.schemas.predict import BatchOperationalData


class WhatIfRequest(BatchOperationalData):
    """
    Request body for counterfactual what-if simulation:
    Provides the baseline operational batch parameters, plus an overrides dictionary
    restricted exclusively to the 4 controllable levers:
      - withering_duration_hrs
      - dryer_temperature_c
      - machine_downtime_hrs
      - plucking_fine_leaf_pct
    """
    overrides: Dict[str, float] = Field(
        ...,
        description=(
            "Proposed operational lever modifications. Restricted strictly to: "
            "'withering_duration_hrs', 'dryer_temperature_c', 'machine_downtime_hrs', "
            "'plucking_fine_leaf_pct'. All other features remain fixed at baseline."
        ),
        examples=[{"machine_downtime_hrs": 0.10}]
    )
    refuse_resale_status: Optional[str] = Field(
        "DISCARDED",
        description="Refuse resale disposition ('DISCARDED' or 'SOLD_DISCOUNTED_GRADE') for LKR conversion."
    )
    total_dry_tea_kg: Optional[float] = Field(
        None,
        description="Optional actual dry tea mass (kg) for backtest mode economic translation."
    )


class WhatIfEconomicSummary(BaseModel):
    """Monetary translation of counterfactual physical refuse change."""
    base_revenue_loss_lkr: float = Field(..., description="Baseline estimated revenue loss (LKR).")
    simulated_revenue_loss_lkr: float = Field(..., description="Simulated counterfactual revenue loss (LKR).")
    simulated_savings_lkr: float = Field(..., description="Monetary savings in LKR (base - simulated).")
    savings_pct_of_loss: float = Field(..., description="Percentage reduction in revenue loss.")


class WhatIfResponse(BaseModel):
    """Response body for counterfactual what-if simulation."""
    success: bool = True
    baseline_predicted_refuse_pct: float = Field(..., description="Baseline model prediction (%).")
    simulated_predicted_refuse_pct: float = Field(..., description="Counterfactual model prediction (%).")
    delta_refuse_pct: float = Field(..., description="Physical refuse change (pp, simulated - baseline).")
    direction: str = Field(..., description="'IMPROVEMENT', 'REGRESSION', or 'UNCHANGED'.")
    overrides_applied: Dict[str, float] = Field(..., description="Operational overrides evaluated.")
    derived_features_updated: Dict[str, Any] = Field(..., description="Recomputed derived features.")
    out_of_distribution_warning: bool = Field(..., description="Flag indicating extrapolation risk beyond training support.")
    out_of_distribution_details: List[str] = Field(..., description="Specific boundary warning messages.")
    economic_impact: Optional[WhatIfEconomicSummary] = Field(None, description="Monetary savings/loss analysis.")
    disclaimer: str = Field(..., description="Mandatory regulatory and decision-support disclaimer.")
    latency_ms: float = Field(..., description="End-to-end simulation latency in milliseconds.")
    used_fallback_rolling_features: bool = Field(..., description="Whether rolling weather fallback was used.")
