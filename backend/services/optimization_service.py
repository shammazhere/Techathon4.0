"""
Optimization Service — Bridge between Backend Agents and Person 2's Engine
===========================================================================

This is the FORMAL interface layer.

Person 3's agents call functions here.
This module translates JSON data into typed Optimization objects,
calls Person 2's algorithms, and returns clean JSON back.

No agent should ever import from optimization/ directly.
Everything goes through this service.
"""

from typing import List, Dict, Any, Optional
import networkx as nx

# Person 2's types
from optimization.types import (
    Resource, ResourceType, ResourceStatus,
    Incident, UrgencyLevel,
    Assignment,
)

# Person 2's routing
from optimization.routing.safe_route import (
    find_safe_route,
    find_safe_route_by_coords,
    find_multiple_evacuation_routes,
    find_nearest_node,
)

# Person 2's resource allocation
from optimization.resource_allocation.ambulance_dispatch import dispatch_ambulances

# Person 2's rescue scheduling
from optimization.rescue_scheduling.rescue_priority import batch_calculate_priorities
from optimization.rescue_scheduling.rescue_queue import RescueQueue

# Person 2's traffic optimization
from optimization.traffic_optimization.edge_penalties import (
    set_disaster_risk_radius,
    reset_penalties,
    block_edges,
)
from optimization.traffic_optimization.congestion_control import (
    get_congestion_report,
    get_congested_edges,
    auto_relieve_congestion,
)
from optimization.traffic_optimization.emergency_corridors import (
    create_emergency_corridor,
    get_active_corridors,
)

# Person 2's scoring
from optimization.scoring.hospital_overload import batch_assess_hospitals, get_overload_alerts
from optimization.scoring.shelter_occupancy import batch_assess_shelters, get_shelter_summary
from optimization.scoring.vulnerability_score import batch_calculate_vulnerability

# Shared city graph
from shared.sample_graph import (
    get_city_graph,
    reset_city_graph,
    SIMULATED_AMBULANCES,
    SIMULATED_INCIDENTS,
    SIMULATED_HOSPITALS,
    SIMULATED_SHELTERS,
)


# ---------------------------------------------------------------------------
# Internal helpers — JSON → Optimization Types
# ---------------------------------------------------------------------------

def _build_resources(ambulance_data: List[Dict]) -> List[Resource]:
    """Convert ambulance dicts into typed Resource objects."""
    resources = []
    for a in ambulance_data:
        res = Resource(
            resource_id=a["resource_id"],
            resource_type=ResourceType.AMBULANCE,
            current_coords=tuple(a["coords"]),
            current_node=a.get("node"),
            status=ResourceStatus.AVAILABLE,
            speed_kmh=40.0,
        )
        resources.append(res)
    return resources


def _build_incidents(incident_data: List[Dict]) -> List[Incident]:
    """Convert incident dicts into typed Incident objects."""
    urgency_map = {
        "critical": UrgencyLevel.CRITICAL,
        "high":     UrgencyLevel.HIGH,
        "medium":   UrgencyLevel.MEDIUM,
        "low":      UrgencyLevel.LOW,
    }
    incidents = []
    for i in incident_data:
        inc = Incident(
            incident_id=i["incident_id"],
            coords=tuple(i["coords"]),
            nearest_node=i.get("node"),
            severity=i.get("severity", 0.5),
            people_affected=i.get("people", 1),
            urgency=urgency_map.get(i.get("urgency", "medium"), UrgencyLevel.MEDIUM),
        )
        incidents.append(inc)
    return incidents


# ---------------------------------------------------------------------------
# TASK 1: Apply Disaster to Graph
# ---------------------------------------------------------------------------

def apply_disaster_to_graph(
    disaster_data: Dict[str, Any],
    graph: Optional[nx.Graph] = None,
) -> Dict[str, Any]:
    """
    Called by DisasterAgent when a flood/wildfire starts.

    Updates edge risk values on the city graph based on the
    disaster epicenter from simulation_service.py.

    Returns a summary of how many edges were affected.
    """
    if graph is None:
        graph = get_city_graph()

    center_coords = disaster_data.get("center", [9.9601, 76.2676])
    disaster_type = disaster_data.get("type", "flood")

    # Map disaster center coordinates to nearest graph node
    center_node = find_nearest_node(graph, tuple(center_coords))

    if center_node is None:
        return {"status": "error", "message": "Could not locate disaster center on graph"}

    # Set disaster risk in a radius around the epicenter
    # Flood: 3-hop radius, high risk (0.85)
    # Wildfire: 4-hop radius, extreme risk (0.95)
    risk_configs = {
        "flood":    {"radius_hops": 3, "risk_value": 0.85, "decay": 0.15},
        "wildfire": {"radius_hops": 4, "risk_value": 0.95, "decay": 0.20},
    }
    cfg = risk_configs.get(disaster_type, risk_configs["flood"])

    edges_updated = set_disaster_risk_radius(
        graph,
        center_node=center_node,
        radius_hops=cfg["radius_hops"],
        risk_value=cfg["risk_value"],
        decay=cfg["decay"],
    )

    # Block roads explicitly listed in simulation_service.py
    blocked_roads = disaster_data.get("blocked_areas", [])

    return {
        "status": "graph_updated",
        "disaster_type": disaster_type,
        "center_node": center_node,
        "edges_with_risk_updated": edges_updated,
        "blocked_areas": blocked_roads,
        "risk_level": cfg["risk_value"],
    }


