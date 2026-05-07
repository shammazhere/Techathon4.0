from typing import Dict, Any, List


def get_danger_updates(disaster_type: str = "flood") -> Dict[str, Any]:
    if disaster_type == "flood":
        return {
            "disaster_type": "flood",
            "flood_zones": [
                {"zone_id": "F1", "risk_level": "high", "location": [12.91, 74.85]},
                {"zone_id": "F2", "risk_level": "medium", "location": [12.92, 74.84]}
            ],
            "blocked_roads": ["road_101", "road_205"]
        }

    if disaster_type == "wildfire":
        return {
            "disaster_type": "wildfire",
            "fire_zones": [
                {"zone_id": "W1", "risk_level": "high", "location": [12.95, 74.88]},
                {"zone_id": "W2", "risk_level": "medium", "location": [12.96, 74.87]}
            ],
            "blocked_roads": ["road_301", "road_404"]
        }

    return {
        "disaster_type": disaster_type,
        "zones": [],
        "blocked_roads": []
    }