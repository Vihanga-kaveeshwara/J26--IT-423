import sys
import unittest
import hashlib
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from model_selection_audit import (
    DEFAULT_DATASET,
    _duplicate_prediction_rows,
    _fit_sarima_diagnostic,
    _metrics,
    _origin_comparison,
)


class ModelSelectionAuditTests(unittest.TestCase):
    def test_metrics_recalculate_with_zero_safe_mape_and_mase(self):
        result = _metrics(
            pd.Series([10.0, 0.0, 20.0]),
            pd.Series([12.0, 3.0, 16.0]),
            np.arange(1.0, 25.0),
        )
        self.assertEqual(result["n"], 3)
        self.assertAlmostEqual(result["mae"], 3.0)
        self.assertAlmostEqual(result["mape_pct"], 20.0)
        self.assertTrue(np.isfinite(result["mase"]))

    def test_origin_comparison_detects_mismatched_actuals(self):
        forecast = pd.DataFrame(
            {
                "origin_date": ["2020-01"],
                "target_date": ["2021-01"],
                "actual": [10.0],
            }
        )
        selection = pd.DataFrame(
            {
                "origin_date": ["2020-01"],
                "target_date": ["2021-01"],
                "actual": [20.0],
                "phase": ["validation"],
            }
        )
        result = _origin_comparison(forecast, selection)
        self.assertFalse(bool(result.loc[0, "actuals_match"]))
        self.assertEqual(result.loc[0, "actual_difference"], -10.0)

    def test_duplicate_prediction_rows_are_detected(self):
        predictions = pd.DataFrame(
            {
                "origin_date": ["2020-01", "2020-01"],
                "target_date": ["2021-01", "2021-01"],
            }
        )
        self.assertEqual(len(_duplicate_prediction_rows(predictions)), 2)

    def test_mase_changes_only_with_explicit_history_window(self):
        actual = pd.Series([10.0, 12.0])
        predicted = pd.Series([11.0, 10.0])
        short_history = np.arange(1.0, 25.0)
        long_history = np.arange(1.0, 37.0) ** 1.01
        short = _metrics(actual, predicted, short_history)["mase"]
        long = _metrics(actual, predicted, long_history)["mase"]
        self.assertNotEqual(short, long)

    def test_sarima_diagnostic_returns_status(self):
        result = _fit_sarima_diagnostic(
            np.linspace(20.0, 25.0, 48),
            (0, 1, 1),
            (1, 1, 1, 12),
        )
        self.assertIn(result["status"], {"ok", "failed"})
        self.assertIn("warnings", result)
        self.assertIn("converged", result)

    def test_raw_dataset_is_readable_and_hashable(self):
        digest = hashlib.sha256(DEFAULT_DATASET.read_bytes()).hexdigest()
        self.assertEqual(len(digest), 64)


if __name__ == "__main__":
    unittest.main()
