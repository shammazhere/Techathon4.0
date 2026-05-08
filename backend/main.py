from database.config import supabase
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ai_agents.orchestrator.langgraph_flow import orchestrator
import asyncio

app = FastAPI(
    title="Civic Autopilot Backend",
    version="1.0.0"
)

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
    return {"message": "Civic Autopilot Backend Running"}

@app.get("/health")
def health():
    return {"status": "healthy"}


# Add this function
async def broadcast_message(message):
    disconnected = []
    for conn in active_connections[:]:  # Copy list
        try:
            await conn.send_json(message)
        except:
            disconnected.append(conn)
    for conn in disconnected:
        active_connections.remove(conn)

# Update your /disaster/start (replace broadcast part)
@app.post("/disaster/start")
async def start_disaster():
    try:
        result = orchestrator.start_disaster_session("flood")
        
        supabase.table("disaster_sessions").insert({
            "session_id": result.get("session_id"),
            "status": result.get("status", "active"),
            "disaster_type": "flood"
        }).execute()
        
        message = {"type": "disaster_started", "session_id": result.get("session_id")}
        
        # NON-BLOCKING broadcast
        asyncio.create_task(broadcast_message(message))
        
        return message
    except Exception as e:
        return {"error": str(e)}

@app.post("/disaster/start")
async def start_disaster():
    try:
        result = orchestrator.start_disaster_session("flood")
        
        supabase.table("disaster_sessions").insert({
            "session_id": result.get("session_id"),
            "status": result.get("status", "active"),
            "disaster_type": "flood"  # No agent
        }).execute()
        
        message = {"type": "disaster_started", "session_id": result.get("session_id")}
        
        # Broadcast to WebSocket
        for conn in active_connections[:]:
            try:
                await conn.send_json(message)
            except:
                active_connections.remove(conn)
                
        return message
    except Exception as e:
        return {"error": str(e)}

@app.get("/disaster/status/{session_id}")
def get_disaster_status(session_id: str):
    return {
        "session_id": session_id,
        "status": "running"
    }

@app.websocket("/ws/disaster")
async def websocket_disaster_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json(
                {
                    "type": "disaster_update",
                    "message": f"Live update received: {data}",
                    "risk_level": "high"
                }
            )
    except WebSocketDisconnect:
        if websocket in active_connections:
            active_connections.remove(websocket)