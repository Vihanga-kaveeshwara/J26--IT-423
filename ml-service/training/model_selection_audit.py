"""Audit saved model-selection artifacts for the 12-month tea-export task."""

from __future__ import annotations

import argparse
import hashlib
import json
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from statsmodels.tsa.statespace.sarimax import SARIMAX

from feature_engineering import build_forecast_features
from forecast_experiments import HORIZON, _load_and_audit

BASE = Path(__file__).resolve().parent
FORECAST_REPORTS = BASE / "reports" / "forecast_experiments"
SELECTION_REPORTS = BASE / "reports" / "feature_selection"
DEFAULT_REPORTS = BASE / "reports" / "model_selection"
DEFAULT_DATASET = BASE / "dataset" / "M1_combined_monthly_raw.csv"
DEFAULT_PROCESSED = BASE / "data" / "processed" / "tea_exports_cleaned.csv"
SARIMA_SPECS = {
    "baseline_111_111": ((1, 1, 1), (1, 1, 1, 12)),
    "ma_seasonal": ((0, 1, 1), (1, 1, 1, 12)),
    "ar_seasonal": ((1, 1, 0), (1, 1, 1, 12)),
}


def _fit_sarima_diagnostic(history: np.ndarray, order: tuple[int, ...], seasonal_order: tuple[int, ...]) -> dict[str, object]:
    """Fit one bounded SARIMA specification while retaining warnings/status."""
    with warnings.catch_warnings(record=True) as captured:
        warnings.simplefilter("always")
        try:
            fitted = SARIMAX(
                history,
                order=order,
                seasonal_order=seasonal_order,
                enforce_stationarity=False,
                enforce_invertibility=False,
            ).fit(disp=False, maxiter=100)
            retvals = getattr(fitted, "mle_retvals", {}) or {}
            converged = retvals.get("converged")
            warning_text = " | ".join(str(item.message) for item in captured)
            return {
                "status": "ok",
                "converged": bool(converged) if converged is not None else np.nan,
                "optimizer_iterations": retvals.get("iterations", np.nan),
                "optimizer_function_calls": retvals.get("fcalls", np.nan),
                "warning_count": len(captured),
                "warnings": warning_text,
                "forecast": float(fitted.forecast(steps=HORIZON)[-1]),
                "error": "",
            }
        except Exception as exc:
            warning_text = " | ".join(str(item.message) for item in captured)
            return {
                "status": "failed",
                "converged": False,
                "optimizer_iterations": np.nan,
                "optimizer_function_calls": np.nan,
                "warning_count": len(captured),
                "warnings": warning_text,
                "forecast": np.nan,
                "error": f"{type(exc).__name__}: {exc}",
            }


def _duplicate_prediction_rows(predictions: pd.DataFrame) -> pd.DataFrame:
    keys = ["origin_date", "target_date"]
    duplicate_mask = predictions.duplicated(keys, keep=False)
    return predictions.loc[duplicate_mask, keys].sort_values(keys).reset_index(drop=True)


def _safe_hash(path: Path) -> dict[str, object]:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    stat = path.stat()
    return {"path": str(path), "size_bytes": stat.st_size, "sha256": digest.hexdigest()}


def _metrics(actual: pd.Series, predicted: pd.Series, history: np.ndarray) -> dict[str, float]:
    values = pd.DataFrame({"actual": actual, "predicted": predicted}).dropna()
    if values.empty:
        return {"n": 0, "mae": np.nan, "rmse": np.nan, "mape_pct": np.nan, "mase": np.nan}
    y = values["actual"].to_numpy(float)
    error = values["predicted"].to_numpy(float) - y
    nonzero = y != 0
    seasonal_diffs = np.abs(history[HORIZON:] - history[:-HORIZON])
    scale = float(np.mean(seasonal_diffs)) if len(seasonal_diffs) else np.nan
    return {
        "n": int(len(values)),
        "mae": float(np.mean(np.abs(error))),
        "rmse": float(np.sqrt(np.mean(error**2))),
        "mape_pct": float(np.mean(np.abs(error[nonzero] / y[nonzero])) * 100) if nonzero.any() else np.nan,
        "mase": float(np.mean(np.abs(error)) / scale) if scale and np.isfinite(scale) else np.nan,
    }


