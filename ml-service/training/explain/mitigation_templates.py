"""
M2 Component: Refuse-Tea Prediction & System Integration
Auto-Generated Mitigation Templates (mitigation_templates.py)

Deterministic, Rule-Based Operational Recommendations Engine:
--------------------------------------------------------------
CRITICAL SYSTEM ARCHITECTURE NOTE:
This module is an explicit, deterministic lookup table / template system operating
on SHAP feature attribution outputs. It is strictly RULE-BASED and contains NO MACHINE
LEARNING MODELS, learned weights, or statistical estimators.

This design adheres to the project constraint against adding secondary ML architectures,
ensuring that all root-cause mitigation advice is auditable, explainable, and directly
aligned with Sri Lankan tea processing manufacturing standards.

Usage:
    from explain.mitigation_templates import generate_batch_mitigations
    recommendations = generate_batch_mitigations(row_features, row_shap_values)
"""

from typing import Dict, Any, List, Optional


# -----------------------------------------------------------------------------
# Domain Constants (SLTB & TRI Sri Lanka Processing Standards)
# -----------------------------------------------------------------------------
WITHERING_OPTIMAL_HOURS = 17.0    # TRI Recommended Withering Optimum (16.5 - 17.5 hrs)
DRYER_OPTIMAL_TEMP_C = 111.0      # Fluidized Bed Dryer Optimum (109 - 113 °C)
FINE_LEAF_BENCHMARK_PCT = 80.0    # Minimum Fine Leaf Intake Target for High-Grade Orthodox
HUMIDITY_BENCHMARK_PCT = 80.0     # Critical Relative Humidity Threshold for Natural Withering


