# Backtest Cleaned v2 & DSS Prediction Intervals Report

## Protocol Verification and Model Selection Audit

This report documents the resolution of protocol discrepancies between the final benchmark and backtest reports, details the evaluation of 15 candidate models and ensembles across all 152 rolling origins (2012–2024), and provides empirical prediction intervals and seasonal error diagnostics for the Decision Support System (DSS).

All models were evaluated using direct 12-month-ahead forecasting on the verified 300-month cleaned dataset (`M1_combined_monthly_cleaned.csv`).

---

### Step 0: Protocol Discrepancy Reconciliation

#### Root Causes of Differences
1. **SARIMA Horizon Misalignment**: In `final_benchmark.py`, training data was filtered by `_label_date <= origin`, which truncated historical series 12 months early ($t-12$). Calling `forecast(steps=12)` generated an in-sample forecast of origin $t$ rather than target $t+12$. In `run_backtest_cleaned.py`, the training series was filtered by `index <= origin`, and `forecast(steps=12)[-1]` correctly generated $t+12$.
2. **XGBoost Feature Typo**: In `final_benchmark.py`, the feature list included `target_diff_1` instead of `target_change_1`. Because `target_diff_1` did not exist in the DataFrame, `SimpleImputer` populated it with medians (0), degrading validation/test accuracy.

#### Reconciliation Results (n=23 Validation, n=23 Test)
- **Validation (2021–2022)**:
  - Seasonal Naive: MAE = 2.736
  - SARIMA: MAE = 2.830 (both scripts agree; formerly 1.917)
  - XGBoost: MAE = 2.165 (both scripts agree; formerly 2.308)
- **Test (2023–2024)**:
  - Seasonal Naive: MAE = 2.467
  - SARIMA: MAE = 3.317 (both scripts agree; formerly 2.896)
  - XGBoost: MAE = 2.890 (both scripts agree; formerly 2.475)

#### Pre-2012 Feature Selection Check
Testing feature selection strictly on pre-2012 data (`Date <= 2010-12-01`, 108 origins) selects the identical 8 features:
`target_lag_12`, `target_month_sin`, `target_month_cos`, `target_pct_change_1`, `target_change_1`, `target_month`, `target_lag_1`, `target_rolling_std_6`.
There is zero lookahead leakage into 2012–2020.

#### Recount of Lowest MAE Years (2012–2024, 13 years)
- **Seasonal Mean 3yr**: **6 years** (2018, 2019, 2021, 2022, 2023, 2024)
- **ETS**: **3 years** (2012, 2013, 2014)
- **XGBoost**: **2 years** (2015, 2016)
- **SARIMA**: **2 years** (2017, 2020)
Total: 6 + 3 + 2 + 2 = 13 years.

---

### Step 1: Candidate Models & Ensembles (152 Rolling Origins)

| Model | Pooled MAE | MBB L=6 95% CI | Pooled RMSE | MAPE (%) | Bias (mn kg) | Diff vs Naive | HLN DM Stat | Holm Adj p-val |
|---|---|---|---|---|---|---|---|---|
| **combo_mean_xgb** | **1.734** | [1.401, 2.085] | **2.237** | 8.05% | +0.748 | -0.193 | -1.546 | 0.971 |
| **combo_mean_all_no_sarima** | **1.738** | [1.427, 2.078] | **2.233** | **8.03%** | +0.631 | -0.190 | -2.035 | 0.479 |
| **combo_mean_3** | **1.759** | [1.444, 2.100] | 2.268 | 8.08% | +0.585 | -0.168 | -1.696 | 0.919 |
| seasonal_mean_3yr | 1.770 | [1.430, 2.094] | 2.277 | 8.15% | +0.823 | -0.157 | -0.977 | 1.000 |
| combo_median_3 | 1.786 | [1.462, 2.153] | 2.306 | 8.22% | +0.541 | -0.141 | -1.326 | 0.971 |
| xgboost_selected | 1.883 | [1.531, 2.273] | 2.423 | 8.85% | +0.936 | -0.044 | -0.342 | 1.000 |
| ets | 1.885 | [1.572, 2.234] | 2.382 | 8.67% | +0.485 | -0.042 | -0.344 | 1.000 |
| seasonal_naive | 1.927 | [1.624, 2.293] | 2.478 | 8.81% | +0.448 | 0.000 | 0.000 | 1.000 |
| seasonal_naive_drift | 1.958 | [1.670, 2.313] | 2.494 | 8.94% | +0.459 | +0.030 | +1.664 | 0.919 |
| trend_naive_phi_05 | 2.026 | [1.669, 2.452] | 2.649 | 9.30% | +0.423 | +0.099 | +1.463 | 0.971 |
| theta | 2.031 | [1.720, 2.374] | 2.536 | 9.37% | +0.634 | +0.104 | +0.823 | 1.000 |
| local_drift_5yr | 2.134 | [1.832, 2.504] | 2.712 | 9.66% | +0.188 | +0.206 | +2.624 | 0.124 |
| sarima | 2.141 | [1.794, 2.531] | 2.679 | 9.79% | +0.166 | +0.213 | +1.558 | 0.971 |
| trend_naive_phi_10 | 2.197 | [1.781, 2.695] | 2.890 | 10.08% | +0.407 | +0.270 | +2.165 | 0.384 |
| local_drift_3yr | 2.268 | [1.934, 2.646] | 2.878 | 10.24% | +0.166 | +0.341 | +4.200 | 0.00064* |

