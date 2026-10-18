"""Reproducible, leakage-aware preprocessing diagnostics for M1 tea exports.

This module does not overwrite the raw CSV, impute the target, aggregate duplicate
months, or fit learned transformations on validation/test data. By default,
``-999`` rainfall values are reported but preserved because their sentinel
meaning requires source confirmation. Use ``--confirm-rainfall-sentinel`` only
after confirming that meaning with the data provider.
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

DEFAULT_DATASET = Path(__file__).resolve().parent / "dataset" / "M1_combined_monthly_raw.csv"
DEFAULT_PROCESSED = Path(__file__).resolve().parent / "data" / "processed" / "tea_exports_cleaned.csv"
DEFAULT_REPORTS = Path(__file__).resolve().parent / "reports" / "preprocessing"
TARGET = "TB_Total_Exports"
DATE_COLUMN = "Date"
RAIN_COLUMNS = ["RAIN_Badulla", "RAIN_Nuwara_Eliya", "RAIN_Ratnapura"]
LAG_PERIODS = (1, 3, 6, 12)
ROLLING_WINDOWS = (3, 6, 12)


def _require_columns(frame: pd.DataFrame, required: Iterable[str]) -> None:
    missing = sorted(set(required) - set(frame.columns))
    if missing:
        raise ValueError(f"Required column(s) missing from dataset: {', '.join(missing)}")


def _read_raw(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Raw dataset not found: {path}")
    frame = pd.read_csv(path, low_memory=False)
    _require_columns(frame, [DATE_COLUMN, TARGET])
    return frame


def _date_validation(frame: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    result = frame.copy()
    result["_source_row"] = np.arange(len(result))
    result["_parsed_date"] = pd.to_datetime(result[DATE_COLUMN], format="mixed", errors="coerce")
    result["_period"] = result["_parsed_date"].dt.to_period("M")
    result = result.sort_values(["_parsed_date", "_source_row"], na_position="last").reset_index(drop=True)
    invalid = result[result["_parsed_date"].isna()][["_source_row", DATE_COLUMN]].copy()
    return result, invalid


def _duplicate_report(frame: pd.DataFrame) -> pd.DataFrame:
    source_columns = [c for c in frame.columns if not c.startswith("_")]
    duplicate_rows = frame[frame[source_columns].duplicated(keep=False)].copy()
    duplicate_dates = frame[frame["_parsed_date"].duplicated(keep=False)].copy()
    records = []
    for kind, subset in [("exact_duplicate_row", duplicate_rows), ("duplicate_month", duplicate_dates)]:
        for _, row in subset.iterrows():
            records.append(
                {
                    "duplicate_type": kind,
                    "source_row": int(row["_source_row"]),
                    "date": row[DATE_COLUMN],
                    "parsed_period": str(row["_period"]) if pd.notna(row["_period"]) else "",
                    "target_value": row[TARGET],
                }
            )
    return pd.DataFrame(records, columns=["duplicate_type", "source_row", "date", "parsed_period", "target_value"])


def _missing_report(frame: pd.DataFrame) -> pd.DataFrame:
    missing = frame.isna().sum()
    return pd.DataFrame(
        {
            "column": frame.columns,
            "dtype": [str(frame[c].dtype) for c in frame.columns],
            "missing_count": missing.values,
            "missing_pct": (missing.values / max(len(frame), 1) * 100).round(3),
            "non_missing_count": (len(frame) - missing.values),
        }
    ).sort_values(["missing_count", "column"], ascending=[False, True])


def _target_report(frame: pd.DataFrame) -> pd.DataFrame:
    values = pd.to_numeric(frame[TARGET], errors="coerce")
    invalid_non_numeric = frame[TARGET].notna() & values.isna()
    valid = values.dropna()
    row = {
        "target": TARGET,
        "rows": len(frame),
        "missing_count": int(values.isna().sum()),
        "non_numeric_count": int(invalid_non_numeric.sum()),
        "zero_count": int((valid == 0).sum()),
        "negative_count": int((valid < 0).sum()),
        "valid_count": int(valid.size),
        "unique_valid_values": int(valid.nunique()),
        "minimum": valid.min() if not valid.empty else np.nan,
        "maximum": valid.max() if not valid.empty else np.nan,
        "mean": valid.mean() if not valid.empty else np.nan,
        "median": valid.median() if not valid.empty else np.nan,
        "q01": valid.quantile(0.01) if not valid.empty else np.nan,
        "q25": valid.quantile(0.25) if not valid.empty else np.nan,
        "q75": valid.quantile(0.75) if not valid.empty else np.nan,
        "q99": valid.quantile(0.99) if not valid.empty else np.nan,
        "unit_note": "mn_kg from observed TB_Quantity_Unit values; verify source definition before modeling",
    }
    return pd.DataFrame([row])


def _target_extremes(frame: pd.DataFrame) -> pd.DataFrame:
    values = pd.to_numeric(frame[TARGET], errors="coerce")
    valid = frame.loc[values.notna(), [DATE_COLUMN, TARGET]].copy()
    valid["_numeric_target"] = values[values.notna()]
    valid["rank_from_smallest"] = valid["_numeric_target"].rank(method="first").astype(int)
    valid["rank_from_largest"] = valid["_numeric_target"].rank(method="first", ascending=False).astype(int)
    selected = valid[(valid["rank_from_smallest"] <= 10) | (valid["rank_from_largest"] <= 10)].copy()
    selected["TB_Quantity_Unit"] = frame.loc[selected.index, "TB_Quantity_Unit"].values if "TB_Quantity_Unit" in frame else ""
    return selected.rename(columns={"_numeric_target": "numeric_target"}).sort_values("numeric_target")


def _special_code_report(frame: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for column in RAIN_COLUMNS:
        if column in frame:
            count = int((pd.to_numeric(frame[column], errors="coerce") == -999).sum())
            rows.append(
                {
                    "column": column,
                    "special_value": -999,
                    "count": count,
                    "percentage": round(count / max(len(frame), 1) * 100, 3),
                    "action": "flagged and preserved; replace with NaN only after source confirmation",
                }
            )
    return pd.DataFrame(rows)


def _constant_report(frame: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for column in frame.columns:
        counts = frame[column].value_counts(dropna=False)
        top_share = float(counts.iloc[0] / len(frame)) if len(frame) else 0
        rows.append(
            {
                "column": column,
                "unique_values_including_missing": int(frame[column].nunique(dropna=False)),
                "most_common_value": counts.index[0] if len(counts) else "",
                "most_common_count": int(counts.iloc[0]) if len(counts) else 0,
                "most_common_pct": round(top_share * 100, 3),
                "constant": bool(frame[column].nunique(dropna=False) <= 1),
                "near_constant_at_least_95pct": bool(top_share >= 0.95),
            }
        )
    return pd.DataFrame(rows)


def _correlation_report(frame: pd.DataFrame) -> pd.DataFrame:
    numeric = frame.select_dtypes(include="number")
    corr = numeric.corr()
    rows = []
    columns = list(corr.columns)
    for index, first in enumerate(columns):
        for second in columns[index + 1 :]:
            value = corr.loc[first, second]
            if pd.notna(value) and abs(value) >= 0.90:
                rows.append(
                    {
                        "feature_1": first,
                        "feature_2": second,
                        "correlation": value,
                        "absolute_correlation": abs(value),
                        "review_required": "Confirm duplicate definition, unit, or meaningful separate measure before selection",
                    }
                )
    return pd.DataFrame(rows).sort_values("absolute_correlation", ascending=False) if rows else pd.DataFrame()


def _availability_report(frame: pd.DataFrame) -> pd.DataFrame:
    rows = []
    target_like = ("total", "export", "value", "qty", "quantity", "price", "sale")
    for column in frame.columns:
        if column in {DATE_COLUMN, TARGET}:
            continue
        lower = column.lower()
        if any(token in lower for token in ("unit", "origin")):
            status = "metadata; verify availability"
            risk = "low"
        elif any(token in lower for token in target_like):
            status = "potentially contemporaneous; require timestamp/business confirmation"
            risk = "high"
        else:
            status = "candidate exogenous feature; availability still requires source timestamp confirmation"
            risk = "medium"
        rows.append(
            {
                "feature": column,
                "availability_assessment": status,
                "leakage_risk": risk,
                "required_action": "Use only after confirming it is known at the forecast origin; otherwise lag it or exclude it",
            }
        )
    return pd.DataFrame(rows)


def _monthly_coverage(frame: pd.DataFrame) -> tuple[pd.DataFrame, pd.DatetimeIndex]:
    valid_dates = frame["_parsed_date"].dropna().dt.to_period("M").drop_duplicates().sort_values()
    if valid_dates.empty:
        return pd.DataFrame(), pd.DatetimeIndex([])
    expected = pd.period_range(valid_dates.min(), valid_dates.max(), freq="M")
    observed = set(valid_dates)
    missing = expected[~expected.isin(observed)]
    coverage = pd.DataFrame(
        [
            {
                "first_period": str(valid_dates.min()),
                "last_period": str(valid_dates.max()),
                "unique_periods": len(valid_dates),
                "expected_periods_in_range": len(expected),
                "missing_period_count": len(missing),
                "missing_periods": ", ".join(map(str, missing)),
                "frequency_assessment": "monthly with complete unique-month coverage" if len(missing) == 0 else "monthly with gaps",
            }
        ]
    )
    return coverage, missing.to_timestamp()


def _add_past_only_features(frame: pd.DataFrame) -> pd.DataFrame:
    result = frame.copy()
    target = pd.to_numeric(result[TARGET], errors="coerce")
    if "TB_Quantity_Unit" in result:
        units = result["TB_Quantity_Unit"].astype("string").str.strip().str.lower()
        result["TB_Total_Exports_model_mn_kg"] = target.where(~units.eq("kg"), target / 1_000_000)
        target = result["TB_Total_Exports_model_mn_kg"]
    for lag in LAG_PERIODS:
        result[f"{TARGET}_lag_{lag}"] = target.shift(lag)
    for window in ROLLING_WINDOWS:
        past = target.shift(1)
        result[f"{TARGET}_rolling_mean_{window}"] = past.rolling(window, min_periods=window).mean()
        result[f"{TARGET}_rolling_std_{window}"] = past.rolling(window, min_periods=window).std()
    if result["_parsed_date"].notna().any():
        result["calendar_month"] = result["_parsed_date"].dt.month
        result["calendar_year"] = result["_parsed_date"].dt.year
    return result


def _validation_plan(first: pd.Timestamp, last: pd.Timestamp) -> pd.DataFrame:
    periods = pd.period_range(first.to_period("M"), last.to_period("M"), freq="M")
    n = len(periods)
    test_size = min(24, max(12, n // 10))
    validation_size = min(24, max(12, n // 10))
    train_end = n - validation_size - test_size - 1
    validation_end = n - test_size - 1
    rows = [
        {"partition": "train", "start": str(periods[0]), "end": str(periods[train_end]), "purpose": "fit transformations and models"},
        {"partition": "validation", "start": str(periods[train_end + 1]), "end": str(periods[validation_end]), "purpose": "model selection; never fit transformations here"},
        {"partition": "test", "start": str(periods[validation_end + 1]), "end": str(periods[-1]), "purpose": "final 12-month-horizon evaluation"},
    ]
    return pd.DataFrame(rows)


def _write_decisions(
    output: Path,
    frame: pd.DataFrame,
    invalid_dates: pd.DataFrame,
    duplicate_report: pd.DataFrame,
    coverage: pd.DataFrame,
    target_report: pd.DataFrame,
    special_codes: pd.DataFrame,
    constants: pd.DataFrame,
    availability: pd.DataFrame,
    validation: pd.DataFrame,
    sentinel_confirmed: bool,
) -> None:
    high_missing = _missing_report(frame).query("missing_pct >= 20")
    source_columns = [c for c in frame.columns if not c.startswith("_")]
    exact_duplicate_count = int(frame[source_columns].duplicated().sum())
    duplicate_period_count = duplicate_report.loc[
        duplicate_report["duplicate_type"] == "duplicate_month", "parsed_period"
    ].nunique() if not duplicate_report.empty else 0
    lines = [
        "# Preprocessing Decisions",
        "",
        "## Scope",
        "- This run performs validation and conservative, reproducible transformations only.",
        "- The raw CSV is never overwritten.",
        "- The original `TB_Total_Exports` column is preserved. A separate `TB_Total_Exports_model_mn_kg` column normalizes explicit `kg` rows to million kilograms for lag/rolling features; source unit semantics remain subject to confirmation.",
        f"- Confirmed target: `{TARGET}`; forecast horizon: 12 months.",
        "",
        "## Observed validation findings",
        f"- Rows: {len(frame):,}; date range: {coverage.iloc[0]['first_period']} to {coverage.iloc[0]['last_period']}.",
        f"- Invalid dates: {len(invalid_dates):,}; exact duplicate rows after the first occurrence: {exact_duplicate_count:,}; records belonging to duplicate months: {int((duplicate_report['duplicate_type'] == 'duplicate_month').sum()) if not duplicate_report.empty else 0}; duplicated month periods: {duplicate_period_count:,}.",
        f"- {coverage.iloc[0]['frequency_assessment']}; missing months: {coverage.iloc[0]['missing_period_count']}.",
        f"- Target missing values: {int(target_report.iloc[0]['missing_count'])}; target values are not imputed.",
        "",
        "## Target handling",
        "- Rows with missing or invalid target values are retained in the cleaned chronological output for auditability but must be excluded from supervised training.",
        "- No automatic target outlier removal is performed. Suspicious scale values must be checked against source units and original rows.",
        "",
        "## Missing values and special codes",
        f"- High-missingness features (>=20%): {', '.join(f'`{c}` ({p:.2f}%)' for c, p in high_missing[['column', 'missing_pct']].itertuples(index=False)) or 'none'}.",
        f"- Rainfall -999 confirmation status: {'confirmed; converted to NaN' if sentinel_confirmed else 'not confirmed; values preserved and flagged'}.",
        "- No blanket column dropping or full-dataset imputation is performed.",
        "- For modeling, imputers must be fitted inside each training window only. Forward fill is appropriate only for justified slow-moving series; interpolation must not use future values.",
        "- Strategy comparison: time interpolation is unsuitable as a default for contemporaneous exogenous data because it can use future values; forward fill is restricted to justified slow-moving series and training boundaries; training-only median/most-frequent imputation is the reproducible default candidate for model pipelines, to be fit separately in each training window.",
        "",
        "## Duplicates and constants",
        "- Duplicate monthly records are not aggregated because their semantic meaning and aggregation rule are not established.",
        "- Constant and near-constant columns are reported for review, not automatically removed.",
        "",
        "## Leakage controls and feature engineering",
        "- Target lags and rolling statistics use shift-before-roll, so each row uses only prior target observations.",
        "- Candidate availability and leakage risks are heuristic flags requiring source timestamp confirmation.",
        "- Any feature selection, imputation, scaling, or model fitting must be repeated inside each chronological training fold.",
        "- A direct 12-month forecast means the training label must be the target at origin + 12 months; the lag features in this run are inputs only and do not by themselves implement a 12-month supervised label.",
        "",
        "## Validation plan",
    ]
    lines.extend(f"- **{r.partition.title()}:** {r.start} to {r.end} — {r.purpose}." for r in validation.itertuples())
    lines += [
        "- Use rolling-origin evaluation with a 12-month test horizon; never randomly shuffle months.",
        "- Seasonal-naive baseline for later evaluation: predict each month using the observed target from 12 months earlier, when that lag is available.",
        "",
        "## Required clarification before modeling",
        "- Confirm duplicate-month meaning, rainfall sentinel semantics, feature publication/reporting dates, target units, and whether contemporaneous export/auction fields are available at forecast origin.",
    ]
    (output / "preprocessing_decisions.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def prepare_dataset(
    dataset_path: Path = DEFAULT_DATASET,
    processed_path: Path = DEFAULT_PROCESSED,
    reports_dir: Path = DEFAULT_REPORTS,
    confirm_rainfall_sentinel: bool = False,
) -> dict[str, int | str]:
    raw = _read_raw(dataset_path)
    frame, invalid_dates = _date_validation(raw)
    duplicate_report = _duplicate_report(frame)
    missing = _missing_report(frame)
    target_report = _target_report(frame)
    target_extremes = _target_extremes(frame)
    special_codes = _special_code_report(frame)
    constants = _constant_report(frame)
    correlations = _correlation_report(frame.drop(columns=["_source_row", "_parsed_date", "_period"], errors="ignore"))
    availability = _availability_report(frame)
    coverage, _ = _monthly_coverage(frame)
    if coverage.empty:
        raise ValueError("No valid monthly dates were found after parsing Date.")
    validation = _validation_plan(pd.Period(coverage.iloc[0]["first_period"], freq="M").to_timestamp(), pd.Period(coverage.iloc[0]["last_period"], freq="M").to_timestamp())

    transformed = frame.copy()
    transformed[TARGET] = pd.to_numeric(transformed[TARGET], errors="coerce")
    for column in RAIN_COLUMNS:
        if confirm_rainfall_sentinel and column in transformed:
            transformed[column] = pd.to_numeric(transformed[column], errors="coerce").replace(-999, np.nan)
    transformed = _add_past_only_features(transformed)
    transformed = transformed.drop(columns=["_source_row", "_parsed_date", "_period"], errors="ignore")
    processed_path.parent.mkdir(parents=True, exist_ok=True)
    reports_dir.mkdir(parents=True, exist_ok=True)
    transformed.to_csv(processed_path, index=False, encoding="utf-8")
    missing.to_csv(reports_dir / "missing_values_summary.csv", index=False)
    source_columns = [c for c in frame.columns if not c.startswith("_")]
    exact_duplicate_count = int(frame[source_columns].duplicated().sum())
    duplicate_period_count = duplicate_report.loc[
        duplicate_report["duplicate_type"] == "duplicate_month", "parsed_period"
    ].nunique() if not duplicate_report.empty else 0
    data_quality_summary = pd.DataFrame(
        [
            {"metric": "raw_rows", "value": len(raw), "notes": "physical records in source CSV"},
            {"metric": "raw_columns", "value": raw.shape[1], "notes": "source columns"},
            {"metric": "invalid_dates", "value": len(invalid_dates), "notes": "Date values that failed parsing"},
            {"metric": "exact_duplicate_rows_after_first", "value": exact_duplicate_count, "notes": "duplicated() count; no rows removed"},
            {"metric": "records_in_duplicate_month_groups", "value": int((duplicate_report["duplicate_type"] == "duplicate_month").sum()) if not duplicate_report.empty else 0, "notes": "all records in repeated month groups"},
            {"metric": "duplicated_month_periods", "value": duplicate_period_count, "notes": "unique repeated year-month periods"},
            {"metric": "missing_months_in_range", "value": int(coverage.iloc[0]["missing_period_count"]), "notes": "unique-month coverage"},
            {"metric": "missing_columns", "value": int((missing["missing_count"] > 0).sum()), "notes": "columns with at least one missing value"},
            {"metric": "high_missing_columns_at_least_20pct", "value": int((missing["missing_pct"] >= 20).sum()), "notes": "flagged for domain review"},
            {"metric": "constant_columns", "value": int(constants["constant"].sum()), "notes": "not automatically removed"},
            {"metric": "high_correlation_pairs_at_least_90pct", "value": len(correlations), "notes": "not used for automatic selection"},
        ]
    )
    data_quality_summary.to_csv(reports_dir / "data_quality_summary.csv", index=False)
    target_report.to_csv(reports_dir / "target_diagnostics.csv", index=False)
    target_extremes.to_csv(reports_dir / "target_extreme_rows.csv", index=False)
    duplicate_report.to_csv(reports_dir / "duplicate_records.csv", index=False)
    correlations.to_csv(reports_dir / "high_correlation_pairs.csv", index=False)
    availability.to_csv(reports_dir / "feature_availability_and_leakage_review.csv", index=False)
    special_codes.to_csv(reports_dir / "special_code_review.csv", index=False)
    constants.to_csv(reports_dir / "constant_and_near_constant_features.csv", index=False)
    coverage.to_csv(reports_dir / "monthly_coverage.csv", index=False)
    validation.to_csv(reports_dir / "chronological_validation_plan.csv", index=False)
    pd.DataFrame(
        [
            {"strategy": "time_series_interpolation", "status": "not applied", "reason": "Can use future values and is not safe as a default for contemporaneous exogenous data."},
            {"strategy": "forward_fill", "status": "not applied", "reason": "Requires feature-specific scientific justification and training-boundary controls."},
            {"strategy": "training_only_median_or_mode", "status": "prepared, not fitted", "reason": "Use build_training_preprocessor and fit separately inside each chronological training fold."},
        ]
    ).to_csv(reports_dir / "imputation_strategy_comparison.csv", index=False)
    pd.DataFrame(
        [
            {"baseline": "seasonal_naive_12", "formula": "prediction at origin + h = observed target at origin + h - 12 months", "horizon": 12, "status": "specification only; no evaluation performed"},
        ]
    ).to_csv(reports_dir / "seasonal_naive_baseline_spec.csv", index=False)
    _write_decisions(reports_dir, frame, invalid_dates, duplicate_report, coverage, target_report, special_codes, constants, availability, validation, confirm_rainfall_sentinel)
    return {
        "raw_rows": len(raw),
        "raw_columns": raw.shape[1],
        "processed_rows": len(transformed),
        "processed_columns": transformed.shape[1],
        "invalid_dates": len(invalid_dates),
        "duplicate_rows": int(raw.duplicated().sum()),
        "duplicate_month_records": int(frame["_parsed_date"].duplicated().sum()),
        "missing_target": int(target_report.iloc[0]["missing_count"]),
    }


def build_training_preprocessor(numeric_features: list[str], categorical_features: list[str]) -> ColumnTransformer:
    """Build a fit-on-training-only transformer for downstream model folds.

    The returned object is intentionally unfitted. Call ``fit`` only with a
    chronological training partition, then use ``transform`` on validation/test.
    """
    numeric_pipeline = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="median", add_indicator=True)),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_pipeline = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("one_hot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ]
    )
    return ColumnTransformer(
        [
            ("numeric", numeric_pipeline, numeric_features),
            ("categorical", categorical_pipeline, categorical_features),
        ],
        remainder="drop",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate and prepare M1 tea export data without overwriting raw data.")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--processed-output", type=Path, default=DEFAULT_PROCESSED)
    parser.add_argument("--reports-dir", type=Path, default=DEFAULT_REPORTS)
    parser.add_argument("--confirm-rainfall-sentinel", action="store_true", help="Convert -999 rainfall values to NaN only after source confirmation.")
    args = parser.parse_args()
    result = prepare_dataset(args.dataset, args.processed_output, args.reports_dir, args.confirm_rainfall_sentinel)
    print(
        f"Preprocessing completed: {result['raw_rows']} raw rows x {result['raw_columns']} columns; "
        f"{result['processed_rows']} output rows x {result['processed_columns']} columns; "
        f"{result['duplicate_rows']} exact duplicate rows; {result['missing_target']} missing targets."
    )
    print(f"Processed output: {args.processed_output.resolve()}")
    print(f"Reports: {args.reports_dir.resolve()}")


if __name__ == "__main__":
    main()
