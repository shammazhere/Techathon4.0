from typing import Dict, Any, List


def generate_summary(state: Dict[str, Any]) -> Dict[str, Any]:
    summary = {
        "disaster_type": state.get("disaster", {}).get("disaster_type", "unknown"),
        "route_count": len(state.get("routes", [])),
        "resource_count": len(state.get("resources", [])),
        "rescue_count": len(state.get("rescues", [])),
        "explanation_count": len(state.get("explanations", []))
    }

    return {
        "summary": summary
    }