"""Unit tests for feature integrity and missing column assertions."""

import sys
import unittest
from pathlib import Path
import numpy as np
import pandas as pd

training_dir = Path(__file__).resolve().parent.parent
if str(training_dir) not in sys.path:
    sys.path.insert(0, str(training_dir))

from feature_engineering import build_forecast_features
from final_benchmark import SELECTED_FEATURES, _fit_xgb
from run_backtest_cleaned import fit_xgb as backtest_fit_xgb
from run_backtest_v2 import fit_xgb as v2_fit_xgb
from forecast_experiments import _fit_xgb as exp_fit_xgb


class TestFeatureIntegrity(unittest.TestCase):
    def setUp(self):
        # Create a synthetic 48-month dataset with DatetimeIndex
        dates = pd.date_range("2010-01-01", periods=48, freq="MS")
        df = pd.DataFrame(
            {"_target_model_mn_kg": np.random.uniform(20.0, 30.0, size=len(dates))},
            index=dates,
        )
        self.frame, self.features = build_forecast_features(df, horizon=12)

    def test_selected_features_exist_in_engineered_frame(self):
        """Confirm that all 8 features in SELECTED_FEATURES exist in the feature frame."""
        for feat in SELECTED_FEATURES:
            self.assertIn(feat, self.frame.columns, f"Feature {feat} missing from engineered features")
        self.assertNotIn("target_diff_1", self.frame.columns, "target_diff_1 typo must not be present")
        self.assertIn("target_change_1", self.frame.columns, "target_change_1 must be present")

    def test_missing_feature_raises_error_no_silent_imputation(self):
        """Confirm that passing a frame missing any requested feature raises a ValueError."""
        train = self.frame.copy()
        row = train.iloc[[0]].copy()
        
        # Test forecast_experiments._fit_xgb with a missing feature
        with self.assertRaises(ValueError) as ctx:
            exp_fit_xgb(train, row, features=SELECTED_FEATURES + ["target_diff_1"])
        self.assertIn("target_diff_1", str(ctx.exception))

        # Drop one required feature from train frame and verify fit_xgb fails
        train_bad = train.drop(columns=["target_change_1"])
        with self.assertRaises(ValueError) as ctx:
            _fit_xgb(train_bad, row)
        self.assertIn("target_change_1", str(ctx.exception))

        with self.assertRaises(ValueError) as ctx:
            backtest_fit_xgb(train_bad, row)
        self.assertIn("target_change_1", str(ctx.exception))

        with self.assertRaises(ValueError) as ctx:
            v2_fit_xgb(train_bad, row)
        self.assertIn("target_change_1", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
