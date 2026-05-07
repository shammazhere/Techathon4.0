from database.models import db, DisasterSession

class SharedState:
    def __init__(self):
        self.global_sessions = {}

    def save_orchestrator_session(self, session_data):
        session = DisasterSession(
            session_id=session_data["session_id"],
            disaster_type=session_data["disaster_type"],
            status=session_data["status"],
            agent=session_data["agent"],
            risk_zones=[]
        )
        db.save_session(session)
        self.global_sessions[session.session_id] = session
        return f"Session {session.session_id} persisted"

shared_state = SharedState()