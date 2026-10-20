import sys
import unittest
from pathlib import Path
import pandas as pd
import numpy as np

TRAINING_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TRAINING_DIR))

from data_cleaning import (
    COMPONENTS,
    CONFIRMED_TOTAL_TYPOS,
    SUSPECT_COMPONENT_MONTHS,
    DEFAULT_CLEANED_DATASET,
    DEFAULT_PROCESSED_DATASET,
    DEFAULT_RAW_DATASET,
    clean_m1_dataset,
)


class DataCleaningTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cleaned, cls.corrections, cls.config = clean_m1_dataset(
            raw_path=DEFAULT_RAW_DATASET,
            cleaned_path=DEFAULT_CLEANED_DATASET,
            processed_path=DEFAULT_PROCESSED_DATASET,
        )

    def test_300_unique_months(self):
        """Cleaned dataset must contain exactly 300 unique monthly observations from 2000-01 to 2024-12."""
        self.assertEqual(len(self.cleaned), 300)
        dates = pd.PeriodIndex(pd.to_datetime(self.cleaned["Date"], format="mixed").dt.to_period("M")).sort_values()
        self.assertEqual(dates.nunique(), 300)
        expected = pd.period_range("2000-01", "2024-12", freq="M")
        self.assertTrue(dates.equals(expected))

    def test_no_duplicates(self):
        """Cleaned dataset must have no duplicate dates and no duplicate records."""
        self.assertFalse(self.cleaned["Date"].duplicated().any())
        self.assertFalse(self.cleaned.duplicated().any())

    def test_total_equals_component_sum_for_all_rows_with_components(self):
        """For every row with components, total equals component sum within 0.01 tolerance,
        except the 3 flagged suspect-component months where raw total is retained."""
        has_components = self.cleaned[COMPONENTS].notna().all(axis=1)
        component_sums = self.cleaned.loc[has_components, COMPONENTS].sum(axis=1)
        totals = self.cleaned.loc[has_components, "TB_Total_Exports"]
        dates = self.cleaned.loc[has_components, "Date"]

        diff = (totals - component_sums).abs()
        non_suspect_mask = ~dates.isin(SUSPECT_COMPONENT_MONTHS)
        
        self.assertTrue(
            (diff[non_suspect_mask] <= 0.01).all(),
            f"Mismatched rows found outside suspect set: {diff[non_suspect_mask][diff[non_suspect_mask] > 0.01]}",
        )
        
        # Suspect component months must have retained raw total and diff within 2.5%
        for dt in SUSPECT_COMPONENT_MONTHS:
            row = self.cleaned[self.cleaned["Date"] == dt].iloc[0]
            rel_diff = abs(row["TB_Total_Exports"] - row[COMPONENTS].sum()) / row[COMPONENTS].sum()
            self.assertLessEqual(rel_diff, 0.025)

    def test_unfilled_nan_rows_match_spec(self):
        """Rows with null components remain NaN; rows with complete components are recovered."""
        remaining_nan = self.cleaned.loc[self.cleaned["TB_Total_Exports"].isna(), "Date"].tolist()
        self.assertEqual(sorted(remaining_nan), ["2003-12", "2017-01", "2022-11"])

        recovered_dates = ["2012-12", "2020-06", "2022-09"]
        for dt in recovered_dates:
            val = self.cleaned.loc[self.cleaned["Date"] == dt, "TB_Total_Exports"].values[0]
            self.assertTrue(np.isfinite(val), f"Expected {dt} to be filled, got {val}")

    def test_correction_log_types(self):
        """Correction log must contain all 4 types: total_typo, component_suspect, nan_fill, duplicate."""
        types = set(self.corrections["type"].unique())
        self.assertEqual(types, {"total_typo", "component_suspect", "nan_fill", "duplicate"})
        self.assertEqual(len(self.corrections[self.corrections["type"] == "total_typo"]), 4)
        self.assertEqual(len(self.corrections[self.corrections["type"] == "component_suspect"]), 3)
        self.assertEqual(len(self.corrections[self.corrections["type"] == "nan_fill"]), 3)
        self.assertEqual(len(self.corrections[self.corrections["type"] == "duplicate"]), 2)


if __name__ == "__main__":
    unittest.main()
