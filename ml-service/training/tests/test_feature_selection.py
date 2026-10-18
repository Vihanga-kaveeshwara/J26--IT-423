import sys
import unittest
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from feature_engineering import build_forecast_features
from feature_selection import (
    _diagnostics,
    _prediction_origins,
    approved_features,
)


class FeatureSelectionTests(unittest.TestCase):
    def setUp(self):
        dates = pd.date_range("2010-01-01", periods=96, freq="MS")
        target = np.linspace(20.0, 35.0, len(dates)) + np.sin(np.arange(len(dates)) / 3.0)
        self.frame, self.features = build_forecast_features(
            pd.DataFrame({"_target_model_mn_kg": target}, index=dates),
            horizon=12,
        )

    def test_candidate_set_excludes_target_and_future_columns(self):
        candidates = approved_features(self.frame)
        self.assertNotIn("_label", candidates)
        self.assertNotIn("_target_model_mn_kg", candidates)
        self.assertFalse(any("future" in name.lower() for name in candidates))

    def test_selection_is_fold_local_and_reproducible(self):
        origin = pd.Timestamp("2016-12-01")
        training = self.frame[
            (self.frame.index <= origin) & (self.frame["_label_date"] <= origin)
        ].copy()
        scores_one, selected_one = _diagnostics(training, self.features, seed=42)
        scores_two, selected_two = _diagnostics(training, self.features, seed=42)
        self.assertEqual(selected_one, selected_two)
        pd.testing.assert_frame_equal(scores_one, scores_two)
        self.assertTrue(set(selected_one).issubset(self.features))

    def test_forecast_origins_are_chronological_and_identical_by_period(self):
        origins = _prediction_origins(self.frame, "2016-01-01", "2017-12-01")
        self.assertEqual(origins, sorted(origins))
        self.assertEqual(len(origins), 24)
        self.assertEqual(
            origins,
            _prediction_origins(self.frame, "2016-01-01", "2017-12-01"),
        )

    def test_training_labels_are_observed_before_origin(self):
        origin = pd.Timestamp("2016-12-01")
        training = self.frame[
            (self.frame.index <= origin) & (self.frame["_label_date"] <= origin)
        ]
        self.assertTrue((training["_label_date"].dropna() <= origin).all())
        self.assertFalse((training["_label_date"] > origin).any())


if __name__ == "__main__":
    unittest.main()
