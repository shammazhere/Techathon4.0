class EventDispatcher:
    def __init__(self):
        self.events = []

    def dispatch(self, event_type, payload):
        event = {
            "event_type": event_type,
            "payload": payload
        }
        self.events.append(event)
        return event

event_dispatcher = EventDispatcher()