"""Leakage-safe feature selection for direct 12-month tea-export forecasts.

Feature scores are calculated within chronological training folds.  The
validation period is used to compare the fixed selection rule with the full
approved feature set; the final test period is evaluated only after that rule
and its fixed feature subset have been frozen.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.feature_selection import mutual_info_regression
from sklearn.inspection import permutation_importance
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from xgboost import XGBRegressor

from feature_engineering import build_forecast_features
from forecast_experiments import (
    DATE,
    DEFAULT_DATASET,
    HORIZON,
    _fit_sarima,
    _load_and_audit,
)

DEFAULT_REPORTS = Path(__file__).resolve().parent / "reports" / "feature_selection"
DEFAULT_PROCESSED = Path(__file__).resolve().parent / "data" / "processed" / "tea_exports_cleaned.csv"
RANDOM_SEED = 42
SELECTION_TOP_K = 8
INNER_VALIDATION_SIZE = 12


def approved_features(frame: pd.DataFrame) -> list[str]:
    """Return the canonical feature columns and reject target-derived inputs."""
    _, features = build_forecast_features(frame, HORIZON)
    forbidden = {"_label", "_label_date", "_target_model_mn_kg", "_target_raw_numeric"}
    forbidden.update(column for column in features if "future" in column.lower())
    if forbidden.intersection(features):
        raise ValueError(f"Forbidden target/future-derived feature entered candidate set: {sorted(forbidden.intersection(features))}")
    return features


def _model(seed: int = RANDOM_SEED) -> Pipeline:
    return Pipeline(
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
                    random_state=seed,
                    n_jobs=1,
                ),
            ),
        ]
    )


def _rank_desc(values: pd.Series) -> pd.Series:
    return values.fillna(-np.inf).rank(method="min", ascending=False)


def _diagnostics(
    outer_train: pd.DataFrame,
    candidate: list[str],
    seed: int = RANDOM_SEED,
) -> tuple[pd.DataFrame, list[str]]:
    """Calculate fold-local filter and model scores, then select a subset."""
    labelled = outer_train.dropna(subset=["_label"]).copy()
    if len(labelled) < 36:
        raise ValueError("At least 36 labelled training rows are required for feature selection.")
    inner_size = min(INNER_VALIDATION_SIZE, max(6, len(labelled) // 4))
    inner_train = labelled.iloc[:-inner_size]
    inner_validation = labelled.iloc[-inner_size:]
    if len(inner_train) < 24:
        raise ValueError("Not enough chronological inner-training rows for feature selection.")

    y_train = inner_train["_label"].to_numpy(dtype=float)
    rows: list[dict[str, object]] = []
    train_values = outer_train[candidate]
    for feature in candidate:
        x = pd.to_numeric(inner_train[feature], errors="coerce")
        valid = x.notna() & inner_train["_label"].notna()
        corr = float(x[valid].corr(inner_train.loc[valid, "_label"])) if valid.sum() >= 3 else np.nan
        rows.append(
            {
                "feature": feature,
                "missing_proportion": float(train_values[feature].isna().mean()),
                "unique_values": int(train_values[feature].nunique(dropna=True)),
                "variance": float(train_values[feature].var()) if train_values[feature].notna().sum() > 1 else 0.0,
                "target_correlation": corr,
                "absolute_target_correlation": abs(corr) if np.isfinite(corr) else np.nan,
            }
        )

    x_inner = inner_train[candidate]
    imputer = SimpleImputer(strategy="median", add_indicator=True)
    x_inner_imputed = imputer.fit_transform(x_inner)
    mi = mutual_info_regression(x_inner_imputed, y_train, random_state=seed)
    model = _model(seed)
    model.fit(inner_train[candidate], inner_train["_label"])
    xgb_importance = model.named_steps["model"].feature_importances_
    permutation = permutation_importance(
        model,
        inner_validation[candidate],
        inner_validation["_label"],
        n_repeats=8,
        random_state=seed,
        scoring="neg_mean_absolute_error",
    ).importances_mean
    for index, row in enumerate(rows):
        row["mutual_information"] = float(mi[index])
        row["xgb_gain_importance"] = float(xgb_importance[index])
        row["validation_permutation_importance"] = float(permutation[index])

    scores = pd.DataFrame(rows)
    for column in [
        "absolute_target_correlation",
        "mutual_information",
        "xgb_gain_importance",
        "validation_permutation_importance",
    ]:
        scores[f"{column}_rank"] = _rank_desc(scores[column])
    rank_columns = [f"{column}_rank" for column in [
        "absolute_target_correlation",
        "mutual_information",
        "xgb_gain_importance",
        "validation_permutation_importance",
    ]]
    scores["ensemble_rank"] = scores[rank_columns].mean(axis=1)
    scores = scores.sort_values(["ensemble_rank", "feature"]).reset_index(drop=True)

    always_include = [feature for feature in ["target_lag_12", "target_month_sin", "target_month_cos"] if feature in candidate]
    ranked = [feature for feature in scores["feature"] if feature not in always_include]
    selected = always_include + ranked[: max(0, SELECTION_TOP_K - len(always_include))]
    return scores, selected


def _predict_xgb(train: pd.DataFrame, row: pd.DataFrame, features: list[str], seed: int = RANDOM_SEED) -> float:
    usable = train.dropna(subset=["_label"])
    model = _model(seed)
    model.fit(usable[features], usable["_label"])
    return float(model.predict(row[features])[0])


def _metric(actual: pd.Series, predicted: pd.Series, history: np.ndarray) -> dict[str, float]:
    values = pd.DataFrame({"actual": actual, "predicted": predicted}).dropna()
    if values.empty:
        return {"n": 0, "mae": np.nan, "rmse": np.nan, "mape_pct": np.nan, "mase": np.nan}
    error = values["predicted"].to_numpy() - values["actual"].to_numpy()
    actual_values = values["actual"].to_numpy()
    nonzero = actual_values != 0
    seasonal = np.abs(history[HORIZON:] - history[:-HORIZON])
    scale = float(np.mean(seasonal)) if len(seasonal) else np.nan
    return {
        "n": int(len(values)),
        "mae": float(np.mean(np.abs(error))),
        "rmse": float(np.sqrt(np.mean(error**2))),
        "mape_pct": float(np.mean(np.abs(error[nonzero] / actual_values[nonzero])) * 100) if nonzero.any() else np.nan,
        "mase": float(np.mean(np.abs(error)) / scale) if scale and np.isfinite(scale) else np.nan,
    }


def _prediction_origins(frame: pd.DataFrame, start: str, end: str) -> list[pd.Timestamp]:
    dates = frame.index[(frame.index >= pd.Timestamp(start)) & (frame.index <= pd.Timestamp(end))]
    return [date - pd.DateOffset(months=HORIZON) for date in dates if date - pd.DateOffset(months=HORIZON) in frame.index]


def _run_period(
    frame: pd.DataFrame,
    features: list[str],
    start: str,
    end: str,
    fixed_selected: list[str] | None,
    phase: str,
    reports: list[dict[str, object]],
    score_rows: list[pd.DataFrame],
    selected_rows: list[dict[str, object]],
) -> pd.DataFrame:
    predictions: list[dict[str, object]] = []
    for origin in _prediction_origins(frame, start, end):
        target_date = origin + pd.DateOffset(months=HORIZON)
        actual = frame.loc[target_date, "_target_model_mn_kg"]
        train = frame[(frame.index <= origin) & (frame["_label_date"] <= origin)].copy()
        if pd.isna(actual) or train["_label"].notna().sum() < 36:
            continue
        selected = fixed_selected
        if selected is None:
            fold_scores, selected = _diagnostics(train, features)
            fold_scores.insert(0, "origin_date", origin.strftime("%Y-%m"))
            fold_scores.insert(1, "phase", phase)
            score_rows.append(fold_scores)
            reports.append(
                {
                    "phase": phase,
                    "origin_date": origin.strftime("%Y-%m"),
                    "target_date": target_date.strftime("%Y-%m"),
                    "training_rows": int(train["_label"].notna().sum()),
                    "inner_validation_rows": min(INNER_VALIDATION_SIZE, max(6, train["_label"].notna().sum() // 4)),
                    "selected_features": "|".join(selected),
                }
            )
            for feature in features:
                selected_rows.append(
                    {
                        "phase": phase,
                        "origin_date": origin.strftime("%Y-%m"),
                        "feature": feature,
                        "selected": feature in selected,
                    }
                )
        else:
            reports.append(
                {
                    "phase": phase,
                    "origin_date": origin.strftime("%Y-%m"),
                    "target_date": target_date.strftime("%Y-%m"),
                    "training_rows": int(train["_label"].notna().sum()),
                    "inner_validation_rows": 0,
                    "selected_features": "|".join(selected),
                }
            )
            for feature in features:
                selected_rows.append(
                    {
                        "phase": phase,
                        "origin_date": origin.strftime("%Y-%m"),
                        "feature": feature,
                        "selected": feature in selected,
                    }
                )
        row = frame.loc[[origin]]
        history = train["_target_model_mn_kg"].dropna().to_numpy()
        record: dict[str, object] = {
            "phase": phase,
            "origin_date": origin.strftime("%Y-%m"),
            "target_date": target_date.strftime("%Y-%m"),
            "actual": float(actual),
            "selected_features": "|".join(selected),
            "seasonal_naive_12": float(frame.loc[origin, "_target_model_mn_kg"]),
        }
        try:
            record["sarima"] = _fit_sarima(history)
            record["sarima_status"] = "ok"
        except Exception as exc:
            record["sarima"] = np.nan
            record["sarima_status"] = f"failed: {type(exc).__name__}: {exc}"
        for name, model_features in [("xgboost_full", features), ("xgboost_selected", selected)]:
            try:
                record[name] = _predict_xgb(train, row, model_features)
                record[f"{name}_status"] = "ok"
            except Exception as exc:
                record[name] = np.nan
                record[f"{name}_status"] = f"failed: {type(exc).__name__}: {exc}"
        predictions.append(record)
    return pd.DataFrame(predictions)


def run_feature_selection(
    dataset_path: Path = DEFAULT_DATASET,
    reports_dir: Path = DEFAULT_REPORTS,
    processed_path: Path = DEFAULT_PROCESSED,
) -> dict[str, object]:
    if not processed_path.exists():
        raise FileNotFoundError(f"Expected existing processed dataset was not found: {processed_path}")
    processed = pd.read_csv(processed_path, nrows=2)
    required_processed = {"Date", "TB_Total_Exports_model_mn_kg"}
    if not required_processed.issubset(processed.columns):
        raise ValueError(f"Processed dataset is missing required columns: {sorted(required_processed - set(processed.columns))}")
    raw, _, _ = _load_and_audit(dataset_path)
    frame, features = build_forecast_features(raw.sort_values("_date").set_index("_date"), HORIZON)
    if features != approved_features(frame):
        raise ValueError("Canonical candidate feature list is not reproducible.")
    reports_dir.mkdir(parents=True, exist_ok=True)

    fold_rows: list[dict[str, object]] = []
    score_rows: list[pd.DataFrame] = []
    selected_rows: list[dict[str, object]] = []
    validation_predictions = _run_period(
        frame, features, "2021-01-01", "2022-12-01", None, "validation", fold_rows, score_rows, selected_rows
    )
    selected_frame = pd.DataFrame(selected_rows)
    if selected_frame.empty:
        raise RuntimeError("No validation folds produced a selected feature set.")
    validation_selected = selected_frame[selected_frame["phase"] == "validation"]
    frequency = validation_selected.groupby("feature")["selected"].mean().rename("selection_frequency").reset_index()
    stable = frequency[frequency["selection_frequency"] >= 0.5]["feature"].tolist()
    if not stable:
        validation_scores = pd.concat(score_rows, ignore_index=True)
        stable = validation_scores.groupby("feature")["ensemble_rank"].mean().nsmallest(SELECTION_TOP_K).index.tolist()
    stable = [feature for feature in features if feature in stable]
    test_predictions = _run_period(
        frame, features, "2023-01-01", "2024-12-01", stable, "test", fold_rows, score_rows, selected_rows
    )
    predictions = pd.concat([validation_predictions, test_predictions], ignore_index=True)

    score_frame = pd.concat(score_rows, ignore_index=True)
    score_frame.to_csv(reports_dir / "feature_selection_scores.csv", index=False)
    selected_frame = pd.DataFrame(selected_rows)
    selected_frame.to_csv(reports_dir / "selected_features.csv", index=False)
    stability = (
        selected_frame[selected_frame["phase"] == "validation"].groupby("feature")
        .agg(
            folds_observed=("selected", "size"),
            folds_selected=("selected", "sum"),
            selection_frequency=("selected", "mean"),
        )
        .reset_index()
    )
    stability["stability_class"] = np.select(
        [stability["selection_frequency"] >= 0.75, stability["selection_frequency"] >= 0.5],
        ["consistent", "moderate"],
        default="inconsistent",
    )
    stability.to_csv(reports_dir / "feature_selection_stability.csv", index=False)
    pd.DataFrame(fold_rows).to_csv(reports_dir / "chronological_folds.csv", index=False)
    predictions.to_csv(reports_dir / "feature_selection_predictions.csv", index=False)

    metric_rows: list[dict[str, object]] = []
    for phase in ["validation", "test"]:
        period = predictions[predictions["phase"] == phase]
        if period.empty:
            continue
        history_end = pd.Timestamp("2020-12-01") if phase == "validation" else pd.Timestamp("2022-12-01")
        history = frame.loc[frame.index <= history_end, "_target_model_mn_kg"].dropna().to_numpy()
        for model_name in ["seasonal_naive_12", "sarima", "xgboost_full", "xgboost_selected"]:
            result = _metric(period["actual"], period[model_name], history)
            result.update({"phase": phase, "model": model_name, "feature_set": "approved_full" if model_name == "xgboost_full" else "stable_selected" if model_name == "xgboost_selected" else "not_applicable"})
            metric_rows.append(result)
    comparison = pd.DataFrame(metric_rows)
    comparison.to_csv(reports_dir / "feature_subset_comparison.csv", index=False)

    config = {
        "dataset": str(dataset_path),
        "processed_dataset_audited": str(processed_path),
        "target": "_target_model_mn_kg",
        "horizon_months": HORIZON,
        "candidate_features": features,
        "selection_rule": "fold-local inner chronological validation; always include target_lag_12 and target-month sine/cosine, then add highest-ranked ensemble features to a maximum of eight",
        "diagnostic_scores": ["absolute_target_correlation", "mutual_information", "xgb_gain_importance", "validation_permutation_importance"],
        "inner_validation_size": INNER_VALIDATION_SIZE,
        "stable_feature_threshold": 0.5,
        "final_selected_features": stable,
        "validation_period": ["2021-01", "2022-12"],
        "test_period": ["2023-01", "2024-12"],
        "random_seed": RANDOM_SEED,
        "test_selection_policy": "fixed from validation selection frequency; no test targets used to select features",
    }
    (reports_dir / "feature_selection_config.json").write_text(json.dumps(config, indent=2), encoding="utf-8")
    report = [
        "# Feature Selection Report",
        "",
        "## Scope and candidate set",
        f"- Direct forecast horizon: **{HORIZON} months**.",
        f"- Candidate features: {', '.join(f'`{feature}`' for feature in features)}.",
        "- Candidates are the approved past-only lags, rolling statistics, historical changes, target-month seasonality, and origin trend.",
        "- Raw contemporaneous/exogenous variables were not added because forecast-origin publication availability remains unverified.",
        "",
        "## Leakage controls",
        "- Each outer fold uses only rows whose feature origin and direct label date are at or before that simulated origin.",
        "- Filter scores, mutual information, imputation, XGBoost importance, and permutation diagnostics are calculated within the fold.",
        "- Permutation importance uses an inner chronological validation block from the training fold.",
        "- The final test period does not determine feature selection. A fixed subset is frozen from validation-fold selection frequency.",
        "- The raw dataset is not modified.",
        "",
        "## Selection rule",
        "- Always retain `target_lag_12`, `target_month_sin`, and `target_month_cos` when available.",
        f"- Add the highest-ranked ensemble features until at most {SELECTION_TOP_K} features are retained.",
        "- Ensemble ranks average absolute target correlation, mutual information, XGBoost importance, and inner-validation permutation importance.",
        f"- Final stable subset: {', '.join(f'`{feature}`' for feature in stable)}.",
        "",
        "## Interpretation limitations",
        "- Correlation and mutual information are predictive diagnostics, not causal evidence.",
        "- Importance may substitute among highly correlated lag and rolling features and can vary over time.",
        "- MAPE is unstable for small actual values and excludes only zero actuals; all nonzero observed targets remain in metric calculations.",
        "- The dataset has approximately 300 monthly periods, so selection stability and model comparisons are preliminary.",
        "",
        "## Outputs",
        "- `feature_selection_scores.csv`: fold-local diagnostics and ranks.",
        "- `selected_features.csv`: selected/not-selected status by chronological fold.",
        "- `feature_selection_stability.csv`: selection frequency and stability class.",
        "- `feature_subset_comparison.csv`: seasonal-naive, SARIMA, full XGBoost, and selected XGBoost metrics.",
        "- `feature_selection_predictions.csv`: predictions using identical forecast dates where models are available.",
        "- `chronological_folds.csv`: fold cutoffs and selected features.",
        "- `feature_selection_config.json`: reproducibility configuration.",
    ]
    (reports_dir / "feature_selection_report.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    return {"candidate_features": features, "final_selected_features": stable, "predictions": predictions, "metrics": comparison}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--reports", type=Path, default=DEFAULT_REPORTS)
    parser.add_argument("--processed", type=Path, default=DEFAULT_PROCESSED)
    args = parser.parse_args()
    result = run_feature_selection(args.dataset, args.reports, args.processed)
    print(f"Candidate features: {len(result['candidate_features'])}")
    print(f"Final selected features: {', '.join(result['final_selected_features'])}")
    print(f"Predictions written under: {args.reports}")


if __name__ == "__main__":
    main()
