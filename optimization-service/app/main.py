import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import m4_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ceylon_m4_optimization_service")

app = FastAPI(
    title="Ceylon Intelligence — M4 Prescriptive Export & Logistics Optimization Engine",
    description="Mathematical optimization microservice powered by PuLP / MILP for Sri Lankan Tea Export Operations",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(m4_router, prefix="/api/v1/M4", tags=["M4 Optimization"])


@app.get("/api/health")
@app.get("/api/v1/health")
def health_check() -> dict[str, object]:
    return {
        "success": True,
        "service": "M4 Prescriptive Export & Logistics Optimization Engine",
        "engine": "PuLP / CBC Deterministic MILP Solver",
        "version": "1.0.0",
        "status": "ready",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)
