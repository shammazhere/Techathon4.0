"""
Event Dispatcher
================

Central pub/sub bus for the backend.
Agents dispatch events here, and `main.py` wires this
to the WebSocket `ConnectionManager` to broadcast to the UI.
"""

from typing import Callable, List, Dict, Any

class EventDispatcher:
    def __init__(self):
        self.events: List[Dict[str, Any]] = []
        self._callbacks: List[Callable] = []

    def register_callback(self, callback: Callable):
        """Register a function to be called on every new event."""
        self._callbacks.append(callback)

    def dispatch(self, event_type: str, payload: Any) -> Dict[str, Any]:
        """Record the event and notify all listeners (WebSockets)."""
        event = {
            "type": event_type,  # Changed to "type" for standard WS schema
            "payload": payload
        }
        self.events.append(event)
        
        # Fire callbacks
        for cb in self._callbacks:
            try:
                cb(event)
            except Exception as e:
                print(f"Error in event callback: {e}")
                
        return event

# Global singleton
event_dispatcher = EventDispatcher()