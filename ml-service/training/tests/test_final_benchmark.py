import sys
import unittest
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from final_benchmark import SELECTED_FEATURES, _metrics, _period_bounds


class FinalBenchmarkTests(unittest.TestCase):
    def test_frozen_feature_set_and_period_cutoffs(self):
        self.assertEqual(len(SELECTED_FEATURES), 8)
        validation_start, validation_end, validation_scale = _period_bounds("validation")
        test_start, test_end, test_scale = _period_bounds("test")
        self.assertEqual(validation_start, pd.Timestamp("2021-01-01"))
        self.assertEqual(validation_end, pd.Timestamp("2022-12-01"))
        self.assertEqual(validation_scale, pd.Timestamp("2020-12-01"))
        self.assertEqual(test_start, pd.Timestamp("2023-01-01"))
        self.assertEqual(test_end, pd.Timestamp("2024-12-01"))
        self.assertEqual(test_scale, pd.Timestamp("2022-12-01"))

    def test_common_metrics_handle_zero_actuals(self):
        result = _metrics(
            pd.Series([0.0, 10.0, 20.0]),
            pd.Series([5.0, 12.0, 16.0]),
            np.arange(1.0, 25.0),
        )
        self.assertEqual(result["n"], 3)
        self.assertAlmostEqual(result["mape_pct"], 20.0)

    def test_mase_uses_twelve_month_seasonal_history(self):
        history = np.arange(1.0, 25.0)
        result = _metrics(pd.Series([10.0]), pd.Series([11.0]), history)
        expected_scale = np.mean(np.abs(history[12:] - history[:-12]))
        self.assertAlmostEqual(result["mase"], 1.0 / expected_scale)


if __name__ == "__main__":
    unittest.main()
