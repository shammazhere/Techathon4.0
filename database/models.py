from dataclasses import dataclass
from typing import List, Dict
import json

@dataclass
class DisasterSession:
    session_id: str
    disaster_type: str
    status: str
    agent: str
    risk_zones: List[Dict]
    created_at: str = "now"

class Database:
    def __init__(self):
        self.sessions = {}

    def save_session(self, session: DisasterSession):
        self.sessions[session.session_id] = {
            "session_id": session.session_id,
            "disaster_type": session.disaster_type,
            "status": session.status,
            "agent": session.agent,
            "risk_zones": session.risk_zones,
            "created_at": session.created_at
        }
        return f"Saved session {session.session_id}"

    def get_session(self, session_id: str):
        return self.sessions.get(session_id, None)

# Global database instance
db = Database()