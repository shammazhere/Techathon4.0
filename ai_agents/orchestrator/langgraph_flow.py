# import uuid

# class Orchestrator:
#     def __init__(self):
#         self.active_sessions = {}

#     def start_disaster_session(self, disaster_type: str):
#         session_id = str(uuid.uuid4())[:8]

#         result = {
#             "session_id": session_id,
#             "disaster_type": disaster_type,
#             "status": "started",
#             "agent": "disaster-agent",
#             "message": f"{disaster_type} disaster session started"
#         }

#         self.active_sessions[session_id] = result
#         return result


# orchestrator = Orchestrator()
from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, END
from .event_dispatcher import EventDispatcher


class AgentState(TypedDict):
    disaster: Dict[str, Any]
    routes: List[Dict[str, Any]]
    resources: List[Dict[str, Any]]
    rescues: List[Dict[str, Any]]
    traffic: Dict[str, Any]
    explanations: List[str]
    events: List[Dict[str, Any]]


class OrchestratorFlow:
    def __init__(self):
        self.dispatcher = EventDispatcher()
        self.graph = self.build_graph()

    def build_graph(self):
        workflow = StateGraph(AgentState)

        workflow.add_node("disaster", self.disaster_agent)
        workflow.add_node("route", self.route_agent)
        workflow.add_node("resource", self.resource_agent)
        workflow.add_node("rescue", self.rescue_agent)
        workflow.add_node("traffic", self.traffic_agent)
        workflow.add_node("explanation", self.explanation_agent)

        workflow.set_entry_point("disaster")
        workflow.add_edge("disaster", "route")
        workflow.add_edge("route", "resource")
        workflow.add_edge("resource", "rescue")
        workflow.add_edge("rescue", "traffic")
        workflow.add_edge("traffic", "explanation")
        workflow.add_edge("explanation", END)

        return workflow.compile()

    def disaster_agent(self, state: AgentState) -> Dict[str, Any]:
        print("Disaster agent updating danger zones...")
        disaster_data = {"flood_zones": [], "fire_zones": []}
        self.dispatcher.dispatch("disaster_updated", disaster_data)
        return {
            "disaster": disaster_data
        }

    def route_agent(self, state: AgentState) -> Dict[str, Any]:
        print("Route agent calculating safe evacuation paths...")
        routes = [{"path": [], "priority": "high"}]
        self.dispatcher.dispatch("routes_updated", routes)
        return {
            "routes": routes
        }

    def resource_agent(self, state: AgentState) -> Dict[str, Any]:
        print("Resource agent allocating ambulances and resources...")
        resources = [{"type": "ambulance", "location": [0, 0]}]
        self.dispatcher.dispatch("resources_updated", resources)
        return {
            "resources": resources
        }

    def rescue_agent(self, state: AgentState) -> Dict[str, Any]:
        print("Rescue agent prioritizing operations...")
        rescues = [{"priority": "high", "location": [1, 1]}]
        self.dispatcher.dispatch("rescues_updated", rescues)
        return {
            "rescues": rescues
        }

    def traffic_agent(self, state: AgentState) -> Dict[str, Any]:
        print("Traffic agent updating congestion...")
        traffic_data = {"blocked_roads": [], "congestion": {}}
        self.dispatcher.dispatch("traffic_updated", traffic_data)
        return {
            "traffic": traffic_data
        }

    def explanation_agent(self, state: AgentState) -> Dict[str, Any]:
        print("Explanation agent generating summary...")
        explanation = "System coordinated evacuation, resource allocation, and traffic rerouting."
        self.dispatcher.dispatch("explanation_generated", explanation)
        return {
            "explanations": [explanation]
        }

    def run_orchestration(self):
        initial_state: AgentState = {
            "disaster": {},
            "routes": [],
            "resources": [],
            "rescues": [],
            "traffic": {},
            "explanations": [],
            "events": []
        }
        return self.graph.invoke(initial_state)


if __name__ == "__main__":
    flow = OrchestratorFlow()
    result = flow.run_orchestration()
    print(result)