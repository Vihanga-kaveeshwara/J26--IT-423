# Preprocessing Decisions

## Scope
- This run performs validation and conservative, reproducible transformations only.
- The raw CSV is never overwritten.
- The original `TB_Total_Exports` column is preserved. A separate `TB_Total_Exports_model_mn_kg` column normalizes explicit `kg` rows to million kilograms for lag/rolling features; source unit semantics remain subject to confirmation.
- Confirmed target: `TB_Total_Exports`; forecast horizon: 12 months.

## Observed validation findings
- Rows: 302; date range: 2000-01 to 2024-12.
- Invalid dates: 0; exact duplicate rows after the first occurrence: 2; records belonging to duplicate months: 4; duplicated month periods: 2.
- monthly with complete unique-month coverage; missing months: 0.
- Target missing values: 6; target values are not imputed.

## Target handling
- Rows with missing or invalid target values are retained in the cleaned chronological output for auditability but must be excluded from supervised training.
- No automatic target outlier removal is performed. Suspicious scale values must be checked against source units and original rows.

## Missing values and special codes
- High-missingness features (>=20%): `CPI_base_2013` (52.32%), `GDP_Syrian_Arab_Republic` (51.66%), `INF_Syrian_Arab_Republic` (51.66%), `CPI_base_2006_07` (40.73%).
- Rainfall -999 confirmation status: not confirmed; values preserved and flagged.
- No blanket column dropping or full-dataset imputation is performed.
- For modeling, imputers must be fitted inside each training window only. Forward fill is appropriate only for justified slow-moving series; interpolation must not use future values.
- Strategy comparison: time interpolation is unsuitable as a default for contemporaneous exogenous data because it can use future values; forward fill is restricted to justified slow-moving series and training boundaries; training-only median/most-frequent imputation is the reproducible default candidate for model pipelines, to be fit separately in each training window.

## Duplicates and constants
- Duplicate monthly records are not aggregated because their semantic meaning and aggregation rule are not established.
- Constant and near-constant columns are reported for review, not automatically removed.

## Leakage controls and feature engineering
- Target lags and rolling statistics use shift-before-roll, so each row uses only prior target observations.
- Candidate availability and leakage risks are heuristic flags requiring source timestamp confirmation.
- Any feature selection, imputation, scaling, or model fitting must be repeated inside each chronological training fold.
- A direct 12-month forecast means the training label must be the target at origin + 12 months; the lag features in this run are inputs only and do not by themselves implement a 12-month supervised label.

## Validation plan
- **Train:** 2000-01 to 2020-12 — fit transformations and models.
- **Validation:** 2021-01 to 2022-12 — model selection; never fit transformations here.
- **Test:** 2023-01 to 2024-12 — final 12-month-horizon evaluation.
- Use rolling-origin evaluation with a 12-month test horizon; never randomly shuffle months.
- Seasonal-naive baseline for later evaluation: predict each month using the observed target from 12 months earlier, when that lag is available.

## Required clarification before modeling
- Confirm duplicate-month meaning, rainfall sentinel semantics, feature publication/reporting dates, target units, and whether contemporaneous export/auction fields are available at forecast origin.