*Statistically significantly worse than Seasonal Naive at $\alpha=0.05$.

---

### Step 2: DSS Empirical Prediction Intervals & Calibration (2018–2024, n=81)

Empirical percentiles strictly constructed from past errors observed on or before origin $t$ (targets $\le t$, origins $\le t-12$).

| Model | Evaluation Period | n | 80% Coverage Target | Avg 80% Width (mn kg) | 50% Coverage Target | Avg 50% Width (mn kg) |
|---|---|---|---|---|---|---|
| **combo_mean_xgb** | Overall 2018–2024 | 81 | 67.9% | 4.71 | 51.9% | 2.60 |
| | Pre-validation (2018–20) | 35 | 77.1% | 4.59 | 57.1% | 2.67 |
| | Validation (2021–22) | 23 | 60.9% | 4.68 | 56.5% | 2.57 |
| | Test (2023–24) | 23 | 60.9% | 4.94 | 39.1% | 2.54 |
| **combo_mean_all_no_sarima**| Overall 2018–2024 | 81 | 66.7% | 4.78 | 46.9% | 2.55 |
| | Pre-validation (2018–20) | 35 | 74.3% | 4.58 | 51.4% | 2.57 |
| | Validation (2021–22) | 23 | 60.9% | 4.82 | 47.8% | 2.55 |
| | Test (2023–24) | 23 | 60.9% | 5.03 | 39.1% | 2.52 |
| **combo_mean_3** | Overall 2018–2024 | 81 | 66.7% | 4.76 | 45.7% | 2.65 |
| | Pre-validation (2018–20) | 35 | 74.3% | 4.56 | 48.6% | 2.64 |
| | Validation (2021–22) | 23 | 60.9% | 4.79 | 43.5% | 2.60 |
| | Test (2023–24) | 23 | 60.9% | 5.04 | 43.5% | 2.72 |

#### Interval Calibration Variant Comparison (Selection on 2018–2022, n=58)
Comparing (a) Expanding window, (b) 36-month recency window, and (c) 36-month recency window with causal bias correction:

