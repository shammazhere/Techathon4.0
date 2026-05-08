"use client";

import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import AgentLogs from "@/components/AgentLogs";
import DisasterTimeline from "@/components/DisasterTimeline";

import { useEffect } from "react";
import { startRealtimeSimulation } from "@/services/realtime";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });
const RiskHeatmap = dynamic(() => import("@/components/RiskHeatmap"), { ssr: false });
const ResourceTracker = dynamic(() => import("@/components/ResourceTracker"), { ssr: false });

import { useRealtime } from "@/hooks/useRealtime";

export default function DashboardPage() {
  const { logs, startSimulation } = useRealtime();

  useEffect(() => {
    // We could still run jitter for aesthetics, but let's prioritize live data
    const stop = startRealtimeSimulation();
    return () => stop();
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#050505] text-gray-200 font-sans">
      <Navbar />

      {/* Main Container - Full Bleed Map */}
      <div className="flex-1 relative overflow-hidden">

        {/* MAP BACKGROUND */}
        <div className="absolute inset-0 z-0">
          <MapView />
        </div>

        {/* OVERLAYS */}
        <div className="absolute inset-0 z-10 pointer-events-none flex justify-between p-4 gap-4">

          {/* ── LEFT PANEL ─────────────────────────────────────── */}
          <aside className="w-[340px] flex flex-col gap-4 pointer-events-auto h-full">
            {/* Top: Disaster control */}
            <div className="flex-[0.6] overflow-hidden rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl flex flex-col">
              <DisasterTimeline />
            </div>
            {/* Bottom: Risk heatmap */}
            <div className="flex-[0.4] overflow-hidden rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl flex flex-col">
              <RiskHeatmap />
            </div>
          </aside>

          {/* ── CENTER: KPI BAR (Floating at bottom) ─────────────── */}
          <div className="flex-1 flex flex-col justify-end items-center pb-2 pointer-events-none">
            <div className="w-full max-w-4xl pointer-events-auto rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl overflow-hidden">
              <KpiBar />
            </div>
          </div>

          {/* ── RIGHT PANEL ────────────────────────────────────── */}
          <aside className="w-[360px] flex flex-col gap-4 pointer-events-auto h-full">
            {/* Top: Resource tracker */}
            <div className="flex-1 overflow-hidden rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl flex flex-col">
              <ResourceTracker />
            </div>
            {/* Bottom: Agent logs */}
            <div className="flex-1 overflow-hidden rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl flex flex-col">
              <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">System Logs</h3>
                <button 
                  onClick={startSimulation}
                  className="px-3 py-1 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 rounded text-[10px] font-bold text-red-400 transition-colors uppercase tracking-tight"
                >
                  Start Simulation
                </button>
              </div>
              <AgentLogs logs={logs} />
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}

// ─── KPI bar ────────────────────────────────────────────────────────────────
import { useRiskStore } from "@/store/riskStore";
import { useRouteStore } from "@/store/routeStore";
import { useResourceStore } from "@/store/resourceStore";

function KpiBar() {
  const { activeDisasters, riskCells, totalAffected, weather } = useRiskStore();
  const { evacueesMoved, reroutedVehicles } = useRouteStore();
  const { units } = useResourceStore();

  const deployed = units.filter((u) => u.status === "deployed").length;
  const avgRisk = riskCells.length
    ? Math.round(riskCells.reduce((s, c) => s + c.overallRisk, 0) / riskCells.length)
    : 0;

  const kpis = [
    { label: "Weather", value: `${weather.temp}°C / ${weather.description}`, color: "text-blue-300" },
    { label: "Wind/Humid", value: `${weather.windSpeed}m/s / ${weather.humidity}%`, color: "text-blue-200" },
    { label: "Affected People", value: totalAffected.toLocaleString(), color: totalAffected > 0 ? "text-orange-400" : "text-gray-300" },
    { label: "Evacuees Moved", value: evacueesMoved.toLocaleString(), color: "text-emerald-400" },
    { label: "Units Deployed", value: `${deployed}/${units.length}`, color: "text-indigo-400" },
    { label: "Avg City Risk", value: `${avgRisk}%`, color: avgRisk > 60 ? "text-red-400" : avgRisk > 30 ? "text-orange-400" : "text-gray-300" },
  ];

  return (
    <div className="grid grid-cols-6 divide-x divide-white/10">
      {kpis.map(({ label, value, color }) => (
        <div key={label} className="flex flex-col items-center justify-center px-4 py-3 hover:bg-white/5 transition-colors">
          <div className="text-[10px] font-medium tracking-widest uppercase mb-1 text-gray-500">{label}</div>
          <div className={`text-xl font-semibold tracking-tight ${color}`}>{value}</div>
        </div>
      ))}
    </div>
  );
}
