# Feature Selection Report

## Scope and candidate set
- Direct forecast horizon: **12 months**.
- Candidate features: `target_lag_1`, `target_lag_3`, `target_lag_6`, `target_lag_12`, `target_rolling_mean_3`, `target_rolling_std_3`, `target_rolling_mean_6`, `target_rolling_std_6`, `target_rolling_mean_12`, `target_rolling_std_12`, `target_change_1`, `target_pct_change_1`, `target_month`, `target_month_sin`, `target_month_cos`, `origin_time_index`.
- Candidates are the approved past-only lags, rolling statistics, historical changes, target-month seasonality, and origin trend.
- Raw contemporaneous/exogenous variables were not added because forecast-origin publication availability remains unverified.

## Leakage controls
- Each outer fold uses only rows whose feature origin and direct label date are at or before that simulated origin.
- Filter scores, mutual information, imputation, XGBoost importance, and permutation diagnostics are calculated within the fold.
- Permutation importance uses an inner chronological validation block from the training fold.
- The final test period does not determine feature selection. A fixed subset is frozen from validation-fold selection frequency.
- The raw dataset is not modified.

## Selection rule
- Always retain `target_lag_12`, `target_month_sin`, and `target_month_cos` when available.
- Add the highest-ranked ensemble features until at most 8 features are retained.
- Ensemble ranks average absolute target correlation, mutual information, XGBoost importance, and inner-validation permutation importance.
- Final stable subset: `target_lag_1`, `target_lag_12`, `target_rolling_std_6`, `target_pct_change_1`, `target_month`, `target_month_sin`, `target_month_cos`, `origin_time_index`.

## Interpretation limitations
- Correlation and mutual information are predictive diagnostics, not causal evidence.
- Importance may substitute among highly correlated lag and rolling features and can vary over time.
- MAPE is unstable for small actual values and excludes only zero actuals; all nonzero observed targets remain in metric calculations.
- The dataset has approximately 300 monthly periods, so selection stability and model comparisons are preliminary.

## Outputs
- `feature_selection_scores.csv`: fold-local diagnostics and ranks.
- `selected_features.csv`: selected/not-selected status by chronological fold.
- `feature_selection_stability.csv`: selection frequency and stability class.
- `feature_subset_comparison.csv`: seasonal-naive, SARIMA, full XGBoost, and selected XGBoost metrics.
- `feature_selection_predictions.csv`: predictions using identical forecast dates where models are available.
- `chronological_folds.csv`: fold cutoffs and selected features.
- `feature_selection_config.json`: reproducibility configuration.