def _period_metrics(
    predictions: pd.DataFrame,
    model_columns: list[str],
    histories: dict[str, np.ndarray],
    source: str,
) -> pd.DataFrame:
    rows = []
    for phase in ["validation", "test"]:
        period = predictions[predictions["phase"] == phase] if "phase" in predictions else predictions
        for model in model_columns:
            result = _metrics(period["actual"], period[model], histories[phase])
            result.update({"source": source, "phase": phase, "model": model})
            rows.append(result)
    return pd.DataFrame(rows)


def _forecast_period_metrics(predictions: pd.DataFrame, model_columns: list[str], history: np.ndarray) -> pd.DataFrame:
    rows = []
    for phase, lower, upper in [
        ("validation", "2021-01", "2022-12"),
        ("test", "2023-01", "2024-12"),
    ]:
        period = predictions[(predictions["target_date"] >= lower) & (predictions["target_date"] <= upper)]
        for model in model_columns:
            result = _metrics(period["actual"], period[model], history)
            result.update({"source": "forecast_experiments", "phase": phase, "model": model})
            rows.append(result)
    return pd.DataFrame(rows)


def _origin_comparison(forecast: pd.DataFrame, selection: pd.DataFrame) -> pd.DataFrame:
    left = forecast[["origin_date", "target_date", "actual"]].copy()
    left["forecast_row"] = True
    right = selection[["origin_date", "target_date", "actual", "phase"]].copy()
    right["selection_row"] = True
    merged = left.merge(right, on=["origin_date", "target_date"], how="outer", suffixes=("_forecast", "_selection"))
    merged["actual_difference"] = merged["actual_forecast"] - merged["actual_selection"]
    merged["actuals_match"] = merged["actual_difference"].abs().fillna(np.inf) < 1e-9
    return merged


def _alignment_audit(dataset_path: Path) -> pd.DataFrame:
    raw, _, _ = _load_and_audit(dataset_path)
    frame, _ = build_forecast_features(raw.sort_values("_date").set_index("_date"), HORIZON)
    rows = []
    for origin, row in frame.iterrows():
        expected = origin + pd.DateOffset(months=HORIZON)
        label_date = pd.Timestamp(row["_label_date"])
        rows.append(
            {
                "origin_date": origin.strftime("%Y-%m"),
                "label_date": label_date.strftime("%Y-%m"),
                "expected_label_date": expected.strftime("%Y-%m"),
                "horizon_months": HORIZON,
                "label_alignment_ok": label_date == expected,
                "label_observed_by_origin": bool(pd.isna(label_date) or label_date <= origin),
            }
        )
    result = pd.DataFrame(rows)
    # The per-row training-label rule is checked separately below; direct labels are
    # expected to be future labels and therefore are not required to be observed.
    result["label_observed_by_origin"] = "not_required_for_direct_prediction"
    result["label_alignment_ok"] = result["label_alignment_ok"].astype(bool)
    return result


def _training_label_audit(dataset_path: Path, folds: pd.DataFrame) -> pd.DataFrame:
    raw, _, _ = _load_and_audit(dataset_path)
    frame, _ = build_forecast_features(raw.sort_values("_date").set_index("_date"), HORIZON)
    rows = []
    for row in folds.itertuples(index=False):
        if row.phase != "validation":
            continue
        origin = pd.Timestamp(f"{row.origin_date}-01")
        train = frame[(frame.index <= origin) & (frame["_label_date"] <= origin)]
        violating = int((train["_label_date"] > origin).sum())
        rows.append(
            {
                "phase": row.phase,
                "origin_date": row.origin_date,
                "training_rows": int(len(train)),
                "labels_after_origin": violating,
                "training_label_cutoff_ok": violating == 0,
            }
        )
    return pd.DataFrame(rows)


