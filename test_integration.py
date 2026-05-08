"""
Integration Test — Full Pipeline Verification
===============================================

Tests the complete chain:
    sample_graph → optimization_service → langgraph agents

Run from project root:
    python test_integration.py

Expected: All 7 tests pass with real data (no mocks).
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def separator(title):
    print(f"\n{'='*55}")
    print(f"  {title}")
    print('='*55)


def test_1_sample_graph():
    separator("TEST 1: Sample Graph Build")
    from shared.sample_graph import build_kochi_graph, get_shelter_nodes, get_hospital_nodes

    G = build_kochi_graph()
    shelters  = get_shelter_nodes(G)
    hospitals = get_hospital_nodes(G)

    assert G.number_of_nodes() > 0, "Graph has no nodes"
    assert G.number_of_edges() > 0, "Graph has no edges"
    assert len(shelters)  >= 2,     "Need at least 2 shelters"
    assert len(hospitals) >= 2,     "Need at least 2 hospitals"

    # Verify edge schema
    for u, v, data in G.edges(data=True):
        assert "length"       in data, f"Edge {u}-{v} missing 'length'"
        assert "disaster_risk" in data, f"Edge {u}-{v} missing 'disaster_risk'"
        assert "congestion"   in data, f"Edge {u}-{v} missing 'congestion'"
        assert "blocked"      in data, f"Edge {u}-{v} missing 'blocked'"
        break  # check one edge is enough

    print(f"  Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")
    print(f"  Shelters: {shelters}")
    print(f"  Hospitals: {hospitals}")
    print("  PASS")


def test_2_disaster_graph_update():
    separator("TEST 2: Disaster Updates Graph Risk")
    from shared.sample_graph import reset_city_graph
    from backend.services.optimization_service import apply_disaster_to_graph

    graph = reset_city_graph()

    # Check baseline
    risks_before = [d.get("disaster_risk", 0) for _, _, d in graph.edges(data=True)]
    assert all(r == 0.0 for r in risks_before), "Graph should start with 0 risk"

    # Apply flood
    result = apply_disaster_to_graph(
        {"type": "flood", "center": [9.9601, 76.2676], "blocked_areas": []},
        graph=graph,
    )
    assert result["status"] == "graph_updated"
    assert result["edges_with_risk_updated"] > 0

    # Check risk was applied
    risks_after = [d.get("disaster_risk", 0) for _, _, d in graph.edges(data=True)]
    assert any(r > 0 for r in risks_after), "No risk applied after disaster"

    print(f"  Edges updated with risk: {result['edges_with_risk_updated']}")
    print(f"  Max risk on graph: {max(risks_after):.2f}")
    print("  PASS")


def test_3_evacuation_routes():
    separator("TEST 3: A* Evacuation Routes")
    from shared.sample_graph import get_city_graph
    from backend.services.optimization_service import calculate_evacuation_routes

    routes = calculate_evacuation_routes()

    assert len(routes) > 0, "No evacuation routes found"

    for route in routes:
        assert "path_nodes"      in route, "Route missing path_nodes"
        assert "total_distance_m" in route, "Route missing distance"
        assert "risk_score"      in route, "Route missing risk_score"
        assert "algorithm"       in route, "Route missing algorithm"
        assert len(route["path_nodes"]) >= 2, "Route too short"

    print(f"  Routes found: {len(routes)}")
    for r in routes[:3]:
        print(f"    Incident {r['incident_id']}: {r['total_distance_m']}m, "
              f"risk={r['risk_score']:.3f}, algo={r['algorithm']}, "
              f"fallback={r['is_fallback']}")
    print("  PASS")


def test_4_ambulance_dispatch():
    separator("TEST 4: Ambulance Dispatch")
    from shared.sample_graph import reset_city_graph
    from backend.services.optimization_service import dispatch_resources, apply_disaster_to_graph

    graph = reset_city_graph()
    apply_disaster_to_graph({"type": "flood", "center": [9.9601, 76.2676]}, graph=graph)

    assignments = dispatch_resources(graph=graph)

    assert len(assignments) > 0, "No ambulances dispatched"

    for a in assignments:
        assert "resource_id"  in a, "Assignment missing resource_id"
        assert "incident_id"  in a, "Assignment missing incident_id"
        assert "route"        in a, "Assignment missing route"
        assert "priority_rank" in a, "Assignment missing priority_rank"

    print(f"  Ambulances dispatched: {len(assignments)}")
    for a in assignments:
        r = a["route"]
        print(f"    {a['resource_id']} -> {a['incident_id']} | "
              f"{r['total_distance_m']}m | rank={a['priority_rank']}")
    print("  PASS")


def test_5_rescue_priority():
    separator("TEST 5: Rescue Priority Scoring")
    from backend.services.optimization_service import prioritize_rescues

    tasks = prioritize_rescues()

    assert len(tasks) > 0, "No rescue tasks scored"

    # Verify sorted by urgency descending
    scores = [t["urgency_score"] for t in tasks]
    assert scores == sorted(scores, reverse=True), "Tasks not sorted by urgency"

    print(f"  Rescue tasks ranked: {len(tasks)}")
    for t in tasks:
        print(f"    {t['incident_id']}: score={t['urgency_score']:.2f}, "
              f"level={t['urgency_level']}, people={t['people_affected']}")
    print("  PASS")


def test_6_traffic_status():
    separator("TEST 6: Traffic Congestion Report")
    from backend.services.optimization_service import get_traffic_status

    report = get_traffic_status()

    assert "status"          in report, "Report missing status"
    assert "total_edges"     in report, "Report missing total_edges"
    assert "congested_edges" in report, "Report missing congested_edges"
    assert "gridlock_detected" in report, "Report missing gridlock_detected"

    print(f"  Traffic status: {report['status']}")
    print(f"  Total edges: {report['total_edges']}")
    print(f"  Congested: {report['congested_edges']}")
    print(f"  Gridlock: {report['gridlock_detected']}")
    print("  PASS")


def test_7_full_orchestration():
    separator("TEST 7: Full LangGraph Agent Pipeline")
    from ai_agents.orchestrator.langgraph_flow import OrchestratorFlow

    flow = OrchestratorFlow()
    result = flow.start_disaster_session("flood")

    assert result.get("status") == "completed",        "Orchestration did not complete"
    assert "session_id"         in result,             "No session_id returned"
    assert "summary"            in result,             "No explanation summary"
    assert result.get("routes_calculated", 0) > 0,    "No routes calculated"
    assert result.get("rescues_ranked", 0) > 0,       "No rescues ranked"

    print(f"  Session: {result['session_id']}")
    print(f"  Routes calculated: {result['routes_calculated']}")
    print(f"  Rescues ranked: {result['rescues_ranked']}")
    print(f"  Traffic: {result['traffic_status']}")
    print(f"\n  EXPLANATION:")
    print(f"  {result['summary']}")
    print("  PASS")


if __name__ == "__main__":
    tests = [
        test_1_sample_graph,
        test_2_disaster_graph_update,
        test_3_evacuation_routes,
        test_4_ambulance_dispatch,
        test_5_rescue_priority,
        test_6_traffic_status,
        test_7_full_orchestration,
    ]

    passed = 0
    failed = 0

    print("\n" + "="*55)
    print("  CIVIC AUTOPILOT — INTEGRATION TEST SUITE")
    print("="*55)

    for test_fn in tests:
        try:
            test_fn()
            passed += 1
        except Exception as e:
            print(f"  FAIL: {e}")
            import traceback
            traceback.print_exc()
            failed += 1

    separator(f"RESULTS: {passed} passed / {failed} failed")
    sys.exit(0 if failed == 0 else 1)
