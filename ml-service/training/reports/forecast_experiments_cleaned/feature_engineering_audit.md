> [!WARNING]
> **Superseded: Bug Fixed (SARIMA Window Bug)**. This report was generated under older protocols containing the SARIMA window cutoff bug (evaluating origin $t$ instead of 12-month horizon $t+12$). Authoritative reconciled results are in `reports/final_benchmark_cleaned/final_benchmark_report.md` and `reports/backtest_cleaned_v2/backtest_v2_report.md`.

# Feature Engineering Audit


## Existing implementation audit
- Existing preprocessing lag/rolling columns were aligned to the current row, but the forecasting runner had a training-cutoff bug: rows whose labels occurred after the forecast origin were included. The runner now requires both feature origin and label date to be at or before the training origin.
- The existing `calendar_month` represented the origin month. The dedicated feature module now creates `target_month` and cyclical encodings from origin + 12 months. For a 12-month horizon this is usually the same month, but it is now explicit and testable.
- Existing raw export, quantity, value, auction, climate, and macroeconomic columns are excluded from the primary experiment because publication-time availability has not been documented.

## Leakage-safe definitions
- Target lags use only prior target observations.
- Rolling statistics use `shift(1)` before rolling, excluding the current target.
- Historical changes and percentage changes use only current and prior observations; percentage changes return missing when the denominator is zero or missing.
- The direct label is separate from features and points to origin + 12 months.

## Dataset and unit decisions
- Exact duplicate rows were verified before retaining one copy in the experiment view.
- Explicit `kg` target values are normalized to `mn_kg` in a derived modeling column; raw values and unit labels are retained in audit outputs.
- Missing target values are not imputed and corresponding forecast cases are excluded and recorded.

## Limitations
- Availability classifications cannot replace source publication timestamps.
- The 300-month sample is small for a broad model search or LSTM. No LSTM or hybrid claim is made.
