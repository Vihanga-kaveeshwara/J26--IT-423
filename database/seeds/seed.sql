-- ==============================================================================
-- CEYLON INTELLIGENCE: Initial Database Seeds
-- ==============================================================================

-- 1. Insert Seed Users (passwords hashed with bcrypt cost 10)
INSERT INTO users (id, email, password_hash, name, role, organization)
VALUES
('usr-admin-001', 'admin@ceylonintelligence.lk', '$2b$10$wTqS8NlY5QpQ5/Bv6GkH2O5gO88y7Y5Gj0jXhF2F9G3Yg8M1d6kZe', 'Dr. Rohan Jayasinghe', 'Admin', 'Sri Lanka Tea Board / Research Directorate'),
('usr-expmgr-002', 'export.manager@ceylonintelligence.lk', '$2b$10$6GkH2O5gO88y7Y5Gj0jXhF2F9G3Yg8M1d6kZewTqS8NlY5QpQ5/Bv', 'Anoma Wickramasinghe', 'Export Manager', 'Ceylon Tea Exporters Consortium'),
('usr-logist-003', 'logistics@ceylonintelligence.lk', '$2b$10$F2F9G3Yg8M1d6kZewTqS8NlY5QpQ5/Bv6GkH2O5gO88y7Y5Gj0jXh', 'Kasun Bandara', 'Logistics Coordinator', 'Colombo Maritime Freight Operations'),
('usr-analyst-004', 'analyst@ceylonintelligence.lk', '$2b$10$8M1d6kZewTqS8NlY5QpQ5/Bv6GkH2O5gO88y7Y5Gj0jXhF2F9G3Yg', 'Nawodhi Perera', 'Research Analyst', 'University Research Faculty')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Active Dataset
INSERT INTO datasets (dataset_id, version_tag, description, is_active, record_count)
VALUES
('ds-m4-v1.0', 'M4-DS-v1.0', 'Deterministic baseline dataset: 5 export markets, 3 tea grades, illustrative freight and packaging parameters.', TRUE, 120)
ON CONFLICT (dataset_id) DO NOTHING;

-- 3. Insert Export Markets
INSERT INTO export_markets (market_id, market_name, destination_port, currency, active)
VALUES
('MKT-RUS', 'Russia', 'Novorossiysk', 'USD', TRUE),
('MKT-UAE', 'UAE', 'Jebel Ali', 'USD', TRUE),
('MKT-IRQ', 'Iraq', 'Umm Qasr', 'USD', TRUE),
('MKT-TUR', 'Turkey', 'Mersin', 'USD', TRUE),
('MKT-IRN', 'Iran', 'Bandar Abbas', 'USD', TRUE)
ON CONFLICT (market_id) DO NOTHING;

-- 4. Insert Tea Grades
INSERT INTO tea_grades (tea_grade_id, tea_grade_name, illustrative_supply_cost_usd_per_kg, active)
VALUES
('TEA-BOP', 'BOP Black Tea', 3.2000, TRUE),
('TEA-OP', 'OP Black Tea', 3.5000, TRUE),
('TEA-GREEN', 'Green Tea', 4.8000, TRUE)
ON CONFLICT (tea_grade_id) DO NOTHING;

-- 5. Insert Shipping Routes
INSERT INTO shipping_routes (route_id, origin, destination_market_id, destination_port, freight_cost_usd_per_kg, handling_cost_usd_per_kg, customs_admin_cost_usd_per_kg, transit_days_estimate, route_capacity_kg, route_risk_score, route_available)
VALUES
('RTE-RUS-1', 'Colombo Port, Sri Lanka', 'MKT-RUS', 'Novorossiysk', 0.8500, 0.0850, 0.0400, 22, 400000.0, 0.18, TRUE),
('RTE-UAE-1', 'Colombo Port, Sri Lanka', 'MKT-UAE', 'Jebel Ali', 0.4200, 0.0650, 0.0350, 8, 600000.0, 0.08, TRUE),
('RTE-IRQ-1', 'Colombo Port, Sri Lanka', 'MKT-IRQ', 'Umm Qasr', 0.6800, 0.0800, 0.0450, 14, 350000.0, 0.22, TRUE),
('RTE-TUR-1', 'Colombo Port, Sri Lanka', 'MKT-TUR', 'Mersin', 0.7800, 0.0750, 0.0400, 18, 450000.0, 0.14, TRUE),
('RTE-IRN-1', 'Colombo Port, Sri Lanka', 'MKT-IRN', 'Bandar Abbas', 0.6200, 0.0900, 0.0500, 12, 300000.0, 0.25, TRUE)
ON CONFLICT (route_id) DO NOTHING;

-- 6. Insert Packaging Options
INSERT INTO packaging_options (packaging_id, packaging_name, packaging_cost_usd_per_kg, capacity_kg_per_unit, wastage_rate, max_units_per_quarter)
VALUES
('PKG-BULK', 'Bulk export liner', 0.0750, 500.0, 0.0120, 2000),
('PKG-PACKET', 'Consumer retail tea packets', 0.2400, 25.0, 0.0080, 5000),
('PKG-TEA-BAG', 'String & tag tea bags carton', 0.4500, 10.0, 0.0050, 3000)
ON CONFLICT (packaging_id) DO NOTHING;

-- 7. Insert Supply Records for 2024Q1
INSERT INTO supply_records (supply_id, quarter, tea_grade_id, available_quantity_kg, unit_supply_cost_usd_per_kg)
VALUES
('SUP-20241-BOP', '2024Q1', 'TEA-BOP', 140000.0, 3.2000),
('SUP-20241-OP', '2024Q1', 'TEA-OP', 160000.0, 3.5000),
('SUP-20241-GREEN', '2024Q1', 'TEA-GREEN', 120000.0, 4.8000)
ON CONFLICT (supply_id) DO NOTHING;

-- 8. Insert Demand Records for 2024Q1
INSERT INTO demand_records (demand_id, quarter, market_id, tea_grade_id, predicted_demand_kg, lower_demand_kg, upper_demand_kg)
VALUES
('DEM-20241-RUS-BOP', '2024Q1', 'MKT-RUS', 'TEA-BOP', 48000.0, 42000.0, 55000.0),
('DEM-20241-RUS-OP', '2024Q1', 'MKT-RUS', 'TEA-OP', 35000.0, 30000.0, 40000.0),
('DEM-20241-UAE-BOP', '2024Q1', 'MKT-UAE', 'TEA-BOP', 40000.0, 36000.0, 46000.0),
('DEM-20241-UAE-OP', '2024Q1', 'MKT-UAE', 'TEA-OP', 50000.0, 45000.0, 56000.0),
('DEM-20241-UAE-GREEN', '2024Q1', 'MKT-UAE', 'TEA-GREEN', 25000.0, 20000.0, 30000.0),
('DEM-20241-IRQ-BOP', '2024Q1', 'MKT-IRQ', 'TEA-BOP', 30000.0, 26000.0, 35000.0),
('DEM-20241-TUR-OP', '2024Q1', 'MKT-TUR', 'TEA-OP', 35000.0, 30000.0, 40000.0),
('DEM-20241-IRN-BOP', '2024Q1', 'MKT-IRN', 'TEA-BOP', 25000.0, 22000.0, 30000.0)
ON CONFLICT (demand_id) DO NOTHING;
