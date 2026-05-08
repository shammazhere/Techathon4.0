from typing import Dict, Any


def generate_llm_explanation(disaster_type: str, route_count: int, resource_count: int) -> str:
    return (
        f"During the {disaster_type} emergency, the system identified safe routes, "
        f"allocated {resource_count} resources, and coordinated {route_count} evacuation paths "
        f"to reduce response delays."
    )