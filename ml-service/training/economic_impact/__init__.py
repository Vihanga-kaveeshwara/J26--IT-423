"""
M2 Component: Refuse-Tea Prediction & System Integration
Economic Impact Calculator Package
"""

from .economic_calculator import (
    calculate_economic_impact,
    DEFAULT_GRADE_PRICES,
    DEFAULT_YIELD_RATIO,
)

__all__ = [
    "calculate_economic_impact",
    "DEFAULT_GRADE_PRICES",
    "DEFAULT_YIELD_RATIO",
]
