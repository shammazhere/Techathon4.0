# import uuid

# class SimulationService:
#     def __init__(self):
#         self.active_sessions = {}

#     def start_flood(self, city="Bangalore"):
#         session_id = f"flood_{uuid.uuid4().hex[:8]}"
#         flood_data = {
#             "type": "flood",
#             "session_id": session_id,
#             "center": [12.9716, 77.5946],  # Bangalore
#             "radius_km": 6.8,
#             "affected_roads": 42,
#         # LIVE BANGALORE PLACES (OpenStreetMap data)
#             "blocked_areas": ["MG Road", "Brigade Road", "Church Street"],
#             "hospitals_overload": [
#                 {"name": "Manipal Hospital", "lat": 12.9845, "lng": 77.6028, "overload": 85},
#                 {"name": "Narayana Health", "lat": 12.9241, "lng": 77.4980, "overload": 92},
#                 {"name": "Fortis Hospital", "lat": 12.9267, "lng": 77.6011, "overload": 78}
#             ],
#             "shelters_open": [
#                 {"name": "Kanteerava Stadium", "lat": 12.9784, "lng": 77.5929, "capacity": 5000},
#                 {"name": "UB City Mall", "lat": 12.9698, "lng": 77.5961, "capacity": 2000}
#             ],
#             "ambulances_moving": 17,
#             "timestamp": "2026-05-08T23:54:00Z",
#             "severity": "CRITICAL"
#         }
#         self.active_sessions[session_id] = flood_data
#         return flood_data

#     def get_disaster_status(self, session_id="default"):
#         """Current disaster state"""
#         if session_id in self.active_sessions:
#             return self.active_sessions[session_id]
        
#         # Default active flood
#         default_status = {
#             "session_id": "default",
#             "active": True,
#             "type": "flood",
#             "severity": "HIGH",
#             "evac_needed": 45000,
#             "hospitals_overload": 4,
#             "timestamp": "2026-05-08T11:48:00Z"
#         }
#         self.active_sessions[session_id] = default_status
#         return default_status

#     def start_session(self, disaster_type="flood"):
#         """Full session start (orchestrator calls this)"""
#         session_id = f"{disaster_type}_{uuid.uuid4().hex[:8]}"
#         session_data = {
#             "session_id": session_id,
#             "disaster_type": disaster_type,
#             "status": "active",
#             "risk_level": "HIGH",
#             "affected_zones": [f"Zone-{i}" for i in range(1, 6)],
#             "started_at": "2026-05-08T11:48:00Z"
#         }
#         self.active_sessions[session_id] = session_data
#         print(f"🚀 Session started: {session_id}")  # Hackathon debug
#         return session_data

#     def update_risk_zones(self, session_id, zones):
#         """GIS team sends updates here"""
#         if session_id in self.active_sessions:
#             self.active_sessions[session_id]["risk_zones"] = zones
#             return {"status": "updated", "zone_count": len(zones)}
#         return {"error": "Session not found"}
    
    
# # Global instance
# simulation_service = SimulationService()
import uuid
from datetime import datetime
# from ai_agents.orchestrator.langgraph_flow import orchestrator
try:
    from ai_agents.orchestrator.langgraph_flow import orchestrator
    from backend.websocket.socket_manager import manager
except ImportError as e:
    print(f"Import error: {e}")
    orchestrator = None
    manager = None
from backend.websocket.socket_manager import manager
#remove
# DEBUG - remove after working
print("Testing imports...")
try:
    import ai_agents.orchestrator.langgraph_flow
    print("✅ ai_agents OK")
except:
    print("❌ ai_agents FAIL")

try:
    import backend.websocket.socket_manager
    print("✅ websocket OK")
except:
    print("❌ websocket FAIL")
