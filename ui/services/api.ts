// ─── API Service ────────────────────────────────────────────────────────────
// Connects to the real FastAPI backend.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export interface ApiResponse<T> {
  data: T;
  status: "ok" | "error" | "success";
  message?: string;
}

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (error) {
    console.error(`API Fetch Error [${endpoint}]:`, error);
    throw error;
  }
}

// ─── Disaster API ────────────────────────────────────────────────────────────
export const disasterApi = {
  async getActiveDisasters() {
    return apiFetch("/api/disaster/status");
  },

  async triggerDisaster(payload: {
    type: string;
    lat?: number;
    lng?: number;
    severity?: string;
  }) {
    // We hit the orchestrator endpoint to trigger the full pipeline
    return apiFetch(`/disaster/start?type=${payload.type}`, {
      method: "POST",
    });
  },
};

// ─── Route API (Live Rerouting) ──────────────────────────────────────────────
export const routeApi = {
  async startTracking() {
    return apiFetch("/api/reroute/start_tracking", { method: "POST" });
  },

  async tickSimulation() {
    return apiFetch("/api/reroute/tick", { method: "POST" });
  },

  async blockRoad(nodeU: number, nodeV: number) {
    return apiFetch(`/api/reroute/block_road?node_u=${nodeU}&node_v=${nodeV}`, { method: "POST" });
  }
};

// ─── Simulation API (Live State) ─────────────────────────────────────────────
export const simulationApi = {
  async getResources() {
    return apiFetch("/api/simulation/resources");
  },

  async getRiskCells() {
    return apiFetch("/api/simulation/risk_cells");
  }
};
