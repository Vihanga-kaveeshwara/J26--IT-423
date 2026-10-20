"""
M2 Component: Refuse-Tea Prediction & System Integration
Data Preprocessing & Feature Engineering Pipeline

This module implements the complete data preprocessing, advanced feature engineering,
and feature selection pipeline based strictly on the empirical findings documented in
the Exploratory Data Analysis report (ml-service/training/eda/eda_report.md) and the
project methodology (Section 3.1 & Figure 2).

Stages:
- Stage 1: Data cleaning, sanity assertions, leakage drops, base feature engineering.
- Stage 2: Causal per-factory rolling weather averages, ordinal withering duration buckets,
           and Mutual Information Feature Selection.

Outputs generated in ml-service/training/dataset/processed/:
1. X_features.csv          - Stage 1 baseline feature matrix (22 cols)
2. X_features_full.csv     - Stage 2 full feature matrix (25 cols)
3. mi_feature_ranking.csv  - Mutual Information scores for all 25 features
4. X_features_selected.csv - Stage 2 MI-selected modeling feature matrix (~18-19 cols)
5. y_target.csv            - Raw continuous regression target (refuse_tea_pct)
6. metadata.csv            - Traceability metadata (batch_id, factory_id, batch_date,
                             refuse_resale_status, raw tea_grade_produced)

Usage:
    cd ml-service/training
    python preprocessing.py
"""

import os
import sys
from typing import Tuple, Dict, Any, List
import numpy as np
import pandas as pd
from sklearn.feature_selection import mutual_info_regression

# -----------------------------------------------------------------------------
# Path Configurations
# -----------------------------------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(SCRIPT_DIR, 'dataset')
PROCESSED_DIR = os.path.join(DATASET_DIR, 'processed')

RAW_DATASET_CANDIDATES = [
    os.path.join(DATASET_DIR, 'M2_refuse_tea_synthetic_dataset.csv'),
    os.path.join(DATASET_DIR, 'M2_refuse_tea_synthetic_dataset-new.csv')
]


# =============================================================================
# Stage 1: Data Cleaning, Sanity Assertions & Base Feature Engineering
# =============================================================================

def load_raw_dataset(dataset_path: str = None) -> pd.DataFrame:
    """
    Locate and load the raw synthetic tea manufacturing dataset.
    
    Args:
        dataset_path: Optional explicit path to the CSV file.
        
    Returns:
        pd.DataFrame containing the raw batch records.
    """
    if dataset_path and os.path.exists(dataset_path):
        target_path = dataset_path
    else:
        target_path = None
        for p in RAW_DATASET_CANDIDATES:
            if os.path.exists(p):
                target_path = p
                break
        if not target_path:
            raise FileNotFoundError(
                f"Raw dataset not found in {DATASET_DIR}. "
                f"Expected 'M2_refuse_tea_synthetic_dataset.csv'."
            )
            
    print(f"[PREPROCESSING - STAGE 1] Loading raw dataset from: {target_path}")
    df = pd.read_csv(target_path)
    return df


