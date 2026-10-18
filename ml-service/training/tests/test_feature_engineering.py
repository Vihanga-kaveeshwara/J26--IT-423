import sys
import unittest
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from feature_engineering import build_forecast_features


class FeatureEngineeringTests(unittest.TestCase):
    def setUp(self):
        dates = pd.date_range("2020-01-01", periods=24, freq="MS")
        self.frame = pd.DataFrame(
            {"_target_model_mn_kg": np.arange(1.0, 25.0)},
            index=dates,
        )

    def test_direct_horizon_label_alignment(self):
        features, _ = build_forecast_features(self.frame, horizon=12)
        self.assertEqual(features.loc[pd.Timestamp("2020-01"), "_label"], 13.0)
        self.assertEqual(features.loc[pd.Timestamp("2020-01"), "_label_date"], pd.Timestamp("2021-01-01"))
        self.assertEqual(features.loc[pd.Timestamp("2020-01"), "target_month"], 1)

    def test_lags_and_rolling_use_only_past_values(self):
        features, _ = build_forecast_features(self.frame, horizon=12)
        row = features.loc[pd.Timestamp("2020-04")]
        self.assertEqual(row["target_lag_1"], 3.0)
        self.assertEqual(row["target_lag_3"], 1.0)
        self.assertAlmostEqual(row["target_rolling_mean_3"], (1 + 2 + 3) / 3)
        self.assertNotEqual(row["target_rolling_mean_3"], (2 + 3 + 4) / 3)

    def test_no_future_target_leakage_and_zero_denominator(self):
        frame = self.frame.copy()
        frame.loc[pd.Timestamp("2020-02"), "_target_model_mn_kg"] = 0.0
        features, _ = build_forecast_features(frame, horizon=12)
        self.assertTrue(pd.isna(features.loc[pd.Timestamp("2020-03"), "target_pct_change_1"]))
        self.assertEqual(features.loc[pd.Timestamp("2020-03"), "target_lag_1"], 0.0)

    def test_chronological_order_and_feature_columns(self):
        features, names = build_forecast_features(self.frame, horizon=12)
        self.assertTrue(features.index.is_monotonic_increasing)
        self.assertTrue(set(names).issubset(features.columns))
        self.assertEqual(list(features.columns).count("target_lag_1"), 1)


if __name__ == "__main__":
    unittest.main()
