# Ceylon Intelligence — PostgreSQL & pgAdmin Setup Guide

This guide provides step-by-step instructions for Windows beginners to create and configure the `tea_export_db` database using **pgAdmin** or **psql**.

---

## 1. Prerequisites
- **PostgreSQL 18** installed and running on `localhost:5432`.
- **pgAdmin 4** installed (usually installed alongside PostgreSQL).

---

## 2. Option A: Creating the Database Using pgAdmin (GUI)

1. Open **pgAdmin 4** from your Windows Start Menu.
2. In the left sidebar tree, expand **Servers** and double-click **PostgreSQL 18** (or your version).
3. Enter your master PostgreSQL password when prompted.
4. Right-click on **Databases** > Select **Create** > **Database...**
5. In the **Database** field, enter:
   ```
   tea_export_db
   ```
6. Click **Save**.
7. Now expand **Databases**, select `tea_export_db`, and click **Tools** in the top menu > **Query Tool**.
8. Open the schema file from this repository:
   - Click the folder icon (Open File) and browse to: `database/schema.sql`
   - Click the **Execute** (Play button / F5) to create all tables and indexes.
9. Open `database/seeds/seed.sql` in the Query Tool and click **Execute** (F5) to populate the demo records.
10. In the left panel, expand `tea_export_db` > `Schemas` > `public` > `Tables`. You will see all 15 tables (`users`, `export_markets`, `shipping_routes`, `optimization_scenarios`, etc.).

---

## 3. Option B: Creating the Database Using PowerShell & psql (Fast)

Open PowerShell and execute:

```powershell
# Create database
psql -U postgres -c "CREATE DATABASE tea_export_db;"

# Apply schema
psql -U postgres -d tea_export_db -f "database\schema.sql"

# Apply initial seed data
psql -U postgres -d tea_export_db -f "database\seeds\seed.sql"
```

---

## 4. Connection Details & Environment Configuration
In `backend/.env` (or default environment variables):
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/tea_export_db
PORT=5000
OPTIMIZATION_SERVICE_URL=http://localhost:8001
JWT_SECRET=ceylon-intelligence-tea-export-jwt-secret-2026
```

---

## 5. Seed User Accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@ceylonintelligence.lk` | `CeylonAdmin2026!` |
| Export Manager | `export.manager@ceylonintelligence.lk` | `ExportMgr2026!` |
| Logistics Coordinator | `logistics@ceylonintelligence.lk` | `Logistics2026!` |
| Research Analyst | `analyst@ceylonintelligence.lk` | `Analyst2026!` |
