"""
M2 Component: Refuse-Tea Prediction & System Integration
Economic Impact Calculator Module (economic_calculator.py)

This module implements a pure, deterministic, rule-based economic calculation
engine that converts machine learning refuse_tea_pct predictions into monetary
revenue-loss figures (in Sri Lankan Rupees, LKR).

Architectural Principles:
- Standalone & Reusable: Zero dependencies on machine learning frameworks (no XGBoost,
  no scikit-learn, and no mandatory pandas dependency at runtime).
- Fully Auditable: Returns all intermediate physical and financial metrics (dry tea mass,
  refuse mass, gross opportunity loss, recovered revenue, and net revenue loss).
- Dual Operational Modes:
    1. "backtest": Employs actual historical dry tea mass (made_tea_output_kg + refuse_tea_kg)
       to strictly isolate model prediction error from mass balance variance.
    2. "estimated": Employs an empirical factory green-leaf outturn yield ratio
       (default_yield_ratio = 0.223274, ~22.33%) for live real-time serving where
       post-drying batch weighing has not yet occurred.
- Market Price Anchoring: Uses indicative Colombo Tea Auction prices by grade
  (OP=1420, FBOP=1280, BOP=1100, BOPF=980, PEKOE=900, DUST=430 LKR/kg).
"""

from typing import Dict, Any, Optional

# -----------------------------------------------------------------------------
# Default Market Reference Parameters
# -----------------------------------------------------------------------------
# Indicative Colombo Tea Auction reference prices (LKR per kg), anchored to
# historical 2024-2026 auction averages. Note: These are illustrative benchmark
# prices for operational impact simulation, not live market quotes.
DEFAULT_GRADE_PRICES: Dict[str, float] = {
    "OP": 1420.0,       # High-grown orthodox, premium whole-leaf grade
    "FBOP": 1280.0,     # Flowery Broken Orange Pekoe, orthodox semi-leafy
    "BOP": 1100.0,      # Broken Orange Pekoe, standard main grading
    "BOPF": 980.0,      # Broken Orange Pekoe Fannings, high-volume CTC/orthodox
    "PEKOE": 900.0,     # Medium-leaf curly grade
    "DUST": 430.0,      # Secondary / refuse grade resale value (recovered price)
}

# Empirical mean outturn yield ratio across all 620 historical production batches:
# mean((made_tea_output_kg + refuse_tea_kg) / green_leaf_input_kg) = 0.223273969...
# Validated against the ~0.225 theoretical Sri Lankan tea factory outturn target.
DEFAULT_YIELD_RATIO: float = 0.223274

# Fallback tea price if an unrecognized grade string is encountered
FALLBACK_GOOD_TEA_PRICE: float = 1100.0  # Median BOP benchmark


