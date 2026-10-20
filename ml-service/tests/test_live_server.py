"""
Live Server Integration Test & Verification Script (test_live_server.py)

Spins up a local Uvicorn process running app.main:app, performs end-to-end
HTTP calls against all 4 endpoints, verifies Task 6 benchmark batch predictions,
and validates error handling.
"""

import os
import sys
import time
import json
import socket
import subprocess
import urllib.request
import urllib.error
import pandas as pd

ML_SERVICE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
VENV_PYTHON = os.path.join(ML_SERVICE_DIR, '.venv', 'Scripts', 'python.exe')
DATASET_CSV = os.path.join(ML_SERVICE_DIR, 'training', 'dataset', 'M2_refuse_tea_synthetic_dataset.csv')
X_FULL_CSV = os.path.join(ML_SERVICE_DIR, 'training', 'dataset', 'processed', 'X_features_full.csv')

HOST = "127.0.0.1"
PORT = 8000
BASE_URL = f"http://{HOST}:{PORT}"


def make_request(method: str, path: str, payload: dict = None) -> tuple[int, dict]:
    """Helper to send HTTP request using standard library urllib."""
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"} if payload else {}
    data = json.dumps(payload).encode('utf-8') if payload else None

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            status = resp.status
            body = json.loads(resp.read().decode('utf-8'))
            return status, body
    except urllib.error.HTTPError as e:
        body = json.loads(e.read().decode('utf-8'))
        return e.code, body


