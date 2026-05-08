"""
Sample City Graph — Kochi Waterfront Road Network
====================================================

A realistic miniature road network around the Kochi Waterfront
area for testing the full optimization + agent pipeline
BEFORE Person 1 delivers the real OSMnx graph.

Geography:
    The graph covers the area between Fort Kochi, Marine Drive,
    Thevara Canal, and Willingdon Island — the exact zone
    used in the hardcoded simulation_service.py flood scenario.

Node attributes (matches OSMnx format):
    - x: longitude
    - y: latitude

Edge attributes (matches Person 2's expected schema):
    - length:           road distance in meters
    - speed_kph:        speed limit / effective speed
    - disaster_risk:    0.0–1.0 (initially 0.0, updated by agents)
    - congestion:       0.0–1.0 (initially 0.0, updated by agents)
    - blocked:          bool (initially False)
    - civilian_penalty: float (for emergency corridors)
    - emergency_corridor: bool
    - name:             human-readable road name

Node types (stored in node data):
    - "intersection" (default)
    - "hospital"
    - "shelter"
    - "fire_station"

This module is the ONLY place that will change when Person 1
delivers the real graph. Every other module imports from here.
"""

import networkx as nx
from typing import Dict, Any


# ---------------------------------------------------------------------------
# Kochi Coordinates (lat, lon) — real locations
# ---------------------------------------------------------------------------
KOCHI_NODES: Dict[int, Dict[str, Any]] = {
    # === Core intersections ===
    1:  {"y": 9.9712, "x": 76.2729, "type": "shelter",      "name": "Marine Drive Ground"},
    2:  {"y": 9.9683, "x": 76.2425, "type": "shelter",      "name": "Fort Kochi Ferry Terminal"},
    3:  {"y": 9.9601, "x": 76.2676, "type": "intersection", "name": "Thevara Junction"},
    4:  {"y": 9.9645, "x": 76.3002, "type": "hospital",     "name": "Lakeshore Hospital"},
    5:  {"y": 9.9333, "x": 76.3431, "type": "hospital",     "name": "Amrita Hospital"},
    6:  {"y": 9.9750, "x": 76.2850, "type": "intersection", "name": "MG Road Junction"},
    7:  {"y": 9.9580, "x": 76.2550, "type": "intersection", "name": "Mattancherry Market"},
    8:  {"y": 9.9520, "x": 76.2680, "type": "intersection", "name": "Willingdon Island North"},
    9:  {"y": 9.9480, "x": 76.2780, "type": "intersection", "name": "Willingdon Island South"},
    10: {"y": 9.9700, "x": 76.2600, "type": "intersection", "name": "Customs Junction"},
    11: {"y": 9.9660, "x": 76.2750, "type": "intersection", "name": "Ernakulam South"},
    12: {"y": 9.9800, "x": 76.2900, "type": "intersection", "name": "Kadavanthra"},
    13: {"y": 9.9550, "x": 76.2900, "type": "intersection", "name": "Thevara Bridge"},
    14: {"y": 9.9400, "x": 76.3100, "type": "intersection", "name": "Palarivattom Circle"},
    15: {"y": 9.9450, "x": 76.2600, "type": "intersection", "name": "Thoppumpady Bridge"},
    16: {"y": 9.9850, "x": 76.2800, "type": "fire_station", "name": "Ernakulam Fire Station"},
    17: {"y": 9.9380, "x": 76.2850, "type": "intersection", "name": "Pachalam"},
    18: {"y": 9.9620, "x": 76.2350, "type": "intersection", "name": "Fort Kochi Beach Road"},
    19: {"y": 9.9730, "x": 76.2950, "type": "intersection", "name": "Shanmugham Road"},
    20: {"y": 9.9500, "x": 76.3200, "type": "intersection", "name": "Vyttila Junction"},
}


