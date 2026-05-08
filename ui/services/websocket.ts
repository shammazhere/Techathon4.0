// ─── WebSocket Service ────────────────────────────────────────────────────────
// Manages WebSocket connection for real-time disaster data feeds.

type MessageHandler = (data: unknown) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private url: string;
  private connected = false;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    if (this.connected || typeof window === "undefined") return;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.connected = true;
        console.log("[WS] Connected to", this.url);
        this.emit("connection", { status: "connected" });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.emit(msg.type || "message", msg.payload || msg);
        } catch {
          this.emit("message", event.data);
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.emit("connection", { status: "disconnected" });
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.connected = false;
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), 5000);
  }

  on(event: string, handler: MessageHandler) {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event)!.push(handler);
  }

  off(event: string, handler: MessageHandler) {
    const list = this.handlers.get(event);
    if (list) this.handlers.set(event, list.filter((h) => h !== handler));
  }

  private emit(event: string, data: unknown) {
    const list = this.handlers.get(event) || [];
    list.forEach((h) => h(data));
  }

  send(type: string, payload: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.connected = false;
  }

  isConnected() {
    return this.connected;
  }
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://127.0.0.1:8000/ws/disaster";
export const wsService = new WebSocketService(WS_URL);