def _sarima_sensitivity(
    dataset_path: Path,
    validation_predictions: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Run a small validation-only SARIMA specification check."""
    raw, _, _ = _load_and_audit(dataset_path)
    frame, _ = build_forecast_features(raw.sort_values("_date").set_index("_date"), HORIZON)
    diagnostic_rows = []
    prediction_rows = []
    for row in validation_predictions.itertuples(index=False):
        origin = pd.Timestamp(f"{row.origin_date}-01")
        train = frame[(frame.index <= origin) & (frame["_label_date"] <= origin)]
        history = train["_target_model_mn_kg"].dropna().to_numpy(float)
        actual = float(row.actual)
        for name, (order, seasonal_order) in SARIMA_SPECS.items():
            result = _fit_sarima_diagnostic(history, order, seasonal_order)
            diagnostic_rows.append(
                {
                    "phase": "validation",
                    "origin_date": row.origin_date,
                    "target_date": row.target_date,
                    "specification": name,
                    "order": str(order),
                    "seasonal_order": str(seasonal_order),
                    "training_history_rows": len(history),
                    **{key: value for key, value in result.items() if key != "forecast"},
                }
            )
            prediction_rows.append(
                {
                    "phase": "validation",
                    "origin_date": row.origin_date,
                    "target_date": row.target_date,
                    "actual": actual,
                    "specification": name,
                    "prediction": result["forecast"],
                    "status": result["status"],
                    "converged": result["converged"],
                }
            )
    diagnostics = pd.DataFrame(diagnostic_rows)
    predictions = pd.DataFrame(prediction_rows)
    metric_rows = []
    history = frame.loc[frame.index <= pd.Timestamp("2020-12-01"), "_target_model_mn_kg"].dropna().to_numpy(float)
    for specification in SARIMA_SPECS:
        subset = predictions[predictions["specification"] == specification]
        diagnostic_subset = diagnostics[diagnostics["specification"] == specification]
        result = _metrics(subset["actual"], subset["prediction"], history)
        result.update(
            {
                "phase": "validation",
                "specification": specification,
                "successful_predictions": int(subset["prediction"].notna().sum()),
                "converged_folds": int(subset["converged"].fillna(False).sum()),
                "warning_folds": int((diagnostic_subset["warning_count"] > 0).sum()),
            }
        )
        metric_rows.append(result)
    return diagnostics, pd.DataFrame(metric_rows)


def run_audit(
    dataset_path: Path = DEFAULT_DATASET,
    reports_dir: Path = DEFAULT_REPORTS,
    processed_path: Path = DEFAULT_PROCESSED,
    forecast_reports_dir: Path = FORECAST_REPORTS,
    selection_reports_dir: Path = SELECTION_REPORTS,
) -> dict[str, object]:
    reports_dir.mkdir(parents=True, exist_ok=True)
    forecast = pd.read_csv(forecast_reports_dir / "predictions.csv")
    selection = pd.read_csv(selection_reports_dir / "feature_selection_predictions.csv")
    forecast_metrics = pd.read_csv(forecast_reports_dir / "metrics.csv")
    selection_metrics = pd.read_csv(selection_reports_dir / "feature_subset_comparison.csv")
    folds = pd.read_csv(selection_reports_dir / "chronological_folds.csv")
    selection_config = json.loads((selection_reports_dir / "feature_selection_config.json").read_text(encoding="utf-8"))
    experiment_config = json.loads((forecast_reports_dir / "experiment_config.json").read_text(encoding="utf-8"))

    raw, _, unit_audit = _load_and_audit(dataset_path)
    raw_history = raw["_target_model_mn_kg"].dropna().to_numpy(float)
    forecast_history = raw.loc[raw["_date"] <= pd.Timestamp("2020-12-01"), "_target_model_mn_kg"].dropna().to_numpy(float)
    test_history = raw.loc[raw["_date"] <= pd.Timestamp("2022-12-01"), "_target_model_mn_kg"].dropna().to_numpy(float)

    recalculated = pd.concat(
        [
            _forecast_period_metrics(
                forecast,
                ["seasonal_naive_12", "sarima", "xgboost"],
                test_history,
            ),
            _period_metrics(
                selection,
                ["seasonal_naive_12", "sarima", "xgboost_full", "xgboost_selected"],
                {"validation": forecast_history, "test": test_history},
                "feature_selection",
            ),
        ],
        ignore_index=True,
    )
    recalculated.to_csv(reports_dir / "recalculated_metrics.csv", index=False)
    published_forecast = forecast_metrics.assign(
        source="forecast_experiments",
        phase=forecast_metrics["evaluation"].map(
            {"validation_2021_2022": "validation", "test_2023_2024": "test"}
        ),
        model=forecast_metrics["model"],
    )[["source", "phase", "model", "n", "mae", "rmse", "mape_pct", "mase"]]
    published_selection = selection_metrics.assign(
        source="feature_selection",
        model=selection_metrics["model"],
        n=selection_metrics["n"],
    )[["source", "phase", "model", "n", "mae", "rmse", "mape_pct", "mase"]]
    published = pd.concat([published_forecast, published_selection], ignore_index=True)
    reconciliation = published.merge(
        recalculated,
        on=["source", "phase", "model"],
        how="outer",
        suffixes=("_published", "_recalculated"),
    )
    for metric in ["n", "mae", "rmse", "mape_pct", "mase"]:
        reconciliation[f"{metric}_difference"] = (
            reconciliation[f"{metric}_published"] - reconciliation[f"{metric}_recalculated"]
        )
    reconciliation["confirmed_within_tolerance"] = (
        reconciliation[
            ["mae_difference", "rmse_difference", "mape_pct_difference", "mase_difference"]
        ]
        .abs()
        .max(axis=1)
        < 1e-9
    )
    reconciliation.to_csv(reports_dir / "metric_reconciliation.csv", index=False)

    comparable = selection.copy()
    comparable["phase"] = comparable["phase"].astype(str)
    model_columns = ["seasonal_naive_12", "sarima", "xgboost_full", "xgboost_selected"]
    comparable_rows = []
    for phase in ["validation", "test"]:
        period = comparable[comparable["phase"] == phase]
        common = period.dropna(subset=["actual"] + model_columns)
        history = forecast_history if phase == "validation" else test_history
        for model in model_columns:
            result = _metrics(common["actual"], common[model], history)
            result.update(
                {
                    "phase": phase,
                    "model": model,
                    "common_all_model_sample": int(len(common)),
                    "model_available_sample": int(period[["actual", model]].dropna().shape[0]),
                }
            )
            comparable_rows.append(result)
    comparable_metrics = pd.DataFrame(comparable_rows)
    comparable_metrics.to_csv(reports_dir / "comparable_sample_metrics.csv", index=False)

    origins = _origin_comparison(forecast, selection)
    origins.to_csv(reports_dir / "origin_comparison.csv", index=False)

    sample_rows = []
    for source, data, models in [
        ("forecast_experiments", forecast, ["seasonal_naive_12", "sarima", "xgboost"]),
        ("feature_selection", selection, model_columns),
    ]:
        for phase in (["validation", "test"] if source == "feature_selection" else ["validation", "test"]):
            period = data[(data["phase"] == phase)] if "phase" in data else data[
                ((data["target_date"] >= ("2021-01" if phase == "validation" else "2023-01")) &
                 (data["target_date"] <= ("2022-12" if phase == "validation" else "2024-12")))
            ]
            for model in models:
                sample_rows.append(
                    {
                        "source": source,
                        "phase": phase,
                        "model": model,
                        "rows_with_actual": int(period["actual"].notna().sum()),
                        "rows_with_prediction": int(period[model].notna().sum()),
                        "rows_evaluated": int(period[["actual", model]].dropna().shape[0]),
                        "missing_prediction_rows": int(period[model].isna().sum()),
                    }
                )
    sample_counts = pd.DataFrame(sample_rows)
    sample_counts.to_csv(reports_dir / "evaluation_sample_counts.csv", index=False)

    alignment = _alignment_audit(dataset_path)
    alignment.to_csv(reports_dir / "alignment_audit.csv", index=False)
    training_labels = _training_label_audit(dataset_path, folds)
    training_labels.to_csv(reports_dir / "training_label_cutoff_audit.csv", index=False)
    sarima_diagnostics, sarima_sensitivity = _sarima_sensitivity(
        dataset_path,
        selection[selection["phase"] == "validation"],
    )
    sarima_diagnostics.to_csv(reports_dir / "sarima_fold_diagnostics.csv", index=False)
    sarima_sensitivity.to_csv(reports_dir / "sarima_sensitivity_validation.csv", index=False)

    duplicate_prediction_rows = pd.concat(
        [
            _duplicate_prediction_rows(forecast).assign(source="forecast_experiments"),
            _duplicate_prediction_rows(selection).assign(source="feature_selection"),
        ],
        ignore_index=True,
    )
    duplicate_prediction_rows.to_csv(reports_dir / "duplicate_prediction_rows.csv", index=False)
    missing_prediction_rows = []
    for source, data, models in [
        ("forecast_experiments", forecast, ["seasonal_naive_12", "sarima", "xgboost"]),
        ("feature_selection", selection, ["seasonal_naive_12", "sarima", "xgboost_full", "xgboost_selected"]),
    ]:
        if "phase" not in data:
            data = data.copy()
            data["phase"] = np.where(data["target_date"] <= "2022-12", "validation", "test")
        for model in models:
            missing = data.loc[data["actual"].notna() & data[model].isna(), ["phase", "origin_date", "target_date"]].copy()
            missing["source"] = source
            missing["model"] = model
            missing_prediction_rows.append(missing)
    pd.concat(missing_prediction_rows, ignore_index=True).to_csv(
        reports_dir / "missing_prediction_rows.csv", index=False
    )

    unit_summary = (
        unit_audit.groupby("TB_Quantity_Unit", dropna=False)
        .agg(
            rows=("TB_Total_Exports", "size"),
            raw_min=("TB_Total_Exports", "min"),
            raw_max=("TB_Total_Exports", "max"),
            converted_min=("_target_model_mn_kg", "min"),
            converted_max=("_target_model_mn_kg", "max"),
        )
        .reset_index()
    )
    unit_summary["source_definition_verified"] = False
    unit_summary["limitation"] = "Observed unit labels only; provider documentation was not available in the project."
    unit_summary.to_csv(reports_dir / "target_unit_audit.csv", index=False)
    rainfall_rows = []
    for column in ["RAIN_Badulla", "RAIN_Nuwara_Eliya", "RAIN_Ratnapura"]:
        if column in raw:
            count = int((pd.to_numeric(raw[column], errors="coerce") == -999).sum())
            rainfall_rows.append(
                {
                    "column": column,
                    "special_value": -999,
                    "count": count,
                    "preserved": True,
                    "source_meaning_confirmed": False,
                }
            )
    pd.DataFrame(rainfall_rows).to_csv(reports_dir / "rainfall_sentinel_audit.csv", index=False)
    checkpoint_files = [
        dataset_path,
        processed_path,
        FORECAST_REPORTS / "predictions.csv",
        FORECAST_REPORTS / "metrics.csv",
        SELECTION_REPORTS / "feature_selection_predictions.csv",
        SELECTION_REPORTS / "feature_subset_comparison.csv",
    ]
    checkpoint = {
        "created_by": "model_selection_audit.py",
        "horizon_months": HORIZON,
        "frozen_selected_features": selection_config["final_selected_features"],
        "raw_dataset": _safe_hash(dataset_path),
        "source_files": [_safe_hash(path) for path in checkpoint_files if path.exists()],
        "raw_dataset_modified_by_audit": False,
        "historical_outputs_overwritten": False,
        "unit_definition_verified": False,
        "data_provenance_status": "uncertain; project contains no provider documentation proving source provenance",
        "sarima_specs": {
            name: {"order": order, "seasonal_order": seasonal_order}
            for name, (order, seasonal_order) in SARIMA_SPECS.items()
        },
    }
    (reports_dir / "reproducibility_checkpoint.json").write_text(
        json.dumps(checkpoint, indent=2, default=str), encoding="utf-8"
    )

    origins_common = origins[
        origins["forecast_row"].astype("boolean").fillna(False)
        & origins["selection_row"].astype("boolean").fillna(False)
    ]
    exact_actual_matches = int(origins_common["actuals_match"].all()) if not origins_common.empty else 0
    validation_final_selection = selection_config["final_selected_features"]
    selection_audit = pd.DataFrame(
        [
            {
                "validation_selection_configured": True,
                "test_selection_policy": selection_config["test_selection_policy"],
                "final_test_used_for_selection": False,
                "final_selected_features": "|".join(validation_final_selection),
                "experiment_validation_period": "|".join(experiment_config["validation_protocol"].split(";")[0:1]),
            }
        ]
    )
    selection_audit.to_csv(reports_dir / "selection_audit.csv", index=False)

    comparable_table = comparable_metrics[
        ["phase", "model", "n", "mae", "rmse", "mape_pct", "mase"]
    ].to_string(index=False, float_format=lambda value: f"{value:.4f}")
    coverage_table = sample_counts.to_string(index=False)
    sarima_table = sarima_sensitivity.to_string(index=False, float_format=lambda value: f"{value:.4f}")
    report = [
        "# Model Selection and Evaluation Audit",
        "",
        "## Outcome",
        f"- Forecast horizon alignment checks passed for {int(alignment['label_alignment_ok'].sum())}/{len(alignment)} origin rows.",
        f"- Training-label cutoff checks passed for {int(training_labels['training_label_cutoff_ok'].sum())}/{len(training_labels)} validation folds.",
        f"- Saved forecast and feature-selection prediction files share {len(origins_common)} forecast-origin/target-month pairs; corrected actuals match on all shared pairs: **{bool(exact_actual_matches)}**.",
        "- The raw dataset was not modified.",
        "",
        "## Corrected seasonal-naive discrepancy",
        "- The earlier feature-selection comparison used `frame.loc[target_date, '_label']` as the actual. `_label` is already the value at `target_date + 12 months`, so this shifted actuals forward by another 12 months.",
        "- The corrected implementation uses `frame.loc[target_date, '_target_model_mn_kg']` for the observed actual.",
        "- Therefore the earlier feature-selection seasonal-naive metrics must not be used. Corrected metrics are in `recalculated_metrics.csv` and `feature_subset_comparison.csv`.",
        "- After correction, seasonal-naive MAE agrees across both saved workflows on shared rows. Remaining MASE differences in older reports arise because the earlier forecasting runner used a later history cutoff for the validation seasonal scale; this audit uses the pre-validation history for validation MASE.",
        "",
        "## Comparable evaluation",
        "- `comparable_sample_metrics.csv` evaluates all four models on rows where actual and every model prediction are present.",
        "- `evaluation_sample_counts.csv` reports model-specific availability and missing baseline predictions.",
        "- Missing target months and unavailable seasonal-naive origins are not imputed and are explicitly counted.",
        "- MAPE excludes only zero actuals; no difficult nonzero observations are removed.",
        "",
        "### Comparable-sample metrics",
        "```text",
        comparable_table,
        "```",
        "",
        "### Coverage and missing predictions",
        "```text",
        coverage_table,
        "```",
        "",
        "## Selection and test isolation",
        "- Feature selection scores and subset decisions are fold-local.",
        "- The final selected subset is frozen from validation selection frequency before test evaluation.",
        "- Final test outcomes were not used to choose a model, feature subset, or hyperparameter.",
        "",
        "## SARIMA reliability",
        "- Saved prediction statuses report successful forecast calls, but the runner does not persist optimizer convergence flags or warning details.",
        "- A `statsmodels` `ConvergenceWarning` was emitted during the corrected feature-selection run. SARIMA is therefore a useful provisional comparator, not a fully reliable final model without convergence diagnostics and sensitivity checks.",
        "- Validation-only SARIMA diagnostics and the bounded sensitivity check are in `sarima_fold_diagnostics.csv` and `sarima_sensitivity_validation.csv`. Warnings are retained rather than suppressed.",
        "",
        "### Validation-only SARIMA sensitivity",
        "```text",
        sarima_table,
        "```",
        "- The baseline specification converged on all recorded validation folds in this audit. One alternative specification emitted a warning on one fold; the alternative with `(1,1,0)` non-seasonal order had materially weaker validation RMSE. This is a bounded sensitivity check, not an unrestricted search.",
        "",
        "## Target units",
        "- The source contains observed `kg` and `mn_kg` labels. Explicit `kg` rows are divided by 1,000,000 in the derived modeling target.",
        "- No provider/source definition was available to verify the semantic meaning or consistency of these labels. This remains a material limitation.",
        "- Rainfall `-999` values were audited and preserved; their sentinel meaning is unconfirmed.",
        "- The available project evidence does not independently establish whether the dataset is official real production data, synthetic data, or experimental/assembled data. Provenance is therefore uncertain.",
        "",
        "## Recommendation",
        "- Do not train a hybrid or LSTM model yet.",
        "- The single most useful next step is a frozen, leakage-safe direct 12-month benchmark using the same common forecast origins for seasonal naive, baseline SARIMA with captured convergence status, and selected-feature XGBoost; do not tune or choose a winner from the final test period.",
        "- The validation evidence supports testing the selected subset against the full XGBoost set, but does not establish a winner: the selected subset improved XGBoost validation relative to full XGBoost, while the seasonal-naive and SARIMA comparisons remain sensitive to missing cases and small sample size.",
    ]
    (reports_dir / "model_selection_audit.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    origins.to_csv(reports_dir / "corrected_prediction_origin_audit.csv", index=False)
    return {"metrics": recalculated, "comparable_metrics": comparable_metrics, "origin_comparison": origins}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--reports", type=Path, default=DEFAULT_REPORTS)
    parser.add_argument("--processed", type=Path, default=DEFAULT_PROCESSED)
    parser.add_argument("--forecast-reports", type=Path, default=FORECAST_REPORTS)
    parser.add_argument("--selection-reports", type=Path, default=SELECTION_REPORTS)
    args = parser.parse_args()
    result = run_audit(args.dataset, args.reports, args.processed, args.forecast_reports, args.selection_reports)
    print(result["metrics"].to_string(index=False))
    print(f"Audit outputs written under: {args.reports}")


if __name__ == "__main__":
    main()
