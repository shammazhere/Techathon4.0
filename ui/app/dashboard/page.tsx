"use client";

import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import AgentLogs from "@/components/AgentLogs";
import DisasterTimeline from "@/components/DisasterTimeline";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });
const RoutePanel = dynamic(() => import("@/components/RoutePanel"), { ssr: false });
const RiskHeatmap = dynamic(() => import("@/components/RiskHeatmap"), { ssr: false });
const ResourceTracker = dynamic(() => import("@/components/ResourceTracker"), { ssr: false });

export default function DashboardPage() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      <Navbar />

      {/* Main 3-column grid */}
      <div className="flex-1 overflow-hidden grid" style={{
        gridTemplateColumns: "300px 1fr 320px",
        gridTemplateRows: "1fr",
        gap: "0",
      }}>
        {/* ── LEFT PANEL ─────────────────────────────────────── */}
        <aside className="flex flex-col overflow-hidden border-r" style={{ borderColor: "rgba(0,210,255,0.1)" }}>
          {/* Top: Disaster control */}
          <div className="flex-1 overflow-hidden border-b" style={{ borderColor: "rgba(0,210,255,0.08)" }}>
            <DisasterTimeline />
          </div>
          {/* Bottom: Risk heatmap */}
          <div className="overflow-hidden" style={{ height: "40%" }}>
            <RiskHeatmap />
          </div>
        </aside>

        {/* ── CENTER: MAP ────────────────────────────────────── */}
        <main className="relative overflow-hidden flex flex-col">
          <div className="flex-1 overflow-hidden">
            <MapView />
          </div>
          {/* Bottom strip: KPI bar */}
          <KpiBar />
        </main>

        {/* ── RIGHT PANEL ────────────────────────────────────── */}
        <aside className="flex flex-col overflow-hidden border-l" style={{ borderColor: "rgba(0,210,255,0.1)" }}>
          {/* Top: Route panel */}
          <div className="overflow-hidden border-b" style={{ height: "45%", borderColor: "rgba(0,210,255,0.08)" }}>
            <RoutePanel />
          </div>
          {/* Middle: Resource tracker */}
          <div className="overflow-hidden border-b" style={{ height: "30%", borderColor: "rgba(0,210,255,0.08)" }}>
            <ResourceTracker />
          </div>
          {/* Bottom: Agent logs */}
          <div className="flex-1 overflow-hidden">
            <AgentLogs />
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── KPI bar ────────────────────────────────────────────────────────────────
import { useRiskStore } from "@/store/riskStore";
import { useRouteStore } from "@/store/routeStore";
import { useResourceStore } from "@/store/resourceStore";

function KpiBar() {
  const { activeDisasters, riskCells, totalAffected } = useRiskStore();
  const { evacueesMoved, reroutedVehicles } = useRouteStore();
  const { units } = useResourceStore();

  const deployed = units.filter((u) => u.status === "deployed").length;
  const avgRisk = riskCells.length
    ? Math.round(riskCells.reduce((s, c) => s + c.overallRisk, 0) / riskCells.length)
    : 0;

  const kpis = [
    { label: "Active Incidents", value: activeDisasters.length.toString(), color: activeDisasters.length > 0 ? "#ff3b3b" : "#00ff88", icon: "🚨" },
    { label: "Affected People",  value: totalAffected.toLocaleString(),    color: "#ff9500", icon: "👥" },
    { label: "Evacuees Moved",   value: evacueesMoved.toLocaleString(),    color: "#00ff88", icon: "🏃" },
    { label: "Vehicles Rerouted",value: reroutedVehicles.toLocaleString(), color: "#00d2ff", icon: "🚗" },
    { label: "Units Deployed",   value: `${deployed}/${units.length}`,     color: "#7c3aed", icon: "🚑" },
    { label: "Avg City Risk",    value: `${avgRisk}%`,                     color: avgRisk > 60 ? "#ff3b3b" : avgRisk > 30 ? "#ff9500" : "#00ff88", icon: "📊" },
  ];

  return (
    <div className="grid shrink-0 border-t"
      style={{
        gridTemplateColumns: `repeat(${kpis.length}, 1fr)`,
        borderColor: "rgba(0,210,255,0.1)",
        background: "rgba(2,4,8,0.9)",
      }}>
      {kpis.map(({ label, value, color, icon }, i) => (
        <div key={label}
          className="flex flex-col items-center justify-center py-2.5 border-r"
          style={{ borderColor: "rgba(0,210,255,0.08)" }}>
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-sm">{icon}</span>
            <span className="text-sm font-black" style={{ color }}>{value}</span>
          </div>
          <div className="text-xs text-center" style={{ color: "var(--text-muted)", fontSize: 10 }}>{label}</div>
        </div>
      ))}
    </div>
  );
}