class SimulationService:
    def __init__(self):
        self.active_sessions = {}

    def start_disaster(self, disaster_type="flood", city="Kochi"):
        """Unified disaster starter - Kochi + Wayanad ONLY"""
        session_id = f"{disaster_type}_{uuid.uuid4().hex[:8]}"
        
        if disaster_type == "flood":
            return self.start_flood(city)
        elif disaster_type == "wildfire":
            return self.start_wildfire(city)
        else:
            return {"error": f"Unknown disaster: {disaster_type}"}

    def start_flood(self, city="Kochi"):
        session_id = f"flood_{uuid.uuid4().hex[:8]}"
        flood_data = {
            "type": "flood",
            "session_id": session_id,
            "city": "Kochi Waterfront",
            "center": [9.9601, 76.2676],     # Thevara Canal mouth
            "radius_km": 1.0,                # ~1000m flood radius
            "peak_water_m": 3.00,
            "flooded_nodes": 579,
            "blocked_roads": 587,
            "blocked_areas": ["Thevara Canal mouth", "Mattancherry waterfront", "Willingdon Island"],
            "hospitals_overload": [
                {"name": "Lakeshore Hospital", "lat": 9.9645, "lng": 76.3002, "overload": 89},
                {"name": "Amrita Hospital", "lat": 9.9333, "lng": 76.3431, "overload": 76}
            ],
            "shelters_open": [
                {"name": "Marine Drive Ground", "lat": 9.9712, "lng": 76.2729, "capacity": 8000},
                {"name": "Fort Kochi Ferry Terminal", "lat": 9.9683, "lng": 76.2425, "capacity": 3000}
            ],
            "ambulances_moving": 17,
            "timestamp": datetime.now().isoformat(),
            "severity": "CRITICAL"
        }
        self.active_sessions[session_id] = flood_data
        print(f"🌊 Kochi Flood started: {session_id}")
        return flood_data

    def start_wildfire(self, city="Wayanad"):
        session_id = f"wildfire_{uuid.uuid4().hex[:8]}"
        wildfire_data = {
            "type": "wildfire",
            "session_id": session_id,
            "city": "Wayanad Forest",
            "center": [11.6833, 76.0833],  # Wayanad Western Ghats
            "burn_radius_km": 2.5,
            "wind_speed": "15kmh NW",
            "affected_areas": ["Western Ghats", "Tea plantations", "Forest roads"],
            "hospitals_overload": [
                {"name": "Wayanad District Hospital", "lat": 11.6500, "lng": 76.0800, "overload": 65}
            ],
            "shelters_open": [
                {"name": "Wayanad Wildlife Sanctuary", "lat": 11.6500, "lng": 76.0833, "capacity": 10000},
                {"name": "Government School Kalpetta", "lat": 11.6056, "lng": 76.0828, "capacity": 2000}
            ],
            "fire_trucks_needed": 12,
            "timestamp": datetime.now().isoformat(),
            "severity": "EXTREME"
        }
        self.active_sessions[session_id] = wildfire_data
        print(f"🔥 Wayanad Wildfire started: {session_id}")
        return wildfire_data

    def get_disaster_status(self, session_id="default"):
        """Current disaster state"""
        if session_id in self.active_sessions:
            return self.active_sessions[session_id]
        
        # Default Kochi flood
        default_status = {
            "session_id": "default",
            "active": True,
            "type": "flood",
            "city": "Kochi Waterfront",
            "severity": "CRITICAL",
            "evac_needed": 25000,
            "hospitals_overload": 2,
            "timestamp": datetime.now().isoformat()
        }
        self.active_sessions[session_id] = default_status
        return default_status

    def start_session(self, disaster_type="flood"):
        """Full session start (orchestrator calls this)"""
        session_id = f"{disaster_type}_{uuid.uuid4().hex[:8]}"
        cities = {"flood": "Kochi Waterfront", "wildfire": "Wayanad Forest"}
        session_data = {
            "session_id": session_id,
            "disaster_type": disaster_type,
            "city": cities.get(disaster_type, "Kerala"),
            "status": "active",
            "risk_level": "HIGH",
            "affected_zones": [f"Zone-{i}" for i in range(1, 6)],
            "started_at": datetime.now().isoformat()
        }
        self.active_sessions[session_id] = session_data
        print(f"🚀 Session started: {session_id} ({session_data['city']})")
        return session_data

    def update_risk_zones(self, session_id, zones):
        """GIS team sends updates here"""
        if session_id in self.active_sessions:
            self.active_sessions[session_id]["risk_zones"] = zones
            return {"status": "updated", "zone_count": len(zones)}
        return {"error": "Session not found"}
    
    # Add to end of SimulationService class (before global instance)
# from ai_agents.orchestrator.langgraph_flow import orchestrator
    def start_full_orchestration(self, disaster_type: str = "flood"):
        """Controller calls this - SimPy + LangGraph + WebSocket"""
    
    # 1. Start simulation (your existing code)
        sim_data = self.start_disaster(disaster_type)
        session_id = sim_data["session_id"]
    
    # 2. RUN LANGGRAPH AGENTS
        agent_state = {
            "disaster": sim_data,
            "routes": [], "resources": [], "rescues": [], 
            "traffic": {}, "explanations": [], "events": []
        }
        agents_result = orchestrator.graph.invoke(agent_state)
    
    # 3. WebSocket broadcast (import manager)
        from backend.websocket.socket_manager import manager
        broadcast_data = {
            "status": "orchestrated",
            "simulation": sim_data,
            "agents": agents_result,
            "session_id": session_id
        }
        manager.broadcast(broadcast_data)  # Live to frontend!
    
        print(f"🤖 FULL ORCHESTRATION COMPLETE: {session_id}")
        return {
            **sim_data,
            "agents_status": "completed",
            "agent_decisions": agents_result
        }
# Global instance
simulation_service = SimulationService()