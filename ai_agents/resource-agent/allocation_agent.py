from typing import Dict, Any, List


def get_resource_allocation() -> Dict[str, Any]:
    resources = [
        {
            "resource_id": "AMB_01",
            "type": "ambulance",
            "location": [12.91, 74.85],
            "status": "available",
            "capacity": 2
        },
        {
            "resource_id": "BOAT_01",
            "type": "rescue_boat",
            "location": [12.92, 74.84],
            "status": "deployed",
            "capacity": 6
        }
    ]

    return {
        "resources": resources,
        "total_resources": len(resources),
        "available_resources": len([r for r in resources if r["status"] == "available"])
    }