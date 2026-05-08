import random
from typing import List, Dict, Any
from shared.sample_graph import SIMULATED_AMBULANCES, SIMULATED_HOSPITALS, SIMULATED_SHELTERS

class ResourceSimulator:
    """
    Manages the operational state of emergency resources.
    Simulates:
    - Ambulance positions & movement
    - Hospital occupancy levels
    - Shelter capacity
    """
    
    def __init__(self):
        self.ambulances = [dict(a) for a in SIMULATED_AMBULANCES]
        self.hospitals = [dict(h) for h in SIMULATED_HOSPITALS]
        self.shelters = [dict(s) for s in SIMULATED_SHELTERS]
        
    def get_live_resources(self) -> Dict[str, List[Dict[str, Any]]]:
        """Return the current state of all operational resources."""
        # Add some slight jitter to ambulance positions to simulate movement
        for amb in self.ambulances:
            if amb.get("status") == "moving":
                amb["coords"][0] += random.uniform(-0.0005, 0.0005)
                amb["coords"][1] += random.uniform(-0.0005, 0.0005)
        
        # Simulate hospital occupancy changes
        for hosp in self.hospitals:
            hosp["occupancy"] = min(1.0, hosp.get("occupancy", 0.5) + random.uniform(-0.02, 0.05))
            
        return {
            "ambulances": self.ambulances,
            "hospitals": self.hospitals,
            "shelters": self.shelters
        }

    def update_resource_status(self, resource_id: str, status: str, destination: List[float] = None):
        """Update the status of a specific resource (called by agents)."""
        for amb in self.ambulances:
            if amb["resource_id"] == resource_id:
                amb["status"] = status
                if destination:
                    amb["destination"] = destination
                return True
        return False

resource_simulator = ResourceSimulator()
