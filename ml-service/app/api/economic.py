"""
Economic Impact Calculation API Route
"""

from fastapi import APIRouter
from app.schemas.economic import EconomicImpactRequest, EconomicImpactResponse
from economic_impact.economic_calculator import calculate_economic_impact

router = APIRouter(tags=["Economic Impact"])

DISCLAIMER_TEXT = (
    "Note: Indicative Colombo Tea Auction prices (OP=1420, FBOP=1280, BOP=1100, "
    "BOPF=980, PEKOE=900, DUST=430 LKR/kg) are illustrative benchmark references "
    "for operational impact simulation, not live market quotes."
)


@router.post(
    "/economic-impact",
    response_model=EconomicImpactResponse,
    summary="Compute Monetary Revenue Loss from Refuse Tea",
    description=(
        "Converts predicted or actual refuse tea percentage into Sri Lankan Rupee (LKR) "
        "revenue loss. Supports dual modes: 'backtest' (using provided total dry tea kg) "
        "or 'estimated' (using empirical factory green-leaf outturn yield ratio of 0.223274)."
    )
)
def compute_economic_impact(request: EconomicImpactRequest) -> EconomicImpactResponse:
    res = calculate_economic_impact(
        green_leaf_input_kg=request.green_leaf_input_kg,
        predicted_refuse_pct=request.predicted_refuse_pct,
        tea_grade_produced=request.tea_grade_produced,
        refuse_resale_status=request.refuse_resale_status,
        total_dry_tea_kg=request.total_dry_tea_kg
    )

    return EconomicImpactResponse(
        success=True,
        mode=res["mode"],
        green_leaf_input_kg=res["green_leaf_input_kg"],
        predicted_refuse_pct=res["predicted_refuse_pct"],
        total_dry_tea_kg=res["total_dry_tea_kg"],
        yield_ratio_used=res["yield_ratio_used"],
        estimated_refuse_tea_kg=res["estimated_refuse_tea_kg"],
        tea_grade_produced=res["tea_grade_produced"],
        good_tea_price_per_kg=res["good_tea_price_per_kg"],
        refuse_resale_status=res["refuse_resale_status"],
        is_recovered=res["is_recovered"],
        recovered_price_per_kg=res["recovered_price_per_kg"],
        net_loss_per_kg=res["net_loss_per_kg"],
        gross_revenue_loss_lkr=res["gross_revenue_loss_lkr"],
        recovered_revenue_lkr=res["recovered_revenue_lkr"],
        revenue_loss_lkr=res["revenue_loss_lkr"],
        disclaimer=DISCLAIMER_TEXT
    )