def validate_raw_data(df: pd.DataFrame) -> None:
    """
    Defensively re-verify data-quality and sanity properties established in EDA Section 1.
    Raises AssertionError if any check fails, preventing contaminated data ingestion.
    """
    print("[PREPROCESSING - STAGE 1] Running defensive data-quality and sanity assertions...")

    # 1. Missing Value Audit (EDA Section 1.1)
    null_counts = df.isnull().sum()
    total_nulls = null_counts.sum()
    assert total_nulls == 0, (
        f"Data quality assertion failed: Expected 0 missing values, found {total_nulls}. "
        f"Columns with nulls: {null_counts[null_counts > 0].to_dict()}"
    )

    # 2. Primary Key Uniqueness (EDA Section 1.1)
    assert 'batch_id' in df.columns, "Expected 'batch_id' column in raw dataset."
    dup_ids = df['batch_id'].duplicated().sum()
    assert dup_ids == 0, (
        f"Data quality assertion failed: Found {dup_ids} duplicate batch_id values."
    )

    # 3. Mass Non-Negativity (EDA Section 1.2)
    mass_cols = ['green_leaf_input_kg', 'made_tea_output_kg', 'refuse_tea_kg']
    for col in mass_cols:
        assert col in df.columns, f"Expected column '{col}' in raw dataset."
        assert (df[col] >= 0).all(), f"Physical sanity failed: Negative mass detected in '{col}'."

    # 4. Outturn Ratio Sanity Check (EDA Section 1.2)
    # Total dry tea output / green leaf intake strictly between 15% and 35% (norm: 21-23%)
    total_output = df['made_tea_output_kg'] + df['refuse_tea_kg']
    outturn = total_output / df['green_leaf_input_kg']
    assert (outturn >= 0.15).all() and (outturn <= 0.35).all(), (
        f"Physical sanity failed: Outturn ratio out of realistic range [0.15, 0.35]. "
        f"Min observed: {outturn.min():.4f}, Max observed: {outturn.max():.4f}"
    )

    # 5. Process Parameter Sanity Bounds (EDA Section 1.2 & Section 3)
    assert (df['withering_duration_hrs'] > 0).all(), "Non-positive withering_duration_hrs found."
    assert (df['dryer_temperature_c'] > 0).all(), "Non-positive dryer_temperature_c found."
    assert (df['machine_downtime_hrs'] >= 0).all(), "Negative machine_downtime_hrs found."
    assert (df['relative_humidity_pct'] >= 0).all() and (df['relative_humidity_pct'] <= 100).all(), (
        "relative_humidity_pct outside [0, 100]% interval."
    )
    assert (df['plucking_fine_leaf_pct'] >= 0).all() and (df['plucking_fine_leaf_pct'] <= 100).all(), (
        "plucking_fine_leaf_pct outside [0, 100]% interval."
    )

    # 6. Target Variable Boundaries (EDA Section 1.2 & Section 2)
    assert 'refuse_tea_pct' in df.columns, "Target column 'refuse_tea_pct' missing."
    assert (df['refuse_tea_pct'] >= 0).all() and (df['refuse_tea_pct'] <= 100).all(), (
        "Target 'refuse_tea_pct' values outside valid percentage range [0, 100]."
    )

    # 7. Date and Month Consistency (EDA Section 1.1 & Section 5)
    assert df['month'].between(1, 12).all(), "Month values outside range 1-12."
    try:
        parsed_dates = pd.to_datetime(df['batch_date'], format='%Y-%m-%d')
        assert (parsed_dates.dt.month == df['month']).all(), (
            "Mismatch between parsed batch_date month and recorded 'month' column."
        )
    except Exception as e:
        raise AssertionError(f"Batch date validation failed: {e}")

    print(" -> All data-quality and sanity assertions PASSED successfully.")


