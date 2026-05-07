import uuid

class Orchestrator:
    def __init__(self):
        self.active_sessions = {}

    def start_disaster_session(self, disaster_type: str):
        session_id = str(uuid.uuid4())[:8]

        result = {
            "session_id": session_id,
            "disaster_type": disaster_type,
            "status": "started",
            "agent": "disaster-agent",
            "message": f"{disaster_type} disaster session started"
        }

        self.active_sessions[session_id] = result
        return result


orchestrator = Orchestrator()