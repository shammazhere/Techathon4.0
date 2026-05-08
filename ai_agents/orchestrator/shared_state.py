from typing import Any, Dict, List, Optional


class SharedState:
    def __init__(self):
        self.state: Dict[str, Any] = {
            "disaster": {},
            "routes": [],
            "resources": [],
            "rescues": [],
            "traffic": {},
            "explanations": [],
            "events": []
        }

    def get_state(self) -> Dict[str, Any]:
        return self.state

    def update_disaster(self, disaster_data: Dict[str, Any]) -> None:
        self.state["disaster"] = disaster_data

    def update_routes(self, routes: List[Dict[str, Any]]) -> None:
        self.state["routes"] = routes

    def update_resources(self, resources: List[Dict[str, Any]]) -> None:
        self.state["resources"] = resources

    def update_rescues(self, rescues: List[Dict[str, Any]]) -> None:
        self.state["rescues"] = rescues

    def update_traffic(self, traffic_data: Dict[str, Any]) -> None:
        self.state["traffic"] = traffic_data

    def add_explanation(self, explanation: str) -> None:
        self.state["explanations"].append(explanation)

    def add_event(self, event: Dict[str, Any]) -> None:
        self.state["events"].append(event)

    def get_latest_event(self) -> Optional[Dict[str, Any]]:
        if not self.state["events"]:
            return None
        return self.state["events"][-1]