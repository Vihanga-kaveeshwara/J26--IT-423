from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI(title="ML Service", version="0.1.0")


@app.get("/api/ml/health")
def health() -> dict[str, object]:
    return {"success": True, "message": "ML service is running"}


def not_implemented() -> JSONResponse:
    return JSONResponse(
        status_code=501,
        content={"success": False, "message": "Not implemented yet"},
    )


@app.post("/api/ml/predict")
def predict() -> JSONResponse:
    return not_implemented()


@app.post("/api/ml/train")
def train() -> JSONResponse:
    return not_implemented()


@app.get("/api/ml/model")
def model() -> JSONResponse:
    return not_implemented()


@app.get("/api/ml/metrics")
def metrics() -> JSONResponse:
    return not_implemented()
