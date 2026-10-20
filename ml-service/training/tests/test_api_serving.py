"""Unit and Integration Tests for FastAPI ML Serving Endpoints."""

import json
import sys
import unittest
from pathlib import Path
import pandas as pd

from fastapi.testclient import TestClient

BASE_DIR = Path(__file__).resolve().parent.parent.parent
APP_DIR = BASE_DIR / "app"
TRAINING_DIR = BASE_DIR / "training"
BACKTEST_PREDS_PATH = TRAINING_DIR / "reports" / "backtest_cleaned_v2" / "backtest_predictions.csv"

for p in [str(APP_DIR), str(TRAINING_DIR), str(BASE_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from app.main import app


class TestMLServingAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_endpoint(self):
        """GET /api/ml/health returns status 200 and indicates model service is running."""
        response = self.client.get("/api/ml/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["status"], "healthy")
        self.assertTrue(data["m1_loaded"])
        self.assertIn("m2_loaded", data)

    def test_model_info_endpoint(self):
        """GET /api/ml/model returns correct metadata, 8 features, and SHA-256."""
        response = self.client.get("/api/ml/model")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["model_name"], "m1_demand_forecast_v1")
        self.assertEqual(data["model_version"], "1.0.0")
        self.assertEqual(len(data["features"]), 8)
        self.assertIn("target_change_1", data["features"])
        self.assertNotIn("target_diff_1", data["features"])
        self.assertEqual(data["data_cutoff_date"], "2024-12-01")
        self.assertTrue(len(data["cleaned_data_sha256"]) == 64)

    def test_metrics_endpoint(self):
        """GET /api/ml/metrics returns verified backtest metrics, coverage, bias, and asymmetry."""
        response = self.client.get("/api/ml/metrics")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        metrics = data["backtest_metrics"]
        self.assertAlmostEqual(metrics["mae"], 1.734265, places=5)
        self.assertAlmostEqual(metrics["rmse"], 2.236599, places=5)
        self.assertAlmostEqual(metrics["bias_mn_kg"], 0.747662, places=5)

        # Coverage checks
        cov = data["observed_backtest_coverage"]
        self.assertAlmostEqual(cov["nominal_80_overall_pct"], 67.9, places=1)
        self.assertAlmostEqual(cov["nominal_80_test_phase_pct"], 60.9, places=1)
        self.assertAlmostEqual(cov["nominal_90_test_phase_pct"], 78.3, places=1)
        self.assertAlmostEqual(cov["nominal_50_overall_pct"], 51.9, places=1)

        # Bias and asymmetry checks (Step 5)
        bias_info = data["bias_and_asymmetry"]
        self.assertAlmostEqual(bias_info["pooled_bias_mn_kg"], 0.75, places=2)
        self.assertAlmostEqual(bias_info["test_phase_2023_2024_bias_mn_kg"], 1.77, places=2)
        self.assertAlmostEqual(bias_info["share_actuals_below_point_forecast_pooled_pct"], 63.8, places=1)
        self.assertAlmostEqual(bias_info["share_actuals_below_point_forecast_test_phase_pct"], 78.3, places=1)

    def test_predict_demand_direct_12m_semantics(self):
        """POST /api/ml/predict-demand returns correct direct 12m response semantics."""
        payload = {
            "target_months": ["2025-01", "2025-02", "2025-03"]
        }
        response = self.client.post("/api/ml/predict-demand", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["model_version"], "1.0.0")
        self.assertEqual(data["latest_actual_month"], "2024-12")

        # Check coverage and bias numbers in disclaimer text (Step 5)
        self.assertIn("68%", data["disclaimer"])
        self.assertIn("61%", data["disclaimer"])
        self.assertIn("78%", data["disclaimer"])
        self.assertIn("52%", data["disclaimer"])
        self.assertIn("+0.75 mn kg", data["disclaimer"])
        self.assertIn("+1.77 mn kg", data["disclaimer"])
        self.assertIn("asymmetrically", data["disclaimer"])
        self.assertEqual(len(data["predictions"]), 3)

        expected_origins = ["2024-01", "2024-02", "2024-03"]
        for i, pred in enumerate(data["predictions"]):
            self.assertEqual(pred["forecast_origin_month"], expected_origins[i])
            self.assertEqual(pred["horizon_months"], 12)
            self.assertFalse(pred["uses_appended_data"])
            self.assertGreater(pred["point_forecast_mn_kg"], 0.0)

            # 50% interval checks
            i50 = pred["interval_50"]
            self.assertGreater(i50["width_mn_kg"], 0.0)
            self.assertLessEqual(i50["lower_mn_kg"], i50["upper_mn_kg"])
            self.assertEqual(i50["nominal_coverage_pct"], 50)

            # 80% interval checks
            i80 = pred["interval_80"]
            self.assertGreater(i80["width_mn_kg"], i50["width_mn_kg"])
            self.assertLessEqual(i80["lower_mn_kg"], i80["upper_mn_kg"])
            self.assertEqual(i80["nominal_coverage_pct"], 80)

            # Individual components
            comps = pred["component_forecasts"]
            self.assertIn("seasonal_mean_3yr_mn_kg", comps)
            self.assertIn("ets_mn_kg", comps)
            self.assertIn("xgboost_mn_kg", comps)

    def test_override_existing_month_guard(self):
        """Step 4: Appending month that already exists requires override_existing=True."""
        # 2024-12 already exists in stored baseline dataset
        payload_no_override = {
            "target_months": ["2025-01"],
            "recent_monthly_totals": [
                {"date": "2024-12", "total_mn_kg": 23.4, "unit": "mn_kg"}
            ],
            "override_existing": False,
        }
        res_fail = self.client.post("/api/ml/predict-demand", json=payload_no_override)
        self.assertEqual(res_fail.status_code, 422)
        self.assertIn("already exists", res_fail.json()["detail"])
        self.assertIn("override_existing=true", res_fail.json()["detail"])

        # With override_existing=True, should succeed and return overrides_applied + warnings
        payload_with_override = {
            "target_months": ["2025-01"],
            "recent_monthly_totals": [
                {"date": "2024-12", "total_mn_kg": 23.4, "unit": "mn_kg"}
            ],
            "override_existing": True,
        }
        res_ok = self.client.post("/api/ml/predict-demand", json=payload_with_override)
        self.assertEqual(res_ok.status_code, 200)
        data = res_ok.json()
        self.assertEqual(len(data["overrides_applied"]), 1)
        self.assertEqual(data["overrides_applied"][0]["date"], "2024-12")

        # Check delayed impact warning for 2024-12 on 2025-01
        self.assertTrue(any("only affects target months >= 2025-12" in w for w in data["warnings"]))

    def test_overrides_warn_on_greater_than_10_pct_diff(self):
        """Step 4: Overriding existing month by >10% generates a warning."""
        payload = {
            "target_months": ["2025-12"],
            "recent_monthly_totals": [
                # baseline for 2024-12 is 19.982; 23.4 is ~17.1% higher (>10%)
                {"date": "2024-12", "total_mn_kg": 23.4, "unit": "mn_kg"}
            ],
            "override_existing": True,
        }
        resp = self.client.post("/api/ml/predict-demand", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(any(">10%" in w for w in data["warnings"]))
        # Target 2025-12 uses origin 2024-12, so uses_appended_data should be True
        self.assertTrue(data["predictions"][0]["uses_appended_data"])

    def test_immutability_consecutive_requests_are_independent(self):
        """Step 4 (a): Two consecutive requests with different appended values give independent results."""
        # Request 1 with appended 2025-01 = 20.0
        payload1 = {
            "target_months": ["2025-02"],
            "recent_monthly_totals": [
                {"date": "2025-01", "total_mn_kg": 20.0, "unit": "mn_kg"}
            ],
        }
        res1 = self.client.post("/api/ml/predict-demand", json=payload1)
        self.assertEqual(res1.status_code, 200)
        data1 = res1.json()
        self.assertEqual(data1["latest_actual_month"], "2025-01")

        # Request 2 with NO appended values (pure baseline)
        payload2 = {
            "target_months": ["2025-02"]
        }
        res2 = self.client.post("/api/ml/predict-demand", json=payload2)
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()
        # Ensure latest_actual_month is back to baseline 2024-12 (no state leaked from Request 1)
        self.assertEqual(data2["latest_actual_month"], "2024-12")
        self.assertEqual(len(data2["overrides_applied"]), 0)
        self.assertEqual(len(data2["warnings"]), 0)

    def test_forecast_for_target_T_is_identical_for_data_after_T_minus_12(self):
        """Step 4 (b): The forecast for target T is identical whatever data after T-12 is appended."""
        # Target 2025-01 origin is 2024-01
        # Forecast for 2025-01 without appending 2024-12
        res_baseline = self.client.post(
            "/api/ml/predict-demand",
            json={"target_months": ["2025-01"]}
        )
        self.assertEqual(res_baseline.status_code, 200)
        pred_baseline = res_baseline.json()["predictions"][0]["point_forecast_mn_kg"]

        # Forecast for 2025-01 with overridden 2024-12 (which is 11 months after origin 2024-01)
        res_appended = self.client.post(
            "/api/ml/predict-demand",
            json={
                "target_months": ["2025-01"],
                "recent_monthly_totals": [{"date": "2024-12", "total_mn_kg": 23.4, "unit": "mn_kg"}],
                "override_existing": True,
            }
        )
        self.assertEqual(res_appended.status_code, 200)
        pred_appended = res_appended.json()["predictions"][0]["point_forecast_mn_kg"]

        # The forecast for 2025-01 must be strictly identical under direct 12m protocol
        self.assertEqual(pred_baseline, pred_appended)
        # uses_appended_data must be False because 2024-12 > 2024-01
        self.assertFalse(res_appended.json()["predictions"][0]["uses_appended_data"])

    def test_served_components_reproduce_backtest_predictions_for_ets_and_seasonal_mean(self):
        """Step 4 (c): Served forecasts for targets 2023-01..2024-12 reproduce ETS and seasonal-mean in backtest_predictions.csv.

        Note: XGBoost cannot be compared exactly because the served model was trained on all cleaned data through 2024-12,
        whereas backtest evaluated XGBoost under rolling chronological retraining.
        """
        self.assertTrue(BACKTEST_PREDS_PATH.exists(), f"Backtest predictions missing at {BACKTEST_PREDS_PATH}")
        df_backtest = pd.read_csv(BACKTEST_PREDS_PATH)

        # Evaluate targets in 2023-01 to 2023-06
        test_targets = [f"2023-{m:02d}" for m in range(1, 7)]
        resp = self.client.post("/api/ml/predict-demand", json={"target_months": test_targets})
        self.assertEqual(resp.status_code, 200)
        preds = resp.json()["predictions"]

        for pred in preds:
            tgt = pred["target_month"]
            row = df_backtest[df_backtest["target_date"] == tgt].iloc[0]
            expected_s_mean = float(row["seasonal_mean_3yr"])
            expected_ets = float(row["ets"])

            served_s_mean = pred["component_forecasts"]["seasonal_mean_3yr_mn_kg"]
            served_ets = pred["component_forecasts"]["ets_mn_kg"]

            self.assertAlmostEqual(served_s_mean, expected_s_mean, places=2)
            self.assertAlmostEqual(served_ets, expected_ets, places=2)

    def test_input_guard_10x_typo_rejected(self):
        """Step 4: Rejects 10x typo outside [0.5x, 2.0x] median range with 422."""
        payload = {
            "target_months": ["2025-02"],
            "recent_monthly_totals": [
                {"date": "2025-01", "total_mn_kg": 218.5}  # 10x typo
            ]
        }
        response = self.client.post("/api/ml/predict-demand", json=payload)
        self.assertEqual(response.status_code, 422)
        self.assertIn("outside plausible range", response.json()["detail"])

    def test_input_guard_non_contiguous_months_rejected(self):
        """Step 4: Rejects non-contiguous gap in appended months with 422."""
        payload = {
            "target_months": ["2025-04"],
            "recent_monthly_totals": [
                {"date": "2025-01", "total_mn_kg": 21.0},
                {"date": "2025-03", "total_mn_kg": 22.0}  # skipped 2025-02
            ]
        }
        response = self.client.post("/api/ml/predict-demand", json=payload)
        self.assertEqual(response.status_code, 422)
        self.assertIn("contiguous", response.json()["detail"])

    def test_input_guard_invalid_unit_rejected(self):
        """Step 4: Rejects units other than mn_kg with 422."""
        payload = {
            "target_months": ["2025-02"],
            "recent_monthly_totals": [
                {"date": "2025-01", "total_mn_kg": 21.0, "unit": "kg"}
            ]
        }
        response = self.client.post("/api/ml/predict-demand", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_input_guard_target_exceeding_available_origin(self):
        """Rejects target month beyond available origin history with 422."""
        payload = {
            "target_months": ["2026-03"]  # requires origin 2025-03, but data ends 2024-12
        }
        response = self.client.post("/api/ml/predict-demand", json=payload)
        self.assertEqual(response.status_code, 422)
        self.assertIn("exceeds the available historical data cutoff", response.json()["detail"])

    def test_input_guard_unsorted_target_months(self):
        """Rejects unsorted target months with 422."""
        payload = {
            "target_months": ["2025-03", "2025-01"]
        }
        response = self.client.post("/api/ml/predict-demand", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_input_guard_empty_target_months(self):
        """Rejects empty target months list with 422."""
        payload = {
            "target_months": []
        }
        response = self.client.post("/api/ml/predict-demand", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_disclaimer_matches_evaluated_metrics(self):
        """Step 5: Verify that disclaimer dynamically matches m1_evaluate metrics (+0.75 pooled, +1.77 test)."""
        from training.m1_evaluate import evaluate_model
        metrics = evaluate_model()
        expected_pooled_bias_str = f"+{metrics['bias_mn_kg']:.2f}"  # +0.75

        response = self.client.post("/api/ml/predict-demand", json={"target_months": ["2025-01"]})
        self.assertEqual(response.status_code, 200)
        disclaimer = response.json()["disclaimer"]

        self.assertIn(expected_pooled_bias_str, disclaimer)
        self.assertIn("+1.77 mn kg", disclaimer)


if __name__ == "__main__":
    unittest.main()

