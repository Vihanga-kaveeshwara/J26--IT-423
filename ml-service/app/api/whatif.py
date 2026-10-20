"""
What-If Counterfactual Simulator API Route
"""

import time
from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.whatif import WhatIfRequest, WhatIfResponse, WhatIfEconomicSummary
from app.feature_engineering import build_feature_vector
from app.services.model_service import ModelService, get_model_service
from whatif_simulator.whatif_engine import (
    simulate_whatif,
    CONTROLLABLE_LEVERS,
    SAFE_OPERATING_RANGES,
    MANDATORY_DISCLAIMER,
)
from economic_impact.economic_calculator import calculate_economic_impact

router = APIRouter(tags=["What-If Simulator"])


@router.post(
    "/whatif",
    response_model=WhatIfResponse,
    summary="Simulate Process Adjustments (Constrained What-If)",
    description=(
        "Executes a constrained counterfactual re-prediction using the already-trained model. "
        "Overrides are strictly restricted to 4 controllable operational levers: "
        "'withering_duration_hrs', 'dryer_temperature_c', 'machine_downtime_hrs', 'plucking_fine_leaf_pct'. "
        "Automatically updates non-linear derived features, audits historical boundaries, "
        "and computes LKR monetary impact."
    )
)
def run_whatif_simulation(
    request: WhatIfRequest,
    service: ModelService = Depends(get_model_service)
) -> WhatIfResponse:
    t0 = time.perf_counter()

    # 1. Reject unauthorized simulation levers early with 400 Bad Request
    invalid_keys = set(request.overrides.keys()) - CONTROLLABLE_LEVERS
    if invalid_keys:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unauthorized simulation levers: {sorted(list(invalid_keys))}. "
                f"The What-if Simulator accepts only controllable levers: "
                f"{sorted(list(CONTROLLABLE_LEVERS))}. All other features are exogenous "
                f"and must remain fixed at their baseline observed values."
            )
        )

    # 2. Shared Feature Engineering for baseline vector
    raw_dict = request.model_dump(exclude={"overrides", "refuse_resale_status", "total_dry_tea_kg"})
    baseline_features, used_fallback = build_feature_vector(raw_dict)

    # 3. Execute What-If simulation engine
    try:
        sim_res = simulate_whatif(
            baseline_row=baseline_features,
            overrides=request.overrides,
            model=service.model,
            safe_range_mode="min_max"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # 4. Optional Economic Impact Conversion
    economic_summary = None
    if request.green_leaf_input_kg > 0:
        base_econ = calculate_economic_impact(
            green_leaf_input_kg=request.green_leaf_input_kg,
            predicted_refuse_pct=sim_res["baseline_predicted_refuse_pct"],
            tea_grade_produced=request.tea_grade_produced,
            refuse_resale_status=request.refuse_resale_status or "DISCARDED",
            total_dry_tea_kg=request.total_dry_tea_kg
        )
        sim_econ = calculate_economic_impact(
            green_leaf_input_kg=request.green_leaf_input_kg,
            predicted_refuse_pct=sim_res["simulated_predicted_refuse_pct"],
            tea_grade_produced=request.tea_grade_produced,
            refuse_resale_status=request.refuse_resale_status or "DISCARDED",
            total_dry_tea_kg=request.total_dry_tea_kg
        )
        base_loss = base_econ["revenue_loss_lkr"]
        sim_loss = sim_econ["revenue_loss_lkr"]
        savings = base_loss - sim_loss
        savings_pct = (savings / base_loss * 100.0) if base_loss > 0 else 0.0

        economic_summary = WhatIfEconomicSummary(
            base_revenue_loss_lkr=round(base_loss, 2),
            simulated_revenue_loss_lkr=round(sim_loss, 2),
            simulated_savings_lkr=round(savings, 2),
            savings_pct_of_loss=round(savings_pct, 2)
        )

    latency_ms = round((time.perf_counter() - t0) * 1000.0, 3)

    return WhatIfResponse(
        success=True,
        baseline_predicted_refuse_pct=sim_res["baseline_predicted_refuse_pct"],
        simulated_predicted_refuse_pct=sim_res["simulated_predicted_refuse_pct"],
        delta_refuse_pct=sim_res["delta_refuse_pct"],
        direction=sim_res["direction"],
        overrides_applied=sim_res["overrides_applied"],
        derived_features_updated=sim_res["derived_features_updated"],
        out_of_distribution_warning=sim_res["out_of_distribution_warning"],
        out_of_distribution_details=sim_res["out_of_distribution_details"],
        economic_impact=economic_summary,
        disclaimer=MANDATORY_DISCLAIMER,
        latency_ms=latency_ms,
        used_fallback_rolling_features=used_fallback
    )