# -----------------------------------------------------------------------------
# Deterministic Rule Mapping Catalog
# -----------------------------------------------------------------------------
MITIGATION_RULES = {
    'machine_downtime_log': {
        'category': 'Mechanical / Maintenance',
        'severity_thresholds': {'HIGH': 0.50, 'MEDIUM': 0.20, 'LOW': 0.05},
        'template': (
            "Machine downtime (log1p value: {val:.2f}, equivalent to ~{raw_downtime:.2f}h) "
            "is increasing predicted refuse tea by +{shap:.2f} percentage points. "
            "Mechanical stalling causes leaf over-fermentation in rolling troughs and uneven thermal "
            "channelling in dryers. Immediate action: Inspect roller belt tension, check fluid levels "
            "on drive motors, and schedule preventative mechanical overhaul before the next intake cycle."
        )
    },
    'machine_downtime_hrs': {
        'category': 'Mechanical / Maintenance',
        'severity_thresholds': {'HIGH': 0.50, 'MEDIUM': 0.20, 'LOW': 0.05},
        'template': (
            "Machine downtime of {val:.2f} hours is elevating predicted refuse tea by +{shap:.2f} "
            "percentage points. Line stoppage disrupts the continuous CTC/orthodox leaf flow. "
            "Immediate action: Review shift equipment maintenance logs and ensure standby motors "
            "are primed to eliminate line halting."
        )
    },
    'withering_deviation': {
        'category': 'Withering Process Control',
        'severity_thresholds': {'HIGH': 0.30, 'MEDIUM': 0.15, 'LOW': 0.05},
        'template': (
            "Withering duration ({withering_hrs:.1f}h) deviates from the optimal ~{opt:.1f}h target "
            "by {val:.2f}h, increasing predicted refuse tea by +{shap:.2f} percentage points. "
            "{direction_clause} "
            "Immediate action: Modulate withering trough fan speed and hygrometric dampers to recalibrate "
            "the moisture loss trajectory back toward the 16.5–17.5h completion window."
        )
    },
    'dryer_deviation': {
        'category': 'Thermal / Drying Control',
        'severity_thresholds': {'HIGH': 0.30, 'MEDIUM': 0.15, 'LOW': 0.05},
        'template': (
            "Dryer operating temperature ({dryer_temp:.1f}°C) deviates from the optimal ~{opt:.1f}°C target "
            "by {val:.2f}°C, increasing predicted refuse tea by +{shap:.2f} percentage points. "
            "{direction_clause} "
            "Immediate action: Inspect burner air-fuel ratio, clean fluid bed radiator fins, and verify thermocouple "
            "calibration at the dryer discharge hood."
        )
    },
    'relative_humidity_pct': {
        'category': 'Environmental / Air Handling',
        'severity_thresholds': {'HIGH': 0.30, 'MEDIUM': 0.15, 'LOW': 0.05},
        'template': (
            "Ambient relative humidity of {val:.1f}% is suppressing natural moisture dissipation, "
            "driving predicted refuse tea up by +{shap:.2f} percentage points. "
            "Immediate action: Engage auxiliary withering trough heater radiators and open exhaust air louvers "
            "to prevent moisture condensation and leaf rotting on the lower trough mesh."
        )
    },
    'rolling_humidity_3batch': {
        'category': 'Environmental / Air Handling',
        'severity_thresholds': {'HIGH': 0.25, 'MEDIUM': 0.12, 'LOW': 0.05},
        'template': (
            "Trailing 3-batch average relative humidity of {val:.1f}% indicates sustained microclimatic dampness, "
            "increasing predicted refuse tea by +{shap:.2f} percentage points. "
            "Immediate action: Transition factory air intake to indirect steam-coil heating and extend trough aeration "
            "cycles across upcoming raw leaf deliveries."
        )
    },
    'plucking_fine_leaf_pct': {
        'category': 'Raw Material Intake Quality',
        'severity_thresholds': {'HIGH': 0.25, 'MEDIUM': 0.12, 'LOW': 0.05},
        'template': (
            "Plucking fine leaf proportion of {val:.1f}% (below standard) is pushing predicted refuse tea up by "
            "+{shap:.2f} percentage points due to excess coarse leaf and mature fibrous stalk. "
            "Immediate action: Enforce field-level plucking quality inspections (2-leaves-and-a-bud rule) "
            "and calibrate green leaf intake mechanical sorting sieves before batch loading."
        )
    },
    'rolling_ambient_temp_3batch': {
        'category': 'Environmental / Temperature Control',
        'severity_thresholds': {'HIGH': 0.20, 'MEDIUM': 0.10, 'LOW': 0.05},
        'template': (
            "Trailing 3-batch ambient temperature of {val:.1f}°C is elevated, contributing +{shap:.2f} "
            "percentage points to predicted refuse tea due to accelerated early-stage enzymatic oxidation. "
            "Immediate action: Activate misting humidifiers in rolling rooms and lower trough bed thickness to "
            "dissipate heat buildup."
        )
    },
    'green_leaf_input_kg': {
        'category': 'Capacity & Scheduling',
        'severity_thresholds': {'HIGH': 0.20, 'MEDIUM': 0.10, 'LOW': 0.05},
        'template': (
            "High green leaf intake volume of {val:,.0f} kg is increasing predicted refuse tea by +{shap:.2f} "
            "percentage points due to trough overcrowding and inadequate air circulation. "
            "Immediate action: Stagger intake batch loading across secondary factory sheds or extend bed aeration."
        )
    }
}


def _calculate_severity(feature_name: str, shap_val: float) -> str:
    """Assigns deterministic priority severity based on SHAP contribution magnitude."""
    rule = MITIGATION_RULES.get(feature_name)
    if not rule or 'severity_thresholds' not in rule:
        return 'HIGH' if shap_val >= 0.30 else ('MEDIUM' if shap_val >= 0.10 else 'LOW')

    thresholds = rule['severity_thresholds']
    if shap_val >= thresholds['HIGH']:
        return 'HIGH'
    elif shap_val >= thresholds['MEDIUM']:
        return 'MEDIUM'
    return 'LOW'


