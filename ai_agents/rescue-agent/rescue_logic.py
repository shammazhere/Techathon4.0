from typing import Dict, Any, List


def get_rescue_plan() -> Dict[str, Any]:
    rescue_tasks = [
        {
            "rescue_id": "RES_01",
            "zone_id": "F1",
            "priority": "high",
            "people_to_rescue": 12,
            "assigned_team": "team_alpha"
        },
        {
            "rescue_id": "RES_02",
            "zone_id": "F2",
            "priority": "medium",
            "people_to_rescue": 5,
            "assigned_team": "team_beta"
        }
    ]

    return {
        "rescue_tasks": rescue_tasks,
        "total_rescue_tasks": len(rescue_tasks),
        "high_priority_count": len([task for task in rescue_tasks if task["priority"] == "high"])
    }