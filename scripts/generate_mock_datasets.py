import os
import random
import pandas as pd
import numpy as np

# Fix random seed for exact reproducibility
random.seed(42)
np.random.seed(42)

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "datasets", "mock")
os.makedirs(OUT_DIR, exist_ok=True)

DATASET_VERSION = "M4-DS-v1.0"
SOURCE_TYPE = "SYNTHETIC_DEMO"

QUARTERS = [
    "2024Q1", "2024Q2", "2024Q3", "2024Q4",
    "2025Q1", "2025Q2", "2025Q3", "2025Q4",
    "2026Q1", "2026Q2", "2026Q3", "2026Q4"
]

MARKETS = [
    {"market_id": "MKT-RUS", "market_name": "Russia", "destination_port": "Novorossiysk", "currency": "USD"},
    {"market_id": "MKT-UAE", "market_name": "UAE", "destination_port": "Jebel Ali", "currency": "USD"},
    {"market_id": "MKT-IRQ", "market_name": "Iraq", "destination_port": "Umm Qasr", "currency": "USD"},
    {"market_id": "MKT-TUR", "market_name": "Turkey", "destination_port": "Mersin", "currency": "USD"},
    {"market_id": "MKT-IRN", "market_name": "Iran", "destination_port": "Bandar Abbas", "currency": "USD"},
]

GRADES = [
    {"tea_grade_id": "TEA-BOP", "tea_grade_name": "BOP Black Tea", "supply_cost_usd_kg": 3.10},
    {"tea_grade_id": "TEA-OP", "tea_grade_name": "OP Black Tea", "supply_cost_usd_kg": 3.45},
    {"tea_grade_id": "TEA-GREEN", "tea_grade_name": "Green Tea", "supply_cost_usd_kg": 4.75},
]

# 1. export_markets.csv
df_markets = pd.DataFrame(MARKETS)
df_markets["active"] = True
df_markets["data_source_type"] = SOURCE_TYPE
df_markets.to_csv(os.path.join(OUT_DIR, "export_markets.csv"), index=False)

# 2. tea_grades.csv
df_grades = pd.DataFrame(GRADES)
df_grades.rename(columns={"supply_cost_usd_kg": "illustrative_supply_cost_usd_per_kg"}, inplace=True)
df_grades["active"] = True
df_grades["data_source_type"] = SOURCE_TYPE
df_grades.to_csv(os.path.join(OUT_DIR, "tea_grades.csv"), index=False)

