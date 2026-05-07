// ─── Realtime Service ─────────────────────────────────────────────────────────
// Simulates real-time data updates when backend WS is unavailable (demo mode).

import { useRiskStore } from "@/store/riskStore";
import { useResourceStore } from "@/store/resourceStore";

type Unsubscribe = () => void;

const SIMULATION_INTERVAL = 4000; // ms

// Simulate live telemetry updates
export function startRealtimeSimulation(): Unsubscribe {
  let active = true;

  const tick = () => {
    if (!active) return;

    // Jitter resource ETAs
    const { units } = useResourceStore.getState();
    const updated = units.map((u) => {
      if (u.status === "deployed" && u.eta !== undefined) {
        const newEta = Math.max(0, u.eta - 1);
        return { ...u, eta: newEta, status: newEta === 0 ? ("available" as const) : u.status };
      }
      return u;
    });
    useResourceStore.setState({ units: updated });

    // Jitter fuel levels
    const fuelUpdated = updated.map((u) =>
      u.status === "deployed"
        ? { ...u, fuelLevel: Math.max(10, u.fuelLevel - (Math.random() * 0.5)) }
        : u
    );
    useResourceStore.setState({ units: fuelUpdated });
  };

  const interval = setInterval(tick, SIMULATION_INTERVAL);

  return () => {
    active = false;
    clearInterval(interval);
  };
}

// Simulate disaster spread
export function simulateDisasterSpread(): Unsubscribe {
  let active = true;

  const spread = () => {
    if (!active) return;
    const { activeDisasters, riskCells } = useRiskStore.getState();
    if (activeDisasters.length === 0) return;

    const updatedCells = riskCells.map((cell) => {
      const delta = (Math.random() - 0.3) * 3;
      return {
        ...cell,
        floodRisk: Math.min(100, Math.max(0, cell.floodRisk + (activeDisasters.some(d => d.type === "flood") ? delta : 0))),
        fireRisk: Math.min(100, Math.max(0, cell.fireRisk + (activeDisasters.some(d => d.type === "wildfire") ? delta : 0))),
        overallRisk: Math.min(100, Math.max(0, cell.overallRisk + delta * 0.5)),
      };
    });

    useRiskStore.setState({ riskCells: updatedCells });
  };

  const interval = setInterval(spread, SIMULATION_INTERVAL * 2);
  return () => {
    active = false;
    clearInterval(interval);
  };
}

// Generate mock agent log entries
export type AgentLogEntry = {
  id: string;
  agentType: "disaster" | "route" | "resource" | "rescue" | "traffic" | "explanation";
  agentLabel: string;
  action: string;
  detail: string;
  priority: "critical" | "high" | "medium" | "low" | "info";
  timestamp: Date;
  zone?: string;
};

const MOCK_LOGS: Omit<AgentLogEntry, "id" | "timestamp">[] = [
  { agentType: "disaster", agentLabel: "Disaster Agent", action: "Flood zone perimeter updated", detail: "Zone A boundary expanded by 0.8km due to rising water table. 3 road segments flagged as impassable.", priority: "critical", zone: "Zone A" },
  { agentType: "route", agentLabel: "Route Agent", action: "A* rerouting completed", detail: "Safest path recalculated for 1,240 vehicles. Route Alpha now avoids Elm Street (blocked). ETA updated.", priority: "high", zone: "Zone A" },
  { agentType: "resource", agentLabel: "Resource Agent", action: "OR-Tools optimization run", detail: "Ambulance AMB-01 and AMB-02 reallocated. Supply truck SUP-01 rerouted to Westpark. 340 medical kits distributed.", priority: "high", zone: "Zone B" },
  { agentType: "rescue", agentLabel: "Rescue Agent", action: "Priority queue updated", detail: "Zone B elderly density 0.22 scored highest urgency (92/100). RSC-01 dispatched. ETA 3 min.", priority: "critical", zone: "Zone B" },
  { agentType: "traffic", agentLabel: "Traffic Agent", action: "Green corridor activated", detail: "Harbor Blvd and Main St signals set to evacuation mode (90s green). Estimated +35% throughput gain.", priority: "medium" },
  { agentType: "explanation", agentLabel: "Explanation Agent", action: "Decision justified", detail: "Zone B received highest evacuation priority due to flood risk (91%) combined with high elderly density and 3 blocked road segments.", priority: "info", zone: "Zone B" },
  { agentType: "disaster", agentLabel: "Disaster Agent", action: "Wildfire spread computed", detail: "Zone D fire spread probability: 0.74. Wind alignment: NE at 28 km/h. Fuel density high. Expansion radius: +1.2km.", priority: "critical", zone: "Zone D" },
  { agentType: "resource", agentLabel: "Resource Agent", action: "Shelter rebalancing triggered", detail: "North High School at 100% capacity. 420 evacuees redirected to Westpark Stadium. Capacity buffer: 3,800.", priority: "high" },
  { agentType: "route", agentLabel: "Route Agent", action: "Route Delta blocked", detail: "3 segments on West Hills Dr confirmed impassable. Alternative via Park Lane computed. Delay: +14 min.", priority: "critical", zone: "Zone D" },
  { agentType: "traffic", agentLabel: "Traffic Agent", action: "Signal optimization complete", detail: "4 intersections switched to emergency mode. Central Pkwy throughput increased by 62%.", priority: "medium" },
];

export function generateLogEntry(): AgentLogEntry {
  const base = MOCK_LOGS[Math.floor(Math.random() * MOCK_LOGS.length)];
  return {
    ...base,
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date(),
  };
}
