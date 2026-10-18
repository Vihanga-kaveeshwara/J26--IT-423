# Frozen Direct 12-Month Benchmark

## Scope
- This benchmark uses the existing direct 12-month feature engineering and does not train a hybrid model, LSTM, or new architecture.
- Frozen feature set: `target_lag_1`, `target_lag_12`, `target_rolling_std_6`, `target_pct_change_1`, `target_month`, `target_month_sin`, `target_month_cos`, `origin_time_index`.
- Models: seasonal naive, baseline SARIMA, and selected-feature XGBoost.
- Validation results are for assessment; the 2023–2024 test period is held out and is not used for model or feature selection.

## Common-origin design
- Validation included 21 identical origin/target-month rows and excluded 3 rows.
- Test included 22 identical origin/target-month rows and excluded 2 rows.
- A row is included only when the actual, seasonal-naive origin target, observed training-label cutoff, SARIMA forecast, and XGBoost forecast are all available at the same origin.
- Training rows satisfy both feature origin <= forecast origin and label date <= forecast origin.

## Metrics
```text
     phase            model  n     mae    rmse  mape_pct   mase
validation   seasonal_naive 21 13.1219 48.7188   62.2966 2.7306
validation           sarima 21  3.0740  4.4437   14.7866 0.6397
validation xgboost_selected 21 27.3206 58.4607  127.2810 5.6852
      test   seasonal_naive 22 22.1007 67.1851   71.0580 4.0370
      test           sarima 22 18.5568 46.3609   53.2539 3.3896
      test xgboost_selected 22 26.4418 66.3379   93.5653 4.8299
```
- MAPE excludes zero actuals from the denominator; all nonzero actuals remain.
- MASE uses mean absolute error divided by the mean absolute 12-month seasonal difference computed only through the pre-validation or pre-test cutoff.
- Metrics are calculated from `benchmark_predictions.csv`, not copied from earlier reports.

## SARIMA diagnostics
- Each fold records optimizer status, convergence, warning count/text, iterations, and function calls.
- A forecast is marked reliable only when the fit reports convergence and no warnings were captured. Forecast availability alone is not treated as reliability.
- See `sarima_diagnostics.csv` for fold-level evidence.

## Limitations
- The target contains observed `kg` and `mn_kg` labels. The derived modeling target divides explicit `kg` values by 1,000,000, but provider documentation verifying the unit semantics is unavailable.
- Rainfall `-999` values remain preserved because their sentinel meaning is unconfirmed.
- Dataset provenance is uncertain; the available project evidence does not independently establish official real, synthetic, or experimental status.
- The common samples are small, so results are preliminary and are not claims of real-world forecasting performance.

## Recommendation
- Do not train a hybrid or LSTM model yet. First review this frozen benchmark and resolve target-unit/provenance questions. The next useful experiment is a controlled repeat with any approved data-definition correction, retaining the same common-origin protocol.