def calculate_economic_impact(
    green_leaf_input_kg: float,
    predicted_refuse_pct: float,
    tea_grade_produced: str,
    refuse_resale_status: str,
    total_dry_tea_kg: Optional[float] = None,
    default_yield_ratio: Optional[float] = None,
    price_reference: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    """
    Computes the monetary revenue loss (in LKR) resulting from refuse tea generation.

    Parameters:
    -----------
    green_leaf_input_kg : float
        Total wet green leaf mass received at withering troughs (kg).
    predicted_refuse_pct : float
        Refuse tea percentage predicted by ML model (or actual observed %).
    tea_grade_produced : str
        Primary commercial tea grade produced (e.g., 'OP', 'FBOP', 'BOP', 'BOPF', 'PEKOE', 'DUST').
        Matched case-insensitively against the price reference table.
    refuse_resale_status : str
        Disposition status of refuse tea:
        - 'SOLD_DISCOUNTED_GRADE': Refuse is recovered and sold as secondary DUST grade.
        - 'DISCARDED' (or any other status): Refuse is discarded with zero economic recovery.
    total_dry_tea_kg : float, optional
        True total dry tea produced (made_tea_output_kg + refuse_tea_kg).
        If provided, the calculation operates in 'backtest' mode.
        If None, the calculation operates in 'estimated' mode using green_leaf_input_kg * yield_ratio.
    default_yield_ratio : float, optional
        Outturn ratio to estimate dry tea from green leaf when total_dry_tea_kg is None.
        Defaults to DEFAULT_YIELD_RATIO (0.223274) if not supplied.
    price_reference : dict, optional
        Mapping from grade strings to LKR/kg prices. Defaults to DEFAULT_GRADE_PRICES.

    Returns:
    --------
    dict
        Auditable dictionary containing physical masses, applied unit prices,
        and financial impact figures:
        - 'mode': 'backtest' or 'estimated'
        - 'green_leaf_input_kg': Input green leaf mass (kg)
        - 'predicted_refuse_pct': Refuse percentage applied (%)
        - 'total_dry_tea_kg': Total dry tea mass used in calculation (kg)
        - 'yield_ratio_used': Outturn ratio (dry tea / green leaf) applied
        - 'estimated_refuse_tea_kg': Mass of refuse tea generated (kg)
        - 'tea_grade_produced': Normalized tea grade string
        - 'good_tea_price_per_kg': Benchmark selling price for primary grade (LKR/kg)
        - 'refuse_resale_status': Normalized refuse disposition status
        - 'is_recovered': Boolean flag indicating if refuse revenue was recovered
        - 'recovered_price_per_kg': Secondary resale price realized (LKR/kg, 430 if sold, 0 if discarded)
        - 'net_loss_per_kg': Good price minus recovered price (LKR/kg)
        - 'gross_revenue_loss_lkr': Opportunity loss if zero refuse were produced (LKR)
        - 'recovered_revenue_lkr': Revenue recovered through secondary grade resale (LKR)
        - 'revenue_loss_lkr': Net unrecoverable economic loss (LKR)
    """
    # 1. Clean and normalize categorical inputs
    clean_grade = str(tea_grade_produced).strip().upper() if tea_grade_produced is not None else "BOP"
    clean_status = str(refuse_resale_status).strip().upper() if refuse_resale_status is not None else "DISCARDED"

    prices = price_reference if price_reference is not None else DEFAULT_GRADE_PRICES
    dust_price = prices.get("DUST", 430.0)

    # 2. Determine total dry tea mass (Mode selection)
    gl_input = float(green_leaf_input_kg) if green_leaf_input_kg is not None else 0.0
    refuse_pct = float(predicted_refuse_pct) if predicted_refuse_pct is not None else 0.0

    # Ensure non-negative bounds
    gl_input = max(0.0, gl_input)
    refuse_pct = max(0.0, refuse_pct)

    if total_dry_tea_kg is not None and float(total_dry_tea_kg) >= 0.0:
        mode = "backtest"
        used_total_dry_tea_kg = float(total_dry_tea_kg)
        used_yield_ratio = (used_total_dry_tea_kg / gl_input) if gl_input > 0.0 else DEFAULT_YIELD_RATIO
    else:
        mode = "estimated"
        ratio = float(default_yield_ratio) if default_yield_ratio is not None else DEFAULT_YIELD_RATIO
        used_yield_ratio = max(0.0, ratio)
        used_total_dry_tea_kg = gl_input * used_yield_ratio

    # 3. Compute refuse mass
    estimated_refuse_tea_kg = used_total_dry_tea_kg * (refuse_pct / 100.0)

    # 4. Lookup pricing benchmarks
    good_tea_price_per_kg = prices.get(clean_grade, FALLBACK_GOOD_TEA_PRICE)
    is_recovered = (clean_status == "SOLD_DISCOUNTED_GRADE")
    recovered_price_per_kg = dust_price if is_recovered else 0.0

    # 5. Financial opportunity and loss calculations
    gross_revenue_loss_lkr = estimated_refuse_tea_kg * good_tea_price_per_kg
    recovered_revenue_lkr = estimated_refuse_tea_kg * recovered_price_per_kg
    net_revenue_loss_lkr = max(0.0, gross_revenue_loss_lkr - recovered_revenue_lkr)
    net_loss_per_kg = max(0.0, good_tea_price_per_kg - recovered_price_per_kg)

    return {
        "mode": mode,
        "green_leaf_input_kg": round(gl_input, 2),
        "predicted_refuse_pct": round(refuse_pct, 4),
        "total_dry_tea_kg": round(used_total_dry_tea_kg, 2),
        "yield_ratio_used": round(used_yield_ratio, 6),
        "estimated_refuse_tea_kg": round(estimated_refuse_tea_kg, 2),
        "tea_grade_produced": clean_grade,
        "good_tea_price_per_kg": round(good_tea_price_per_kg, 2),
        "refuse_resale_status": clean_status,
        "is_recovered": is_recovered,
        "recovered_price_per_kg": round(recovered_price_per_kg, 2),
        "net_loss_per_kg": round(net_loss_per_kg, 2),
        "gross_revenue_loss_lkr": round(gross_revenue_loss_lkr, 2),
        "recovered_revenue_lkr": round(recovered_revenue_lkr, 2),
        "revenue_loss_lkr": round(net_revenue_loss_lkr, 2),
    }
