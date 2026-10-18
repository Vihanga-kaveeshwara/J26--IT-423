# Ceylon Intelligence — M4 REST API Documentation

Base URL: `http://localhost:5000/api/v1`

All protected endpoints require either an `Authorization: Bearer <JWT_TOKEN>` header or an HttpOnly cookie `ceylon_token`.

---

## 1. Authentication Endpoints

### `POST /api/v1/auth/login`
Authenticates a user and returns a signed JWT access token and user profile.
- **Request Body**:
  ```json
  {
    "email": "export.manager@ceylonintelligence.lk",
    "password": "ExportMgr2026!"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Authentication successful",
    "token": "eyJhbGciOi...",
    "user": {
      "id": "usr-expmgr-002",
      "email": "export.manager@ceylonintelligence.lk",
      "name": "Anoma Wickramasinghe",
      "role": "Export Manager",
      "organization": "Ceylon Tea Exporters Consortium"
    }
  }
  ```

### `POST /api/v1/auth/logout`
Clears the session cookie.
- **Response `200 OK`**: `{"success": true, "message": "Logged out successfully"}`

### `GET /api/v1/auth/me`
Returns the currently authenticated user profile. Requires JWT.

### `GET /api/v1/auth/seed-accounts`
Returns local development seed accounts for testing.

---

## 2. Dashboard Endpoints

### `GET /api/v1/dashboard/summary`
Returns high-level research KPIs, active dataset version, latest solver status, cost breakdown, and quarterly performance trend.

### `GET /api/v1/dashboard/recent-activity`
Returns the recent audit activity trail of optimization runs and dataset activations.

---

## 3. Dataset Management Endpoints

### `GET /api/v1/datasets`
Lists all registered dataset versions, record counts, and active baseline status.

### `GET /api/v1/datasets/:id`
Returns detailed metadata and the first 10 preview records of the dataset.

### `POST /api/v1/datasets/validate`
Validates CSV text content against required columns (`tea_grade_id`, `available_quantity_kg`) and row formats.
- **Request Body**: `{"csvContent": "quarter,tea_grade_id,available_quantity_kg\n..."}`

### `POST /api/v1/datasets/upload`
Registers a validated CSV dataset into the version registry.

### `POST /api/v1/datasets/:id/activate`
Switches the active operational baseline to the selected dataset version.

---

## 4. Scenario Management Endpoints

### `GET /api/v1/M4/scenarios`
Lists all saved export planning scenarios.

### `POST /api/v1/M4/scenarios`
Creates a new planning scenario configuration.

### `GET /api/v1/M4/scenarios/:id`
Retrieves a single scenario by ID.

### `PUT /api/v1/M4/scenarios/:id`
Updates an existing scenario.

### `DELETE /api/v1/M4/scenarios/:id`
Deletes a scenario.

---

## 5. Optimization & Prescriptive Engine Endpoints

### `POST /api/v1/M4/optimization-runs`
Executes the deterministic MILP solver on the supplied scenario parameters.
- **Request Body**:
  ```json
  {
    "scenario_id": "SCN-2024Q1-BASE",
    "planning_horizon": "2024Q1",
    "dataset_version": "M4-DS-v1.0",
    "markets": [...],
    "supply": [...],
    "demand": [...],
    "routes": [...],
    "packaging": [...],
    "enforce_contractual_minimums": true,
    "enforce_route_capacities": true,
    "unmet_demand_penalty_per_kg": 12.0
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "status": "Optimal",
    "run_id": "RUN-1710600000000",
    "total_cost_usd": 1846850.0,
    "total_allocated_kg": 359373.0,
    "total_demand_kg": 359373.0,
    "fulfillment_rate_pct": 100.0,
    "baseline_estimated_cost_usd": 2126780.0,
    "estimated_savings_usd": 279930.0,
    "estimated_savings_pct": 13.16,
    "execution_time_seconds": 0.042,
    "cost_breakdown": {
      "procurement_cost_usd": 1224500.0,
      "packaging_cost_usd": 142100.0,
      "freight_cost_usd": 325400.0,
      "handling_cost_usd": 84300.0,
      "customs_admin_cost_usd": 48250.0,
      "estimated_wastage_cost_usd": 22300.0,
      "unmet_demand_penalties_usd": 0.0,
      "total_cost_usd": 1846850.0
    },
    "allocations": [...],
    "solver_message": "Optimal export allocation found."
  }
  ```

### `GET /api/v1/M4/optimization-runs`
Returns historical optimization solver executions.

### `GET /api/v1/M4/optimization-runs/:id/results`
Returns detailed allocation records and decision variables for the specified run.

---

## 6. Sensitivity & Backtesting Endpoints

### `POST /api/v1/M4/sensitivity-runs`
Runs parametric sensitivity sweeps across parameter variations (`freight_cost`, `market_demand`, `supply_capacity`, `packaging_cost`).

### `GET /api/v1/M4/backtesting/history`
Returns 12-quarter empirical validation history, target evaluations, and cumulative savings.

---

## 7. Model Management Endpoints

### `GET /api/v1/M4/models`
Returns mathematical optimization specifications and metadata.

### `GET /api/v1/M4/models/:id`
Returns full mathematical details for a specific model version (`M4-MILP-v1.0`).