# ---------------------------------------------------------------------------
# TASK 2: Calculate Safe Evacuation Routes
# ---------------------------------------------------------------------------

def calculate_evacuation_routes(
    incidents: Optional[List[Dict]] = None,
    graph: Optional[nx.Graph] = None,
) -> List[Dict[str, Any]]:
    """
    Called by RouteAgent.

    Finds the best evacuation route from each incident location
    to the nearest available shelter using Person 2's A* algorithm.

    Returns a list of route dicts ready for JSON / WebSocket broadcast.
    """
    if graph is None:
        graph = get_city_graph()

    if incidents is None:
        incidents = SIMULATED_INCIDENTS

    # Get shelter node IDs from the graph
    shelter_nodes = [
        n for n, d in graph.nodes(data=True)
        if d.get("type") == "shelter"
    ]

    if not shelter_nodes:
        return []

    routes = []
    for inc_data in incidents:
        source_node = inc_data.get("node")
        if source_node is None:
            source_node = find_nearest_node(graph, tuple(inc_data["coords"]))

        if source_node is None:
            continue

        # Find routes to all shelters, return best 2
        found_routes = find_multiple_evacuation_routes(
            graph,
            source=source_node,
            shelter_nodes=shelter_nodes,
            risk_penalty=5.0,
            max_results=2,
        )

        for route in found_routes:
            route_dict = route.to_dict()
            route_dict["incident_id"] = inc_data["incident_id"]
            route_dict["source_coords"] = inc_data["coords"]
            routes.append(route_dict)

    return routes


# ---------------------------------------------------------------------------
# TASK 3: Dispatch Ambulances to Incidents
# ---------------------------------------------------------------------------

def dispatch_resources(
    ambulances: Optional[List[Dict]] = None,
    incidents: Optional[List[Dict]] = None,
    graph: Optional[nx.Graph] = None,
) -> List[Dict[str, Any]]:
    """
    Called by ResourceAgent.

    Uses Person 2's greedy dispatch algorithm to assign the
    nearest available ambulance to each active incident.

    Returns a list of assignment dicts.
    """
    if graph is None:
        graph = get_city_graph()

    if ambulances is None:
        ambulances = SIMULATED_AMBULANCES
    if incidents is None:
        incidents = SIMULATED_INCIDENTS

    # Build typed objects
    resource_objs = _build_resources(ambulances)
    incident_objs = _build_incidents(incidents)

    # Run Person 2's dispatch algorithm
    assignments: List[Assignment] = dispatch_ambulances(
        graph,
        ambulances=resource_objs,
        incidents=incident_objs,
        apply_congestion=True,
    )

    return [a.to_dict() for a in assignments]


# ---------------------------------------------------------------------------
# TASK 4: Prioritize Rescues
# ---------------------------------------------------------------------------

def prioritize_rescues(
    incidents: Optional[List[Dict]] = None,
) -> List[Dict[str, Any]]:
    """
    Called by RescueAgent.

    Scores each incident by urgency using Person 2's
    weighted formula and returns them ranked by priority.
    """
    if incidents is None:
        incidents = SIMULATED_INCIDENTS

    incident_objs = _build_incidents(incidents)

    # Score and rank all incidents
    rescue_tasks = batch_calculate_priorities(incident_objs)

    return [t.to_dict() for t in rescue_tasks]


# ---------------------------------------------------------------------------
# TASK 5: Get Traffic / Congestion Report
# ---------------------------------------------------------------------------

def get_traffic_status(
    graph: Optional[nx.Graph] = None,
) -> Dict[str, Any]:
    """
    Called by TrafficAgent.

    Reads the current congestion state of the city graph
    and returns a structured report for the frontend dashboard.
    """
    if graph is None:
        graph = get_city_graph()

    report = get_congestion_report(graph)

    # Also get active emergency corridors
    corridors = get_active_corridors(graph)
    report["active_corridors"] = len(corridors)
    report["corridor_edges"] = corridors

    return report


