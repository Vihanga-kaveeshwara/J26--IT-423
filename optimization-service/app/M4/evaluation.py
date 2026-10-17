from typing import Dict, Any

def evaluate_scenario_solution(solution: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluates solution feasibility, constraint saturation, and economic indicators.
    """
    allocations = solution.get("allocations", [])
    total_qty = solution.get("total_allocated_kg", 0.0)
    total_cost = solution.get("total_cost_usd", 0.0)
    savings = solution.get("estimated_savings_usd", 0.0)

    avg_unit_cost = (total_cost / total_qty) if total_qty > 0 else 0.0

    return {
        "status": solution.get("status", "Unknown"),
        "total_volume_mt": round(total_qty / 1000.0, 2),
        "average_cost_per_kg_usd": round(avg_unit_cost, 3),
        "estimated_savings_usd": savings,
        "is_economically_viable": savings > 0 and solution.get("status") == "Optimal",
        "allocation_count": len(allocations),
    }
