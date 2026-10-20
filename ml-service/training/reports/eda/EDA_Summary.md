# EDA Summary: `M1_combined_monthly_raw.csv`

## 1. Dataset Overview
- Observed shape: **302 rows x 77 columns**.
- Numerical columns: **65**; non-numerical columns: **12**.
- Date-like columns detected: **Date**.
- Confirmed target: **`TB_Total_Exports`**.

## 2. Dataset Quality Assessment
- 3 columns are constant or have only one including-missing value.
- 0 columns contain blank strings; 16 numeric columns contain negative values.
- See `data_quality_report.csv` for per-column types, cardinality, missingness, zeros, negatives, and IQR flags.

## 3. Missing-Value Findings
- 51 of 77 columns contain missing values; total missing cells: **1,073**.
- Columns with missing values: `CPI_base_2013` (52.32%), `GDP_Syrian_Arab_Republic` (51.66%), `INF_Syrian_Arab_Republic` (51.66%), `CPI_base_2006_07` (40.73%), `GDP_Iraq` (15.89%), `GDP_Libya` (7.95%), `INF_Iran` (7.95%), `CT_kg_Chile` (6.29%), `CT_kg_Russian_Federation` (5.96%), `CT_World_value_USD` (5.63%), `CT_kg_Azerbaijan` (4.97%), `COMP_India` (4.64%), `CT_kg_Iran` (4.64%), `CT_kg_Libya` (4.64%), `RAIN_Badulla` (4.30%), `RAIN_Nuwara_Eliya` (4.30%), `COMP_China` (3.97%), `COMP_Kenya` (3.97%), `COMP_Vietnam` (3.97%), `GDP_Azerbaijan` (3.97%), `GDP_Iran` (3.97%), `GDP_Turkiye` (3.97%), `GDP_United_Arab_Emirates` (3.97%), `INF_Azerbaijan` (3.97%), `INF_Libya` (3.97%), `INF_Turkiye` (3.97%), `INF_United_Arab_Emirates` (3.97%), `CT_kg_Iraq` (3.64%), `CT_kg_Japan` (3.64%), `CT_kg_Syrian_Arab_Republic` (3.64%), `CT_kg_Turkiye` (3.64%), `CT_kg_United_Arab_Emirates` (2.98%), `RAIN_Ratnapura` (2.65%), `TB_Export_Value_Rs_Mn` (2.65%), `CT_World_netWgt` (2.32%), `CT_World_unit` (2.32%), `TB_Total_Exports` (1.99%), `TB_Bulk_Tea` (0.99%), `TB_Green_Tea` (0.99%), `TB_Instant_Tea` (0.99%), `TB_Packets` (0.99%), `TB_Tea_Bags` (0.99%), `AUC_Medium_price_mean` (0.66%), `AUC_Medium_price_std` (0.66%), `AUC_High_price_mean` (0.33%), `AUC_High_price_std` (0.33%), `AUC_High_qty_sum` (0.33%), `AUC_Low_price_mean` (0.33%), `AUC_Low_price_std` (0.33%), `AUC_Low_qty_sum` (0.33%), `AUC_Medium_qty_sum` (0.33%)

## 4. Duplicate Analysis
- Exact duplicate records: **2** (0.66% of rows).

## 5. Distribution Analysis
- Numerical distribution statistics and skewness are in `descriptive_statistics.csv` for 65 numerical columns.
- Histograms and KDE overlays are included only for the first 24 numerical columns to keep the report readable.

## 6. Outlier Findings
- IQR screening flagged 1,065 cell-level observations across 40 numerical columns.
- Highest IQR flags: `TB_Total_Exports` (74), `TB_Bulk_Tea` (71), `TB_Tea_Bags` (71), `TB_Packets` (71), `TB_Instant_Tea` (71), `TB_Green_Tea` (71), `INF_Turkiye` (60), `GDP_Chile` (49), `COMP_Vietnam` (47), `AUC_Medium_price_std` (36)
- IQR flags are screening signals, not automatic errors; time-series seasonality and legitimate extremes require domain review.

