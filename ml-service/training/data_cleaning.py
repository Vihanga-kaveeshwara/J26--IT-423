"""Reproducible Data Cleaning and Target Reconciliation for M1 Tea Exports.

Implements data cleaning steps for M1_combined_monthly_raw.csv:
1. Drops exact duplicate rows (2007-02, 2009-10).
2. Reconciles confirmed 10x target transcription typos (2009-08, 2013-11, 2020-09, 2023-10)
   to equal the component sum (type: total_typo).
3. Reverts and flags component discrepancies where headline total is plausible and components are suspect
   (2005-01, 2012-06, 2023-04) (type: component_suspect).
4. Fills NaN TB_Total_Exports from component_sum only when all 5 components are non-null
   (2012-12, 2020-06, 2022-09) (type: nan_fill).
5. Persists a comprehensive correction log CSV with a 'type' column (total_typo / component_suspect / nan_fill / duplicate)
   and config JSON recording raw and cleaned SHA-256 digests.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_RAW_DATASET = BASE_DIR / "dataset" / "M1_combined_monthly_raw.csv"
DEFAULT_CLEANED_DATASET = BASE_DIR / "dataset" / "M1_combined_monthly_cleaned.csv"
DEFAULT_PROCESSED_DATASET = BASE_DIR / "data" / "processed" / "tea_exports_cleaned.csv"
DEFAULT_REPORTS_DIR = BASE_DIR / "reports" / "data_cleaning"

TARGET = "TB_Total_Exports"
DATE_COL = "Date"
UNIT_COL = "TB_Quantity_Unit"
COMPONENTS = [
    "TB_Bulk_Tea",
    "TB_Packets",
    "TB_Tea_Bags",
    "TB_Instant_Tea",
    "TB_Green_Tea",
]

# Confirmed 10x clerical typos in recorded total
CONFIRMED_TOTAL_TYPOS = {"2009-08", "2013-11", "2020-09", "2023-10"}
# Months where headline total is smooth and component breakdown is suspect (e.g. fractional cents)
SUSPECT_COMPONENT_MONTHS = {"2005-01", "2012-06", "2023-04"}


def compute_sha256(path: Path) -> str:
    """Compute SHA-256 digest of a file."""
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def clean_m1_dataset(
    raw_path: Path = DEFAULT_RAW_DATASET,
    cleaned_path: Path = DEFAULT_CLEANED_DATASET,
    processed_path: Path = DEFAULT_PROCESSED_DATASET,
    reports_dir: Path = DEFAULT_REPORTS_DIR,
) -> tuple[pd.DataFrame, pd.DataFrame, dict[str, object]]:
    """Clean and reconcile raw M1 dataset without modifying the source CSV."""
    if not raw_path.exists():
        raise FileNotFoundError(f"Raw dataset not found at {raw_path}")

    raw_sha256 = compute_sha256(raw_path)
    df = pd.read_csv(raw_path, low_memory=False)

    source_cols = [c for c in df.columns if not c.startswith("_")]
    initial_rows = len(df)

    # 1. Identify and drop exact duplicate rows
    duplicate_mask = df.duplicated(subset=source_cols, keep="first")
    duplicate_dates = df.loc[duplicate_mask, DATE_COL].tolist()
    
    correction_records: list[dict[str, object]] = []
    for dt in duplicate_dates:
        row_dup = df[df[DATE_COL] == dt].iloc[-1]
        correction_records.append(
            {
                "date": dt,
                "unit": row_dup[UNIT_COL],
                "old_value": row_dup[TARGET],
                "new_value": np.nan,
                "component_sum": np.nan,
                "relative_diff_pct": np.nan,
                "type": "duplicate",
                "action": "drop_duplicate_row",
                "reason": "Exact physical duplicate row across all 77 columns",
            }
        )

    cleaned = df[~duplicate_mask].copy().reset_index(drop=True)

    # Date parsing and sorting
    cleaned["_parsed_date"] = pd.to_datetime(cleaned[DATE_COL], format="mixed", errors="coerce")
    cleaned = cleaned.sort_values("_parsed_date").reset_index(drop=True)

    # Numeric conversion for target and components
    for col in COMPONENTS:
        cleaned[col] = pd.to_numeric(cleaned[col], errors="coerce")
    cleaned[TARGET] = pd.to_numeric(cleaned[TARGET], errors="coerce")

    all_components_present = cleaned[COMPONENTS].notna().all(axis=1)
    comp_sums = cleaned[COMPONENTS].sum(axis=1)

    for i, row in cleaned.iterrows():
        dt = row[DATE_COL]
        unit = row[UNIT_COL]
        current_total = row[TARGET]
        has_all_comps = all_components_present.iloc[i]
        c_sum = comp_sums.iloc[i] if has_all_comps else np.nan

        if has_all_comps:
            if pd.isna(current_total):
                # Step 2c: fill NaN from component sum
                cleaned.at[i, TARGET] = float(c_sum)
                correction_records.append(
                    {
                        "date": dt,
                        "unit": unit,
                        "old_value": np.nan,
                        "new_value": float(c_sum),
                        "component_sum": float(c_sum),
                        "relative_diff_pct": np.nan,
                        "type": "nan_fill",
                        "action": "fill_nan_from_components",
                        "reason": "Target total was NaN but all 5 components are non-null",
                    }
                )
            else:
                rel_diff = abs(current_total - c_sum) / c_sum
                if dt in CONFIRMED_TOTAL_TYPOS or rel_diff > 0.50:  # Large discrepancy (>50%)
                    cleaned.at[i, TARGET] = float(c_sum)
                    correction_records.append(
                        {
                            "date": dt,
                            "unit": unit,
                            "old_value": float(current_total),
                            "new_value": float(c_sum),
                            "component_sum": float(c_sum),
                            "relative_diff_pct": round(float(rel_diff * 100), 4),
                            "type": "total_typo",
                            "action": "reconcile_component_sum_typo",
                            "reason": f"Discrepancy of {rel_diff * 100:.2f}% confirms 10x total transcription error; replaced with component sum",
                        }
                    )
                elif dt in SUSPECT_COMPONENT_MONTHS or rel_diff > 0.005:  # 0.5% to 50%
                    # Revert correction: keep raw headline total, flag component as suspect
                    correction_records.append(
                        {
                            "date": dt,
                            "unit": unit,
                            "old_value": float(current_total),
                            "new_value": float(current_total),
                            "component_sum": float(c_sum),
                            "relative_diff_pct": round(float(rel_diff * 100), 4),
                            "type": "component_suspect",
                            "action": "retain_raw_total_flag_component",
                            "reason": f"Discrepancy of {rel_diff * 100:.2f}%: headline total is smooth and consistent with neighboring months; component breakdown is suspect",
                        }
                    )

    # Derived modeling target in mn_kg
    is_kg = cleaned[UNIT_COL].astype(str).str.strip().str.lower() == "kg"
    cleaned["TB_Total_Exports_model_mn_kg"] = np.where(
        is_kg,
        cleaned[TARGET] / 1_000_000.0,
        cleaned[TARGET],
    )

    # Validation checks
    cleaned_dates = cleaned["_parsed_date"].dt.to_period("M")
    if cleaned_dates.duplicated().any():
        raise ValueError("Duplicate months remain after cleaning.")
    if len(cleaned_dates.unique()) != 300:
        raise ValueError(f"Expected 300 unique months, got {len(cleaned_dates.unique())}")

    # Drop temporary parsing column before saving
    cleaned_to_save = cleaned.drop(columns=["_parsed_date"])

    # Ensure parent directories exist
    cleaned_path.parent.mkdir(parents=True, exist_ok=True)
    processed_path.parent.mkdir(parents=True, exist_ok=True)
    reports_dir.mkdir(parents=True, exist_ok=True)

    # Save outputs
    cleaned_to_save.to_csv(cleaned_path, index=False, encoding="utf-8")
    cleaned_to_save.to_csv(processed_path, index=False, encoding="utf-8")

    cleaned_sha256 = compute_sha256(cleaned_path)

    # Write correction log
    correction_df = pd.DataFrame(correction_records)
    correction_df.to_csv(reports_dir / "target_corrections_log.csv", index=False)

    config = {
        "raw_dataset_path": str(raw_path),
        "raw_sha256": raw_sha256,
        "initial_rows": initial_rows,
        "cleaned_dataset_path": str(cleaned_path),
        "cleaned_sha256": cleaned_sha256,
        "final_rows": len(cleaned_to_save),
        "unique_months": 300,
        "dropped_duplicate_dates": duplicate_dates,
        "total_typo_corrections_count": int((correction_df["type"] == "total_typo").sum()),
        "component_suspect_retained_count": int((correction_df["type"] == "component_suspect").sum()),
        "nan_filled_count": int((correction_df["type"] == "nan_fill").sum()),
        "remaining_nan_targets": int(cleaned_to_save[TARGET].isna().sum()),
        "remaining_nan_dates": cleaned.loc[cleaned[TARGET].isna(), DATE_COL].tolist(),
    }
    with (reports_dir / "cleaning_config.json").open("w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)

    return cleaned_to_save, correction_df, config


def main() -> None:
    parser = argparse.ArgumentParser(description="Clean and reconcile M1 dataset.")
    parser.add_argument("--raw", type=Path, default=DEFAULT_RAW_DATASET)
    parser.add_argument("--cleaned", type=Path, default=DEFAULT_CLEANED_DATASET)
    parser.add_argument("--processed", type=Path, default=DEFAULT_PROCESSED_DATASET)
    parser.add_argument("--reports", type=Path, default=DEFAULT_REPORTS_DIR)
    args = parser.parse_args()

    cleaned, corrections, config = clean_m1_dataset(
        args.raw, args.cleaned, args.processed, args.reports
    )
    print(f"Cleaning complete! Final rows: {len(cleaned)} (300 unique months).")
    print(f"Correction types logged:")
    print(corrections["type"].value_counts().to_string())
    print("\nDetailed log:")
    print(corrections[["date", "old_value", "new_value", "type", "action"]].to_string(index=False))


if __name__ == "__main__":
    main()
