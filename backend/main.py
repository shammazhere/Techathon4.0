from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ai_agents.orchestrator.langgraph_flow import orchestrator

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

@app.post("/disaster/start")
async def start_disaster():
    result = orchestrator.start_disaster_session("flood")

    message = {
        "type": "disaster_started",
        "message": "Disaster session started successfully",
        "session_id": result["session_id"],
        "status": result["status"],
        "agent": result["agent"],
        "disaster_type": result["disaster_type"]
    }

    disconnected = []

    for connection in active_connections:
        try:
            await connection.send_json(message)
        except Exception:
            disconnected.append(connection)

    for connection in disconnected:
        if connection in active_connections:
            active_connections.remove(connection)

    return message

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