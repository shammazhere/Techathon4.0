import networkx as nx
from optimization.types import Resource, Incident, ResourceType, ResourceStatus, UrgencyLevel
from optimization.routing.safe_route import find_safe_route, find_nearest_node
from optimization.resource_allocation.ambulance_dispatch import dispatch_ambulances
from optimization.traffic_optimization.edge_penalties import set_disaster_risk_radius

def run_tests():
    print("--- Starting Optimization Engine Tests ---")
    
    # 1. Create a mock city graph
    print("1. Creating mock graph...")
    G = nx.Graph()
    # Add nodes (coordinates: lat, lon)
    G.add_node(1, y=12.971, x=77.594) # Center
    G.add_node(2, y=12.972, x=77.595)
    G.add_node(3, y=12.970, x=77.593)
    G.add_node(4, y=12.973, x=77.596) # Hospital
    
    # Add edges (length in meters)
    G.add_edge(1, 2, length=150.0, speed_kph=40.0)
    G.add_edge(2, 4, length=200.0, speed_kph=40.0)
    G.add_edge(1, 3, length=100.0, speed_kph=30.0)
    G.add_edge(3, 4, length=300.0, speed_kph=50.0)
    
    print("Graph created with", G.number_of_nodes(), "nodes and", G.number_of_edges(), "edges.")
    
    # 2. Test Routing
    print("\n2. Testing Routing...")
    route = find_safe_route(G, source=1, target=4)
    if route:
        print(f"SUCCESS: Route found! Distance: {route.total_distance_m}m, Time: {route.estimated_time_s}s")
        print(f"Path nodes: {route.path_nodes}")
    else:
        print("FAILED: No route found!")

    # 3. Test Disaster Risk
    print("\n3. Testing Disaster Risk Impact...")
    # Add risk to node 2 (making the 1->2->4 route dangerous)
    set_disaster_risk_radius(G, center_node=2, radius_hops=1, risk_value=0.9, decay=0.0)
    
    route_with_risk = find_safe_route(G, source=1, target=4)
    if route_with_risk:
        print(f"SUCCESS: Route found avoiding risk! Distance: {route_with_risk.total_distance_m}m")
        print(f"Path nodes: {route_with_risk.path_nodes} (Should avoid node 2 if possible)")
    else:
        print("FAILED: No route found!")

    # 4. Test Ambulance Dispatch
    print("\n4. Testing Ambulance Dispatch...")
    ambulances = [
        Resource(resource_id="AMB_1", resource_type=ResourceType.AMBULANCE, current_coords=(12.973, 77.596), current_node=4)
    ]
    incidents = [
        Incident(incident_id="INC_1", coords=(12.970, 77.593), nearest_node=3, people_affected=2)
    ]
    
    assignments = dispatch_ambulances(G, ambulances, incidents)
    if assignments:
        print(f"SUCCESS: Dispatch successful! AMB_1 assigned to INC_1.")
        print(f"Route distance: {assignments[0].route.total_distance_m}m")
    else:
        print("FAILED: Dispatch failed!")
        
    print("\n--- All tests completed successfully! ---")

if __name__ == "__main__":
    run_tests()