def engineer_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Transforms the validated raw dataset into model-ready features, separate target,
    and metadata tables based strictly on EDA findings.
    
    EDA Cross-References:
    - Drop made_tea_output_kg & refuse_tea_kg: Target leakage (EDA Section 6)
    - Drop elevation_band: 100% collinear with region (EDA Section 7.2)
    - Set aside batch_id, factory_id, batch_date, refuse_resale_status into metadata (EDA Section 5 & 7.2)
    - Engineer withering_deviation: abs(withering - 17.0h) (EDA Section 4.2)
    - Engineer dryer_deviation: abs(dryer - 111.0°C) (EDA Section 4.2)
    - Engineer machine_downtime_log: np.log1p(downtime) (EDA Section 3.1 & 7.1)
    - Cyclical month encoding: sin & cos of month (EDA Section 7.1)
    - One-hot encode categoricals with drop_first=True (EDA Section 7.1)
    
    Returns:
        Tuple of (X_features, y_target, metadata)
    """
    print("[PREPROCESSING - STAGE 1] Applying base feature engineering and exclusions...")

    # Preserve exact row alignment across all outputs
    X = pd.DataFrame(index=df.index)

    # -------------------------------------------------------------------------
    # Tier 1 Features: Non-Linear & Skewed Operational Controls
    # -------------------------------------------------------------------------
    # 1. Withering duration (EDA Section 4.2: U-shaped response, optimum at 16.5-17.5h)
    X['withering_duration_hrs'] = df['withering_duration_hrs'].astype(float)
    X['withering_deviation'] = (df['withering_duration_hrs'] - 17.0).abs()

    # 2. Dryer temperature (EDA Section 4.2: V-shaped response, optimum at 109-113°C)
    X['dryer_temperature_c'] = df['dryer_temperature_c'].astype(float)
    X['dryer_deviation'] = (df['dryer_temperature_c'] - 111.0).abs()

    # 3. Machine downtime (EDA Section 3.1: Skew +1.73, 5.5% heavy outlier tail)
    # Keep raw hours and log1p; do not clip outliers (mechanical breakdowns are real events)
    X['machine_downtime_hrs'] = df['machine_downtime_hrs'].astype(float)
    X['machine_downtime_log'] = np.log1p(df['machine_downtime_hrs']).astype(float)

    # -------------------------------------------------------------------------
    # Tier 2 Features: Moderate Signal Monotonic Operational Controls
    # -------------------------------------------------------------------------
    # StandardScaler will be applied in train.py cross-validation pipeline, not here.
    X['relative_humidity_pct'] = df['relative_humidity_pct'].astype(float)
    X['plucking_fine_leaf_pct'] = df['plucking_fine_leaf_pct'].astype(float)
    X['green_leaf_input_kg'] = df['green_leaf_input_kg'].astype(float)
    X['ambient_temperature_c'] = df['ambient_temperature_c'].astype(float)

    # -------------------------------------------------------------------------
    # Tier 3 Features: Temporal, Cyclical & Categorical Encodings
    # -------------------------------------------------------------------------
    # Month: Raw integer (1-12) + cyclical sine/cosine representation
    month_rad = 2.0 * np.pi * df['month'] / 12.0
    X['month'] = df['month'].astype(int)
    X['month_sin'] = np.sin(month_rad).astype(float)
    X['month_cos'] = np.cos(month_rad).astype(float)

    # One-hot encoding for categoricals with drop_first=True
    # Region: Low-Country (base), Nuwara Eliya, Uva
    region_dummies = pd.get_dummies(df['region'], prefix='region', drop_first=True, dtype=int)

    # Season: INTER_MONSOON (base), NE_MONSOON, SW_MONSOON
    season_dummies = pd.get_dummies(df['season'], prefix='season', drop_first=True, dtype=int)

    # Tea Grade Produced: BOP (base), BOPF, DUST, FBOP, OP, PEKOE
    grade_dummies = pd.get_dummies(df['tea_grade_produced'], prefix='tea_grade_produced', drop_first=True, dtype=int)

    X = pd.concat([X, region_dummies, season_dummies, grade_dummies], axis=1)

    # -------------------------------------------------------------------------
    # Target Variable (y)
    # -------------------------------------------------------------------------
    # EDA Section 2: Kept continuous and unscaled for train.py
    y = pd.DataFrame({'refuse_tea_pct': df['refuse_tea_pct'].astype(float)}, index=df.index)

    # -------------------------------------------------------------------------
    # Metadata Table (Set aside from X)
    # -------------------------------------------------------------------------
    # Preserved for chronological train/val splits and economic simulation
    metadata = pd.DataFrame({
        'batch_id': df['batch_id'].astype(str),
        'factory_id': df['factory_id'].astype(str),
        'batch_date': pd.to_datetime(df['batch_date']).dt.strftime('%Y-%m-%d'),
        'refuse_resale_status': df['refuse_resale_status'].astype(str),
        'tea_grade_produced': df['tea_grade_produced'].astype(str)
    }, index=df.index)

    # -------------------------------------------------------------------------
    # Critical Leakage & Exclusion Verification
    # -------------------------------------------------------------------------
    forbidden_leakage_columns = [
        'made_tea_output_kg',    # EDA Section 6: Target leakage
        'refuse_tea_kg',         # EDA Section 6: Target leakage
        'refuse_tea_pct',        # Target variable
        'elevation_band',        # EDA Section 7.2: 100% collinear with region
        'batch_id',              # Identifier (in metadata)
        'refuse_resale_status',  # Post-hoc outcome (in metadata)
        'factory_id',            # Random-effect / grouping (in metadata)
        'batch_date'             # Timestamp (in metadata)
    ]
    for forbidden in forbidden_leakage_columns:
        assert forbidden not in X.columns, (
            f"CRITICAL LEAKAGE / EXCLUSION VIOLATION: '{forbidden}' is present in feature matrix X!"
        )

    # Consistency assertions
    assert len(X) == len(df), f"Row mismatch in X: {len(X)} vs {len(df)}"
    assert len(y) == len(df), f"Row mismatch in y: {len(y)} vs {len(df)}"
    assert len(metadata) == len(df), f"Row mismatch in metadata: {len(metadata)} vs {len(df)}"
    assert (X.index == y.index).all() and (X.index == metadata.index).all(), "Index mismatch across output tables."

    print(f" -> Stage 1 complete: X_base shape={X.shape}, y shape={y.shape}, metadata shape={metadata.shape}")
    return X, y, metadata


def save_processed_data(
    X: pd.DataFrame,
    y: pd.DataFrame,
    metadata: pd.DataFrame,
    output_dir: str = PROCESSED_DIR
) -> Dict[str, str]:
    """
    Saves Stage 1 outputs: X_features.csv, y_target.csv, and metadata.csv to processed directory.
    """
    os.makedirs(output_dir, exist_ok=True)
    
    x_path = os.path.join(output_dir, 'X_features.csv')
    y_path = os.path.join(output_dir, 'y_target.csv')
    meta_path = os.path.join(output_dir, 'metadata.csv')

    print(f"[PREPROCESSING - STAGE 1] Saving Stage 1 outputs to: {output_dir}")
    X.to_csv(x_path, index=False)
    y.to_csv(y_path, index=False)
    metadata.to_csv(meta_path, index=False)

    print(f" -> Saved: {x_path} ({os.path.getsize(x_path):,} bytes)")
    print(f" -> Saved: {y_path} ({os.path.getsize(y_path):,} bytes)")
    print(f" -> Saved: {meta_path} ({os.path.getsize(meta_path):,} bytes)")

    return {
        'X_features': x_path,
        'y_target': y_path,
        'metadata': meta_path
    }


# =============================================================================
# Stage 2: Advanced Feature Engineering & Selection
# =============================================================================

def engineer_advanced_features(X_base: pd.DataFrame, metadata: pd.DataFrame) -> pd.DataFrame:
    """
    Stage 2 Advanced Feature Engineering (Methodology Section 3.1 & EDA Section 4).
    
    1. Causal Rolling Weather Averages:
       - Computes 3-batch trailing rolling means for relative_humidity_pct and
         ambient_temperature_c grouped strictly by factory_id and ordered by batch_date.
       - Strictly causal: center=False, min_periods=1, preventing forward-looking data leakage.
       - Explicit verification: Earliest batch per factory strictly equals the raw value.
       - Restores original positional row order to align with y and metadata.
       
    2. Withering Duration Buckets:
       - Categorizes withering_duration_hrs into 5 ordinal integer buckets (0-4)
         using exact EDA report Section 4 / Figure 4 thresholds.
       - Ordinal format (0 to 4) preserves natural progression from under-wither to over-wither.
       
    3. Shift Indicators (Documented Skip):
       - NOTE (Methodology Section 3.1): Shift indicator feature was intentionally skipped
         because sub-daily/shift-level granularity does not exist in the current synthetic
         dataset (records represent daily factory batches). Fabricating shift labels would be
         invalid data generation; real shift logs will be incorporated when factory telemetry is live.
         
    Returns:
        X_full: Extended feature matrix (620 rows × 25 features).
    """
    print("[PREPROCESSING - STAGE 2] Computing advanced features (causal rolling weather & withering buckets)...")

    # -------------------------------------------------------------------------
    # 1. Causal Rolling Weather Averages (Per-Factory, Time-Ordered)
    # -------------------------------------------------------------------------
    # Join factory_id and batch_date by positional index (temporary sorting keys only)
    temp = pd.DataFrame({
        'factory_id': metadata['factory_id'],
        'batch_date': pd.to_datetime(metadata['batch_date']),
        'relative_humidity_pct': X_base['relative_humidity_pct'],
        'ambient_temperature_c': X_base['ambient_temperature_c']
    }, index=X_base.index)

    # Sort strictly by factory and chronological date to guarantee causality
    temp_sorted = temp.sort_values(by=['factory_id', 'batch_date']).copy()

    # Compute trailing (causal) 3-batch rolling means per factory group
    temp_sorted['rolling_humidity_3batch'] = (
        temp_sorted.groupby('factory_id')['relative_humidity_pct']
        .rolling(window=3, min_periods=1)
        .mean()
        .reset_index(level=0, drop=True)
    )
    temp_sorted['rolling_ambient_temp_3batch'] = (
        temp_sorted.groupby('factory_id')['ambient_temperature_c']
        .rolling(window=3, min_periods=1)
        .mean()
        .reset_index(level=0, drop=True)
    )

    # CRITICAL CAUSALITY AUDIT:
    # Verify that for the very first batch of each factory, rolling value == raw value
    print(" -> Verifying causal trailing window integrity (window=1 for earliest factory batches)...")
    for f_id, grp in temp_sorted.groupby('factory_id'):
        first_row = grp.iloc[0]
        assert np.isclose(first_row['rolling_humidity_3batch'], first_row['relative_humidity_pct'], atol=1e-5), (
            f"Causality audit FAILED: Factory {f_id} earliest humidity rolling ({first_row['rolling_humidity_3batch']}) "
            f"!= raw ({first_row['relative_humidity_pct']})."
        )
        assert np.isclose(first_row['rolling_ambient_temp_3batch'], first_row['ambient_temperature_c'], atol=1e-5), (
            f"Causality audit FAILED: Factory {f_id} earliest ambient temp rolling ({first_row['rolling_ambient_temp_3batch']}) "
            f"!= raw ({first_row['ambient_temperature_c']})."
        )
    print("    [CONFIRMED] Causal verification passed: Earliest batch per factory strictly equals raw value.")

    # Restore exact original row order matching X_base, y, and metadata positionally
    temp_restored = temp_sorted.sort_index()
    assert (temp_restored.index == X_base.index).all(), "Index mismatch during row restoration."

    # -------------------------------------------------------------------------
    # 2. Withering Duration Buckets (Ordinal 0-4, EDA Section 4 & Figure 4)
    # -------------------------------------------------------------------------
    # Bin thresholds:
    #   < 15.0h      -> 0 (Under-withered)
    #   15.0 - 16.5h -> 1 (Mild under)
    #   16.5 - 17.5h -> 2 (Optimal window)
    #   17.5 - 19.0h -> 3 (Mild over)
    #   > 19.0h      -> 4 (Over-withered)
    w_bins = [-np.inf, 15.0, 16.5, 17.5, 19.0, np.inf]
    w_labels = [0, 1, 2, 3, 4]
    withering_bucket = pd.cut(
        X_base['withering_duration_hrs'],
        bins=w_bins,
        labels=w_labels,
        right=False
    ).astype(int)

    assert withering_bucket.isnull().sum() == 0, "Null values generated during withering bucketing."

    # -------------------------------------------------------------------------
    # 3. Assemble Full Feature Matrix (X_full)
    # -------------------------------------------------------------------------
    X_full = X_base.copy()
    X_full['rolling_humidity_3batch'] = temp_restored['rolling_humidity_3batch'].astype(float)
    X_full['rolling_ambient_temp_3batch'] = temp_restored['rolling_ambient_temp_3batch'].astype(float)
    X_full['withering_duration_bucket'] = withering_bucket

    # Sanity checks
    assert len(X_full) == len(X_base), "Row count changed in X_full."
    assert X_full.isnull().sum().sum() == 0, "Missing values detected in X_full."

    print(f" -> Stage 2 feature engineering complete: X_full shape={X_full.shape} (25 features).")
    return X_full


def select_features_by_mutual_info(
    X_full: pd.DataFrame,
    y: pd.DataFrame,
    min_features: int = 18,
    random_state: int = 42
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Group-Aware Mutual Information Feature Selection (Methodology Figure 2 & Part A Patch).
    
    1. Computes non-parametric mutual information regression scores for all features
       against continuous target refuse_tea_pct using k-NN estimator.
    2. Groups one-hot-encoded dummy columns by categorical prefix:
       - 'region_' -> 'region'
       - 'season_' -> 'season'
       - 'tea_grade_produced_' -> 'tea_grade_produced'
       - All other continuous/ordinal columns -> 'individual'
    3. Computes group score = MAX(mi_score) among member dummy columns.
    4. Ranks mixed list of individual features and categorical groups descending by score.
    5. Selects units from the top until at least min_features (default: 18) actual columns are selected.
       A selected categorical group contributes ALL of its member dummy columns at once.
    6. Audits mandatory physical non-linear deviations (withering_deviation, dryer_deviation):
       - If either ranks outside selected columns, force-retains it with an explicit warning.
    7. Saves mi_ranking with columns: ['feature', 'mi_score', 'group'].
       
    Returns:
        X_selected: Selected feature matrix for train.py (19 features).
        mi_ranking: DataFrame containing all features, their MI scores, and their group.
    """
    print(f"[PREPROCESSING - STAGE 2] Computing Mutual Information scores across {X_full.shape[1]} features...")

    y_target = y['refuse_tea_pct'].values.ravel()
    mi_scores = mutual_info_regression(X_full, y_target, random_state=random_state)

    # Prefix definitions for one-hot groups
    prefixes = ['region_', 'season_', 'tea_grade_produced_']

    def assign_group(col_name: str) -> str:
        for p in prefixes:
            if col_name.startswith(p):
                return p[:-1]
        return 'individual'

    mi_ranking = pd.DataFrame({
        'feature': X_full.columns,
        'mi_score': mi_scores,
        'group': [assign_group(c) for c in X_full.columns]
    }).sort_values(by='mi_score', ascending=False).reset_index(drop=True)

    # Build group-level ranking units
    # Categoricals score = MAX(mi_score) of member dummies; individuals score = individual mi_score
    ranking_units = []
    categorical_groups = ['region', 'season', 'tea_grade_produced']

    for grp in categorical_groups:
        grp_rows = mi_ranking[mi_ranking['group'] == grp]
        if not grp_rows.empty:
            ranking_units.append({
                'unit_type': 'categorical_group',
                'name': grp,
                'score': grp_rows['mi_score'].max(),
                'columns': grp_rows['feature'].tolist()
            })

    for _, row in mi_ranking[mi_ranking['group'] == 'individual'].iterrows():
        ranking_units.append({
            'unit_type': 'individual',
            'name': row['feature'],
            'score': row['mi_score'],
            'columns': [row['feature']]
        })

    # Sort units descending by score
    ranking_units_df = pd.DataFrame(ranking_units).sort_values(by='score', ascending=False).reset_index(drop=True)

    print("\n[PREPROCESSING - STAGE 2] Group-Aware Ranking Units:")
    for idx, r in ranking_units_df.iterrows():
        print(f"  {idx+1:2d}. {r['name']:<25} ({r['unit_type']:<17}) Max Score = {r['score']:.6f} (cols: {len(r['columns'])})")

    # Select units from top until at least min_features columns are collected
    selected_features = []
    selected_units = []

    for _, unit in ranking_units_df.iterrows():
        selected_units.append(unit['name'])
        for col in unit['columns']:
            if col not in selected_features:
                selected_features.append(col)
        if len(selected_features) >= min_features:
            break

    print(f"\n -> Selected {len(selected_features)} columns from units: {selected_units}")

    # Mandatory non-linear physical features audit (EDA Section 4)
    mandatory_features = ['withering_deviation', 'dryer_deviation']
    print("\n[PREPROCESSING - STAGE 2] Mandatory Non-Linear Feature Audit:")
    for feat in mandatory_features:
        rank = mi_ranking[mi_ranking['feature'] == feat].index[0] + 1
        score = mi_ranking.loc[mi_ranking['feature'] == feat, 'mi_score'].values[0]
        if feat in selected_features:
            print(f"  [PASSED] '{feat}' included on its own merit (Individual Rank #{rank}, MI score = {score:.6f}).")
        else:
            print(
                f"  [FORCE-INCLUDED] '{feat}' (Individual Rank #{rank}, MI score = {score:.6f}).\n"
                f"    WARNING: k-NN continuous MI estimation at n=620 exhibits estimator noise on symmetric curves.\n"
                f"    Retained based on EDA Section 4 empirical evidence demonstrating the physical V-shaped\n"
                f"    operating curve (optimum at 109-113°C) critical for tree-based XGBoost splits."
            )
            selected_features.append(feat)

    X_selected = X_full[selected_features].copy()

    # Assertions
    assert len(X_selected) == len(X_full), "Row count mismatch in X_selected."
    assert len(selected_features) == len(set(selected_features)), "Duplicate columns in X_selected."

    print(f" -> Group-aware feature selection complete: X_selected shape={X_selected.shape} ({len(selected_features)} features).")
    return X_selected, mi_ranking