# ---------------------------------------------------------------------------
# Road network edges — (from, to, attributes)
# ---------------------------------------------------------------------------
KOCHI_EDGES = [
    # Marine Drive area
    (1, 6,  {"length": 450, "speed_kph": 30, "name": "Marine Drive → MG Road"}),
    (6, 12, {"length": 380, "speed_kph": 35, "name": "MG Road → Kadavanthra"}),
    (6, 11, {"length": 320, "speed_kph": 30, "name": "MG Road → Ernakulam South"}),
    (1, 11, {"length": 280, "speed_kph": 25, "name": "Marine Drive → Ernakulam South"}),
    (1, 19, {"length": 350, "speed_kph": 30, "name": "Marine Drive → Shanmugham Road"}),
    (19, 12, {"length": 300, "speed_kph": 35, "name": "Shanmugham → Kadavanthra"}),
    (12, 16, {"length": 200, "speed_kph": 40, "name": "Kadavanthra → Fire Station"}),

    # Fort Kochi side
    (2, 18, {"length": 350, "speed_kph": 25, "name": "Ferry Terminal → Beach Road"}),
    (2, 10, {"length": 500, "speed_kph": 30, "name": "Ferry Terminal → Customs"}),
    (18, 7,  {"length": 400, "speed_kph": 20, "name": "Beach Road → Mattancherry"}),
    (10, 7,  {"length": 380, "speed_kph": 25, "name": "Customs → Mattancherry"}),
    (10, 1,  {"length": 600, "speed_kph": 30, "name": "Customs → Marine Drive"}),

    # Thevara / Canal zone (FLOOD RISK AREA)
    (3, 11, {"length": 350, "speed_kph": 25, "name": "Thevara → Ernakulam South"}),
    (3, 8,  {"length": 400, "speed_kph": 20, "name": "Thevara → Willingdon North"}),
    (3, 13, {"length": 300, "speed_kph": 25, "name": "Thevara → Thevara Bridge"}),
    (7, 3,  {"length": 550, "speed_kph": 20, "name": "Mattancherry → Thevara"}),
    (7, 8,  {"length": 420, "speed_kph": 20, "name": "Mattancherry → Willingdon"}),

    # Willingdon Island
    (8, 9,  {"length": 300, "speed_kph": 25, "name": "Willingdon N → S"}),
    (8, 15, {"length": 350, "speed_kph": 25, "name": "Willingdon → Thoppumpady"}),
    (9, 15, {"length": 280, "speed_kph": 25, "name": "Willingdon S → Thoppumpady"}),
    (9, 13, {"length": 350, "speed_kph": 25, "name": "Willingdon S → Thevara Bridge"}),

    # Eastern corridor (Hospital route)
    (11, 4,  {"length": 500, "speed_kph": 40, "name": "Ernakulam South → Lakeshore"}),
    (13, 4,  {"length": 450, "speed_kph": 35, "name": "Thevara Bridge → Lakeshore"}),
    (4, 19,  {"length": 350, "speed_kph": 35, "name": "Lakeshore → Shanmugham"}),
    (4, 20,  {"length": 600, "speed_kph": 40, "name": "Lakeshore → Vyttila"}),
    (13, 14, {"length": 500, "speed_kph": 35, "name": "Thevara Bridge → Palarivattom"}),
    (14, 5,  {"length": 700, "speed_kph": 40, "name": "Palarivattom → Amrita"}),
    (14, 20, {"length": 350, "speed_kph": 35, "name": "Palarivattom → Vyttila"}),
    (20, 5,  {"length": 500, "speed_kph": 40, "name": "Vyttila → Amrita"}),

    # Southern connectors
    (15, 17, {"length": 400, "speed_kph": 30, "name": "Thoppumpady → Pachalam"}),
    (17, 9,  {"length": 350, "speed_kph": 25, "name": "Pachalam → Willingdon S"}),
    (17, 14, {"length": 500, "speed_kph": 30, "name": "Pachalam → Palarivattom"}),

    # Northern bypass
    (16, 12, {"length": 200, "speed_kph": 40, "name": "Fire Station → Kadavanthra"}),
    (16, 19, {"length": 400, "speed_kph": 35, "name": "Fire Station → Shanmugham"}),
]


def build_kochi_graph() -> nx.Graph:
    """
    Build the sample Kochi road network graph.

    Returns a NetworkX Graph with the same attribute schema
    that Person 1's real OSMnx graph will have:
        Node: {x, y, type, name}
        Edge: {length, speed_kph, disaster_risk, congestion, blocked,
               civilian_penalty, emergency_corridor, name}

    When Person 1 delivers the real graph, replace this function's
    body with their loader — everything else stays the same.
    """
    # Try to load real GIS graph first
    try:
        from backend.engines.gis.gis_manager import gis_manager
        real_g = gis_manager.load_city_graph("Kochi, Kerala")
        if real_g.number_of_nodes() > 50: # Ensure it's a decent graph
            print("[Graph] Successfully loaded real OSMnx graph for Kochi")
            return real_g
    except Exception as e:
        print(f"[Graph] Falling back to sample graph: {e}")

    G = nx.Graph()

    # Add nodes with coordinates and metadata
    for node_id, attrs in KOCHI_NODES.items():
        G.add_node(node_id, **attrs)

    # Add edges with default dynamic attributes
    for u, v, attrs in KOCHI_EDGES:
        edge_attrs = {
            "length": attrs["length"],
            "speed_kph": attrs["speed_kph"],
            "name": attrs.get("name", f"Road {u}-{v}"),
            # Dynamic attributes (updated by optimization engine at runtime)
            "disaster_risk": 0.0,
            "congestion": 0.0,
            "blocked": False,
            "civilian_penalty": 0.0,
            "emergency_corridor": False,
        }
        G.add_edge(u, v, **edge_attrs)

    return G


