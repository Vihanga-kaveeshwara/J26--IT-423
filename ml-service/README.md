# ML service

FastAPI scaffold for future model work. It intentionally does not contain model, prediction, training, or evaluation logic yet.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
