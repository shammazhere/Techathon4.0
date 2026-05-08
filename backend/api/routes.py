from fastapi import APIRouter
from backend.api.disaster_api import router as disaster_router

router = APIRouter()

@router.get("/")
def root():
    return {
        "message": "Civic Autopilot backend is running",
        "module": "PERSON 3 - System Orchestration Engineer",
        "status": "ok"
    }

@router.get("/health")
def health():
    return {
        "service": "backend",
        "status": "healthy"
    }

router.include_router(disaster_router)