from typing import Dict, Any, List


def get_route_updates(blocked_roads: List[str] | None = None) -> Dict[str, Any]:
    blocked_roads = blocked_roads or []

    safe_routes = [
        {
            "route_id": "R1",
            "start": "zone_A",
            "end": "shelter_1",
            "path": ["node_1", "node_5", "node_9"],
            "priority": "high"
        },
        {
            "route_id": "R2",
            "start": "zone_B",
            "end": "hospital_1",
            "path": ["node_2", "node_6", "node_10"],
            "priority": "medium"
        }
    ]

    return {
        "blocked_roads": blocked_roads,
        "safe_routes": safe_routes,
        "reroute_required": len(blocked_roads) > 0
    }