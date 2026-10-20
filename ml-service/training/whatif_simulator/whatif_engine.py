"""
M2 Component: Refuse-Tea Prediction & System Integration
Constrained Model-Based What-If Counterfactual Simulator Engine (whatif_engine.py)

This module implements the constrained, model-based what-if counterfactual re-prediction
tool for the M2 component.

Architectural Specification:
- Constrained & Model-Based: Re-queries the ALREADY-TRAINED machine learning model
  (m2_refuse_tea_xgb_v1) at modified input points within its learned domain.
- NOT A Causal Model: Explicitly correlational. It does not fit or retrain anything.
- Strictly Controlled Levers: Restricts user overrides exclusively to 4 controllable
  operational parameters (withering_duration_hrs, dryer_temperature_c, machine_downtime_hrs,
  plucking_fine_leaf_pct). All exogenous features (ambient temperature, humidity, factory,
  season, grade, leaf intake volume) remain fixed at their baseline observed values.
- Consistent Derived Features: Automatically recomputes all mathematical dependencies
  (withering_deviation, withering_duration_bucket, dryer_deviation, machine_downtime_log)
  using the exact formulas from preprocessing.py to prevent feature drift.
- Safe Operating Range Boundary Auditing: Checks proposed overrides against empirical
  historical bounds [min, max] and raises an explicit `out_of_distribution_warning` flag
  when inputs extrapolate beyond the training support.
- Reusable & Decoupled: Zero training or pipeline dependencies; importable standalone
  by future FastAPI serving routers.

Mandatory Operational Disclaimer:
  "This is a constrained, model-based counterfactual: it reports what the
  SAME trained regression model would have predicted had these inputs
  been different, based on correlational patterns learned from historical
  data. It is NOT a separate causal model, and the predicted change in
  refuse_tea_pct (and the resulting LKR savings estimate) is NOT a
  guarantee of real-world outcome. Actual results depend on factors this
  model cannot observe or control for. Treat this as a decision-support
  estimate, not a commitment."
"""

import math
from typing import Dict, Any, List, Optional, Tuple

import numpy as np
import pandas as pd

# Optional import of economic calculator for combined simulations
try:
    from economic_impact.economic_calculator import calculate_economic_impact
except ImportError:
    from ..economic_impact.economic_calculator import calculate_economic_impact

# -----------------------------------------------------------------------------
# Mandatory Regulatory & Governance Disclaimer
# -----------------------------------------------------------------------------
MANDATORY_DISCLAIMER: str = (
    "This is a constrained, model-based counterfactual: it reports what the "
    "SAME trained regression model would have predicted had these inputs "
    "been different, based on correlational patterns learned from historical "
    "data. It is NOT a separate causal model, and the predicted change in "
    "refuse_tea_pct (and the resulting LKR savings estimate) is NOT a "
    "guarantee of real-world outcome. Actual results depend on factors this "
    "model cannot observe or control for. Treat this as a decision-support "
    "estimate, not a commitment."
)

# -----------------------------------------------------------------------------
# Controllable Parameter Levers
# -----------------------------------------------------------------------------
# These 4 operational variables represent the ONLY parameters an intake supervisor
# or factory floor manager can realistically modulate for a production batch.
# All other variables (weather, elevation, batch size, tea grade) are exogenous.
CONTROLLABLE_LEVERS: set = {
    "withering_duration_hrs",
    "dryer_temperature_c",
    "machine_downtime_hrs",
    "plucking_fine_leaf_pct",
}

# -----------------------------------------------------------------------------
# Safe Operating Ranges (Empirically Derived from Full Dataset, N=620)
# -----------------------------------------------------------------------------
# Computed strictly across all 620 historical production runs in the raw dataset.
# The 'min_max' bounds define the absolute empirical training support; the
# 'percentile_1_99' bounds define a tighter, conservative operational boundary.
SAFE_OPERATING_RANGES: Dict[str, Dict[str, Any]] = {
    "withering_duration_hrs": {
        "min": 10.0,
        "max": 23.3,
        "p1": 11.34,
        "p99": 22.18,
        "unit": "hours",
        "description": "Withering trough duration",
        "optimal_target": 17.0,
    },
    "dryer_temperature_c": {
        "min": 94.5,
        "max": 134.2,
        "p1": 95.92,
        "p99": 127.16,
        "unit": "°C",
        "description": "Fluidized bed dryer firing temperature",
        "optimal_target": 111.0,
    },
    "machine_downtime_hrs": {
        "min": 0.0,
        "max": 4.39,
        "p1": 0.00,
        "p99": 2.55,
        "unit": "hours",
        "description": "Mechanical line outage duration",
        "optimal_target": 0.0,
    },
    "plucking_fine_leaf_pct": {
        "min": 56.2,
        "max": 96.0,
        "p1": 62.22,
        "p99": 94.31,
        "unit": "%",
        "description": "Plucking fine leaf compliance (2-leaves-and-a-bud)",
        "optimal_target": 85.0,
    },
}

