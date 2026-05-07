from database.config import supabase

class SimulationService:
    def __init__(self):
        self.active_sessions = {}

    def get_disaster_status(self, session_id: str = "default"):
        if session_id in self.active_sessions:
            return self.active_sessions[session_id]

        try:
            response = supabase.table("disaster_sessions").select("*").eq("id", session_id).execute()

            if response.data and len(response.data) > 0:
                session = response.data[0]
                session_data = {
                    "disaster_type": session["disaster_type"],
                    "session_status": session["session_status"],
                    "risk_level": session["risk_level"],
                    "affected_zones": session["affected_zones"],
                    "session_id": session["id"]
                }
                self.active_sessions[session_id] = session_data
                return session_data

        except Exception as e:
            return {
                "message": "Database read failed",
                "session_id": session_id,
                "error": str(e)
            }

        return {
            "message": "Session not found",
            "session_id": session_id
        }

    def start_session(self, disaster_type: str = "flood"):
        session_id = f"session_{len(self.active_sessions) + 1:03d}"

        session_data = {
            "disaster_type": disaster_type,
            "session_status": "active",
            "risk_level": "high",
            "affected_zones": ["Zone A", "Zone B"],
            "session_id": session_id
        }

        self.active_sessions[session_id] = session_data

        try:
            supabase.table("disaster_sessions").insert({
                "id": session_id,
                "disaster_type": disaster_type,
                "session_status": "active",
                "risk_level": "high",
                "affected_zones": ["Zone A", "Zone B"]
            }).execute()
        except Exception as e:
            session_data["db_warning"] = f"Supabase insert failed: {str(e)}"

        return {
            "message": "Disaster session started successfully",
            "session_id": session_id,
            "status": "running"
        }

simulation_service = SimulationService()