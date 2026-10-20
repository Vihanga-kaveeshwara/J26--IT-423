"""Frozen common-origin benchmark for the existing direct 12-month models."""

from __future__ import annotations

import argparse
import hashlib
import json
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from statsmodels.tsa.statespace.sarimax import SARIMAX
from xgboost import XGBRegressor

from feature_engineering import build_forecast_features
from forecast_experiments import HORIZON, _load_and_audit

BASE = Path(__file__).resolve().parent
DEFAULT_DATASET = BASE / "dataset" / "M1_combined_monthly_raw.csv"
DEFAULT_REPORTS = BASE / "reports" / "final_benchmark"
DEFAULT_PROCESSED = BASE / "data" / "processed" / "tea_exports_cleaned.csv"
SELECTED_FEATURES = [
    "target_lag_1",
    "target_lag_12",
    "target_rolling_std_6",
    "target_change_1",
    "target_pct_change_1",
    "target_month",
    "target_month_sin",
    "target_month_cos",
]
SARIMA_ORDER = (1, 1, 1)
SARIMA_SEASONAL_ORDER = (1, 1, 1, 12)
RANDOM_SEED = 42


def _fit_sarima(history: np.ndarray) -> dict[str, object]:
    with warnings.catch_warnings(record=True) as captured:
        warnings.simplefilter("always")
        try:
            fitted = SARIMAX(
                history,
                order=SARIMA_ORDER,
                seasonal_order=SARIMA_SEASONAL_ORDER,
                enforce_stationarity=False,
                enforce_invertibility=False,
            ).fit(disp=False, maxiter=100)
            retvals = getattr(fitted, "mle_retvals", {}) or {}
            converged = retvals.get("converged")
            warning_text = " | ".join(str(item.message) for item in captured)
            return {
                "forecast": float(fitted.forecast(steps=HORIZON)[-1]),
                "status": "ok",
                "converged": bool(converged) if converged is not None else np.nan,
                "warning_count": len(captured),
                "warnings": warning_text,
                "optimizer_iterations": retvals.get("iterations", np.nan),
                "optimizer_function_calls": retvals.get("fcalls", np.nan),
                "reliable": bool(converged) and not captured if converged is not None else False,
                "error": "",
            }
        except Exception as exc:
            warning_text = " | ".join(str(item.message) for item in captured)
            return {
                "forecast": np.nan,
                "status": "failed",
                "converged": False,
                "warning_count": len(captured),
                "warnings": warning_text,
                "optimizer_iterations": np.nan,
                "optimizer_function_calls": np.nan,
                "reliable": False,
                "error": f"{type(exc).__name__}: {exc}",
            }


def _fit_xgb(train: pd.DataFrame, row: pd.DataFrame) -> float:
    usable = train.dropna(subset=["_label"])
    model = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="median", add_indicator=True)),
            (
                "model",
                XGBRegressor(
                    n_estimators=160,
                    max_depth=2,
                    learning_rate=0.05,
                    subsample=0.9,
                    colsample_bytree=0.9,
                    objective="reg:squarederror",
                    random_state=RANDOM_SEED,
                    n_jobs=1,
                ),
            ),
        ]
    )
    missing = set(SELECTED_FEATURES) - set(usable.columns)
    if missing:
        raise ValueError(f"Requested feature column(s) not found in training frame: {missing}")
    model.fit(usable[SELECTED_FEATURES], usable["_label"])
    return float(model.predict(row[SELECTED_FEATURES])[0])


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


def _hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _period_bounds(phase: str) -> tuple[pd.Timestamp, pd.Timestamp, pd.Timestamp]:
    if phase == "validation":
        return pd.Timestamp("2021-01-01"), pd.Timestamp("2022-12-01"), pd.Timestamp("2020-12-01")
    return pd.Timestamp("2023-01-01"), pd.Timestamp("2024-12-01"), pd.Timestamp("2022-12-01")


