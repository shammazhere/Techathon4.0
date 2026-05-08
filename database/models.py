"""
Database Models — SQLite-Backed Persistent Storage
=====================================================

Upgraded from in-memory dict to SQLite so sessions survive restarts.

Uses Python's built-in sqlite3 (zero dependencies).
DB file: civic_autopilot.db (created automatically in project root)

Supabase config in config.py is preserved for when you want
cloud persistence — this SQLite layer is the local fallback.
"""

import sqlite3
import json
import os
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Any
from datetime import datetime


# DB file lives next to the project root
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "civic_autopilot.db")


@dataclass
class DisasterSession:
    session_id: str
    disaster_type: str
    status: str
    agent: str
    risk_zones: List[Dict]
    city: str = "Kochi"
    severity: str = "HIGH"
    routes_calculated: int = 0
    ambulances_dispatched: int = 0
    rescues_ranked: int = 0
    explanation: str = ""
    created_at: str = ""

    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now().isoformat()


class Database:
    """
    SQLite-backed database with dict-compatible API.

    All existing code that calls db.save_session() and db.get_session()
    works exactly the same — but now data persists to disk.
    """

    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """Create tables if they don't exist."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS disaster_sessions (
                session_id TEXT PRIMARY KEY,
                disaster_type TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                agent TEXT DEFAULT '',
                city TEXT DEFAULT 'Kochi',
                severity TEXT DEFAULT 'HIGH',
                risk_zones TEXT DEFAULT '[]',
                routes_calculated INTEGER DEFAULT 0,
                ambulances_dispatched INTEGER DEFAULT 0,
                rescues_ranked INTEGER DEFAULT 0,
                explanation TEXT DEFAULT '',
                created_at TEXT NOT NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS agent_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                agent_name TEXT DEFAULT '',
                payload TEXT DEFAULT '{}',
                created_at TEXT NOT NULL,
                FOREIGN KEY (session_id) REFERENCES disaster_sessions(session_id)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS reroute_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                resource_id TEXT NOT NULL,
                incident_id TEXT NOT NULL,
                tick INTEGER DEFAULT 0,
                old_path TEXT DEFAULT '[]',
                new_path TEXT DEFAULT '[]',
                reason TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                FOREIGN KEY (session_id) REFERENCES disaster_sessions(session_id)
            )
        """)

        conn.commit()
        conn.close()

    # -----------------------------------------------------------------------
    # Session CRUD
    # -----------------------------------------------------------------------
    def save_session(self, session: DisasterSession) -> str:
        """Save or update a disaster session."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            INSERT OR REPLACE INTO disaster_sessions 
            (session_id, disaster_type, status, agent, city, severity,
             risk_zones, routes_calculated, ambulances_dispatched,
             rescues_ranked, explanation, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            session.session_id,
            session.disaster_type,
            session.status,
            session.agent,
            session.city,
            session.severity,
            json.dumps(session.risk_zones),
            session.routes_calculated,
            session.ambulances_dispatched,
            session.rescues_ranked,
            session.explanation,
            session.created_at,
        ))

        conn.commit()
        conn.close()
        return f"Saved session {session.session_id}"

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a session by ID."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM disaster_sessions WHERE session_id = ?", (session_id,))
        row = cursor.fetchone()
        conn.close()

        if row is None:
            return None

        result = dict(row)
        result["risk_zones"] = json.loads(result.get("risk_zones", "[]"))
        return result

    def get_all_sessions(self) -> List[Dict[str, Any]]:
        """Retrieve all sessions, newest first."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM disaster_sessions ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()

        results = []
        for row in rows:
            r = dict(row)
            r["risk_zones"] = json.loads(r.get("risk_zones", "[]"))
            results.append(r)
        return results

    def update_session_status(self, session_id: str, status: str) -> bool:
        """Update just the status of a session."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE disaster_sessions SET status = ? WHERE session_id = ?",
            (status, session_id)
        )
        updated = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return updated

    # -----------------------------------------------------------------------
    # Agent Event Log
    # -----------------------------------------------------------------------
    def log_agent_event(
        self,
        session_id: str,
        event_type: str,
        agent_name: str = "",
        payload: Dict = None,
    ) -> int:
        """Log an agent event (dispatch, reroute, arrival, etc.)"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO agent_events (session_id, event_type, agent_name, payload, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (
            session_id,
            event_type,
            agent_name,
            json.dumps(payload or {}),
            datetime.now().isoformat(),
        ))

        event_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return event_id

    def get_session_events(self, session_id: str) -> List[Dict[str, Any]]:
        """Get all events for a session."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM agent_events WHERE session_id = ? ORDER BY id",
            (session_id,)
        )
        rows = cursor.fetchall()
        conn.close()

        results = []
        for row in rows:
            r = dict(row)
            r["payload"] = json.loads(r.get("payload", "{}"))
            results.append(r)
        return results

    # -----------------------------------------------------------------------
    # Reroute Log
    # -----------------------------------------------------------------------
    def log_reroute(
        self,
        session_id: str,
        resource_id: str,
        incident_id: str,
        tick: int,
        old_path: List = None,
        new_path: List = None,
        reason: str = "",
    ) -> int:
        """Log a reroute event for audit trail."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO reroute_log 
            (session_id, resource_id, incident_id, tick, old_path, new_path, reason, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            session_id, resource_id, incident_id, tick,
            json.dumps(old_path or []),
            json.dumps(new_path or []),
            reason,
            datetime.now().isoformat(),
        ))

        reroute_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return reroute_id

    # -----------------------------------------------------------------------
    # Stats
    # -----------------------------------------------------------------------
    def get_stats(self) -> Dict[str, Any]:
        """Dashboard stats."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM disaster_sessions")
        total_sessions = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM agent_events")
        total_events = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM reroute_log")
        total_reroutes = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM disaster_sessions WHERE status = 'active'")
        active_sessions = cursor.fetchone()[0]

        conn.close()

        return {
            "total_sessions": total_sessions,
            "active_sessions": active_sessions,
            "total_agent_events": total_events,
            "total_reroutes": total_reroutes,
            "db_path": self.db_path,
        }


# Global database instance
db = Database()