def run_tests():
    print("=" * 85)
    print("M2 SERVING LAYER LIVE INTEGRATION TESTS")
    print("=" * 85)

    # 1. Start uvicorn process
    print(f"\n[1] Starting Uvicorn server on {HOST}:{PORT}...")
    server_cmd = [
        VENV_PYTHON, "-m", "uvicorn", "app.main:app",
        "--host", HOST, "--port", str(PORT), "--log-level", "warning"
    ]
    proc = subprocess.Popen(server_cmd, cwd=ML_SERVICE_DIR)

    try:
        # Wait for server to become responsive
        connected = False
        for _ in range(30):
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.connect((HOST, PORT))
                s.close()
                connected = True
                break
            except Exception:
                time.sleep(0.3)

        if not connected:
            raise RuntimeError("Uvicorn server failed to start within timeout.")
        print(" -> Server connected successfully.")

        # ---------------------------------------------------------------------
        # Test 1: Health Endpoints
        # ---------------------------------------------------------------------
        print("\n[2] Testing GET /health and GET /api/ml/health...")
        status, body = make_request("GET", "/health")
        assert status == 200, f"Expected 200, got {status}"
        assert body["status"] == "healthy"
        assert body["model_name"] == "m2_refuse_tea_xgb_v1"
        print(f" -> GET /health PASSED: {body}")

        status, body = make_request("GET", "/api/ml/health")
        assert status == 200, f"Expected 200, got {status}"
        assert body["success"] is True
        print(f" -> GET /api/ml/health PASSED: {body}")

        # ---------------------------------------------------------------------
        # Test 2: Task 6 Benchmark Validation on /predict
        # ---------------------------------------------------------------------
        print("\n[3] Testing POST /predict (Task 6 Parity Check on Benchmark Batches)...")
        raw_df = pd.read_csv(DATASET_CSV)
        x_full = pd.read_csv(X_FULL_CSV)

        benchmarks = [
            ("B0614", "Worst Case", 8.78),
            ("B0613", "Typical Case", 6.51),
            ("B0078", "Best Case", 5.21),
        ]

        predict_results = {}
        for b_id, title, expected_pct in benchmarks:
            idx = raw_df[raw_df['batch_id'] == b_id].index[0]
            raw_row = raw_df.iloc[idx].to_dict()
            full_row = x_full.iloc[idx].to_dict()

            payload = {
                "green_leaf_input_kg": float(raw_row["green_leaf_input_kg"]),
                "withering_duration_hrs": float(raw_row["withering_duration_hrs"]),
                "dryer_temperature_c": float(raw_row["dryer_temperature_c"]),
                "machine_downtime_hrs": float(raw_row["machine_downtime_hrs"]),
                "plucking_fine_leaf_pct": float(raw_row["plucking_fine_leaf_pct"]),
                "relative_humidity_pct": float(raw_row["relative_humidity_pct"]),
                "ambient_temperature_c": float(raw_row["ambient_temperature_c"]),
                "region": str(raw_row["region"]),
                "tea_grade_produced": str(raw_row["tea_grade_produced"]),
                "season": str(raw_row["season"]),
                "month": int(raw_row["month"]),
                "rolling_humidity_3batch": float(full_row["rolling_humidity_3batch"]),
                "rolling_ambient_temp_3batch": float(full_row["rolling_ambient_temp_3batch"])
            }

            status, resp = make_request("POST", "/predict", payload)
            assert status == 200, f"Predict failed for {b_id}: {resp}"
            pred_pct = resp["predicted_refuse_tea_pct"]
            matched = round(pred_pct, 2) == expected_pct
            predict_results[b_id] = (pred_pct, expected_pct, matched, resp["latency_ms"])

            print(f" -> Batch {b_id} ({title}): API Pred = {pred_pct:.4f} ({pred_pct:.2f}%), Expected = {expected_pct}%, Match = {matched} (Latency: {resp['latency_ms']}ms)")
            assert matched, f"PARITY CHECK FAILED for {b_id}: expected {expected_pct}%, got {pred_pct:.2f}%"

        # Test fallback when rolling averages omitted
        idx_b0614 = raw_df[raw_df['batch_id'] == 'B0614'].index[0]
        payload_fallback = {
            "green_leaf_input_kg": float(raw_df.iloc[idx_b0614]["green_leaf_input_kg"]),
            "withering_duration_hrs": float(raw_df.iloc[idx_b0614]["withering_duration_hrs"]),
            "dryer_temperature_c": float(raw_df.iloc[idx_b0614]["dryer_temperature_c"]),
            "machine_downtime_hrs": float(raw_df.iloc[idx_b0614]["machine_downtime_hrs"]),
            "plucking_fine_leaf_pct": float(raw_df.iloc[idx_b0614]["plucking_fine_leaf_pct"]),
            "relative_humidity_pct": float(raw_df.iloc[idx_b0614]["relative_humidity_pct"]),
            "ambient_temperature_c": float(raw_df.iloc[idx_b0614]["ambient_temperature_c"]),
            "region": str(raw_df.iloc[idx_b0614]["region"]),
            "tea_grade_produced": str(raw_df.iloc[idx_b0614]["tea_grade_produced"]),
            # Omit rolling features
        }
        status, resp_fb = make_request("POST", "/predict", payload_fallback)
        assert status == 200
        assert resp_fb["used_fallback_rolling_features"] is True
        print(f" -> Fallback test PASSED: used_fallback_rolling_features={resp_fb['used_fallback_rolling_features']} (Pred: {resp_fb['predicted_refuse_tea_pct']:.2f}%)")

        # ---------------------------------------------------------------------
        # Test 4: POST /explain (Using B0614 Worst Case with high refuse drivers)
        # ---------------------------------------------------------------------
        print("\n[4] Testing POST /explain...")
        idx_b0614 = raw_df[raw_df['batch_id'] == 'B0614'].index[0]
        raw_b0614 = raw_df.iloc[idx_b0614].to_dict()
        full_b0614 = x_full.iloc[idx_b0614].to_dict()
        payload_b0614 = {
            "green_leaf_input_kg": float(raw_b0614["green_leaf_input_kg"]),
            "withering_duration_hrs": float(raw_b0614["withering_duration_hrs"]),
            "dryer_temperature_c": float(raw_b0614["dryer_temperature_c"]),
            "machine_downtime_hrs": float(raw_b0614["machine_downtime_hrs"]),
            "plucking_fine_leaf_pct": float(raw_b0614["plucking_fine_leaf_pct"]),
            "relative_humidity_pct": float(raw_b0614["relative_humidity_pct"]),
            "ambient_temperature_c": float(raw_b0614["ambient_temperature_c"]),
            "region": str(raw_b0614["region"]),
            "tea_grade_produced": str(raw_b0614["tea_grade_produced"]),
            "season": str(raw_b0614["season"]),
            "month": int(raw_b0614["month"]),
            "rolling_humidity_3batch": float(full_b0614["rolling_humidity_3batch"]),
            "rolling_ambient_temp_3batch": float(full_b0614["rolling_ambient_temp_3batch"])
        }

        status, resp_exp = make_request("POST", "/explain", payload_b0614)
        assert status == 200
        assert len(resp_exp["top_features"]) == 5
        assert len(resp_exp["mitigations"]) >= 1
        top_driver = resp_exp["top_features"][0]
        print(f" -> Top SHAP driver: {top_driver['feature']} (+{top_driver['shap_value_pp']} pp)")
        print(f" -> Generated {len(resp_exp['mitigations'])} mitigations:")
        for m in resp_exp["mitigations"]:
            print(f"    * [{m['category']}] ({m['severity']}): {m['recommendation'][:85]}...")

        # ---------------------------------------------------------------------
        # Test 5: POST /economic-impact
        # ---------------------------------------------------------------------
        print("\n[5] Testing POST /economic-impact...")
        econ_payload = {
            "green_leaf_input_kg": 9316.0,
            "predicted_refuse_pct": 8.78,
            "tea_grade_produced": "BOP",
            "refuse_resale_status": "DISCARDED",
            "total_dry_tea_kg": 2170.0
        }
        status, resp_econ = make_request("POST", "/economic-impact", econ_payload)
        assert status == 200
        assert resp_econ["revenue_loss_lkr"] > 0
        print(f" -> Economic Loss: LKR {resp_econ['revenue_loss_lkr']:,.2f} on {resp_econ['estimated_refuse_tea_kg']:.1f}kg refuse tea")
        print(f" -> Disclaimer: {resp_econ['disclaimer']}")

        # ---------------------------------------------------------------------
        # Test 6: POST /whatif
        # ---------------------------------------------------------------------
        print("\n[6] Testing POST /whatif...")
        whatif_payload = dict(payload_b0614)
        whatif_payload["overrides"] = {"machine_downtime_hrs": 0.10}
        whatif_payload["refuse_resale_status"] = "DISCARDED"

        status, resp_wi = make_request("POST", "/whatif", whatif_payload)
        assert status == 200
        assert resp_wi["delta_refuse_pct"] < 0
        assert resp_wi["direction"] == "IMPROVEMENT"
        assert resp_wi["economic_impact"] is not None
        print(f" -> What-If Downtime Simulation (2.71h -> 0.10h):")
        print(f"    Baseline: {resp_wi['baseline_predicted_refuse_pct']:.2f}% -> Simulated: {resp_wi['simulated_predicted_refuse_pct']:.2f}% (Delta: {resp_wi['delta_refuse_pct']:+.2f} pp)")
        print(f"    Savings: LKR {resp_wi['economic_impact']['simulated_savings_lkr']:+,.2f} ({resp_wi['economic_impact']['savings_pct_of_loss']:.1f}% reduction)")
        print(f"    Mandatory Disclaimer Verified: {resp_wi['disclaimer'][:80]}...")

        # Test invalid lever rejection (HTTP 400)
        invalid_payload = dict(payload)
        invalid_payload["overrides"] = {"unauthorized_ambient_temp": 15.0}
        status_inv, resp_inv = make_request("POST", "/whatif", invalid_payload)
        assert status_inv == 400, f"Expected 400, got {status_inv}"
        print(f" -> Invalid lever rejection PASSED (HTTP {status_inv}): {resp_inv['detail'][:70]}...")

        print("\n" + "=" * 85)
        print("ALL FASTAPI LIVE INTEGRATION TESTS PASSED WITH 100% PARITY!")
        print("=" * 85)

    finally:
        print("\n[7] Stopping Uvicorn test server...")
        proc.terminate()
        proc.wait(timeout=5)
        print(" -> Server stopped cleanly.")


if __name__ == '__main__':
    run_tests()
