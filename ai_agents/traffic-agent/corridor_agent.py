from typing import Dict, Any, List


def get_emergency_corridors() -> Dict[str, Any]:
    corridors = [
        {
            "corridor_id": "EC1",
            "path": ["node_1", "node_5", "node_9"],
            "priority": "ambulance_only",
            "status": "active"
        },
        {
            "corridor_id": "EC2",
            "path": ["node_2", "node_6", "node_10"],
            "priority": "rescue_vehicles",
            "status": "active"
        }
    ]

    return {
        "emergency_corridors": corridors,
        "active_corridors": [c for c in corridors if c["status"] == "active"]
    }