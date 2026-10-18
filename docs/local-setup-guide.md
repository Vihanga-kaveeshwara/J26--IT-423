# Ceylon Intelligence — Local Development & Beginner Execution Guide

**AI-Based Decision Support System for Sri Lankan Tea Export Operations**  
**M4: Prescriptive Export & Logistics Optimization Engine**

This guide provides beginner-friendly, step-by-step instructions for running Ceylon Intelligence locally on **Windows** using **PowerShell**, **VS Code**, **Node.js**, **PostgreSQL**, and **Python**.

---

## 1. Prerequisites Check

Open **PowerShell** and verify that your tools are installed:

```powershell
node -v      # Expected: v20+ (Verified: v23.7.0)
npm -v       # Expected: v10+ (Verified: 10.9.2)
python --version  # Expected: Python 3.11+ (Verified: Python 3.13.12)
```

Ensure PostgreSQL is running as a Windows Service (`postgresql-x64-18`).

---

## 2. Seed User Accounts (Local Development)

| Role | Email | Password | Allowed Capabilities |
|---|---|---|---|
| **Admin** | `admin@ceylonintelligence.lk` | `CeylonAdmin2026!` | User administration, audit logs, dataset activation |
| **Export Manager** | `export.manager@ceylonintelligence.lk` | `ExportMgr2026!` | Formulate scenarios, solve MILP engine, view allocations |
| **Logistics Coordinator** | `logistics@ceylonintelligence.lk` | `Logistics2026!` | Route capacities, maritime freight rates, packaging limits |
| **Research Analyst** | `analyst@ceylonintelligence.lk` | `Analyst2026!` | Parametric sensitivity, quarterly backtesting, model registry |

---

## 3. Database Setup with pgAdmin (or PowerShell)

### Using pgAdmin 4:
1. Open **pgAdmin 4** from your Start menu and enter your master password.
2. In the left panel, expand **Servers** > **PostgreSQL 18**.
3. Right-click **Databases** > **Create** > **Database...**
4. Name the database `tea_export_db` and click **Save**.
5. Select `tea_export_db`, click **Tools** in the top menu > **Query Tool**.
6. Open and execute `database/schema.sql` (click the Execute / Play button or press F5).
7. Open and execute `database/seeds/seed.sql` to populate baseline demonstration records.

### Quick Command Line (PowerShell):
```powershell
psql -U postgres -c "CREATE DATABASE tea_export_db;"
psql -U postgres -d tea_export_db -f "database\schema.sql"
psql -U postgres -d tea_export_db -f "database\seeds\seed.sql"
```

---

## 4. Starting the Services

Open **three separate PowerShell terminal tabs** in VS Code:

### Terminal 1: Python M4 Optimization Service
```powershell
cd c:\Users\Nawodhi\Documents\GitHub\J26--IT-423
$env:PYTHONPATH="optimization-service"
python -m uvicorn app.main:app --app-dir optimization-service --host 127.0.0.1 --port 8001 --reload
```
*Verification*: Open `http://localhost:8001/api/health` in your browser. You should see:
`{"success": true, "service": "M4 Prescriptive Export & Logistics Optimization Engine", ...}`

---

### Terminal 2: Node.js Express Backend
```powershell
cd c:\Users\Nawodhi\Documents\GitHub\J26--IT-423\backend
npm run dev
```
*Verification*: Backend will display: `Backend listening on http://localhost:5000`

---

### Terminal 3: React Vite Frontend
```powershell
cd c:\Users\Nawodhi\Documents\GitHub\J26--IT-423\frontend
npm run dev
```
*Verification*: Vite will output: `Local: http://localhost:5173/`

Open **`http://localhost:5173`** in your browser.

---

## 5. How to Test the Entire Application Flow

1. **Sign In**: Navigate to `http://localhost:5173/login`. Use one of the **Quick Demo Role** buttons (e.g. *Export Mgr*) to auto-fill credentials, then click **Sign In to Engine**.
2. **Dashboard Overview**: View the active KPIs, cost breakdown donut chart, market allocation distributions, and recent audit activity.
3. **Run Scenario Optimization**:
   - Click **Launch Workspace** or navigate to `/m4/workspace`.
   - Adjust tea supply availability, market demand targets, or route capacities.
   - Click **Run Optimization**. The PuLP solver executes and redirects to the **Optimization Results** page (`/m4/results`).
4. **Inspect Results & Export**:
   - Review the prescribed allocation table mapping grades to destination ports.
   - Click **Export CSV** to download the official allocation file.
   - Click **Print Report (PDF)** for a printable thesis evaluation report.
5. **Sensitivity Analysis**: Navigate to `/m4/sensitivity`, select a parameter (e.g. *Maritime Freight Tariffs*), and click **Execute Sensitivity** to view parametric response curves.
6. **Quarterly Backtesting**: Navigate to `/m4/backtesting` to inspect empirical validation across 12 consecutive quarters with target vs achieved metrics.
7. **Dataset Management**: Navigate to `/m4/datasets` to preview CSV tables, test the schema validator, and switch active version baselines.

---

## 6. Running Automated Verification Tests

### Test 1: Python PuLP Solver Tests
```powershell
$env:PYTHONPATH="optimization-service"
python -m pytest optimization-service\app\M4\tests\test_optimizer.py
```

### Test 2: Hand-Verified Mathematical Benchmark
```powershell
cd backend
npx ts-node src/modules/M4/tests/optimization.test.ts
```

### Test 3: Backend Authentication & Security Tests
```powershell
cd backend
npx ts-node src/modules/auth/auth.test.ts
```

### Test 4: Dataset Integrity & CSV Tests
```powershell
cd backend
npx ts-node src/modules/datasets/dataset.test.ts
```

### Test 5: Production Build Checks
```powershell
# Frontend
cd frontend
npm run build

# Backend
cd backend
npm run build
```

---

## 7. Troubleshooting Common Issues

- **Port in use (5000 or 8001)**:
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force
  ```
- **PostgreSQL connection refused**:
  Verify Windows Service:
  ```powershell
  Get-Service -Name *postgres*
  ```
  If stopped:
  ```powershell
  Start-Service postgresql-x64-18
  ```
