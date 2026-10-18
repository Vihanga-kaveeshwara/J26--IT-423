# Target Data Validation and Provenance Audit

## Scope and integrity

- Dataset: `M1_combined_monthly_raw.csv`
- Physical rows and columns: **302 x 77**
- Unique monthly periods: **300**, from **2000-01** to **2024-12**
- Raw SHA-256 before and after audit: `f35a9cde764724e6a927c48b110a7e3b53301a0d1f808486b13f2e70bd380f03` (unchanged)
- The raw CSV, historical reports, predictions, and frozen benchmark were not modified.

## Target-unit findings

The raw target is `TB_Total_Exports` and its unit label is `TB_Quantity_Unit`. Observed labels are `{'kg': 230, 'mn_kg': 72}`. The labels change from `mn_kg` in the early period to `kg` in later rows; this is an observed pattern, not proof that the source definition is correct. The audit reproduces the existing engineering rule in a derived field only: explicit `kg` values are divided by 1,000,000 and explicit `mn_kg` values are retained. The original raw value and label remain in `target_unit_audit.csv`.

The conversion is **not independently source-verified**. No project file establishes an official target definition, publication source, or authoritative explanation for the unit transition. Consequently, all benchmark errors remain in provisional modelling units and must not be presented as verified real-world export performance.

## Data consistency

- Missing target values: **6**
- Exact duplicate rows in duplicate groups: **4**
- Rows belonging to duplicate months: **4**
- Duplicate month periods after retaining one audit row per month: **2**
- Missing calendar months: **0** (`none`)
- Rainfall `-999` counts: {'RAIN_Badulla': 5, 'RAIN_Nuwara_Eliya': 1, 'RAIN_Ratnapura': 3}. These values were preserved because their sentinel meaning is unconfirmed.

`monthly_target_quality.csv` records duplicate status, missingness, unit labels, derived values, rainfall sentinel counts, and target/component consistency where all five target components are present. No duplicate months were aggregated and no missing target was imputed. Component agreement, even if observed, does not independently validate the unit semantics.

## Provenance assessment

The dataset contains `FX_origin` values `{'synthetic': np.int64(170), 'real_cbsl': np.int64(132)}`, including both `synthetic` and `real_cbsl`. On the evidence available in the project, the classification is **Mixed provenance**, qualified as **metadata-indicated and not independently authenticated**. The project search found no authoritative provider URL or extraction note. This is not a claim that the labels are genuine source records.

## Recommendations and unresolved questions

1. Obtain the original provider documentation and confirm whether `TB_Total_Exports` is kilograms or million kilograms in each period.
2. Confirm why the unit and `FX_origin` categories change over time, and whether the transition represents a source splice.
3. Confirm the meaning of rainfall `-999` before imputation or replacement.
4. Define the semantic rule for duplicate months before any future aggregation.
5. Until those questions are answered, retain the frozen benchmark only as a reproducible experimental comparison; do not interpret MAE, RMSE, MAPE, or MASE as verified production-scale performance.
