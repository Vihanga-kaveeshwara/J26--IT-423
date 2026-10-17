from typing import Dict, Any, List

def calculate_backtest_summary(quarterly_results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes rigorous backtesting KPIs from historical quarterly runs:
    - Target: >= 10% expected cost reduction
    - Target: >= 80% quarters with positive savings
    - Feasible quarters count
    """
    total_quarters = len(quarterly_results)
    if total_quarters == 0:
        return {
            "total_quarters": 0,
            "feasible_quarters": 0,
            "positive_savings_quarters": 0,
            "average_savings_pct": 0.0,
            "total_baseline_cost_usd": 0.0,
            "total_optimized_cost_usd": 0.0,
            "net_savings_usd": 0.0,
            "target_10pct_cost_reduction_achieved": False,
            "target_80pct_positive_savings_achieved": False,
        }

    feasible_count = sum(1 for q in quarterly_results if q.get("status") == "Optimal")
    positive_savings_count = sum(1 for q in quarterly_results if q.get("savings_usd", 0.0) > 0)
    total_baseline = sum(q.get("baseline_cost_usd", 0.0) for q in quarterly_results)
    total_optimized = sum(q.get("optimized_cost_usd", 0.0) for q in quarterly_results)
    net_savings = total_baseline - total_optimized
    overall_savings_pct = (net_savings / total_baseline * 100.0) if total_baseline > 0 else 0.0

    pct_positive_quarters = (positive_savings_count / total_quarters * 100.0) if total_quarters > 0 else 0.0

    return {
        "total_quarters": total_quarters,
        "feasible_quarters": feasible_count,
        "positive_savings_quarters": positive_savings_count,
        "percentage_positive_quarters": round(pct_positive_quarters, 2),
        "overall_savings_pct": round(overall_savings_pct, 2),
        "total_baseline_cost_usd": round(total_baseline, 2),
        "total_optimized_cost_usd": round(total_optimized, 2),
        "net_savings_usd": round(net_savings, 2),
        "target_10pct_cost_reduction_achieved": overall_savings_pct >= 10.0,
        "target_80pct_positive_savings_achieved": pct_positive_quarters >= 80.0,
    }
