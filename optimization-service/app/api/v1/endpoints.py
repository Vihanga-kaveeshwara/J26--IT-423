import time
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from app.schemas.optimization import OptimizationRequest, OptimizationResponse
from app.M4.optimizer import M4ExportOptimizer
from app.M4.sensitivity import run_sensitivity_analysis
from app.M4.backtesting import calculate_backtest_summary
from app.M4.model_registry import get_registered_models, get_model_by_id

m4_router = APIRouter()
optimizer = M4ExportOptimizer()

class SensitivityRequest(BaseModel):
    scenario: OptimizationRequest
    parameter: str = "freight_cost"
    variations: Optional[List[float]] = [-0.20, -0.10, 0.0, 0.10, 0.20]

class BacktestQuarterInput(BaseModel):
    quarter: str
    baseline_cost_usd: float
    optimized_cost_usd: float
    savings_usd: float
    savings_pct: float
    status: str = "Optimal"

class BacktestBatchRequest(BaseModel):
    dataset_version: str = "M4-DS-v1.0"
    quarterly_records: List[BacktestQuarterInput]

@m4_router.post("/optimize", response_model=OptimizationResponse)
def run_optimization(request: OptimizationRequest):
    try:
        start_time = time.time()
        result = optimizer.solve(request)
        result["execution_time_seconds"] = round(time.time() - start_time, 4)
        result["timestamp"] = datetime.now(timezone.utc).isoformat()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization solver error: {str(e)}")

@m4_router.post("/sensitivity")
def run_sensitivity(request: SensitivityRequest):
    try:
        results = run_sensitivity_analysis(
            request.scenario,
            parameter=request.parameter,
            variations=request.variations
        )
        return {
            "success": True,
            "parameter": request.parameter,
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sensitivity calculation error: {str(e)}")

@m4_router.post("/backtesting/evaluate")
def evaluate_backtesting(request: BacktestBatchRequest):
    try:
        records_dict = [r.dict() for r in request.quarterly_records]
        summary = calculate_backtest_summary(records_dict)
        return {
            "success": True,
            "dataset_version": request.dataset_version,
            "summary": summary,
            "records": records_dict
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backtesting evaluation error: {str(e)}")

@m4_router.get("/models")
def list_models():
    return {
        "success": True,
        "models": get_registered_models()
    }

@m4_router.get("/models/{model_id}")
def get_model(model_id: str):
    model = get_model_by_id(model_id)
    return {
        "success": True,
        "model": model
    }

@m4_router.get("/status")
def get_solver_status():
    return {
        "status": "ready",
        "solver": "PuLP CBC Deterministic MILP",
        "version": "1.0.0",
        "capabilities": [
            "Supply & demand multi-market allocation",
            "Route capacity & risk constraints",
            "Packaging wastage & costs",
            "Contractual minimums enforcement",
            "Quarterly sensitivity analysis",
            "Historical backtesting evaluation"
        ]
    }