| Candidate Model | Variant | Nominal 50% Cov | Avg 50% W | PB Loss 50% | Nominal 80% Cov | Avg 80% W | PB Loss 80% | Nominal 90% Cov | Avg 90% W | PB Loss 90% |
|---|---|---|---|---|---|---|---|---|---|---|
| **combo_mean_xgb** | **(a) Expanding window** | **56.9%** | 2.63 | **0.695** | **70.7%** | 4.63 | **0.415** | **79.3%** | 5.47 | **0.276** |
| | (b) 36m recency | 36.2% | 2.06 | 0.753 | 62.1% | 3.76 | 0.459 | 67.2% | 4.55 | 0.331 |
| | (c) 36m recency + bias | 36.2% | 2.06 | 0.753 | 62.1% | 3.76 | 0.459 | 67.2% | 4.55 | 0.331 |
| **combo_mean_all** | **(a) Expanding window** | 50.0% | 2.56 | 0.738 | 69.0% | 4.68 | 0.443 | 74.1% | 5.42 | 0.295 |
| | (b) 36m recency | 34.5% | 2.07 | 0.812 | 58.6% | 4.06 | 0.494 | 69.0% | 4.87 | 0.351 |
| | (c) 36m recency + bias | 34.5% | 2.07 | 0.812 | 58.6% | 4.06 | 0.494 | 69.0% | 4.87 | 0.351 |
| **combo_mean_3** | **(a) Expanding window** | 46.6% | 2.62 | 0.749 | 69.0% | 4.65 | 0.455 | 75.9% | 5.59 | 0.299 |
| | (b) 36m recency | 34.5% | 2.16 | 0.854 | 60.3% | 4.16 | 0.507 | 65.5% | 5.04 | 0.361 |
| | (c) 36m recency + bias | 34.5% | 2.16 | 0.854 | 60.3% | 4.16 | 0.507 | 65.5% | 5.04 | 0.361 |

*Selection Decision*: Variant (a) Expanding window is selected as the champion calibration method based on lowest pinball loss and coverage closest to nominal on the 2018–2022 development window.

#### Held-out Test Phase Performance (2023–2024, n=23)
- `combo_mean_xgb` Variant (a): 50% Coverage = 39.1% (Width = 2.54, Pinball = 0.858), 80% Coverage = 60.9% (Width = 4.94, Pinball = 0.499), 90% Coverage = 78.3% (Width = 6.23, Pinball = 0.322).

#### Calendar Month Error Diagnostics (Hardest to Easiest)
*Mean MAE across top models (with untested domain hypotheses noted for context):*
1. **October**: Mean MAE = 2.604 mn kg (*Untested hypothesis: Inter-monsoon rainfall shifts impacting harvesting rush*)
2. **May**: Mean MAE = 2.526 mn kg (*Untested hypothesis: Southwest monsoon onset volatility*)
3. **March**: Mean MAE = 2.402 mn kg (*Untested hypothesis: Western quality season auction volume timing*)
4. **February**: Mean MAE = 2.402 mn kg (*Untested hypothesis: Shorter calendar working month and container logistics*)
5. **July**: Mean MAE = 1.900 mn kg
6. **June**: Mean MAE = 1.840 mn kg
7. **September**: Mean MAE = 1.808 mn kg
8. **April**: Mean MAE = 1.770 mn kg (*Untested hypothesis: Factory holiday shutdowns during national New Year*)
9. **November**: Mean MAE = 1.663 mn kg
10. **August**: Mean MAE = 1.621 mn kg
11. **January**: Mean MAE = 1.374 mn kg
12. **December**: Mean MAE = 0.944 mn kg (*Most consistent / lowest forecasting variance month*)

---

### Step 3: Architecture & Serving Design Note (Direct $h=12$ Semantics)
- **Direct 12-Month Horizon Alignment**: Under the direct 12-month-ahead forecasting protocol, each target month $T$ is forecast strictly from historical data observed up to origin $T - 12\text{ months}$ ($h = 12$).
- **Delayed Impact of Fresh Telemetry**: Appending fresh actuals (e.g. at date $D = \text{2024-12}$) only affects target forecasts for months $T \ge D + 12\text{ months}$ (e.g. $T \ge \text{2025-12}$). Targets earlier than $D + 12$ are forecast strictly from their respective historical origins $T - 12$.
- **Interval Horizon Specificity**: Empirical prediction intervals are specifically calibrated for $h = 12$ forecasting errors. They cannot be linearly scaled or assumed valid for arbitrary multi-step or single-step horizons.
- **Asymmetric Intervals & Systemic Bias**: Champion point forecasts exhibit a positive over-forecast bias (+0.75 mn kg pooled across all 152 origins, and +1.77 mn kg during the 2023–2024 crisis phase), with 63.8% of actuals falling below the point forecast (78.3% in 2023–2024). Prediction intervals are calibrated asymmetrically using empirical error quantiles to adjust for this structural characteristic.


