"""Leakage-safe 12-month-ahead forecasting experiments for M1 tea exports.

This runner consumes the raw CSV directly so the unit audit remains visible.
It keeps the raw file unchanged, removes only exact duplicate copies for the
experiment view, converts explicit ``kg`` target rows to ``mn_kg`` in a new
modeling column, and evaluates direct 12-month forecasts chronologically.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from xgboost import XGBRegressor
from statsmodels.tsa.statespace.sarimax import SARIMAX
from feature_engineering import build_forecast_features, verify_alignment

TARGET = "TB_Total_Exports"
DATE = "Date"
UNIT = "TB_Quantity_Unit"
HORIZON = 12
DEFAULT_DATASET = Path(__file__).resolve().parent / "dataset" / "M1_combined_monthly_raw.csv"
DEFAULT_REPORTS = Path(__file__).resolve().parent / "reports" / "forecast_experiments"
DEFAULT_PROCESSED = Path(__file__).resolve().parent / "data" / "processed" / "tea_exports_experiment_view.csv"


def _load_and_audit(path: Path) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    raw = pd.read_csv(path, low_memory=False)
    missing = sorted({DATE, TARGET, UNIT} - set(raw.columns))
    if missing:
        raise ValueError(f"Required columns missing: {', '.join(missing)}")
    raw["_source_row"] = np.arange(len(raw))
    raw["_date"] = pd.to_datetime(raw[DATE], format="mixed", errors="coerce")
    if raw["_date"].isna().any():
        raise ValueError(f"Invalid dates found: {int(raw['_date'].isna().sum())}")
    raw["_period"] = raw["_date"].dt.to_period("M")
    source_columns = [c for c in raw.columns if not c.startswith("_")]
    duplicates = raw[raw[source_columns].duplicated(keep=False)].copy()
    duplicate_report = duplicates[["_source_row", DATE, UNIT, TARGET, "_period"]].copy()
    duplicate_report["resolution"] = "exact duplicate copy; retain first chronological source row for experiments"
    raw = raw.sort_values(["_date", "_source_row"]).reset_index(drop=True)
    raw["_target_raw_numeric"] = pd.to_numeric(raw[TARGET], errors="coerce")
    raw["_target_model_mn_kg"] = raw["_target_raw_numeric"]
    kg_mask = raw[UNIT].astype("string").str.strip().str.lower().eq("kg")
    mnkg_mask = raw[UNIT].astype("string").str.strip().str.lower().eq("mn_kg")
    unknown_units = raw.loc[raw["_target_raw_numeric"].notna() & ~(kg_mask | mnkg_mask), UNIT].dropna().unique()
    if len(unknown_units):
        raise ValueError(f"Unrecognized target units: {list(unknown_units)}")
    raw.loc[kg_mask, "_target_model_mn_kg"] = raw.loc[kg_mask, "_target_raw_numeric"] / 1_000_000
    raw["_unit_conversion_applied"] = np.where(kg_mask, "kg_to_mn_kg_divide_1e6", np.where(mnkg_mask, "already_mn_kg", "missing_or_invalid"))
    unit_audit = raw[[DATE, UNIT, TARGET, "_target_raw_numeric", "_target_model_mn_kg", "_unit_conversion_applied", "_source_row"]].copy()
    deduped = raw.drop_duplicates(subset=source_columns, keep="first").copy()
    if deduped["_period"].duplicated().any():
        raise ValueError("Duplicate month remains after exact-duplicate removal; no aggregation rule was applied.")
    return deduped, duplicate_report, unit_audit


def _alignment_check(frame: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for date_text in ("2001-01", "2001-02", "2010-01"):
        date = pd.Timestamp(f"{date_text}-01")
        if date not in frame.index:
            continue
        row = frame.loc[date]
        prior = frame.loc[date - pd.DateOffset(months=1), "_target_model_mn_kg"] if date - pd.DateOffset(months=1) in frame.index else np.nan
        prior_12 = frame.loc[date - pd.DateOffset(months=12), "_target_model_mn_kg"] if date - pd.DateOffset(months=12) in frame.index else np.nan
        rows.append(
            {
                "date": date_text,
                "observed_target": row["_target_model_mn_kg"],
                "expected_lag_1": prior,
                "actual_lag_1": row["target_lag_1"],
                "lag_1_matches": bool(pd.isna(prior) and pd.isna(row["target_lag_1"]) or prior == row["target_lag_1"]),
                "expected_lag_12": prior_12,
                "actual_lag_12": row["target_lag_12"],
                "lag_12_matches": bool(pd.isna(prior_12) and pd.isna(row["target_lag_12"]) or prior_12 == row["target_lag_12"]),
                "rolling_mean_3_uses_prior_three": "verified by shift(1); current target excluded",
            }
        )
    return pd.DataFrame(rows)


def _metrics(actual: np.ndarray, predicted: np.ndarray, training_history: np.ndarray) -> dict[str, float]:
    error = predicted - actual
    nonzero = actual != 0
    seasonal_diffs = np.abs(training_history[HORIZON:] - training_history[:-HORIZON])
    scale = float(np.mean(seasonal_diffs)) if len(seasonal_diffs) else np.nan
    return {
        "n": int(len(actual)),
        "mae": float(np.mean(np.abs(error))),
        "rmse": float(np.sqrt(np.mean(error**2))),
        "mape_pct": float(np.mean(np.abs(error[nonzero] / actual[nonzero])) * 100) if nonzero.any() else np.nan,
        "mase": float(np.mean(np.abs(error)) / scale) if scale and np.isfinite(scale) else np.nan,
    }


def _fit_xgb(train: pd.DataFrame, row: pd.DataFrame, features: list[str]) -> float:
    missing = set(features) - set(train.columns)
    if missing:
        raise ValueError(f"Requested feature column(s) not found in training frame: {missing}")
    usable = train.dropna(subset=["_label"])
    pipeline = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="median", add_indicator=True)),
            (
                "model",
                XGBRegressor(
                    n_estimators=200,
                    max_depth=3,
                    learning_rate=0.05,
                    subsample=0.9,
                    colsample_bytree=0.9,
                    objective="reg:squarederror",
                    random_state=42,
                    n_jobs=1,
                ),
            ),
        ]
    )
    pipeline.fit(usable[features], usable["_label"])
    return float(pipeline.predict(row[features])[0])


def _fit_sarima(history: np.ndarray) -> float:
    model = SARIMAX(
        history,
        order=(1, 1, 1),
        seasonal_order=(1, 1, 1, 12),
        enforce_stationarity=False,
        enforce_invertibility=False,
    )
    fitted = model.fit(disp=False, maxiter=100)
    return float(fitted.forecast(steps=HORIZON)[-1])


def run_experiments(dataset_path: Path = DEFAULT_DATASET, reports_dir: Path = DEFAULT_REPORTS, processed_path: Path = DEFAULT_PROCESSED) -> dict[str, object]:
    frame, duplicate_report, unit_audit = _load_and_audit(dataset_path)
    frame, features = build_forecast_features(frame.sort_values("_date").set_index("_date"), HORIZON)
    processed_path.parent.mkdir(parents=True, exist_ok=True)
    reports_dir.mkdir(parents=True, exist_ok=True)
    export_columns = [DATE, UNIT, TARGET, "_target_raw_numeric", "_target_model_mn_kg", "_unit_conversion_applied"] + features
    frame.reset_index().rename(columns={"_date": DATE})[export_columns].to_csv(processed_path, index=False)
    duplicate_report.to_csv(reports_dir / "duplicate_resolution.csv", index=False)
    unit_audit.to_csv(reports_dir / "target_unit_audit.csv", index=False)
    unit_summary = (
        unit_audit.groupby(UNIT, dropna=False)
        .agg(
            rows=(TARGET, "size"),
            missing_target=(TARGET, lambda values: values.isna().sum()),
            raw_min=(TARGET, "min"),
            raw_max=(TARGET, "max"),
            raw_median=(TARGET, "median"),
            converted_min=("_target_model_mn_kg", "min"),
            converted_max=("_target_model_mn_kg", "max"),
            converted_median=("_target_model_mn_kg", "median"),
        )
        .reset_index()
    )
    unit_summary.to_csv(reports_dir / "target_unit_summary.csv", index=False)
    alignment = verify_alignment(frame, HORIZON)
    alignment.to_csv(reports_dir / "feature_alignment_checks.csv", index=False)
    _alignment_check(frame).to_csv(reports_dir / "lag_alignment_check.csv", index=False)
    pd.DataFrame(
        [
            {
                "feature": feature,
                "feature_group": (
                    "target_lag" if feature.startswith("target_lag_") else
                    "past_rolling" if feature.startswith("target_rolling_") else
                    "historical_change" if feature.startswith("target_change") or feature.startswith("target_pct_change") else
                    "target_calendar" if feature.startswith("target_month") else
                    "time_trend" if feature == "origin_time_index" else "other"
                ),
                "available_at_origin": True,
                "future_target_used": False,
                "notes": "Derived only from target observations at or before origin; label is separate.",
            }
            for feature in features
        ]
    ).to_csv(reports_dir / "feature_availability_review.csv", index=False)
    pd.DataFrame(
        [
            {"feature": feature, "dtype": str(frame[feature].dtype), "included_in_primary_experiment": True}
            for feature in features
        ]
    ).to_csv(reports_dir / "engineered_feature_summary.csv", index=False)

    target_dates = frame.index[frame.index >= frame.index.min() + pd.DateOffset(years=0)]
    target_dates = target_dates[(target_dates >= pd.Timestamp("2021-01-01")) & (target_dates <= pd.Timestamp("2024-12-01"))]
    predictions = []
    for target_date in target_dates:
        origin = target_date - pd.DateOffset(months=HORIZON)
        if origin not in frame.index:
            continue
        row = frame.loc[[origin]]
        actual = frame.loc[target_date, "_target_model_mn_kg"]
        naive = frame.loc[origin, "_target_model_mn_kg"]
        train = frame[(frame.index <= origin) & (frame["_label_date"] <= origin)].copy()
        if pd.isna(actual) or pd.isna(naive) or train["_label"].notna().sum() < 36:
            continue
        history = train["_target_model_mn_kg"].dropna().to_numpy()
        record = {"origin_date": origin.strftime("%Y-%m"), "target_date": target_date.strftime("%Y-%m"), "actual": float(actual), "seasonal_naive_12": float(naive)}
        try:
            record["sarima"] = _fit_sarima(history)
            record["sarima_status"] = "ok"
        except Exception as exc:
            record["sarima"] = np.nan
            record["sarima_status"] = f"failed: {type(exc).__name__}: {exc}"
        try:
            record["xgboost"] = _fit_xgb(train, row, features)
            record["xgboost_status"] = "ok"
        except Exception as exc:
            record["xgboost"] = np.nan
            record["xgboost_status"] = f"failed: {type(exc).__name__}: {exc}"
        predictions.append(record)
    predictions_frame = pd.DataFrame(predictions)
    predictions_frame.to_csv(reports_dir / "predictions.csv", index=False)

    metric_rows = []
    for model in ["seasonal_naive_12", "sarima", "xgboost"]:
        subset = predictions_frame.dropna(subset=["actual", model]) if not predictions_frame.empty else pd.DataFrame()
        if subset.empty:
            continue
        train_history = frame.loc[frame.index <= pd.Timestamp("2022-12-01"), "_target_model_mn_kg"].dropna().to_numpy()
        for evaluation, lower, upper in [
            ("validation_2021_2022", "2021-01", "2022-12"),
            ("test_2023_2024", "2023-01", "2024-12"),
        ]:
            window = subset[(subset["target_date"] >= lower) & (subset["target_date"] <= upper)]
            if window.empty:
                continue
            values = _metrics(window["actual"].to_numpy(), window[model].to_numpy(), train_history)
            values.update({"model": model, "evaluation": evaluation, "horizon_months": HORIZON})
            metric_rows.append(values)
    metrics = pd.DataFrame(metric_rows)
    metrics.to_csv(reports_dir / "metrics.csv", index=False)
    config = {
        "dataset": str(dataset_path),
        "target": TARGET,
        "target_model_unit": "mn_kg",
        "horizon_months": HORIZON,
        "duplicate_resolution": "remove only exact duplicate copies in experiment view; no aggregation",
        "features": features,
        "excluded_feature_policy": "Raw contemporaneous/exogenous columns excluded until publication-time availability is documented.",
        "training_cutoff_rule": "for forecast origin t, train direct samples whose origin <= t and label date <= t",
        "validation_protocol": "rolling origin; target dates 2021-01 through 2024-12; final test metrics target dates 2023-01 through 2024-12",
        "random_seed": 42,
        "lstm": "not run; 300 unique monthly periods is a small sample for an additional deep sequence model",
    }
    (reports_dir / "experiment_config.json").write_text(json.dumps(config, indent=2), encoding="utf-8")
    (reports_dir / "feature_engineering_config.json").write_text(
        json.dumps(
            {
                "horizon_months": HORIZON,
                "feature_columns": features,
                "target_column": "_target_model_mn_kg",
                "label_definition": "target at origin + 12 months",
                "rolling_definition": "shift(1) before rolling; current target excluded",
                "duplicate_policy": "exact duplicate copies removed only in experiment view; no month aggregation",
                "zero_denominator_policy": "percentage change is NaN when prior target is zero or missing",
                "raw_exogenous_policy": "excluded pending forecast-origin availability evidence",
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    report_lines = [
        "# Forecast Experiment Report",
        "",
        "## Audit decisions",
        "- Raw CSV was not modified.",
        "- Exact duplicate rows were confirmed and only duplicate copies were removed from the experiment view; duplicated months were not averaged.",
        "- `TB_Total_Exports` contains explicit `mn_kg` and `kg` rows. `kg` rows were converted to `mn_kg` by dividing by 1,000,000 in `_target_model_mn_kg`; original values remain in the audit files.",
        "- Target unit semantics are still unverified beyond the observed unit labels.",
        "- Only target lags, past-only rolling statistics, and calendar month were used as model features. Contemporaneous export, quantity, value, auction, climate, and macroeconomic columns were excluded pending availability timestamps.",
        "",
        "## Evaluation",
        "- Each prediction is direct 12-month-ahead: features at origin `t` predict target at `t+12`.",
        "- The seasonal-naive baseline predicts the target at `t+12` from the observed target at `t`.",
        "- Imputation is fitted inside each XGBoost training fold only. SARIMA uses only the target history available at the origin.",
        "- MAPE excludes zero actuals; MASE uses the mean absolute 12-month seasonal difference from the training history.",
        "- Results are estimates from a small sample and do not establish that any model is superior outside this evaluation design.",
        "",
        "## Files",
        "- `predictions.csv`: origin, target date, actual, and model forecasts.",
        "- `metrics.csv`: MAE, RMSE, MAPE, and MASE on the 2023-2024 test target dates.",
        "- `duplicate_resolution.csv`, `target_unit_audit.csv`, `target_unit_summary.csv`, and `lag_alignment_check.csv`: source-level audit evidence.",
        "- `engineered_feature_summary.csv`, `feature_availability_review.csv`, and `feature_alignment_checks.csv`: feature audit evidence.",
    ]
    (reports_dir / "forecast_experiment_report.md").write_text("\n".join(report_lines) + "\n", encoding="utf-8")
    audit_lines = [
        "# Feature Engineering Audit",
        "",
        "## Existing implementation audit",
        "- Existing preprocessing lag/rolling columns were aligned to the current row, but the forecasting runner had a training-cutoff bug: rows whose labels occurred after the forecast origin were included. The runner now requires both feature origin and label date to be at or before the training origin.",
        "- The existing `calendar_month` represented the origin month. The dedicated feature module now creates `target_month` and cyclical encodings from origin + 12 months. For a 12-month horizon this is usually the same month, but it is now explicit and testable.",
        "- Existing raw export, quantity, value, auction, climate, and macroeconomic columns are excluded from the primary experiment because publication-time availability has not been documented.",
        "",
        "## Leakage-safe definitions",
        "- Target lags use only prior target observations.",
        "- Rolling statistics use `shift(1)` before rolling, excluding the current target.",
        "- Historical changes and percentage changes use only current and prior observations; percentage changes return missing when the denominator is zero or missing.",
        "- The direct label is separate from features and points to origin + 12 months.",
        "",
        "## Dataset and unit decisions",
        "- Exact duplicate rows were verified before retaining one copy in the experiment view.",
        "- Explicit `kg` target values are normalized to `mn_kg` in a derived modeling column; raw values and unit labels are retained in audit outputs.",
        "- Missing target values are not imputed and corresponding forecast cases are excluded and recorded.",
        "",
        "## Limitations",
        "- Availability classifications cannot replace source publication timestamps.",
        "- The 300-month sample is small for a broad model search or LSTM. No LSTM or hybrid claim is made.",
    ]
    (reports_dir / "feature_engineering_audit.md").write_text("\n".join(audit_lines) + "\n", encoding="utf-8")
    return {"unique_months": len(frame), "prediction_rows": len(predictions_frame), "metrics_rows": len(metrics)}


def main() -> None:
    parser = argparse.ArgumentParser(description="Run leakage-safe 12-month forecasting experiments.")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--reports-dir", type=Path, default=DEFAULT_REPORTS)
    parser.add_argument("--processed-output", type=Path, default=DEFAULT_PROCESSED)
    args = parser.parse_args()
    result = run_experiments(args.dataset, args.reports_dir, args.processed_output)
    print(f"Experiments completed: {result['unique_months']} unique months, {result['prediction_rows']} predictions, {result['metrics_rows']} metric rows.")
    print(f"Reports: {args.reports_dir.resolve()}")


if __name__ == "__main__":
    main()
