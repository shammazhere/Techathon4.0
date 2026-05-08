"""
LangGraph Orchestrator — AI Agent Flow
========================================
Person 3: System Orchestration Engineer

Coordinates 6 agents in sequence:
    disaster → route → resource → rescue → traffic → explanation

Each agent now calls Person 2's real optimization engine
via optimization_service.py instead of returning mock data.

The shared city graph (shared/sample_graph.py) is mutated
in-place as agents run — so traffic, risk, and congestion
state cascades naturally from one agent to the next.
"""

from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, END
from .event_dispatcher import event_dispatcher


class AgentState(TypedDict):
# ... (rest of the file remains same, but self.dispatcher must point to the global one)
    disaster: Dict[str, Any]
    routes: List[Dict[str, Any]]
    resources: List[Dict[str, Any]]
    rescues: List[Dict[str, Any]]
    traffic: Dict[str, Any]
    explanations: List[str]
    events: List[Dict[str, Any]]


class OrchestratorFlow:
    def __init__(self):
        self.dispatcher = event_dispatcher
        self.graph = self.build_graph()

    def build_graph(self):
        workflow = StateGraph(AgentState)

        workflow.add_node("disaster",    self.disaster_agent)
        workflow.add_node("route",       self.route_agent)
        workflow.add_node("resource",    self.resource_agent)
        workflow.add_node("rescue",      self.rescue_agent)
        workflow.add_node("traffic",     self.traffic_agent)
        workflow.add_node("explanation", self.explanation_agent)

        workflow.set_entry_point("disaster")
        workflow.add_edge("disaster",    "route")
        workflow.add_edge("route",       "resource")
        workflow.add_edge("resource",    "rescue")
        workflow.add_edge("rescue",      "traffic")
        workflow.add_edge("traffic",     "explanation")
        workflow.add_edge("explanation", END)

        return workflow.compile()

    # -----------------------------------------------------------------------
    # Agent 1: Disaster Agent
    # Applies the disaster to the city graph (updates edge risk values)
    # -----------------------------------------------------------------------
    def disaster_agent(self, state: AgentState) -> Dict[str, Any]:
        print("[DisasterAgent] Applying disaster to city graph...")
        try:
            from backend.services.optimization_service import apply_disaster_to_graph
            disaster_data = state.get("disaster", {})
            result = apply_disaster_to_graph(disaster_data)
            print(f"[DisasterAgent] Graph updated: {result.get('edges_with_risk_updated', 0)} edges marked as risky")
            updated_disaster = {**disaster_data, **result}
        except Exception as e:
            print(f"[DisasterAgent] Error: {e} — using raw disaster data")
            updated_disaster = state.get("disaster", {})

        self.dispatcher.dispatch("disaster_updated", updated_disaster)
        return {"disaster": updated_disaster}

    # -----------------------------------------------------------------------
    # Agent 2: Route Agent
    # Calculates safest evacuation routes from incident zones to shelters
    # -----------------------------------------------------------------------
    def route_agent(self, state: AgentState) -> Dict[str, Any]:
        print("[RouteAgent] Calculating safe evacuation routes via A*...")
        try:
            from backend.services.optimization_service import calculate_evacuation_routes
            routes = calculate_evacuation_routes()
            print(f"[RouteAgent] Found {len(routes)} evacuation routes")
        except Exception as e:
            print(f"[RouteAgent] Error: {e} — returning empty routes")
            routes = []

        self.dispatcher.dispatch("routes_updated", routes)
        return {"routes": routes}

    # -----------------------------------------------------------------------
    # Agent 3: Resource Agent
    # Dispatches ambulances to incidents using greedy nearest-first algorithm
    # -----------------------------------------------------------------------
    def resource_agent(self, state: AgentState) -> Dict[str, Any]:
        print("[ResourceAgent] Dispatching ambulances to incidents...")
        try:
            from backend.services.optimization_service import (
                dispatch_resources,
                get_hospital_status,
                get_shelter_status,
            )
            assignments = dispatch_resources()
            hospital_status = get_hospital_status()
            shelter_status = get_shelter_status()

            resources = {
                "assignments": assignments,
                "hospitals": hospital_status,
                "shelters": shelter_status,
                "total_dispatched": len(assignments),
            }
            print(f"[ResourceAgent] Dispatched {len(assignments)} ambulances")
        except Exception as e:
            print(f"[ResourceAgent] Error: {e} — returning empty resources")
            resources = {"assignments": [], "hospitals": {}, "shelters": {}, "total_dispatched": 0}

        self.dispatcher.dispatch("resources_updated", resources)
        return {"resources": [resources]}

    # -----------------------------------------------------------------------
    # Agent 4: Rescue Agent
    # Prioritizes all active incidents by urgency score
    # -----------------------------------------------------------------------
    def rescue_agent(self, state: AgentState) -> Dict[str, Any]:
        print("[RescueAgent] Scoring and prioritizing rescue operations...")
        try:
            from backend.services.optimization_service import prioritize_rescues
            rescue_tasks = prioritize_rescues()
            print(f"[RescueAgent] Ranked {len(rescue_tasks)} incidents by urgency")
        except Exception as e:
            print(f"[RescueAgent] Error: {e} — returning empty rescues")
            rescue_tasks = []

        self.dispatcher.dispatch("rescues_updated", rescue_tasks)
        return {"rescues": rescue_tasks}

    # -----------------------------------------------------------------------
    # Agent 5: Traffic Agent
    # Reads the city graph's congestion state after all dispatches
    # -----------------------------------------------------------------------
    def traffic_agent(self, state: AgentState) -> Dict[str, Any]:
        print("[TrafficAgent] Analyzing city-wide congestion...")
        try:
            from backend.services.optimization_service import get_traffic_status
            traffic_data = get_traffic_status()
            print(f"[TrafficAgent] Traffic status: {traffic_data.get('status', 'unknown')}, "
                  f"congested edges: {traffic_data.get('congested_edges', 0)}")
        except Exception as e:
            print(f"[TrafficAgent] Error: {e} — returning empty traffic data")
            traffic_data = {"status": "unknown", "blocked_roads": [], "congestion": {}}

        self.dispatcher.dispatch("traffic_updated", traffic_data)
        return {"traffic": traffic_data}

    # -----------------------------------------------------------------------
    # Agent 6: Explanation Agent
    # Synthesizes all agent outputs into a human-readable summary
    # (LLM-free for now — templates. LLM call can be added here later.)
    # -----------------------------------------------------------------------
    def explanation_agent(self, state: AgentState) -> Dict[str, Any]:
        print("[ExplanationAgent] Generating human-readable summary...")

        disaster  = state.get("disaster", {})
        routes    = state.get("routes", [])
        resources = state.get("resources", [{}])
        rescues   = state.get("rescues", [])
        traffic   = state.get("traffic", {})

        # Pull key numbers safely
        res_data = resources[0] if resources else {}
        dispatched    = res_data.get("total_dispatched", 0)
        route_count   = len(routes)
        rescue_count  = len(rescues)
        traffic_status = traffic.get("status", "unknown")
        congested_edges = traffic.get("congested_edges", 0)
        disaster_type = disaster.get("type", "disaster").upper()
        risk_edges    = disaster.get("edges_with_risk_updated", 0)

        # Hospital alerts
        hosp_data = res_data.get("hospitals", {})
        overloaded = hosp_data.get("total_overloaded", 0)

        # Shelter data
        shelter_data = res_data.get("shelters", {})
        shelter_remaining = shelter_data.get("total_remaining", 0)

        # Top rescue priority
        top_rescue = ""
        if rescues:
            top = rescues[0]
            top_rescue = (f" Highest priority: Incident {top.get('incident_id')} "
                         f"({top.get('urgency_level','unknown')} — "
                         f"{top.get('people_affected',0)} people affected).")

        explanation = (
            f"CIVIC AUTOPILOT ACTIVATED — {disaster_type} RESPONSE: "
            f"{risk_edges} road segments flagged as high-risk. "
            f"{dispatched} ambulances dispatched to {rescue_count} active incidents. "
            f"{route_count} safe evacuation routes calculated via A* pathfinding. "
            f"Traffic status: {traffic_status} ({congested_edges} congested edges). "
            f"{overloaded} hospital(s) at critical capacity — rerouting patients. "
            f"{shelter_remaining} shelter spaces remaining across all sites."
            f"{top_rescue}"
        )

        print(f"[ExplanationAgent] Summary generated ({len(explanation)} chars)")
        self.dispatcher.dispatch("explanation_generated", explanation)
        return {"explanations": [explanation]}

    # -----------------------------------------------------------------------
    # Public API
    # -----------------------------------------------------------------------
    def run_orchestration(self):
        initial_state: AgentState = {
            "disaster": {},
            "routes": [],
            "resources": [],
            "rescues": [],
            "traffic": {},
            "explanations": [],
            "events": [],
        }
        return self.graph.invoke(initial_state)

    def start_disaster_session(self, disaster_data: dict):
        """
        Entry point called by simulation_service.py.
        Accepts dynamic disaster data from the optimization engine
        and runs the full agent pipeline.
        """
        disaster_type = disaster_data.get("type", "unknown")
        print(f"[Orchestrator] Starting {disaster_type} disaster session...")

        from shared.sample_graph import reset_city_graph
        reset_city_graph()  # fresh graph for each new session

        initial_state: AgentState = {
            "disaster": disaster_data,
            "routes": [],
            "resources": [],
            "rescues": [],
            "traffic": {},
            "explanations": [],
            "events": [],
        }

        result = self.graph.invoke(initial_state)

        return {
            "session_id": f"session_{disaster_type}_{abs(hash(str(result))) % 10000}",
            "status": "completed",
            "agent": "orchestrator",
            "disaster_type": disaster_type,
            "summary": result.get("explanations", ["No summary generated"])[0],
            "routes_calculated": len(result.get("routes", [])),
            "rescues_ranked": len(result.get("rescues", [])),
            "traffic_status": result.get("traffic", {}).get("status", "unknown"),
        }


if __name__ == "__main__":
    flow = OrchestratorFlow()
    result = flow.run_orchestration()
    print("\n=== ORCHESTRATION RESULT ===")
    print(result.get("explanations", ["No explanation"])[0])

orchestrator = OrchestratorFlow()