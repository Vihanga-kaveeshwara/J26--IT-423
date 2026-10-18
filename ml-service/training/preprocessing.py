"""Training preprocessing scaffold.

Future implementation locations:
- Load the project dataset from training/dataset.
- Clean and validate raw records.
- Extract and transform model features.
- Fit reusable preprocessing steps.
"""

import os
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer

DATASET_DIR = Path(__file__).resolve().parent / "dataset"
M1_DATASET_PATH = DATASET_DIR / "m1_demand_data.csv"
M2_DATASET_PATH = DATASET_DIR / "m2_logistics_data.csv"


def extract_quarter_features(df: pd.DataFrame, quarter_col: str = "quarter") -> pd.DataFrame:
    """Extracts numerical year, quarter index, and cyclical trigonometric features."""
    df = df.copy()
    if quarter_col in df.columns:
        # e.g., 2024Q1
        df["year"] = df[quarter_col].str.slice(0, 4).astype(int)
        df["quarter_num"] = df[quarter_col].str.slice(5, 6).astype(int)
        # Cyclical quarterly seasonality
        df["sin_quarter"] = np.sin(2 * np.pi * df["quarter_num"] / 4.0)
        df["cos_quarter"] = np.cos(2 * np.pi * df["quarter_num"] / 4.0)
    return df


def prepare_demand_dataset(test_size: float = 0.2, random_state: int = 42):
    """Loads and preprocesses M1 tea export demand forecasting dataset.
    
    Predicts demand volume (kg) by market, tea grade, and quarter.
    """
    if not M1_DATASET_PATH.exists():
        # Fallback to datasets/mock
        alt_path = Path(__file__).resolve().parents[2] / "datasets" / "mock" / "m1_demand_forecasts.csv"
        df = pd.read_csv(alt_path)
    else:
        df = pd.read_csv(M1_DATASET_PATH)

    df = extract_quarter_features(df, "quarter")

    categorical_features = ["market", "tea_grade"]
    numerical_features = ["year", "quarter_num", "sin_quarter", "cos_quarter"]
    target_col = "predicted_demand_kg"

    X = df[categorical_features + numerical_features]
    y = df[target_col].astype(float)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, shuffle=True
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_features),
            ("num", StandardScaler(), numerical_features),
        ],
        remainder="drop",
    )

    return {
        "X_train": X_train,
        "X_test": X_test,
        "y_train": y_train,
        "y_test": y_test,
        "preprocessor": preprocessor,
        "feature_names": categorical_features + numerical_features,
        "dataset_shape": df.shape,
    }


def prepare_logistics_dataset(test_size: float = 0.2, random_state: int = 42):
    """Loads and preprocesses M2 maritime logistics freight and risk dataset."""
    if not M2_DATASET_PATH.exists():
        alt_path = Path(__file__).resolve().parents[2] / "datasets" / "mock" / "m2_logistics_predictions.csv"
        df = pd.read_csv(alt_path)
    else:
        df = pd.read_csv(M2_DATASET_PATH)

    df = extract_quarter_features(df, "quarter")

    categorical_features = ["route_id"]
    numerical_features = ["estimated_transit_days", "year", "quarter_num", "sin_quarter", "cos_quarter"]
    target_col = "estimated_freight_cost_usd_per_kg"

    X = df[categorical_features + numerical_features]
    y = df[target_col].astype(float)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, shuffle=True
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_features),
            ("num", StandardScaler(), numerical_features),
        ],
        remainder="drop",
    )

    return {
        "X_train": X_train,
        "X_test": X_test,
        "y_train": y_train,
        "y_test": y_test,
        "preprocessor": preprocessor,
        "feature_names": categorical_features + numerical_features,
        "dataset_shape": df.shape,
    }


def prepare_dataset():
    """Default interface function implemented for backward compatibility."""
    return prepare_demand_dataset()
