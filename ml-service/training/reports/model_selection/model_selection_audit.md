# Model Selection and Evaluation Audit

## Outcome
- Forecast horizon alignment checks passed for 300/300 origin rows.
- Training-label cutoff checks passed for 22/22 validation folds.
- Saved forecast and feature-selection prediction files share 43 forecast-origin/target-month pairs; corrected actuals match on all shared pairs: **True**.
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
     phase             model  n     mae    rmse  mape_pct   mase
validation seasonal_naive_12 21 13.1219 48.7188   62.2966 2.7306
validation            sarima 21  3.0740  4.4437   14.7866 0.6397
validation      xgboost_full 21 31.8920 60.5997  149.9576 6.6365
validation  xgboost_selected 21 23.8032 57.6931  109.8822 4.9533
      test seasonal_naive_12 22 22.1007 67.1851   71.0580 4.0370
      test            sarima 22 18.5568 46.3609   53.2539 3.3896
      test      xgboost_full 22 30.5469 73.5557  117.1575 5.5798
      test  xgboost_selected 22 26.4418 66.3379   93.5653 4.8299
```

### Coverage and missing predictions
```text
              source      phase             model  rows_with_actual  rows_with_prediction  rows_evaluated  missing_prediction_rows
forecast_experiments validation seasonal_naive_12                21                    21              21                        0
forecast_experiments validation            sarima                21                    21              21                        0
forecast_experiments validation           xgboost                21                    21              21                        0
forecast_experiments       test seasonal_naive_12                22                    22              22                        0
forecast_experiments       test            sarima                22                    22              22                        0
forecast_experiments       test           xgboost                22                    22              22                        0
   feature_selection validation seasonal_naive_12                22                    21              21                        1
   feature_selection validation            sarima                22                    22              22                        0
   feature_selection validation      xgboost_full                22                    22              22                        0
   feature_selection validation  xgboost_selected                22                    22              22                        0
   feature_selection       test seasonal_naive_12                24                    22              22                        2
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
 n    mae    rmse  mape_pct   mase      phase    specification  successful_predictions  converged_folds  warning_folds
22 3.0710  4.3887   14.6679 0.6391 validation baseline_111_111                      22               22              0
22 3.0627  4.3771   14.6129 0.6373 validation      ma_seasonal                      22               21              1
22 6.5902 19.7290   34.5704 1.3714 validation      ar_seasonal                      22               22              0
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
