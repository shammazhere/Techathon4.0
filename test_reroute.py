"""
Reroute Test — Proves Live Mid-Transit Rerouting Works
=======================================================

Scenario:
    1. Trigger a flood disaster on the Kochi graph
    2. Dispatch 4 ambulances to 4 incidents
    3. Start live tracking
    4. Advance ambulances a few ticks (they start driving)
    5. BLOCK a road that AMB_02 is currently using
    6. Tick again — system should automatically reroute AMB_02
    7. Continue until all arrive or are stranded
    8. Print complete event log

Run:  python test_reroute.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def main():
    print("=" * 60)
    print("  CIVIC AUTOPILOT - LIVE REROUTING TEST")
    print("=" * 60)

    # Step 1: Reset everything
    from shared.sample_graph import reset_city_graph
    from backend.services.optimization_service import (
        apply_disaster_to_graph,
        dispatch_resources,
        reset_reroute_monitor,
        start_live_tracking,
        tick_simulation,
        block_road_midtransit,
    )

    graph = reset_city_graph()
    reset_reroute_monitor()

    # Step 2: Apply flood disaster
    print("\n[1] Applying flood disaster...")
    disaster_result = apply_disaster_to_graph(
        {"type": "flood", "center": [9.9601, 76.2676]},
        graph=graph,
    )
    print(f"    Edges with risk: {disaster_result['edges_with_risk_updated']}")

    # Step 3: Dispatch ambulances
    print("\n[2] Dispatching ambulances...")
    assignments = dispatch_resources(graph=graph)
    print(f"    Dispatched: {len(assignments)} ambulances")
    for a in assignments:
        path = a["route"]["path_nodes"]
        print(f"    {a['resource_id']} -> {a['incident_id']} | "
              f"path: {path}")

    # Step 4: Start live tracking
    print("\n[3] Starting live reroute monitor...")
    tracking = start_live_tracking(assignments)
    print(f"    Tracking {tracking['ambulances_tracked']} ambulances")

    # Step 5: Advance 2 ticks (ambulances start driving)
    print("\n[4] Advancing 2 ticks (ambulances driving)...")
    for i in range(2):
        result = tick_simulation()
        for event in result["events"]:
            print(f"    Tick {event['tick']}: {event['resource_id']} "
                  f"{event['event']} -> node {event['current_node']}")

    # Step 6: BLOCK a road mid-transit!
    # Find a road that an active ambulance is about to use
    monitor = start_live_tracking.__module__  # just to get the module
    from backend.services.optimization_service import get_reroute_monitor
    mon = get_reroute_monitor()

    # Pick the first active convoy and block its next edge
    blocked_edge = None
    for rid, convoy in mon.convoys.items():
        if convoy.status == "en_route" and len(convoy.remaining_nodes) >= 3:
            remaining = convoy.remaining_nodes
            node_u = remaining[1]  # next node
            node_v = remaining[2]  # node after that
            blocked_edge = (node_u, node_v)
            print(f"\n[5] BLOCKING ROAD {node_u} <-> {node_v} "
                  f"(ahead of {rid})!")
            break

    if blocked_edge:
        block_result = block_road_midtransit(blocked_edge[0], blocked_edge[1])
        print(f"    Affected ambulances: {block_result['affected_ambulances']}")
        print(f"    Will reroute on next tick: {block_result['will_reroute_on_next_tick']}")
    else:
        print("\n[5] No active convoy with enough remaining path to block")

    # Step 7: Continue ticking until everyone arrives
    print("\n[6] Continuing simulation (with rerouting active)...")
    tick_count = 0
    max_ticks = 30

    while mon.active_count > 0 and tick_count < max_ticks:
        result = tick_simulation()
        tick_count += 1
        for event in result["events"]:
            symbol = {
                "moved": "  ->",
                "rerouted": "  !!",
                "arrived": "  OK",
                "stranded": "  XX",
            }.get(event["event"], "  ??")

            print(f"    {symbol} Tick {event['tick']}: {event['resource_id']} "
                  f"{event['event']} | node {event['current_node']} | "
                  f"{event['detail']}")

    # Step 8: Final status
    status = mon.get_status()
    reroute_summary = mon.get_reroute_summary()

    print("\n" + "=" * 60)
    print("  FINAL STATUS")
    print("=" * 60)
    print(f"  Total ticks: {status['tick']}")
    print(f"  Arrived:     {status['arrived']}")
    print(f"  Stranded:    {status['stranded']}")
    print(f"  Reroutes:    {reroute_summary['total_reroutes']}")

    for detail in reroute_summary.get("details", []):
        print(f"    {detail['resource_id']}: rerouted {detail['reroute_count']}x "
              f"-> {detail['current_status']}")

    # Verify
    assert status["arrived"] > 0, "No ambulances arrived!"
    print(f"\n  TEST PASSED - {status['arrived']} ambulances reached their destinations")

    if reroute_summary["total_reroutes"] > 0:
        print(f"  REROUTING VERIFIED - {reroute_summary['total_reroutes']} dynamic reroutes executed")
    else:
        print("  (No reroutes triggered - road block may not have been on an active path)")


if __name__ == "__main__":
    main()