# Target feature columns expected by the trained XGBoost model (19 features)
EXPECTED_FEATURE_COLUMNS: List[str] = [
    "machine_downtime_log",
    "machine_downtime_hrs",
    "relative_humidity_pct",
    "withering_duration_bucket",
    "ambient_temperature_c",
    "withering_duration_hrs",
    "green_leaf_input_kg",
    "rolling_ambient_temp_3batch",
    "withering_deviation",
    "plucking_fine_leaf_pct",
    "tea_grade_produced_PEKOE",
    "tea_grade_produced_FBOP",
    "tea_grade_produced_OP",
    "tea_grade_produced_BOPF",
    "tea_grade_produced_DUST",
    "rolling_humidity_3batch",
    "region_Uva",
    "region_Nuwara Eliya",
    "dryer_deviation",
]


def compute_withering_bucket(duration_hrs: float) -> int:
    """
    Computes ordinal withering duration bucket (0-4) using exact EDA Section 4 bin thresholds:
      Bucket 0: < 15.0h      (Under-withered)
      Bucket 1: 15.0 - 16.5h (Mild under)
      Bucket 2: 16.5 - 17.5h (Optimal window)
      Bucket 3: 17.5 - 19.0h (Mild over)
      Bucket 4: >= 19.0h     (Over-withered)
    """
    d = float(duration_hrs)
    if d < 15.0:
        return 0
    elif d < 16.5:
        return 1
    elif d < 17.5:
        return 2
    elif d < 19.0:
        return 3
    else:
        return 4


def validate_overrides(
    overrides: Dict[str, float],
    safe_range_mode: str = "min_max"
) -> Tuple[bool, List[str]]:
    """
    Validates override levers against the allowable controllable set and checks
    whether any value falls outside the safe operating ranges.

    Raises:
    -------
    ValueError:
        If any key in overrides is not in CONTROLLABLE_LEVERS.

    Returns:
    --------
    Tuple[bool, List[str]]:
        (out_of_distribution_warning, list_of_warning_details)
    """
    if not isinstance(overrides, dict) or len(overrides) == 0:
        raise ValueError("Overrides must be a non-empty dictionary of operational levers.")

    # 1. Reject unauthorized exogenous features
    invalid_keys = set(overrides.keys()) - CONTROLLABLE_LEVERS
    if invalid_keys:
        raise ValueError(
            f"Unauthorized simulation levers: {sorted(list(invalid_keys))}. "
            f"The What-if Simulator strictly accepts only controllable levers: "
            f"{sorted(list(CONTROLLABLE_LEVERS))}. All other features are exogenous "
            f"and must remain fixed at their baseline observed values."
        )

    # 2. Check safe operating ranges
    ood_warning = False
    ood_details = []

    for lever, val in overrides.items():
        bounds = SAFE_OPERATING_RANGES[lever]
        low_bound = bounds["min"] if safe_range_mode == "min_max" else bounds["p1"]
        high_bound = bounds["max"] if safe_range_mode == "min_max" else bounds["p99"]

        val_float = float(val)
        if val_float < low_bound:
            ood_warning = True
            ood_details.append(
                f"Lever '{lever}' = {val_float}{bounds['unit']} is below safe lower bound of "
                f"{low_bound}{bounds['unit']} ({safe_range_mode} support). Model extrapolation risk."
            )
        elif val_float > high_bound:
            ood_warning = True
            ood_details.append(
                f"Lever '{lever}' = {val_float}{bounds['unit']} exceeds safe upper bound of "
                f"{high_bound}{bounds['unit']} ({safe_range_mode} support). Model extrapolation risk."
            )

    return ood_warning, ood_details