# ---------------------------------------------------------------------------
# TASK 6: Hospital & Shelter Status
# ---------------------------------------------------------------------------

def get_hospital_status(
    hospitals: Optional[List[Dict]] = None,
) -> Dict[str, Any]:
    """
    Called by ResourceAgent / ExplanationAgent.
    Uses simulation_service.py hardcoded hospital data.
    """
    if hospitals is None:
        hospitals = SIMULATED_HOSPITALS

    assessed = batch_assess_hospitals(hospitals)
    alerts = get_overload_alerts(hospitals)

    return {
        "hospitals": assessed,
        "overload_alerts": alerts,
        "total_overloaded": len(alerts),
    }


def get_shelter_status(
    shelters: Optional[List[Dict]] = None,
) -> Dict[str, Any]:
    """
    Called by RouteAgent / ExplanationAgent.
    Uses simulation_service.py hardcoded shelter data.
    """
    if shelters is None:
        shelters = SIMULATED_SHELTERS

    return get_shelter_summary(shelters)


# ---------------------------------------------------------------------------
# TASK 7: Full Reset (for new simulation run)
# ---------------------------------------------------------------------------

def reset_simulation_state() -> Dict[str, Any]:
    """
    Reset all dynamic graph state for a fresh simulation start.
    Called when simulation_service.py starts a new disaster.
    """
    graph = reset_city_graph()
    edges_reset = reset_penalties(graph)

    return {
        "status": "reset",
        "graph_nodes": graph.number_of_nodes(),
        "graph_edges": graph.number_of_edges(),
        "penalties_cleared": edges_reset,
    }


# ---------------------------------------------------------------------------
# TASK 8: Live Rerouting — Mid-Transit Dynamic Path Adaptation
# ---------------------------------------------------------------------------

# Module-level monitor singleton (shared across agents/ticks)
_reroute_monitor = None


def get_reroute_monitor():
    """Get or create the global reroute monitor."""
    global _reroute_monitor
    if _reroute_monitor is None:
        from optimization.routing.live_reroute import LiveRerouteMonitor
        _reroute_monitor = LiveRerouteMonitor(get_city_graph())
    return _reroute_monitor


def reset_reroute_monitor():
    """Reset the monitor (called on new simulation)."""
    global _reroute_monitor
    from optimization.routing.live_reroute import LiveRerouteMonitor
    _reroute_monitor = LiveRerouteMonitor(get_city_graph())
    return _reroute_monitor


def start_live_tracking(
    assignments: Optional[List[Dict]] = None,
) -> Dict[str, Any]:
    """
    Register dispatched ambulances for live reroute monitoring.

    Call this AFTER dispatch_resources() returns assignments.
    The monitor will then track each ambulance's movement.
    """
    monitor = get_reroute_monitor()

    if assignments is None:
        # If no assignments provided, run dispatch first
        assignments = dispatch_resources()

    monitor.register_all(assignments)

    return {
        "status": "tracking_started",
        "ambulances_tracked": monitor.active_count,
        "convoys": {rid: c.to_dict() for rid, c in monitor.convoys.items()},
    }


def tick_simulation() -> Dict[str, Any]:
    """
    Advance all ambulances by one step and check for reroutes.

    This is the function that the frontend calls on a timer
    (e.g., every 2 seconds via WebSocket).

    Returns events that happened during this tick.
    """
    monitor = get_reroute_monitor()
    events = monitor.tick()

    return {
        "tick": monitor._tick_count,
        "events": events,
        "active_ambulances": monitor.active_count,
        "status": monitor.get_status(),
    }


def block_road_midtransit(
    node_u: int,
    node_v: int,
) -> Dict[str, Any]:
    """
    Block a road while ambulances are already driving.

    This is the DEMO function — call this to simulate a bridge
    collapse or new flood wave mid-evacuation.

    The next tick() will automatically reroute affected ambulances.
    """
    monitor = get_reroute_monitor()
    result = monitor.block_road(node_u, node_v)

    return {
        "road_blocked": f"{node_u} <-> {node_v}",
        "affected_ambulances": result["affected_ambulances"],
        "will_reroute_on_next_tick": result["will_reroute_on_next_tick"],
    }


def run_full_reroute_simulation(
    max_ticks: int = 50,
) -> Dict[str, Any]:
    """
    Run the complete simulation: all ambulances drive to their
    destinations with rerouting active.

    Returns a full event log showing every move, reroute, and arrival.
    Great for demo presentations.
    """
    monitor = get_reroute_monitor()
    all_events = monitor.run_full_simulation(max_ticks=max_ticks)

    return {
        "total_ticks": monitor._tick_count,
        "total_events": len(all_events),
        "events": all_events,
        "final_status": monitor.get_status(),
        "reroute_summary": monitor.get_reroute_summary(),
    }