def get_single_feature_mitigation(
    feature_name: str,
    feature_value: float,
    shap_value: float,
    context: Optional[Dict[str, Any]] = None
) -> Optional[Dict[str, Any]]:
    """
    Produces a single actionable mitigation suggestion for a specific feature driving
    refuse tea percentage upward. Returns None if feature is not in rule catalog or
    if SHAP value is non-positive (i.e. feature is already helping reduce refuse tea).
    """
    if shap_value <= 0.0:
        return None  # Only generate operational mitigations for adverse (positive) drivers

    rule = MITIGATION_RULES.get(feature_name)
    if not rule:
        # Graceful fallback for unmapped positive feature
        return {
            'feature': feature_name,
            'feature_value': float(feature_value),
            'shap_value_pp': round(float(shap_value), 4),
            'severity': 'MEDIUM' if shap_value >= 0.15 else 'LOW',
            'category': 'General Operational Control',
            'recommendation': (
                f"Feature '{feature_name}' (value: {feature_value:.2f}) is increasing predicted refuse tea "
                f"by +{shap_value:.2f} percentage points. Review standard operating parameters for this variable."
            )
        }

    ctx = context or {}
    template = rule['template']
    category = rule['category']
    severity = _calculate_severity(feature_name, shap_value)

    # Dynamic contextual formatting
    format_kwargs = {'val': feature_value, 'shap': shap_value}

    if feature_name == 'machine_downtime_log':
        # Reconstruct approximate raw downtime hours from log1p(x) = y => x = exp(y) - 1
        raw_hours = ctx.get('machine_downtime_hrs', (2.71828 ** feature_value) - 1.0)
        format_kwargs['raw_downtime'] = max(0.0, raw_hours)

    elif feature_name == 'withering_deviation':
        w_hrs = ctx.get('withering_duration_hrs', WITHERING_OPTIMAL_HOURS + feature_value)
        direction = "Under-withering (insufficient moisture loss leads to flaky particles)" if w_hrs < WITHERING_OPTIMAL_HOURS else "Over-withering (excessive drying leads to leaf breakage and powdering)"
        format_kwargs['withering_hrs'] = w_hrs
        format_kwargs['opt'] = WITHERING_OPTIMAL_HOURS
        format_kwargs['direction_clause'] = direction

    elif feature_name == 'dryer_deviation':
        d_temp = ctx.get('dryer_temperature_c', DRYER_OPTIMAL_TEMP_C + feature_value)
        direction = "Under-drying (stewing and case-hardening causes gummy refuse clumps)" if d_temp < DRYER_OPTIMAL_TEMP_C else "Over-firing (scorched and blistered leaf increases burnt refuse dust)"
        format_kwargs['dryer_temp'] = d_temp
        format_kwargs['opt'] = DRYER_OPTIMAL_TEMP_C
        format_kwargs['direction_clause'] = direction

    message = template.format(**format_kwargs)

    return {
        'feature': feature_name,
        'feature_value': float(feature_value),
        'shap_value_pp': round(float(shap_value), 4),
        'severity': severity,
        'category': category,
        'recommendation': message
    }


def generate_batch_mitigations(
    row_features: Dict[str, float],
    row_shap_values: Dict[str, float],
    top_n: int = 2,
    min_shap_threshold: float = 0.05,
    context: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Extracts the top positive SHAP drivers for a specific batch and generates
    rule-based actionable mitigation templates.
    
    Args:
        row_features: Mapping of feature names to observed values.
        row_shap_values: Mapping of feature names to computed SHAP attribution values.
        top_n: Maximum number of high-impact mitigations to return (default: 2).
        min_shap_threshold: Minimum positive SHAP value to trigger mitigation (default: 0.05 pp).
        context: Optional dictionary containing unselected/raw variables (e.g. dryer_temperature_c).
        
    Returns:
        List of structured recommendation dictionaries sorted by SHAP magnitude descending.
    """
    # Filter for adverse drivers (pushing refuse tea UP)
    positive_drivers = [
        (feat, shap_val)
        for feat, shap_val in row_shap_values.items()
        if shap_val >= min_shap_threshold
    ]

    # Sort descending by SHAP impact
    positive_drivers.sort(key=lambda x: x[1], reverse=True)

    # Combine context with row features for complete access
    full_ctx = {}
    if context:
        full_ctx.update(context)
    full_ctx.update(row_features)

    # Avoid generating redundant advice for both machine_downtime_log and machine_downtime_hrs
    seen_downtime = False
    recommendations = []

    for feat, shap_val in positive_drivers:
        if feat in ['machine_downtime_log', 'machine_downtime_hrs']:
            if seen_downtime:
                continue
            seen_downtime = True

        feat_val = row_features.get(feat, 0.0)
        rec = get_single_feature_mitigation(feat, feat_val, shap_val, context=full_ctx)
        if rec:
            recommendations.append(rec)

        if len(recommendations) >= top_n:
            break

    return recommendations