def save_stage2_data(
    X_full: pd.DataFrame,
    mi_ranking: pd.DataFrame,
    X_selected: pd.DataFrame,
    output_dir: str = PROCESSED_DIR
) -> Dict[str, str]:
    """
    Saves Stage 2 outputs to the processed directory.
    """
    os.makedirs(output_dir, exist_ok=True)

    full_path = os.path.join(output_dir, 'X_features_full.csv')
    mi_path = os.path.join(output_dir, 'mi_feature_ranking.csv')
    selected_path = os.path.join(output_dir, 'X_features_selected.csv')

    print(f"[PREPROCESSING - STAGE 2] Saving Stage 2 outputs to: {output_dir}")
    X_full.to_csv(full_path, index=False)
    mi_ranking.to_csv(mi_path, index=False)
    X_selected.to_csv(selected_path, index=False)

    print(f" -> Saved: {full_path} ({os.path.getsize(full_path):,} bytes)")
    print(f" -> Saved: {mi_path} ({os.path.getsize(mi_path):,} bytes)")
    print(f" -> Saved: {selected_path} ({os.path.getsize(selected_path):,} bytes)")

    return {
        'X_features_full': full_path,
        'mi_feature_ranking': mi_path,
        'X_features_selected': selected_path
    }


# =============================================================================
# Main Pipeline Orchestrator
# =============================================================================

