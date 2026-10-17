from typing import Dict, Any, List

M4_MODELS = [
    {
        "model_id": "M4-MILP-v1.0",
        "name": "Deterministic Cost Minimization MILP",
        "type": "Operations Research / Mathematical Optimization",
        "solver": "COIN-OR CBC / PuLP",
        "version": "1.0.0",
        "status": "Active / Production Ready",
        "objective": "Minimize total export and logistics cost across multi-tier constraints",
        "variables": "Shipment quantity x[m,g,r,p], shortfall slack u[m,g]",
        "constraints": [
            "Available grade supply limits",
            "Market demand target fulfillment",
            "Contractual minimum commitments",
            "Shipping lane & port capacity",
            "Packaging availability and wastage bounds"
        ],
        "created_at": "2026-03-01T00:00:00Z",
        "research_notes": "Core prescriptive optimization engine for M4 thesis component."
    },
    {
        "model_id": "M4-STOCHASTIC-v0.5",
        "name": "Two-Stage Stochastic Recourse Formulation",
        "type": "Stochastic Mathematical Optimization (Future Scope)",
        "solver": "PuLP / Scenario Decomposition",
        "version": "0.5.0-prototype",
        "status": "Research Extension",
        "objective": "Minimize expected cost over discrete demand & freight cost scenarios",
        "variables": "Stage 1: Advance packaging & base allocation; Stage 2: Recourse shipment",
        "constraints": [
            "Non-anticipativity constraints",
            "Scenario probability weighted demands",
            "Recourse penalty formulation"
        ],
        "created_at": "2026-03-10T00:00:00Z",
        "research_notes": "Theoretical formulation for robust handling of geopolitical shipping disruptions."
    }
]

def get_registered_models() -> List[Dict[str, Any]]:
    return M4_MODELS

def get_model_by_id(model_id: str) -> Dict[str, Any]:
    for m in M4_MODELS:
        if m["model_id"] == model_id:
            return m
    return M4_MODELS[0]
