> [!WARNING]
> **Superseded: Bug Fixed (SARIMA Window Bug)**. This report was generated under older protocols containing the SARIMA window cutoff bug (evaluating origin $t$ instead of 12-month horizon $t+12$). Authoritative reconciled results are in `reports/final_benchmark_cleaned/final_benchmark_report.md` and `reports/backtest_cleaned_v2/backtest_v2_report.md`.

# Forecast Experiment Report


## Audit decisions
- Raw CSV was not modified.
- Exact duplicate rows were confirmed and only duplicate copies were removed from the experiment view; duplicated months were not averaged.
- `TB_Total_Exports` contains explicit `mn_kg` and `kg` rows. `kg` rows were converted to `mn_kg` by dividing by 1,000,000 in `_target_model_mn_kg`; original values remain in the audit files.
- Target unit semantics are still unverified beyond the observed unit labels.
- Only target lags, past-only rolling statistics, and calendar month were used as model features. Contemporaneous export, quantity, value, auction, climate, and macroeconomic columns were excluded pending availability timestamps.

## Evaluation
- Each prediction is direct 12-month-ahead: features at origin `t` predict target at `t+12`.
- The seasonal-naive baseline predicts the target at `t+12` from the observed target at `t`.
- Imputation is fitted inside each XGBoost training fold only. SARIMA uses only the target history available at the origin.
- MAPE excludes zero actuals; MASE uses the mean absolute 12-month seasonal difference from the training history.
- Results are estimates from a small sample and do not establish that any model is superior outside this evaluation design.

## Files
- `predictions.csv`: origin, target date, actual, and model forecasts.
- `metrics.csv`: MAE, RMSE, MAPE, and MASE on the 2023-2024 test target dates.
- `duplicate_resolution.csv`, `target_unit_audit.csv`, `target_unit_summary.csv`, and `lag_alignment_check.csv`: source-level audit evidence.
- `engineered_feature_summary.csv`, `feature_availability_review.csv`, and `feature_alignment_checks.csv`: feature audit evidence.
