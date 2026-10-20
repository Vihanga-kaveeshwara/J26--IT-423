"""
M2 Component: Refuse-Tea Prediction & System Integration
Shared Feature Engineering Module (feature_engineering.py)

This module provides the SINGLE SOURCE OF TRUTH for feature engineering
at serving time. It mirrors the exact mathematical transformations, binning
boundaries, reference categorical levels, and feature ordering established
during training (ml-service/training/preprocessing.py).

Guarantees exact numerical parity with X_features_selected.csv across
all 19 model inputs.
"""

import math
from typing import Dict, Any, Tuple, List, Optional
import numpy as np

# -----------------------------------------------------------------------------
# Exact 19 Model Input Features in Expected Order
# -----------------------------------------------------------------------------
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

# -----------------------------------------------------------------------------
# Historical Fallback Constants for Rolling Weather Features
# -----------------------------------------------------------------------------
# Empirical dataset-wide means across all 620 historical production batches.
# Used when stateless single-batch API requests omit historical trailing values.
FALLBACK_ROLLING_HUMIDITY_3BATCH: float = 77.368065       # Dataset mean ~77.37%
FALLBACK_ROLLING_AMBIENT_TEMP_3BATCH: float = 22.958441   # Dataset mean ~22.96 °C

# -----------------------------------------------------------------------------
# Reference Domain Optima & Encodings (TRI / SLTB Standards)
# -----------------------------------------------------------------------------
WITHERING_OPTIMAL_HOURS: float = 17.0
DRYER_OPTIMAL_TEMP_C: float = 111.0

VALID_REGIONS: set = {"Low-Country", "Nuwara Eliya", "Uva"}
VALID_SEASONS: set = {"INTER_MONSOON", "NE_MONSOON", "SW_MONSOON"}
VALID_GRADES: set = {"BOP", "BOPF", "DUST", "FBOP", "OP", "PEKOE"}


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


def build_feature_vector(raw_input: Dict[str, Any]) -> Tuple[Dict[str, float], bool]:
    """
    Transforms raw operational batch fields into the exact 19-element feature vector
    required by the persisted m2_refuse_tea_xgb_v1 regression model.

    Parameters:
    -----------
    raw_input : dict
        Dictionary of raw operational parameters:
        - withering_duration_hrs (float)
        - dryer_temperature_c (float)
        - machine_downtime_hrs (float)
        - green_leaf_input_kg (float)
        - plucking_fine_leaf_pct (float)
        - relative_humidity_pct (float)
        - ambient_temperature_c (float)
        - region (str): 'Low-Country', 'Nuwara Eliya', or 'Uva'
        - tea_grade_produced (str): 'BOP', 'BOPF', 'DUST', 'FBOP', 'OP', 'PEKOE'
        - rolling_humidity_3batch (float, optional)
        - rolling_ambient_temp_3batch (float, optional)

    Returns:
    --------
    Tuple[Dict[str, float], bool]:
        - feature_vector: Dict mapping all 19 column names in exact order to float values.
        - used_fallback_rolling_features: True if either rolling weather average was omitted
          and replaced with historical mean fallback; False if both were explicitly supplied.
    """
    vec: Dict[str, float] = {}
    used_fallback = False

    # 1. Machine downtime (raw hours + log1p)
    downtime_raw = float(raw_input.get("machine_downtime_hrs", 0.0))
    downtime_safe = max(0.0, downtime_raw)
    vec["machine_downtime_hrs"] = downtime_safe
    vec["machine_downtime_log"] = float(math.log1p(downtime_safe))

    # 2. Weather & environment
    vec["relative_humidity_pct"] = float(raw_input.get("relative_humidity_pct", 75.0))
    vec["ambient_temperature_c"] = float(raw_input.get("ambient_temperature_c", 24.0))

    # 3. Withering duration, deviation, and ordinal bucket
    wither_raw = float(raw_input.get("withering_duration_hrs", 17.0))
    vec["withering_duration_hrs"] = wither_raw
    vec["withering_deviation"] = float(abs(wither_raw - WITHERING_OPTIMAL_HOURS))
    vec["withering_duration_bucket"] = float(compute_withering_bucket(wither_raw))

    # 4. Green leaf intake and plucking quality
    vec["green_leaf_input_kg"] = float(raw_input.get("green_leaf_input_kg", 5000.0))
    vec["plucking_fine_leaf_pct"] = float(raw_input.get("plucking_fine_leaf_pct", 80.0))

    # 5. Dryer temperature deviation
    dryer_temp = float(raw_input.get("dryer_temperature_c", DRYER_OPTIMAL_TEMP_C))
    vec["dryer_deviation"] = float(abs(dryer_temp - DRYER_OPTIMAL_TEMP_C))

    # 6. Causal rolling weather averages (Stateless fallback handling)
    r_hum = raw_input.get("rolling_humidity_3batch")
    if r_hum is not None:
        vec["rolling_humidity_3batch"] = float(r_hum)
    else:
        vec["rolling_humidity_3batch"] = FALLBACK_ROLLING_HUMIDITY_3BATCH
        used_fallback = True

    r_temp = raw_input.get("rolling_ambient_temp_3batch")
    if r_temp is not None:
        vec["rolling_ambient_temp_3batch"] = float(r_temp)
    else:
        vec["rolling_ambient_temp_3batch"] = FALLBACK_ROLLING_AMBIENT_TEMP_3BATCH
        used_fallback = True

    # 7. One-hot Region (Reference: 'Low-Country' -> all zeros)
    raw_region = str(raw_input.get("region", "Low-Country")).strip()
    vec["region_Nuwara Eliya"] = 1.0 if raw_region == "Nuwara Eliya" else 0.0
    vec["region_Uva"] = 1.0 if raw_region == "Uva" else 0.0

    # 8. One-hot Tea Grade Produced (Reference: 'BOP' -> all zeros)
    raw_grade = str(raw_input.get("tea_grade_produced", "BOP")).strip().upper()
    vec["tea_grade_produced_PEKOE"] = 1.0 if raw_grade == "PEKOE" else 0.0
    vec["tea_grade_produced_FBOP"] = 1.0 if raw_grade == "FBOP" else 0.0
    vec["tea_grade_produced_OP"] = 1.0 if raw_grade == "OP" else 0.0
    vec["tea_grade_produced_BOPF"] = 1.0 if raw_grade == "BOPF" else 0.0
    vec["tea_grade_produced_DUST"] = 1.0 if raw_grade == "DUST" else 0.0

    # Guarantee exact column ordering
    ordered_vec = {col: vec[col] for col in EXPECTED_FEATURE_COLUMNS}
    return ordered_vec, used_fallback
