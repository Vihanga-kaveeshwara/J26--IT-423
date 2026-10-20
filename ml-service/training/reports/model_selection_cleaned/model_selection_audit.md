> [!WARNING]
> **Superseded: Bug Fixed (SARIMA Window Bug)**. This report was generated under older protocols containing the SARIMA window cutoff bug (evaluating origin $t$ instead of 12-month horizon $t+12$). Authoritative reconciled results are in `reports/final_benchmark_cleaned/final_benchmark_report.md` and `reports/backtest_cleaned_v2/backtest_v2_report.md`.

# Model Selection and Evaluation Audit


## Outcome
- Forecast horizon alignment checks passed for 300/300 origin rows.
- Training-label cutoff checks passed for 23/23 validation folds.
- Saved forecast and feature-selection prediction files share 46 forecast-origin/target-month pairs; corrected actuals match on all shared pairs: **True**.
- The raw dataset was not modified.

## Corrected seasonal-naive discrepancy
- The earlier feature-selection comparison used `frame.loc[target_date, '_label']` as the actual. `_label` is already the value at `target_date + 12 months`, so this shifted actuals forward by another 12 months.
- The corrected implementation uses `frame.loc[target_date, '_target_model_mn_kg']` for the observed actual.
- Therefore the earlier feature-selection seasonal-naive metrics must not be used. Corrected metrics are in `recalculated_metrics.csv` and `feature_subset_comparison.csv`.
- After correction, seasonal-naive MAE agrees across both saved workflows on shared rows. Remaining MASE differences in older reports arise because the earlier forecasting runner used a later history cutoff for the validation seasonal scale; this audit uses the pre-validation history for validation MASE.

## Comparable evaluation
- `comparable_sample_metrics.csv` evaluates all four models on rows where actual and every model prediction are present.
- `evaluation_sample_counts.csv` reports model-specific availability and missing baseline predictions.
- Missing target months and unavailable seasonal-naive origins are not imputed and are explicitly counted.
- MAPE excludes only zero actuals; no difficult nonzero observations are removed.

### Comparable-sample metrics
```text
     phase             model  n    mae   rmse  mape_pct   mase
validation seasonal_naive_12 23 2.7356 3.4950   12.9076 1.7033
validation            sarima 23 1.9167 2.3518    9.3404 1.1934
validation      xgboost_full 23 2.1407 2.7447   10.2498 1.3329
validation  xgboost_selected 23 2.0063 2.7006    9.9233 1.2492
      test seasonal_naive_12 23 2.4388 3.1708   13.2286 1.4281
      test            sarima 23 2.8957 3.4506   15.8555 1.6957
      test      xgboost_full 23 2.2592 2.9072   12.4751 1.3230
      test  xgboost_selected 23 2.8438 3.4953   15.8418 1.6653
```

### Coverage and missing predictions
```text
              source      phase             model  rows_with_actual  rows_with_prediction  rows_evaluated  missing_prediction_rows
forecast_experiments validation seasonal_naive_12                23                    23              23                        0
forecast_experiments validation            sarima                23                    23              23                        0
forecast_experiments validation           xgboost                23                    23              23                        0
forecast_experiments       test seasonal_naive_12                23                    23              23                        0
forecast_experiments       test            sarima                23                    23              23                        0
forecast_experiments       test           xgboost                23                    23              23                        0
   feature_selection validation seasonal_naive_12                23                    23              23                        0
   feature_selection validation            sarima                23                    23              23                        0
   feature_selection validation      xgboost_full                23                    23              23                        0
   feature_selection validation  xgboost_selected                23                    23              23                        0
   feature_selection       test seasonal_naive_12                24                    23              23                        1
   feature_selection       test            sarima                24                    24              24                        0
   feature_selection       test      xgboost_full                24                    24              24                        0
   feature_selection       test  xgboost_selected                24                    24              24                        0
```

## Selection and test isolation
- Feature selection scores and subset decisions are fold-local.
- The final selected subset is frozen from validation selection frequency before test evaluation.
- Final test outcomes were not used to choose a model, feature subset, or hyperparameter.

## SARIMA reliability
- Saved prediction statuses report successful forecast calls, but the runner does not persist optimizer convergence flags or warning details.
- A `statsmodels` `ConvergenceWarning` was emitted during the corrected feature-selection run. SARIMA is therefore a useful provisional comparator, not a fully reliable final model without convergence diagnostics and sensitivity checks.
- Validation-only SARIMA diagnostics and the bounded sensitivity check are in `sarima_fold_diagnostics.csv` and `sarima_sensitivity_validation.csv`. Warnings are retained rather than suppressed.

### Validation-only SARIMA sensitivity
```text
 n    mae   rmse  mape_pct   mase      phase    specification  successful_predictions  converged_folds  warning_folds
23 1.9167 2.3518    9.3404 1.1934 validation baseline_111_111                      23               23              0
23 1.9111 2.3203    9.3018 1.1899 validation      ma_seasonal                      23               23              0
23 2.6813 3.2382   13.0219 1.6695 validation      ar_seasonal                      23               23              0
```
- The baseline specification converged on all recorded validation folds in this audit. One alternative specification emitted a warning on one fold; the alternative with `(1,1,0)` non-seasonal order had materially weaker validation RMSE. This is a bounded sensitivity check, not an unrestricted search.

## Target units
- The source contains observed `kg` and `mn_kg` labels. Explicit `kg` rows are divided by 1,000,000 in the derived modeling target.
- No provider/source definition was available to verify the semantic meaning or consistency of these labels. This remains a material limitation.
- Rainfall `-999` values were audited and preserved; their sentinel meaning is unconfirmed.
- The available project evidence does not independently establish whether the dataset is official real production data, synthetic data, or experimental/assembled data. Provenance is therefore uncertain.

## Recommendation
- Do not train a hybrid or LSTM model yet.
- The single most useful next step is a frozen, leakage-safe direct 12-month benchmark using the same common forecast origins for seasonal naive, baseline SARIMA with captured convergence status, and selected-feature XGBoost; do not tune or choose a winner from the final test period.
- The validation evidence supports testing the selected subset against the full XGBoost set, but does not establish a winner: the selected subset improved XGBoost validation relative to full XGBoost, while the seasonal-naive and SARIMA comparisons remain sensitive to missing cases and small sample size.
