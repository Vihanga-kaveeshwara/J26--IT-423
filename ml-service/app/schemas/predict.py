"""
Pydantic Schemas for Refuse Tea Prediction Endpoint
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class BatchOperationalData(BaseModel):
    """Raw operational batch parameters for tea processing."""
    green_leaf_input_kg: float = Field(
        ...,
        gt=0.0,
        description="Wet green leaf mass received at withering troughs (kg).",
        examples=[9316.0]
    )
    withering_duration_hrs: float = Field(
        ...,
        gt=0.0,
        le=48.0,
        description="Duration of withering trough airflow (hours). TRI optimum is 16.5-17.5h.",
        examples=[15.3]
    )
    dryer_temperature_c: float = Field(
        ...,
        gt=50.0,
        le=200.0,
        description="Operating temperature of fluidized bed dryer (°C). TRI optimum is 111.0°C.",
        examples=[110.0]
    )
    machine_downtime_hrs: float = Field(
        0.0,
        ge=0.0,
        description="Mechanical line breakdown outage duration (hours).",
        examples=[2.71]
    )
    plucking_fine_leaf_pct: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Percentage of fine leaf (2-leaves-and-a-bud compliance).",
        examples=[89.4]
    )
    relative_humidity_pct: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Ambient relative humidity inside the factory (%).",
        examples=[94.9]
    )
    ambient_temperature_c: float = Field(
        ...,
        ge=-10.0,
        le=60.0,
        description="Ambient factory temperature (°C).",
        examples=[27.7]
    )
    region: str = Field(
        ...,
        description="Tea cultivation elevation region ('Low-Country', 'Nuwara Eliya', or 'Uva').",
        examples=["Low-Country"]
    )
    tea_grade_produced: str = Field(
        ...,
        description="Primary commercial tea grade target ('BOP', 'BOPF', 'DUST', 'FBOP', 'OP', 'PEKOE').",
        examples=["BOP"]
    )
    season: Optional[str] = Field(
        None,
        description="Monsoon season tag ('SW_MONSOON', 'NE_MONSOON', 'INTER_MONSOON').",
        examples=["SW_MONSOON"]
    )
    month: Optional[int] = Field(
        None,
        ge=1,
        le=12,
        description="Calendar month integer (1-12).",
        examples=[9]
    )
    rolling_humidity_3batch: Optional[float] = Field(
        None,
        ge=0.0,
        le=100.0,
        description=(
            "Trailing 3-batch average relative humidity (%). If omitted, falls back to "
            "the historical dataset mean (~77.37%) with used_fallback_rolling_features=True."
        ),
        examples=[86.5]
    )
    rolling_ambient_temp_3batch: Optional[float] = Field(
        None,
        ge=-10.0,
        le=60.0,
        description=(
            "Trailing 3-batch average ambient temperature (°C). If omitted, falls back to "
            "the historical dataset mean (~22.96°C) with used_fallback_rolling_features=True."
        ),
        examples=[26.7]
    )


class PredictRequest(BatchOperationalData):
    """Inference request body containing batch operational parameters."""
    pass


class PredictResponse(BaseModel):
    """Inference response containing predicted refuse percentage and latency."""
    success: bool = True
    predicted_refuse_tea_pct: float = Field(
        ...,
        description="Predicted refuse tea percentage (refuse_tea_pct)."
    )
    latency_ms: float = Field(
        ...,
        description="End-to-end inference latency in milliseconds."
    )
    used_fallback_rolling_features: bool = Field(
        ...,
        description="Indicates whether historical mean fallbacks were used for trailing rolling weather."
    )
    feature_vector: Optional[Dict[str, float]] = Field(
        None,
        description="The exact 19-column aligned feature vector fed to the XGBoost model."
    )
