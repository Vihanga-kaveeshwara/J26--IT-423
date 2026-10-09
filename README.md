# MERN + ML Service Project

This repository is a clean application scaffold for a React frontend, an Express/TypeScript backend, PostgreSQL managed with Prisma ORM, and an independent Python FastAPI machine-learning service. Business features, authentication, model training, and prediction logic are intentionally not implemented.

## Architecture

```text
React + Vite frontend -> Express backend -> PostgreSQL (Prisma)
                              |
                              v
                       FastAPI ML service
```

The frontend communicates only with the backend. The backend owns the PostgreSQL and ML-service integrations.

## Technologies

- Frontend: React, Vite, TypeScript, Tailwind CSS, React Router, Axios
- Backend: Node.js, Express, TypeScript, Prisma, PostgreSQL, Helmet, CORS, dotenv, Axios
- ML service: Python 3.11+, FastAPI, Uvicorn, Pydantic, NumPy, Pandas, scikit-learn, Joblib
- Infrastructure: PostgreSQL and Docker Compose

## Structure

```text
frontend/       React client
backend/        Express API
ml-service/     FastAPI scaffold and future training workspace
uploads/        Runtime upload location (kept empty)
```

## Prerequisites

For local development, install Node.js 22+, npm, Python 3.11+, and PostgreSQL. Docker Desktop is optional for the containerized workflow.

## Environment setup

Only example environment files are committed. Copy each example before starting its service:

```powershell
Copy-Item .\frontend\.env.example .\frontend\.env
Copy-Item .\backend\.env.example .\backend\.env
Copy-Item .\ml-service\.env.example .\ml-service\.env
```

The defaults use frontend `5173`, backend `5000`, ML service `8000`, and PostgreSQL at `postgresql://postgres:YOUR_PASSWORD@localhost:5432/project_database`.

## Local development

Start PostgreSQL locally, create `project_database`, set `backend/.env`, and generate the Prisma client:

```powershell
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate -- --name initial
npm run dev
```

```powershell
cd frontend
npm install
npm run dev
```

```powershell
cd ml-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

From the repository root, install the helper dependency and run the services together with `npm run dev`. Individual root scripts are also available: `npm run client`, `npm run server`, and `npm run ml`.

## Docker

Docker is not required for local development. To run the complete stack:

```powershell
docker compose up --build
```

PostgreSQL data is persisted in the `postgres_data` volume. Services use Docker service names for internal communication. Database readiness is checked before the backend starts. Stop the stack with `docker compose down`.

## URLs and health endpoints

| Service | URL | Health endpoint |
| --- | --- | --- |
| Frontend | http://localhost:5173 | Frontend root (`/`) |
| Backend | http://localhost:5000 | `GET /api/health` |
| ML service | http://localhost:8000 | `GET /api/ml/health` |
| PostgreSQL | postgresql://localhost:5432 | Managed by PostgreSQL |

The backend health response reports the ML service as `available` or `unavailable`; a temporary ML-service outage does not make the backend health request fail.

The ML placeholder endpoints (`POST /api/ml/predict`, `POST /api/ml/train`, `GET /api/ml/model`, and `GET /api/ml/metrics`) return HTTP 501 until their real workflows are designed.

## Future ML workflow

The `ml-service/training` directory is reserved for dataset loading, cleaning, feature extraction, preprocessing, train/test splitting, model training, evaluation, model saving, and model versioning. `trained_models/` is intentionally empty except for `.gitkeep`.
