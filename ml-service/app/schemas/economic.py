"""
Pydantic Schemas for Economic Impact Calculator Endpoint
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class EconomicImpactRequest(BaseModel):
    """Request body for monetary revenue-loss calculation."""
    green_leaf_input_kg: float = Field(
        ...,
        gt=0.0,
        description="Total wet green leaf mass received at withering troughs (kg).",
        examples=[9316.0]
    )
    predicted_refuse_pct: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Predicted (or actual) refuse tea percentage (refuse_tea_pct).",
        examples=[8.78]
    )
    tea_grade_produced: str = Field(
        ...,
        description="Target tea grade produced ('OP', 'FBOP', 'BOP', 'BOPF', 'PEKOE', 'DUST').",
        examples=["BOP"]
    )
    refuse_resale_status: str = Field(
        ...,
        description="Disposition status of refuse: 'DISCARDED' or 'SOLD_DISCOUNTED_GRADE'.",
        examples=["DISCARDED"]
    )
    total_dry_tea_kg: Optional[float] = Field(
        None,
        gt=0.0,
        description=(
            "True dry tea mass (made_tea_output_kg + refuse_tea_kg). "
            "If provided, runs in 'backtest' mode; if omitted, operates in 'estimated' "
            "mode using the historical mean yield ratio (0.223274)."
        ),
        examples=[2170.0]
    )


class EconomicImpactResponse(BaseModel):
    """Response body containing auditable physical and financial metrics."""
    success: bool = True
    mode: str = Field(..., description="'backtest' or 'estimated'.")
    green_leaf_input_kg: float = Field(..., description="Wet green leaf mass in kg.")
    predicted_refuse_pct: float = Field(..., description="Refuse percentage evaluated.")
    total_dry_tea_kg: float = Field(..., description="Total dry tea mass evaluated in kg.")
    yield_ratio_used: float = Field(..., description="Outturn yield ratio applied.")
    estimated_refuse_tea_kg: float = Field(..., description="Refuse tea mass generated in kg.")
    tea_grade_produced: str = Field(..., description="Target commercial tea grade.")
    good_tea_price_per_kg: float = Field(..., description="Primary grade auction benchmark price (LKR/kg).")
    refuse_resale_status: str = Field(..., description="Refuse disposition status.")
    is_recovered: bool = Field(..., description="Whether refuse was resold as secondary DUST grade.")
    recovered_price_per_kg: float = Field(..., description="Secondary resale price realized (LKR/kg).")
    net_loss_per_kg: float = Field(..., description="Net financial loss per kg of refuse (LKR/kg).")
    gross_revenue_loss_lkr: float = Field(..., description="Gross revenue lost from downgraded refuse (LKR).")
    recovered_revenue_lkr: float = Field(..., description="Revenue recovered from secondary DUST resale (LKR).")
    revenue_loss_lkr: float = Field(..., description="Net financial revenue loss (LKR).")
    disclaimer: str = Field(
        ...,
        description="Notice that grade-price table is illustrative auction benchmark data."
    )