def simulate_whatif(
    baseline_row: Dict[str, Any],
    overrides: Dict[str, float],
    model: Any,
    safe_range_mode: str = "min_max"
) -> Dict[str, Any]:
    """
    Executes a constrained counterfactual re-prediction using the already-trained model.

    Parameters:
    -----------
    baseline_row : dict
        Dictionary of baseline features containing all 19 model inputs.
    overrides : dict
        Dictionary mapping controllable lever names to proposed numerical overrides.
        Valid keys: 'withering_duration_hrs', 'dryer_temperature_c',
                    'machine_downtime_hrs', 'plucking_fine_leaf_pct'.
    model : Any
        Pre-trained regression model (e.g., XGBoost) exposing a `.predict()` method.
    safe_range_mode : str, default='min_max'
        Boundary auditing mode: 'min_max' (full training support) or
        'percentile_1_99' (conservative 1st-99th percentile band).

    Returns:
    --------
    dict:
        Auditable simulation results:
        - 'baseline_predicted_refuse_pct': Baseline model prediction (%)
        - 'simulated_predicted_refuse_pct': Counterfactual model prediction (%)
        - 'delta_refuse_pct': Change in refuse percentage (pp, simulated - baseline)
        - 'direction': 'IMPROVEMENT', 'REGRESSION', or 'UNCHANGED'
        - 'overrides_applied': Dictionary of requested operational overrides
        - 'derived_features_updated': Dictionary of recomputed derived features
        - 'out_of_distribution_warning': Boolean flag indicating extrapolation risk
        - 'out_of_distribution_details': List of specific boundary violation warnings
        - 'disclaimer': Mandatory regulatory disclaimer string
    """
    # 1. Validate overrides & boundary constraints
    ood_warning, ood_details = validate_overrides(overrides, safe_range_mode=safe_range_mode)

    # 2. Deep-copy baseline feature dictionary
    simulated_row = dict(baseline_row)
    derived_updated = {}

    # 3. Apply overrides and recompute mathematical feature dependencies
    for lever, raw_val in overrides.items():
        val = float(raw_val)

        if lever == "withering_duration_hrs":
            simulated_row["withering_duration_hrs"] = val
            new_dev = abs(val - 17.0)
            new_bucket = compute_withering_bucket(val)
            simulated_row["withering_deviation"] = new_dev
            simulated_row["withering_duration_bucket"] = new_bucket
            derived_updated["withering_deviation"] = round(new_dev, 4)
            derived_updated["withering_duration_bucket"] = new_bucket

        elif lever == "dryer_temperature_c":
            # Note: dryer_temperature_c was dropped in preprocessing Stage 2 selection;
            # dryer_deviation is the active feature in the 19-feature model matrix.
            new_dev = abs(val - 111.0)
            simulated_row["dryer_deviation"] = new_dev
            derived_updated["dryer_deviation"] = round(new_dev, 4)

        elif lever == "machine_downtime_hrs":
            simulated_row["machine_downtime_hrs"] = val
            new_log = math.log1p(max(0.0, val))
            simulated_row["machine_downtime_log"] = new_log
            derived_updated["machine_downtime_log"] = round(new_log, 4)

        elif lever == "plucking_fine_leaf_pct":
            simulated_row["plucking_fine_leaf_pct"] = val
            derived_updated["plucking_fine_leaf_pct"] = round(val, 2)

    # 4. Construct aligned DataFrame matrices for inference
    # Ensure columns match exact order expected by XGBoost
    base_df = pd.DataFrame([[baseline_row[col] for col in EXPECTED_FEATURE_COLUMNS]], columns=EXPECTED_FEATURE_COLUMNS)
    sim_df = pd.DataFrame([[simulated_row[col] for col in EXPECTED_FEATURE_COLUMNS]], columns=EXPECTED_FEATURE_COLUMNS)

    # 5. Execute pure forward inference (no fitting)
    base_pred = float(model.predict(base_df)[0])
    sim_pred = float(model.predict(sim_df)[0])
    delta_pp = sim_pred - base_pred

    if delta_pp < -1e-4:
        direction = "IMPROVEMENT"
    elif delta_pp > 1e-4:
        direction = "REGRESSION"
    else:
        direction = "UNCHANGED"

    return {
        "baseline_predicted_refuse_pct": round(base_pred, 4),
        "simulated_predicted_refuse_pct": round(sim_pred, 4),
        "delta_refuse_pct": round(delta_pp, 4),
        "direction": direction,
        "overrides_applied": {k: float(v) for k, v in overrides.items()},
        "derived_features_updated": derived_updated,
        "out_of_distribution_warning": ood_warning,
        "out_of_distribution_details": ood_details,
        "disclaimer": MANDATORY_DISCLAIMER,
    }


