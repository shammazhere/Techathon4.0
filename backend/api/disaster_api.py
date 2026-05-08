from fastapi import APIRouter
from backend.controllers.disaster_controller import (
    get_disaster_status_data,
    start_disaster_session_data,
)

router = APIRouter(prefix="/disaster", tags=["Disaster"])

@router.get("/status/{session_id}")
def get_disaster_status(session_id: str):
    return get_disaster_status_data(session_id)

@router.post("/start")
def start_disaster_session():
    return start_disaster_session_data()