def get_shelter_nodes(graph: nx.Graph) -> list:
    """Return node IDs that are shelters."""
    return [n for n, d in graph.nodes(data=True) if d.get("type") == "shelter"]


def get_hospital_nodes(graph: nx.Graph) -> list:
    """Return node IDs that are hospitals."""
    return [n for n, d in graph.nodes(data=True) if d.get("type") == "hospital"]


def get_fire_station_nodes(graph: nx.Graph) -> list:
    """Return node IDs that are fire stations."""
    return [n for n, d in graph.nodes(data=True) if d.get("type") == "fire_station"]


def get_node_name(graph: nx.Graph, node_id: int) -> str:
    """Get the human-readable name of a node."""
    return graph.nodes[node_id].get("name", f"Node-{node_id}")


# ---------------------------------------------------------------------------
# Simulated Resource Positions (matches simulation_service.py scenario)
# ---------------------------------------------------------------------------
SIMULATED_AMBULANCES = [
    {"resource_id": "AMB_01", "node": 16, "coords": (9.9850, 76.2800)},  # Fire Station
    {"resource_id": "AMB_02", "node": 4,  "coords": (9.9645, 76.3002)},  # Lakeshore Hospital
    {"resource_id": "AMB_03", "node": 5,  "coords": (9.9333, 76.3431)},  # Amrita Hospital
    {"resource_id": "AMB_04", "node": 12, "coords": (9.9800, 76.2900)},  # Kadavanthra
    {"resource_id": "AMB_05", "node": 20, "coords": (9.9500, 76.3200)},  # Vyttila Junction
]

SIMULATED_INCIDENTS = [
    {"incident_id": "INC_01", "node": 3,  "coords": (9.9601, 76.2676), "severity": 0.9, "people": 45, "urgency": "critical"},
    {"incident_id": "INC_02", "node": 7,  "coords": (9.9580, 76.2550), "severity": 0.7, "people": 20, "urgency": "high"},
    {"incident_id": "INC_03", "node": 8,  "coords": (9.9520, 76.2680), "severity": 0.8, "people": 30, "urgency": "critical"},
    {"incident_id": "INC_04", "node": 15, "coords": (9.9450, 76.2600), "severity": 0.5, "people": 12, "urgency": "medium"},
]

SIMULATED_HOSPITALS = [
    {"hospital_id": "Lakeshore Hospital",  "current_patients": 178, "max_capacity": 200, "incoming_patients": 5, "node": 4},
    {"hospital_id": "Amrita Hospital",     "current_patients": 120, "max_capacity": 250, "incoming_patients": 3, "node": 5},
]

SIMULATED_SHELTERS = [
    {"shelter_id": "Marine Drive Ground",       "current_occupants": 2400, "max_capacity": 8000, "has_medical": True,  "has_food": True, "has_water": True, "node": 1},
    {"shelter_id": "Fort Kochi Ferry Terminal",  "current_occupants": 800,  "max_capacity": 3000, "has_medical": False, "has_food": True, "has_water": True, "node": 2},
]


# ---------------------------------------------------------------------------
# Module-level singleton — import this across the codebase
# ---------------------------------------------------------------------------
_city_graph = None

def get_city_graph() -> nx.Graph:
    """
    Get the global city graph instance (lazy singleton).
    
    All agents and services share the SAME graph object so
    edge mutations (risk, congestion) are visible everywhere.
    """
    global _city_graph
    if _city_graph is None:
        _city_graph = build_kochi_graph()
    return _city_graph


def reset_city_graph() -> nx.Graph:
    """Reset the graph to a clean state (for new simulation runs)."""
    global _city_graph
    _city_graph = build_kochi_graph()
    return _city_graph