def simulate_whatif_with_economics(
    baseline_features: Dict[str, Any],
    overrides: Dict[str, float],
    model: Any,
    raw_batch_data: Dict[str, Any],
    safe_range_mode: str = "min_max",
    price_reference: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    """
    Executes a counterfactual simulation and converts the resulting physical refuse delta
    into monetary savings/loss (in Sri Lankan Rupees, LKR).

    Parameters:
    -----------
    baseline_features : dict
        Dictionary of baseline features for the 19 model inputs.
    overrides : dict
        Proposed operational overrides on controllable levers.
    model : Any
        Fitted regression model.
    raw_batch_data : dict
        Batch metadata containing 'green_leaf_input_kg', 'tea_grade_produced',
        'refuse_resale_status', and optional 'total_dry_tea_kg'.
    safe_range_mode : str, default='min_max'
        Boundary auditing mode.
    price_reference : dict, optional
        Custom grade price mapping.

    Returns:
    --------
    dict:
        Simulation results combined with monetary impact metrics:
        - All keys from simulate_whatif()
        - 'base_revenue_loss_lkr': Baseline predicted revenue loss (LKR)
        - 'simulated_revenue_loss_lkr': Counterfactual revenue loss (LKR)
        - 'simulated_savings_lkr': Financial savings (LKR, base - sim)
        - 'savings_pct_of_loss': Relative savings as % of baseline loss
        - 'disclaimer': Mandatory regulatory disclaimer
    """
    # 1. Run physical model simulation
    sim_res = simulate_whatif(
        baseline_row=baseline_features,
        overrides=overrides,
        model=model,
        safe_range_mode=safe_range_mode,
    )

    # 2. Extract batch metadata
    gl_kg = float(raw_batch_data.get("green_leaf_input_kg", 0.0))
    grade = str(raw_batch_data.get("tea_grade_produced", "BOP"))
    status = str(raw_batch_data.get("refuse_resale_status", "DISCARDED"))
    total_dry = raw_batch_data.get("total_dry_tea_kg", None)
    if total_dry is not None:
        total_dry = float(total_dry)

    # 3. Calculate baseline economic loss
    eco_base = calculate_economic_impact(
        green_leaf_input_kg=gl_kg,
        predicted_refuse_pct=sim_res["baseline_predicted_refuse_pct"],
        tea_grade_produced=grade,
        refuse_resale_status=status,
        total_dry_tea_kg=total_dry,
        price_reference=price_reference,
    )

    # 4. Calculate simulated economic loss
    eco_sim = calculate_economic_impact(
        green_leaf_input_kg=gl_kg,
        predicted_refuse_pct=sim_res["simulated_predicted_refuse_pct"],
        tea_grade_produced=grade,
        refuse_resale_status=status,
        total_dry_tea_kg=total_dry,
        price_reference=price_reference,
    )

    base_loss_lkr = eco_base["revenue_loss_lkr"]
    sim_loss_lkr = eco_sim["revenue_loss_lkr"]
    sim_savings_lkr = base_loss_lkr - sim_loss_lkr
    savings_pct = (sim_savings_lkr / base_loss_lkr * 100.0) if base_loss_lkr > 0 else 0.0

    output = dict(sim_res)
    output.update({
        "batch_id": raw_batch_data.get("batch_id", "UNKNOWN"),
        "tea_grade_produced": grade,
        "refuse_resale_status": status,
        "base_revenue_loss_lkr": round(base_loss_lkr, 2),
        "simulated_revenue_loss_lkr": round(sim_loss_lkr, 2),
        "simulated_savings_lkr": round(sim_savings_lkr, 2),
        "savings_pct_of_loss": round(savings_pct, 2),
    })

    return output
