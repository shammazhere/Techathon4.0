// ─── API Service ────────────────────────────────────────────────────────────
// All backend endpoints are defined here. During hackathon demo, these
// functions return mock data with simulated latency.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ApiResponse<T> {
  data: T;
  status: "ok" | "error";
  message?: string;
}

// Simulate network delay
const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch {
    // Fallback: return undefined (caller handles mock data)
    return undefined as T;
  }
}

// ─── Disaster API ────────────────────────────────────────────────────────────
export const disasterApi = {
  async getActiveDisasters() {
    await delay();
    return apiFetch("/api/disasters/active");
  },

  async triggerDisaster(payload: {
    type: string;
    lat: number;
    lng: number;
    severity: string;
  }) {
    await delay(600);
    return apiFetch("/api/disasters/trigger", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getSpreadSimulation(disasterId: string) {
    await delay(800);
    return apiFetch(`/api/disasters/${disasterId}/spread`);
  },
};

// ─── Route API ───────────────────────────────────────────────────────────────
export const routeApi = {
  async getEvacuationRoutes(fromZone: string) {
    await delay();
    return apiFetch(`/api/routes/evacuation?zone=${fromZone}`);
  },

  async computeOptimalRoute(payload: { from: string; to: string; avoid: string[] }) {
    await delay(1200);
    return apiFetch("/api/routes/optimize", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getTrafficStatus() {
    await delay(300);
    return apiFetch("/api/traffic/status");
  },
};

// ─── Resource API ─────────────────────────────────────────────────────────────
export const resourceApi = {
  async getShelters() {
    await delay();
    return apiFetch("/api/shelters");
  },

  async getUnits() {
    await delay();
    return apiFetch("/api/units");
  },

  async allocateUnit(unitId: string, zone: string) {
    await delay(500);
    return apiFetch("/api/units/allocate", {
      method: "POST",
      body: JSON.stringify({ unitId, zone }),
    });
  },
};

// ─── AI Agent API ─────────────────────────────────────────────────────────────
export const agentApi = {
  async getAgentLogs(limit = 20) {
    await delay();
    return apiFetch(`/api/agents/logs?limit=${limit}`);
  },

  async getExplanation(actionId: string) {
    await delay(1500);
    return apiFetch(`/api/agents/explain/${actionId}`);
  },

  async runAgentCycle() {
    await delay(2000);
    return apiFetch("/api/agents/run", { method: "POST" });
  },
};