def prepare_dataset(dataset_path: str = None, output_dir: str = PROCESSED_DIR) -> Dict[str, Any]:
    """
    Executes the end-to-end preprocessing, feature engineering, and selection pipeline.
    
    Returns:
        Dictionary containing DataFrames and file paths.
    """
    print("\n" + "="*80)
    print("M2 REFUSE-TEA PREPROCESSING PIPELINE (STAGES 1 & 2)")
    print("="*80)

    # -------------------------------------------------------------------------
    # Stage 1: Load, Validate, Clean, Base Engineer
    # -------------------------------------------------------------------------
    raw_df = load_raw_dataset(dataset_path)
    validate_raw_data(raw_df)
    X_base, y, metadata = engineer_features(raw_df)
    stage1_paths = save_processed_data(X_base, y, metadata, output_dir)

    # -------------------------------------------------------------------------
    # Stage 2: Advanced Feature Engineering & Mutual Information Selection
    # -------------------------------------------------------------------------
    X_full = engineer_advanced_features(X_base, metadata)
    X_selected, mi_ranking = select_features_by_mutual_info(X_full, y, min_features=18, random_state=42)
    stage2_paths = save_stage2_data(X_full, mi_ranking, X_selected, output_dir)

    # -------------------------------------------------------------------------
    # Final Pipeline Summary
    # -------------------------------------------------------------------------
    print("\n" + "="*80)
    print("PREPROCESSING PIPELINE EXECUTION SUMMARY")
    print("="*80)
    print(f"Raw Input:               {raw_df.shape[0]} rows × {raw_df.shape[1]} columns")
    print(f"X_features (Stage 1):    {X_base.shape[0]} rows × {X_base.shape[1]} columns")
    print(f"X_features_full:         {X_full.shape[0]} rows × {X_full.shape[1]} columns")
    print(f"X_features_selected:     {X_selected.shape[0]} rows × {X_selected.shape[1]} columns")
    print(f"y_target:                {y.shape[0]} rows × {y.shape[1]} target ('{y.columns[0]}')")
    print(f"metadata:                {metadata.shape[0]} rows × {metadata.shape[1]} columns")

    print("\nTop 10 Features by Mutual Information Score:")
    for idx, row in mi_ranking.head(10).iterrows():
        print(f"  {idx+1:2d}. {row['feature']:<30} MI Score = {row['mi_score']:.6f}")

    print("\nFinal X_features_selected Columns:")
    for i, col in enumerate(X_selected.columns, 1):
        print(f"  {i:2d}. {col}")

    print("\nIntegrity & Leakage Verification:")
    print("  [CONFIRMED] Causal trailing rolling window: earliest batch per factory == raw value")
    print("  [CONFIRMED] made_tea_output_kg  ABSENT from all X outputs (Target Leakage)")
    print("  [CONFIRMED] refuse_tea_kg       ABSENT from all X outputs (Target Leakage)")
    print("  [CONFIRMED] elevation_band      ABSENT from all X outputs (Collinear with region)")
    print("  [CONFIRMED] refuse_resale_status ABSENT from all X outputs (Preserved in metadata.csv)")
    print("  [CONFIRMED] factory_id          ABSENT from all X outputs (Preserved in metadata.csv)")
    print("  [CONFIRMED] batch_date          ABSENT from all X outputs (Preserved in metadata.csv)")
    print("  [CONFIRMED] batch_id            ABSENT from all X outputs (Preserved in metadata.csv)")
    print("="*80 + "\n")

    return {
        'X_base': X_base,
        'X_full': X_full,
        'X_selected': X_selected,
        'y': y,
        'metadata': metadata,
        'mi_ranking': mi_ranking,
        'paths': {**stage1_paths, **stage2_paths}
    }


if __name__ == '__main__':
    prepare_dataset()