def run_benchmark(
    dataset_path: Path = DEFAULT_DATASET,
    reports_dir: Path = DEFAULT_REPORTS,
    processed_path: Path = DEFAULT_PROCESSED,
) -> dict[str, object]:
    if not processed_path.exists():
        raise FileNotFoundError(f"Processed dataset not found: {processed_path}")
    processed = pd.read_csv(processed_path, nrows=1)
    if "TB_Total_Exports_model_mn_kg" not in processed.columns:
        raise ValueError("The existing processed dataset lacks TB_Total_Exports_model_mn_kg.")

    raw, duplicate_report, unit_audit = _load_and_audit(dataset_path)
    frame, generated_features = build_forecast_features(
        raw.sort_values("_date").set_index("_date"), HORIZON
    )
    if not set(SELECTED_FEATURES).issubset(generated_features):
        raise ValueError("Frozen selected feature set is not present in canonical feature engineering.")
    reports_dir.mkdir(parents=True, exist_ok=True)

    prediction_rows: list[dict[str, object]] = []
    sample_rows: list[dict[str, object]] = []
    sarima_rows: list[dict[str, object]] = []
    metric_rows: list[dict[str, object]] = []

    for phase in ["validation", "test"]:
        start, end, scale_end = _period_bounds(phase)
        scale_history = frame.loc[
            frame.index <= scale_end, "_target_model_mn_kg"
        ].dropna().to_numpy(float)
        target_dates = frame.index[(frame.index >= start) & (frame.index <= end)]
        for target_date in target_dates:
            origin = target_date - pd.DateOffset(months=HORIZON)
            reasons: list[str] = []
            if origin not in frame.index:
                reasons.append("missing_origin")
            actual = frame.loc[target_date, "_target_model_mn_kg"] if target_date in frame.index else np.nan
            if pd.isna(actual):
                reasons.append("missing_actual")
            if origin in frame.index and pd.isna(frame.loc[origin, "_target_model_mn_kg"]):
                reasons.append("missing_seasonal_naive_origin")
            train = frame[
                (frame.index <= origin) & (frame["_label_date"] <= origin)
            ].copy() if origin in frame.index else frame.iloc[0:0].copy()
            if train["_label"].notna().sum() < 36:
                reasons.append("insufficient_observed_training_labels")
            if reasons:
                sample_rows.append(
                    {
                        "phase": phase,
                        "origin_date": origin.strftime("%Y-%m"),
                        "target_date": target_date.strftime("%Y-%m"),
                        "included_common_sample": False,
                        "exclusion_reasons": "|".join(reasons),
                        "training_rows_with_observed_labels": int(train["_label"].notna().sum()),
                    }
                )
                continue

            row = frame.loc[[origin]]
            history = frame.loc[frame.index <= origin, "_target_model_mn_kg"].dropna().to_numpy(float)
            sarima = _fit_sarima(history)
            if pd.isna(sarima["forecast"]):
                sample_rows.append(
                    {
                        "phase": phase,
                        "origin_date": origin.strftime("%Y-%m"),
                        "target_date": target_date.strftime("%Y-%m"),
                        "included_common_sample": False,
                        "exclusion_reasons": "sarima_forecast_failed",
                        "training_rows_with_observed_labels": int(train["_label"].notna().sum()),
                    }
                )
                sarima_rows.append(
                    {
                        "phase": phase,
                        "origin_date": origin.strftime("%Y-%m"),
                        "target_date": target_date.strftime("%Y-%m"),
                        "order": str(SARIMA_ORDER),
                        "seasonal_order": str(SARIMA_SEASONAL_ORDER),
                        "training_history_rows": len(history),
                        **sarima,
                    }
                )
                continue
            try:
                xgboost_prediction = _fit_xgb(train, row)
            except Exception as exc:
                sample_rows.append(
                    {
                        "phase": phase,
                        "origin_date": origin.strftime("%Y-%m"),
                        "target_date": target_date.strftime("%Y-%m"),
                        "included_common_sample": False,
                        "exclusion_reasons": f"xgboost_forecast_failed:{type(exc).__name__}",
                        "training_rows_with_observed_labels": int(train["_label"].notna().sum()),
                    }
                )
                continue
            prediction_rows.append(
                {
                    "phase": phase,
                    "origin_date": origin.strftime("%Y-%m"),
                    "target_date": target_date.strftime("%Y-%m"),
                    "actual": float(actual),
                    "seasonal_naive": float(frame.loc[origin, "_target_model_mn_kg"]),
                    "sarima": sarima["forecast"],
                    "xgboost_selected": xgboost_prediction,
                    "sarima_status": sarima["status"],
                    "sarima_converged": sarima["converged"],
                    "sarima_warning_count": sarima["warning_count"],
                    "sarima_reliable": sarima["reliable"],
                    "training_rows_with_observed_labels": int(train["_label"].notna().sum()),
                }
            )
            sample_rows.append(
                {
                    "phase": phase,
                    "origin_date": origin.strftime("%Y-%m"),
                    "target_date": target_date.strftime("%Y-%m"),
                    "included_common_sample": True,
                    "exclusion_reasons": "",
                    "training_rows_with_observed_labels": int(train["_label"].notna().sum()),
                }
            )
            sarima_rows.append(
                {
                    "phase": phase,
                    "origin_date": origin.strftime("%Y-%m"),
                    "target_date": target_date.strftime("%Y-%m"),
                    "order": str(SARIMA_ORDER),
                    "seasonal_order": str(SARIMA_SEASONAL_ORDER),
                    "training_history_rows": len(history),
                    **sarima,
                }
            )

        period_predictions = pd.DataFrame(
            [row for row in prediction_rows if row["phase"] == phase]
        )
        for model in ["seasonal_naive", "sarima", "xgboost_selected"]:
            result = _metrics(period_predictions["actual"], period_predictions[model], scale_history)
            result.update(
                {
                    "phase": phase,
                    "model": model,
                    "common_sample": True,
                    "sarima_reliable_predictions": int(
                        period_predictions["sarima_reliable"].fillna(False).sum()
                    ) if model == "sarima" else np.nan,
                    "mase_scaling_rule": f"mean absolute 12-month seasonal difference through {scale_end.strftime('%Y-%m')}",
                }
            )
            metric_rows.append(result)

    predictions = pd.DataFrame(prediction_rows)
    sample_audit = pd.DataFrame(sample_rows)
    diagnostics = pd.DataFrame(sarima_rows)
    metrics = pd.DataFrame(metric_rows)
    predictions.to_csv(reports_dir / "benchmark_predictions.csv", index=False)
    metrics.to_csv(reports_dir / "benchmark_metrics.csv", index=False)
    sample_audit.to_csv(reports_dir / "benchmark_sample_audit.csv", index=False)
    diagnostics.to_csv(reports_dir / "sarima_diagnostics.csv", index=False)

    config = {
        "dataset": str(dataset_path),
        "processed_dataset": str(processed_path),
        "horizon_months": HORIZON,
        "selected_features_frozen": SELECTED_FEATURES,
        "models": ["seasonal_naive", "baseline_sarima", "selected_feature_xgboost"],
        "sarima_order": SARIMA_ORDER,
        "sarima_seasonal_order": SARIMA_SEASONAL_ORDER,
        "xgboost_random_seed": RANDOM_SEED,
        "validation_period": ["2021-01", "2022-12"],
        "test_period": ["2023-01", "2024-12"],
        "common_sample_rule": "actual, origin target for seasonal naive, at least 36 observed training labels, and all three forecasts generated at the same origin",
        "mape_rule": "exclude zero actuals from percentage denominator; retain all nonzero actuals",
        "mase_rule": "mean absolute error divided by mean absolute 12-month seasonal difference computed only through the pre-evaluation cutoff",
        "selection_rule": "feature set and model parameters frozen before final test evaluation; test outcomes are descriptive holdout evidence only",
        "raw_sha256": _hash(dataset_path),
        "target_unit_definition_verified": False,
        "data_provenance": "uncertain; no provider documentation in project",
        "rainfall_minus_999_preserved": True,
        "duplicate_policy": "exact duplicate copies removed by existing loader; no monthly aggregation",
    }
    (reports_dir / "benchmark_config.json").write_text(
        json.dumps(config, indent=2, default=str), encoding="utf-8"
    )

    metric_text = metrics[["phase", "model", "n", "mae", "rmse", "mape_pct", "mase"]].to_string(
        index=False, float_format=lambda value: f"{value:.4f}"
    )
    included_counts = sample_audit.groupby("phase")["included_common_sample"].sum().to_dict()
    excluded_counts = sample_audit.groupby("phase")["included_common_sample"].apply(lambda values: int((~values).sum())).to_dict()
    report = [
        "# Frozen Direct 12-Month Benchmark",
        "",
        "## Scope",
        "- This benchmark uses the existing direct 12-month feature engineering and does not train a hybrid model, LSTM, or new architecture.",
        f"- Frozen feature set: {', '.join(f'`{feature}`' for feature in SELECTED_FEATURES)}.",
        "- Models: seasonal naive, baseline SARIMA, and selected-feature XGBoost.",
        "- Validation results are for assessment; the 2023–2024 test period is held out and is not used for model or feature selection.",
        "",
        "## Common-origin design",
        f"- Validation included {included_counts.get('validation', 0)} identical origin/target-month rows and excluded {excluded_counts.get('validation', 0)} rows.",
        f"- Test included {included_counts.get('test', 0)} identical origin/target-month rows and excluded {excluded_counts.get('test', 0)} rows.",
        "- A row is included only when the actual, seasonal-naive origin target, observed training-label cutoff, SARIMA forecast, and XGBoost forecast are all available at the same origin.",
        "- Training rows satisfy both feature origin <= forecast origin and label date <= forecast origin.",
        "",
        "## Metrics",
        "```text",
        metric_text,
        "```",
        "- MAPE excludes zero actuals from the denominator; all nonzero actuals remain.",
        "- MASE uses mean absolute error divided by the mean absolute 12-month seasonal difference computed only through the pre-validation or pre-test cutoff.",
        "- Metrics are calculated from `benchmark_predictions.csv`, not copied from earlier reports.",
        "",
        "## SARIMA diagnostics",
        "- Each fold records optimizer status, convergence, warning count/text, iterations, and function calls.",
        "- A forecast is marked reliable only when the fit reports convergence and no warnings were captured. Forecast availability alone is not treated as reliability.",
        "- See `sarima_diagnostics.csv` for fold-level evidence.",
        "",
        "## Limitations",
        "- The target contains observed `kg` and `mn_kg` labels. The derived modeling target divides explicit `kg` values by 1,000,000, but provider documentation verifying the unit semantics is unavailable.",
        "- Rainfall `-999` values remain preserved because their sentinel meaning is unconfirmed.",
        "- Dataset provenance is uncertain; the available project evidence does not independently establish official real, synthetic, or experimental status.",
        "- The common samples are small, so results are preliminary and are not claims of real-world forecasting performance.",
        "",
        "## Recommendation",
        "- Do not train a hybrid or LSTM model yet. First review this frozen benchmark and resolve target-unit/provenance questions. The next useful experiment is a controlled repeat with any approved data-definition correction, retaining the same common-origin protocol.",
    ]
    (reports_dir / "final_benchmark_report.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    return {"predictions": predictions, "metrics": metrics, "sample_audit": sample_audit, "sarima": diagnostics}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--reports", type=Path, default=DEFAULT_REPORTS)
    parser.add_argument("--processed", type=Path, default=DEFAULT_PROCESSED)
    args = parser.parse_args()
    result = run_benchmark(args.dataset, args.reports, args.processed)
    print(result["metrics"].to_string(index=False))
    print(f"Benchmark outputs written under: {args.reports}")


if __name__ == "__main__":
    main()
