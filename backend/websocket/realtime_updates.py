from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from socket_manager import manager

router = APIRouter()

@router.websocket("/ws/disaster")
async def websocket_disaster_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.send_personal_message(
                {
                    "type": "disaster_update",
                    "message": f"Live update received: {data}",
                    "risk_level": "high"
                },
                websocket
            )
    except WebSocketDisconnect:
        manager.disconnect(websocket)