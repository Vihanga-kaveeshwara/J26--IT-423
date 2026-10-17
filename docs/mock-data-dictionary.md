# Ceylon Intelligence — Mock Data Dictionary & Schema Reference

## Overview
To facilitate reproducible university evaluation, research validation, and thesis defense, Ceylon Intelligence utilizes versioned synthetic datasets. Synthetic predictions for **M1 (Demand Forecasting)** and **M2 (Logistics Risk & Cost)** are clearly labeled as `SYNTHETIC_DEMO`. No machine learning model is falsely claimed as trained for M1 or M2.

All costs are in **USD** ($) and all quantities are in **Kilograms** (kg).

---

## 1. File Catalog

| File Name | Description | Source Component | Record Count |
|---|---|---|---|
| `export_markets.csv` | Core target destination markets and port terminals | M4 Core Registry | 5 markets |
| `tea_grades.csv` | Major Ceylon Tea export classifications | M4 Core Registry | 3 grades |
| `export_supply.csv` | Available tea harvest quantities & production costs | M4 Supply Domain | 36 records (12 quarters) |
| `m1_demand_forecasts.csv` | Synthetic export demand forecasts & prediction bounds | Synthetic M1 Output | 180 records (12 quarters) |
| `shipping_routes.csv` | Available maritime shipping lanes, freight rates, transit times | Synthetic M2 Output | 7 routes |
| `route_capacities.csv` | Quarterly throughput limits and risk levels per lane | Logistics Management | 7 routes |
| `m2_logistics_predictions.csv` | Route risk scores and packaging wastage estimates | Synthetic M2 Output | 84 records (12 quarters) |
| `packaging_options.csv` | Bulk liners, retail packets, and tea bag specifications | Logistics Domain | 3 packaging types |
| `market_constraints.csv` | Contractual minimums & priority weights per destination | Operations Research | 60 records (12 quarters) |
| `historical_quarterly_costs.csv` | Benchmark baseline export expenditures for comparison | Historical Benchmark | 12 quarters |
| `backtesting_history.csv` | Comparative evaluation outcomes across 12 quarters | Research Evaluation | 12 quarters |

---

## 2. Detailed Data Dictionary

### A. `export_supply.csv`
- `supply_id` (String): Unique identifier, e.g., `SUP-20241-TEA-BOP`
- `quarter` (String): Planning quarter, format `YYYYQ#` (e.g., `2024Q1`)
- `tea_grade_id` (String): Foreign key to `tea_grades.csv` (`TEA-BOP`, `TEA-OP`, `TEA-GREEN`)
- `tea_grade` (String): Full grade name
- `available_quantity_kg` (Integer): Harvest and factory supply available in kg
- `unit_supply_cost_usd_per_kg` (Float): Procurement or production cost in USD/kg
- `data_source_type` (String): `SYNTHETIC_DEMO`

### B. `m1_demand_forecasts.csv`
- `forecast_id` (String): e.g., `FC-20241-MKT-RUS-TEA-BOP`
- `quarter` (String): Forecast period
- `market_id` (String): Foreign key to `export_markets.csv`
- `market` (String): Country name
- `tea_grade_id` (String): Tea grade
- `predicted_demand_kg` (Integer): Point demand forecast
- `lower_demand_kg` (Integer): 85% lower uncertainty bound
- `upper_demand_kg` (Integer): 115% upper uncertainty bound
- `forecast_source` (String): `M1_MOCK_OUTPUT`

### C. `shipping_routes.csv`
- `route_id` (String): Unique lane identifier, e.g., `RTE-RUS-1`
- `origin` (String): Origin port (`Colombo Port, Sri Lanka`)
- `destination_market_id` (String): Destination country
- `destination_port` (String): Novorossiysk, Jebel Ali, Umm Qasr, Mersin, Bandar Abbas
- `freight_cost_usd_per_kg` (Float): Maritime freight rate in USD/kg
- `handling_cost_usd_per_kg` (Float): Port handling & stevedoring in USD/kg
- `customs_admin_cost_usd_per_kg` (Float): Clearance & administrative charges
- `transit_days_estimate` (Integer): Typical transit duration in days
- `route_capacity_kg_per_quarter` (Integer): Maximum container capacity in kg
- `route_risk_score_0_to_1` (Float): Disruption risk indicator from 0.0 to 1.0

### D. `packaging_options.csv`
- `packaging_id` (String): `PKG-BULK`, `PKG-RETAIL`, `PKG-TEABAG`
- `packaging_name` (String): Packaging format name
- `packaging_cost_usd_per_kg` (Float): Incremental material & packaging labor cost
- `capacity_kg_per_unit` (Float): Weight capacity per unit
- `wastage_rate` (Float): Expected product loss rate during handling (0.005 - 0.012)
- `max_units_per_quarter` (Integer): Factory packaging line capacity

---

## 3. How to Replace Mock Datasets with Real Field Data
1. Prepare a CSV file adhering to the exact column names above.
2. Navigate to **Ceylon Intelligence > Dataset Management** (`/m4/datasets`).
3. Drag and drop your new CSV file or click **Upload Dataset**.
4. The system validates column presence, type integrity, and foreign-key references.
5. Click **Activate Version** to make the new dataset the active planning baseline.
