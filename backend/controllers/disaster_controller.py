from backend.services.simulation_service import simulation_service

def get_disaster_status_data(session_id: str = "default"):
    return simulation_service.get_disaster_status(session_id)

def start_disaster_session_data():
    return simulation_service.start_session()

def start_disaster_session_data():
    return simulation_service.start_full_orchestration("flood")  # LangGraph!

def get_disaster_status_data(session_id: str = "default"):
    return simulation_service.get_disaster_status(session_id)