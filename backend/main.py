"""
Civic Autopilot - Main FastAPI Backend
======================================

Orchestrates the entire backend pipeline: HTTP APIs,
WebSocket broadcasts, LangGraph agents, and Optimization Engines.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json

from backend.services.simulation_service import simulation_service
from ai_agents.orchestrator.langgraph_flow import OrchestratorFlow
from backend.websocket.socket_manager import manager
from ai_agents.orchestrator.event_dispatcher import event_dispatcher

app = FastAPI(title="Civic Autopilot Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global orchestrator instance
orchestrator = OrchestratorFlow()

@app.on_event("startup")
async def startup_event():
    """Wire EventDispatcher to WebSocket Broadcast on startup."""
    def _broadcast_event(event_data):
        # Fire-and-forget broadcast
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(manager.broadcast(event_data))
        except RuntimeError:
            pass  # Not running in event loop
            
    # Whenever an agent finishes a task, push to frontend!
    event_dispatcher.register_callback(_broadcast_event)
    print("WebSocket broadcast connected to EventDispatcher.")


@app.get("/")
def root():
    return {"message": "Civic Autopilot Backend Running!"}


@app.get("/health")
def health():
    return {"status": "healthy", "agents": "ready", "database": "sqlite_connected"}


# ---------------------------------------------------------------------------
# API: Disaster Simulation & Orchestration
# ---------------------------------------------------------------------------

@app.get("/api/disaster/start")
def start_disaster(type: str = "flood", city: str = "Kochi"):
    """Initialize a disaster without running agents (mostly for testing)."""
    return simulation_service.start_disaster(disaster_type=type, city=city)


@app.get("/api/disaster/status")
def get_status():
    return simulation_service.get_disaster_status()


@app.post("/disaster/start")
async def start_disaster_orchestrated(type: str = "flood"):
    """
    THE MAIN ENTRY POINT.
    1. Triggers the disaster in the simulation.
    2. Runs the full 6-agent LangGraph pipeline.
    3. Broadcasts results to WebSockets.
    """
    try:
        # Calls the updated simulation_service method which triggers OrchestratorFlow
        result = simulation_service.start_full_orchestration(disaster_type=type)
        return {"status": "success", "data": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ---------------------------------------------------------------------------
# API: Live Rerouting & Movement Tracking
# ---------------------------------------------------------------------------

@app.post("/api/reroute/start_tracking")
def start_tracking():
    """Start tracking active ambulances post-dispatch."""
    from backend.services.optimization_service import start_live_tracking
    return start_live_tracking()


@app.post("/api/reroute/tick")
def reroute_tick():
    """Advance all ambulances by one node and check for reroutes."""
    from backend.services.optimization_service import tick_simulation
    result = tick_simulation()
    
    # Broadcast tick to WebSockets
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(manager.broadcast({
            "type": "live_tracking_tick",
            "data": result
        }))
    except RuntimeError:
        pass
        
    return result


@app.post("/api/reroute/block_road")
def block_road(node_u: int, node_v: int):
    """Dynamically block a road mid-transit to force a reroute."""
    from backend.services.optimization_service import block_road_midtransit
    result = block_road_midtransit(node_u, node_v)
    
    # Broadcast hazard to WebSockets
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(manager.broadcast({
            "type": "hazard_detected",
            "data": result
        }))
    except RuntimeError:
        pass
        
    return result


# ---------------------------------------------------------------------------
# API: Simulation State (Resources & Risk)
# ---------------------------------------------------------------------------

@app.get("/api/simulation/resources")
def get_simulation_resources():
    """Get the current state of all hospitals, shelters, and ambulances."""
    from backend.services.optimization_service import (
        get_hospital_status, get_shelter_status
    )
    from backend.services.resource_simulator import resource_simulator
    live_data = resource_simulator.get_live_resources()
    
    return {
        "hospitals": get_hospital_status()["hospitals"],
        "shelters": get_shelter_status()["shelters"],
        "units": live_data["ambulances"]
    }


@app.get("/api/simulation/risk_cells")
def get_risk_cells():
    """Get current risk levels for different city zones."""
    from backend.services.optimization_service import get_city_graph
    graph = get_city_graph()
    
    # Group nodes by proximity to center points for "Zones"
    zones = [
        {"id": "z1", "name": "Zone A (Fort Kochi)", "coords": (9.9712, 76.2425)},
        {"id": "z2", "name": "Zone B (Thevara)", "coords": (9.9601, 76.2676)},
        {"id": "z3", "name": "Zone C (Ernakulam)", "coords": (9.9750, 76.2850)},
    ]
    
    results = []
    for zone in zones:
        # Find edges near this zone and average their risk
        risk_sum = 0
        count = 0
        for u, v, d in graph.edges(data=True):
            risk_sum += d.get("disaster_risk", 0)
            count += 1
        
        avg_risk = (risk_sum / count) * 100 if count > 0 else 0
        results.append({
            "id": zone["id"],
            "zone": zone["name"],
            "floodRisk": round(avg_risk, 1),
            "fireRisk": 0.0,
            "seismicRisk": 0.0,
            "overallRisk": round(avg_risk, 1),
            "roadBlocked": avg_risk > 50,
            "population": 15000 + (count * 100),
            "elderlyDensity": 0.15 + (avg_risk / 1000),
            "status": "critical" if avg_risk > 70 else "warning" if avg_risk > 30 else "stable"
        })
    
    return results


# ---------------------------------------------------------------------------
# WebSockets
# ---------------------------------------------------------------------------

@app.websocket("/ws/disaster")
async def websocket_disaster(websocket: WebSocket):
    """
    Frontend connects here to receive live map updates,
    agent decisions, and ambulance movements.
    """
    await manager.connect(websocket)
    try:
        while True:
            # Wait for any client messages (mostly ping/pong)
            data = await websocket.receive_text()
            await manager.send_personal_message({
                "type": "ack",
                "message": "received"
            }, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