## 7. Correlation Findings
- The strongest pairwise numerical correlations are summarized in the HTML report and are visible in the correlation heatmap.
- Pairs with absolute correlation >= 0.90: `CPI_base_2006_07` / `CPI_base_2013` (1.000); `TB_Tea_Bags` / `TB_Instant_Tea` (0.997); `TB_Packets` / `TB_Green_Tea` (0.996); `TB_Bulk_Tea` / `TB_Green_Tea` (0.995); `TB_Bulk_Tea` / `TB_Packets` (0.993); `TB_Packets` / `TB_Tea_Bags` (0.988); `TB_Packets` / `TB_Instant_Tea` (0.987); `TB_Tea_Bags` / `TB_Green_Tea` (0.984); `TB_Instant_Tea` / `TB_Green_Tea` (0.984); `AUC_High_price_mean` / `AUC_Low_price_mean` (0.980); `AUC_Low_price_mean` / `FX_USD_LKR` (0.979); `AUC_Low_price_mean` / `CPI_base_2006_07` (0.979); `TB_Bulk_Tea` / `TB_Instant_Tea` (0.973); `TB_Bulk_Tea` / `TB_Tea_Bags` (0.972); `AUC_Medium_price_mean` / `CPI_base_2006_07` (0.966)

## 7A. Confirmed Target Relationships
- The confirmed target is `TB_Total_Exports`. It has 6 missing values and 293 observed unique values.
- Strongest observational numerical associations with the target: `CPI_base_2006_07` (0.557); `TB_Tea_Bags` (0.477); `TB_Instant_Tea` (0.473); `TB_Packets` (0.467); `TB_Green_Tea` (0.463); `TB_Bulk_Tea` (0.460); `CT_World_value_USD` (0.433); `GDP_Syrian_Arab_Republic` (-0.427); `CT_kg_Iraq` (0.317); `TB_Export_Value_Rs_Mn` (0.305).
- These correlations are univariate, contemporaneous associations and must not be interpreted as causal evidence or as model accuracy.

## 8. Important Patterns
- The dataset is structured as monthly observations when the detected date field is used; inspect the time-trend figure for level shifts, seasonality, and missing periods.
- Unit and provenance columns should be interpreted with their paired measures; identical or near-identical source/unit fields can create redundant predictors.

## 9. Potential Data Leakage Risks
- No target was assumed. If a future target is selected, any feature measured after the prediction cutoff, aggregates containing the target period, or columns derived from the target must be excluded.
- Monthly time ordering implies random train/test splitting may leak future information; use a chronological split after the target and forecast horizon are defined.
- Columns with names indicating totals, exports, prices, or post-period aggregates require business-timestamp confirmation before modeling.

## 10. Recommended Preprocessing Steps
- Confirm the modeling objective, target, prediction timestamp, forecast horizon, units, and acceptable missingness policy.
- Parse the detected date column explicitly, validate monthly continuity, and use time-aware validation.
- Resolve missing values by feature meaning; do not impute blindly. Validate negative values and IQR flags against domain rules.
- Remove exact duplicates only after confirming they are not repeated legitimate monthly records; retain the raw source unchanged.

## 11. Recommended Feature Engineering Opportunities
- After target confirmation, consider calendar month/quarter and lag/rolling features computed strictly from prior observations.
- Consider unit-normalized ratios and carefully selected aggregate measures only where their numerator/denominator definitions are known.
- Investigate highly correlated feature groups for documented, domain-informed reduction; do not remove features solely from this EDA.

## 12. Limitations and Issues Requiring Clarification
- The dataset has no explicit target label in this EDA run.
- Source provenance, unit semantics, and whether all columns are available at prediction time require confirmation.
- IQR outlier detection does not account for seasonality, structural breaks, or domain thresholds.
- This stage intentionally performs no permanent cleaning, preprocessing, feature selection, or model training.