# 3. export_supply.csv
supply_records = []
for q in QUARTERS:
    for g in GRADES:
        qty = int(random.uniform(90000, 180000) // 100 * 100)
        cost = round(g["supply_cost_usd_kg"] + random.uniform(-0.25, 0.35), 3)
        supply_records.append({
            "supply_id": f"SUP-{q.replace('Q', '')}-{g['tea_grade_id']}",
            "quarter": q,
            "tea_grade_id": g["tea_grade_id"],
            "tea_grade": g["tea_grade_name"],
            "available_quantity_kg": qty,
            "unit_supply_cost_usd_per_kg": cost,
            "source_component": "M4_mock_supply",
            "data_source_type": SOURCE_TYPE,
        })
df_supply = pd.DataFrame(supply_records)
df_supply.to_csv(os.path.join(OUT_DIR, "export_supply.csv"), index=False)

# 4. m1_demand_forecasts.csv & market_demand.csv
m1_forecasts = []
for q in QUARTERS:
    for m in MARKETS:
        for g in GRADES:
            base_pred = int(random.uniform(15000, 55000) // 100 * 100)
            m1_forecasts.append({
                "forecast_id": f"FC-{q.replace('Q', '')}-{m['market_id']}-{g['tea_grade_id']}",
                "quarter": q,
                "market_id": m["market_id"],
                "market": m["market_name"],
                "tea_grade_id": g["tea_grade_id"],
                "tea_grade": g["tea_grade_name"],
                "predicted_demand_kg": base_pred,
                "lower_demand_kg": int(base_pred * 0.85),
                "upper_demand_kg": int(base_pred * 1.15),
                "forecast_source": "M1_MOCK_OUTPUT",
                "dataset_version": "M1-MOCK-v1.0",
                "data_source_type": SOURCE_TYPE,
            })
df_m1 = pd.DataFrame(m1_forecasts)
df_m1.to_csv(os.path.join(OUT_DIR, "m1_demand_forecasts.csv"), index=False)
df_m1.to_csv(os.path.join(OUT_DIR, "market_demand.csv"), index=False)

# 5. shipping_routes.csv & route_capacities.csv
routes_data = [
    {"route_id": "RTE-RUS-1", "market_id": "MKT-RUS", "dest_port": "Novorossiysk", "freight": 0.82, "days": 22, "cap": 380000, "risk": 0.18},
    {"route_id": "RTE-RUS-2", "market_id": "MKT-RUS", "dest_port": "St. Petersburg", "freight": 0.94, "days": 28, "cap": 300000, "risk": 0.22},
    {"route_id": "RTE-UAE-1", "market_id": "MKT-UAE", "dest_port": "Jebel Ali", "freight": 0.38, "days": 7, "cap": 650000, "risk": 0.08},
    {"route_id": "RTE-UAE-2", "market_id": "MKT-UAE", "dest_port": "Sharjah", "freight": 0.42, "days": 8, "cap": 400000, "risk": 0.09},
    {"route_id": "RTE-IRQ-1", "market_id": "MKT-IRQ", "dest_port": "Umm Qasr", "freight": 0.65, "days": 14, "cap": 350000, "risk": 0.20},
    {"route_id": "RTE-TUR-1", "market_id": "MKT-TUR", "dest_port": "Mersin", "freight": 0.76, "days": 18, "cap": 450000, "risk": 0.14},
    {"route_id": "RTE-IRN-1", "market_id": "MKT-IRN", "dest_port": "Bandar Abbas", "freight": 0.61, "days": 12, "cap": 320000, "risk": 0.24},
]

routes_list = []
capacities_list = []
for r in routes_data:
    market_obj = next(m for m in MARKETS if m["market_id"] == r["market_id"])
    routes_list.append({
        "route_id": r["route_id"],
        "origin": "Colombo Port, Sri Lanka",
        "destination_market_id": r["market_id"],
        "destination_market": market_obj["market_name"],
        "destination_port": r["dest_port"],
        "transport_mode": "SEA",
        "freight_cost_usd_per_kg": r["freight"],
        "handling_cost_usd_per_kg": round(random.uniform(0.065, 0.095), 3),
        "customs_admin_cost_usd_per_kg": round(random.uniform(0.035, 0.048), 3),
        "transit_days_estimate": r["days"],
        "route_capacity_kg_per_quarter": int(r["cap"] * random.uniform(0.95, 1.05)),
        "route_risk_score_0_to_1": r["risk"] + round(random.uniform(-0.02, 0.02), 3),
        "route_available": True,
        "source_component": "M2_MOCK_OUTPUT",
        "dataset_version": "M2-MOCK-v1.0",
        "data_source_type": SOURCE_TYPE,
    })
    capacities_list.append({
        "route_id": r["route_id"],
        "route_capacity_kg_per_quarter": r["cap"],
        "min_shipment_kg": 5000,
        "risk_level": "LOW" if r["risk"] < 0.15 else "MEDIUM" if r["risk"] < 0.22 else "HIGH",
        "data_source_type": SOURCE_TYPE,
    })

df_routes = pd.DataFrame(routes_list)
df_routes.to_csv(os.path.join(OUT_DIR, "shipping_routes.csv"), index=False)

df_caps = pd.DataFrame(capacities_list)
df_caps.to_csv(os.path.join(OUT_DIR, "route_capacities.csv"), index=False)

# 6. m2_logistics_predictions.csv
m2_predictions = []
for q in QUARTERS:
    for r in routes_data:
        m2_predictions.append({
            "prediction_id": f"M2-{q.replace('Q', '')}-{r['route_id']}",
            "quarter": q,
            "route_id": r["route_id"],
            "estimated_freight_cost_usd_per_kg": round(r["freight"] + random.uniform(-0.04, 0.12), 3),
            "estimated_transit_days": r["days"] + random.choice([0, 1, 2, -1]),
            "route_risk_score_0_to_1": round(r["risk"] + random.uniform(-0.01, 0.03), 3),
            "packaging_wastage_rate": round(random.uniform(0.008, 0.015), 3),
            "prediction_source": "M2_MOCK_OUTPUT",
            "dataset_version": "M2-MOCK-v1.0",
            "data_source_type": SOURCE_TYPE,
        })
df_m2 = pd.DataFrame(m2_predictions)
df_m2.to_csv(os.path.join(OUT_DIR, "m2_logistics_predictions.csv"), index=False)

# 7. packaging_options.csv
packaging_data = [
    {
        "packaging_id": "PKG-BULK",
        "packaging_name": "Bulk export liner",
        "compatible_grade_ids": "TEA-BOP;TEA-OP;TEA-GREEN",
        "capacity_kg_per_unit": 500,
        "packaging_cost_usd_per_kg": 0.075,
        "wastage_rate": 0.012,
        "max_units_per_quarter": 1600,
        "data_source_type": SOURCE_TYPE,
    },
    {
        "packaging_id": "PKG-RETAIL",
        "packaging_name": "Consumer retail packet cartons",
        "compatible_grade_ids": "TEA-BOP;TEA-OP;TEA-GREEN",
        "capacity_kg_per_unit": 25,
        "packaging_cost_usd_per_kg": 0.240,
        "wastage_rate": 0.007,
        "max_units_per_quarter": 6000,
        "data_source_type": SOURCE_TYPE,
    },
    {
        "packaging_id": "PKG-TEABAG",
        "packaging_name": "Tagged tea bags dispenser carton",
        "compatible_grade_ids": "TEA-BOP;TEA-GREEN",
        "capacity_kg_per_unit": 10,
        "packaging_cost_usd_per_kg": 0.450,
        "wastage_rate": 0.005,
        "max_units_per_quarter": 4000,
        "data_source_type": SOURCE_TYPE,
    },
]
df_pack = pd.DataFrame(packaging_data)
df_pack.to_csv(os.path.join(OUT_DIR, "packaging_options.csv"), index=False)

# 8. historical_quarterly_costs.csv & backtesting_history.csv
historical_data = []
backtest_data = []
for q in QUARTERS:
    qty = int(random.uniform(250000, 480000))
    base_cost = round(qty * random.uniform(5.8, 6.6), 2)
    savings_rate = random.uniform(0.045, 0.145)
    opt_cost = round(base_cost * (1.0 - savings_rate), 2)
    savings_usd = round(base_cost - opt_cost, 2)
    savings_pct = round(savings_rate * 100.0, 2)

    historical_data.append({
        "quarter": q,
        "historical_export_quantity_kg": qty,
        "historical_total_export_cost_usd": base_cost,
        "historical_cost_basis": "SYNTHETIC_ESTIMATE",
        "currency": "USD",
        "data_source_type": SOURCE_TYPE,
    })
    backtest_data.append({
        "backtest_id": f"BT-{q.replace('Q', '')}",
        "quarter": q,
        "baseline_cost_usd": base_cost,
        "illustrative_optimizer_cost_usd": opt_cost,
        "illustrative_savings_usd": savings_usd,
        "illustrative_savings_pct": savings_pct,
        "status": "SYNTHETIC_EXAMPLE_NOT_SOLVER_RESULT",
        "data_source_type": SOURCE_TYPE,
    })

pd.DataFrame(historical_data).to_csv(os.path.join(OUT_DIR, "historical_quarterly_costs.csv"), index=False)
pd.DataFrame(backtest_data).to_csv(os.path.join(OUT_DIR, "backtesting_history.csv"), index=False)

# 9. market_constraints.csv
constraints_data = []
for q in QUARTERS:
    for m in MARKETS:
        constraints_data.append({
            "constraint_id": f"CON-{q.replace('Q', '')}-{m['market_id']}",
            "quarter": q,
            "market_id": m["market_id"],
            "market": m["market_name"],
            "minimum_contract_quantity_kg": int(random.uniform(10000, 25000) // 250 * 250),
            "maximum_demand_multiplier": 1.0,
            "priority_weight": round(random.uniform(0.85, 1.0), 2),
            "eligible_grade_ids": "TEA-BOP;TEA-OP;TEA-GREEN",
            "data_source_type": SOURCE_TYPE,
        })
pd.DataFrame(constraints_data).to_csv(os.path.join(OUT_DIR, "market_constraints.csv"), index=False)

print(f"Successfully generated {len(os.listdir(OUT_DIR))} mock dataset files in: {OUT_DIR}")
