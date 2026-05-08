# from database.config import supabase
# from fastapi import FastAPI, WebSocket, WebSocketDisconnect
# from fastapi.middleware.cors import CORSMiddleware
# from ai_agents.orchestrator.langgraph_flow import orchestrator
# import asyncio
# # Add these imports at top (after existing imports)
# from services.simulation_service import SimulationService
# from services.routing_service import RoutingService  # We'll fill next
# app = FastAPI(
#     title="Civic Autopilot Backend",
#     version="1.0.0"
# )

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# active_connections = []

# @app.get("/")
# def root():
#     return {"message": "Civic Autopilot Backend Running"}

# @app.get("/health")
# def health():
#     return {"status": "healthy"}

# @app.get("/api/disaster/start")
# def start_disaster():
#     sim = SimulationService()
#     flood_data = sim.start_flood()
#     return {"status": "disaster_active", "data": flood_data}

# @app.get("/api/disaster/status")
# def get_status():
#     sim = SimulationService()
#     return sim.get_disaster_status()

# @app.get("/api/agents/status")
# def agents_status():
#     return {
#         "disaster_agent": "ready",
#         "route_agent": "ready", 
#         "resource_agent": "ready",
#         "rescue_agent": "ready",
#         "traffic_agent": "ready",
#         "explanation_agent": "ready"
#     }
# # Add this function
# async def broadcast_message(message):
#     disconnected = []
#     for conn in active_connections[:]:  # Copy list
#         try:
#             await conn.send_json(message)
#         except:
#             disconnected.append(conn)
#     for conn in disconnected:
#         active_connections.remove(conn)

# # Update your /disaster/start (replace broadcast part)
# @app.post("/disaster/start")
# async def start_disaster():
#     try:
#         result = orchestrator.start_disaster_session("flood")
        
#         supabase.table("disaster_sessions").insert({
#             "session_id": result.get("session_id"),
#             "status": result.get("status", "active"),
#             "disaster_type": "flood"
#         }).execute()
        
#         message = {"type": "disaster_started", "session_id": result.get("session_id")}
        
#         # NON-BLOCKING broadcast
#         asyncio.create_task(broadcast_message(message))
        
#         return message
#     except Exception as e:
#         return {"error": str(e)}

# @app.post("/disaster/start")
# async def start_disaster():
#     try:
#         result = orchestrator.start_disaster_session("flood")
        
#         supabase.table("disaster_sessions").insert({
#             "session_id": result.get("session_id"),
#             "status": result.get("status", "active"),
#             "disaster_type": "flood"  # No agent
#         }).execute()
        
#         message = {"type": "disaster_started", "session_id": result.get("session_id")}
        
#         # Broadcast to WebSocket
#         for conn in active_connections[:]:
#             try:
#                 await conn.send_json(message)
#             except:
#                 active_connections.remove(conn)
                
#         return message
#     except Exception as e:
#         return {"error": str(e)}

# @app.get("/disaster/status/{session_id}")
# def get_disaster_status(session_id: str):
#     return {
#         "session_id": session_id,
#         "status": "running"
#     }

# @app.websocket("/ws/disaster")
# async def websocket_disaster_endpoint(websocket: WebSocket):
#     await websocket.accept()
#     active_connections.append(websocket)
#     try:
#         while True:
#             data = await websocket.receive_text()
#             await websocket.send_json(
#                 {
#                     "type": "disaster_update",
#                     "message": f"Live update received: {data}",
#                     "risk_level": "high"
#                 }
#             )
#     except WebSocketDisconnect:
#         if websocket in active_connections:
#             active_connections.remove(websocket)
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio

# MOCK classes (fixes import errors)
class MockOrchestrator:
    def start_disaster_session(self, disaster_type):
        return {"session_id": f"session_{disaster_type}_123", "status": "active"}

class MockSupabase:
    def table(self, name):
        class MockTable:
            def insert(self, data):
                class MockExecute:
                    def execute(self):
                        return True
                return MockExecute()
        return MockTable()

orchestrator = MockOrchestrator()
supabase = MockSupabase()

# Services
from services.simulation_service import SimulationService

# from backend.services.simulation_service import simulation_service

app = FastAPI(title="Civic Autopilot Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

active_connections = []

@app.get("/")
def root():
    return {"message": "🚀 Civic Autopilot Backend Running!"}

@app.get("/health")
def health():
    return {"status": "healthy", "agents": "ready"}

# @app.get("/api/disaster/start")
# def start_disaster_simple():
#     sim = SimulationService()
#     return {"status": "active", "data": sim.start_flood()}

@app.get("/api/disaster/start")
def start_disaster(type: str = "flood"):
    sim = SimulationService()
    if type == "flood":
        return sim.start_flood()
    elif type == "wildfire":
        return sim.start_wildfire()
    return {"error": "Unknown disaster type"}

@app.get("/api/disaster/status")
def get_status():
    sim = SimulationService()# return sim.get_disaster_status()
    return sim.get_disaster_status()

@app.get("/api/agents/status")
def agents_status():
    return {
        "disaster_agent": "ready",
        "route_agent": "ready", 
        "resource_agent": "ready",
        "rescue_agent": "ready",
        "traffic_agent": "ready",
        "explanation_agent": "ready"
    }

@app.get("/disaster/status/{session_id}")
def get_disaster_status(session_id: str):
    return {"session_id": session_id, "status": "running", "risk_level": "HIGH"}

async def broadcast_message(message):
    disconnected = []
    for conn in active_connections[:]:
        try:
            await conn.send_json(message)
        except:
            disconnected.append(conn)
    for conn in disconnected:
        active_connections.remove(conn)

@app.post("/disaster/start")  # FIXED: Only ONE endpoint
async def start_disaster_orchestrated():
    try:
        result = orchestrator.start_disaster_session("flood")
        supabase.table("disaster_sessions").insert({
            "session_id": result.get("session_id"),
            "status": result.get("status", "active"),
            "disaster_type": "flood"
        }).execute()
        
        message = {"type": "disaster_started", "session_id": result.get("session_id")}
        asyncio.create_task(broadcast_message(message))
        return message
    except Exception as e:
        return {"error": str(e)}

@app.websocket("/ws/disaster")
async def websocket_disaster(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({
                "type": "disaster_update",
                "message": f"Live update: {data}",
                "risk_level": "HIGH"
            })
    except WebSocketDisconnect:
        if websocket in active_connections:
            active_connections.remove(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
