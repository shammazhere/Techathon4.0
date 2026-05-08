from typing import Dict, Any, List


def get_traffic_congestion() -> Dict[str, Any]:
    congestion_data = {
        "road_101": {"congestion": "high", "delay": 15},
        "road_205": {"congestion": "critical", "delay": 25},
        "road_301": {"congestion": "low", "delay": 2}
    }

    return {
        "congestion_data": congestion_data,
        "critical_roads": [road for road, data in congestion_data.items() if data["congestion"] == "critical"],
        "total_delay_minutes": sum(data["delay"] for data in congestion_data.values())
    }