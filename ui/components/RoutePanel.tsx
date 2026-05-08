"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Navigation, Route, TrafficCone, MapPin, Activity, CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react";
import { useRouting } from "@/hooks/useRouting";
import { useRouteStore } from "@/store/routeStore";

const STATUS_LABEL: Record<string, string> = {
  active: "ACTIVE", clear: "CLEAR", congested: "JAMMED", blocked: "BLOCKED",
};

export default function RoutePanel() {
  const {
    routes, activeRouteId, isComputing,
    selectRoute, getRiskColor, getStatusColor, safeRoutes, blockedRoutes,
    runSignalOptimization, lastOptimized,
  } = useRouting();
  const { signals, reroutedVehicles } = useRouteStore();
  const [tab, setTab] = useState<"routes" | "signals">("routes");

  return (
    <div className="flex flex-col h-full bg-transparent text-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Navigation size={14} className="text-gray-400" />
          <span className="text-xs font-semibold tracking-wide text-gray-200">ROUTE COMMAND</span>
          {isComputing && (
            <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase bg-blue-500/10 text-blue-400 animate-pulse">
              Computing
            </span>
          )}
        </div>
        <div className="flex gap-4 text-[10px] text-gray-500 font-medium">
          <span className="flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-400" /> {safeRoutes.length} safe</span>
          <span className="flex items-center gap-1"><AlertOctagon size={10} className="text-red-400" /> {blockedRoutes.length} blocked</span>
          <span className="flex items-center gap-1"><Route size={10} className="text-blue-400" /> {reroutedVehicles.toLocaleString()} rerouted</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-3 gap-1 py-3 shrink-0">
        {(["routes", "signals"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-semibold tracking-wider uppercase transition-colors ${tab === t ? "bg-white/10 text-white" : "bg-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5"
              }`}>
            {t === "routes" ? <Route size={12} /> : <TrafficCone size={12} />}
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto side-panel px-3 pb-3 space-y-2">
        {tab === "routes" ? (
          <>
            {routes.map((route) => {
              const isActive = route.id === activeRouteId;
              const statusColor = getStatusColor(route.status);
              const riskColor = getRiskColor(route.riskScore);
              return (
                <div key={route.id} onClick={() => selectRoute(route.id)}
                  className={`p-3 cursor-pointer rounded-lg border transition-colors ${isActive ? "bg-white/10 border-white/20" : "bg-[#111318]/40 border-transparent hover:bg-white/5"
                    }`}>

                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[11px] font-medium ${isActive ? "text-white" : "text-gray-300"}`}>
                      {route.name}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider bg-white/5" style={{ color: statusColor }}>
                      {STATUS_LABEL[route.status]}
                    </span>
                  </div>

                  {/* Route points */}
                  <div className="flex items-center gap-1.5 text-[10px] mb-3 text-gray-500">
                    <MapPin size={10} />
                    <span>{route.fromZone}</span>
                    <span>→</span>
                    <span className="text-gray-300">{route.toShelter}</span>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px]">
                    <div className="flex gap-1.5">
                      <span className="text-gray-500">Dist:</span>
                      <span className="text-gray-300 font-medium">{route.distance} km</span>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="text-gray-500">ETA:</span>
                      <span className="text-gray-300 font-medium">{route.estimatedTime}m</span>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="text-gray-500">Risk:</span>
                      <span className="font-medium" style={{ color: riskColor }}>{route.riskScore}</span>
                    </div>
                  </div>

                  {/* Blocked segments */}
                  {route.blockedSegments > 0 && (
                    <div className="mt-2 text-[9px] flex items-center gap-1.5 text-orange-400 font-medium uppercase tracking-wider">
                      <AlertTriangle size={10} />
                      {route.blockedSegments} blocked segment{route.blockedSegments > 1 ? "s" : ""}
                    </div>
                  )}

                  {isActive && (
                    <div className="mt-2 text-[9px] flex items-center gap-1.5 text-blue-400 font-medium uppercase tracking-wider">
                      <Activity size={10} className="animate-pulse" /> A* Selected
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          <>
            <motion.button whileTap={{ scale: 0.98 }} onClick={runSignalOptimization} disabled={isComputing}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-md text-[11px] font-bold tracking-widest uppercase mb-3 transition-colors ${isComputing ? "bg-white/5 text-gray-500 cursor-not-allowed border border-white/5" : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                }`}>
              <TrafficCone size={14} />
              {isComputing ? "Optimizing..." : "Optimize Signals"}
            </motion.button>

            {lastOptimized && (
              <div className="text-[9px] text-center mb-3 text-gray-500 uppercase tracking-widest font-medium">
                Last run: {lastOptimized.toLocaleTimeString()}
              </div>
            )}

            {signals.map((sig) => {
              const modeColor = { evacuation: "#34d399", emergency: "#60a5fa", blocked: "#f87171", normal: "#fbbf24" }[sig.mode] ?? "#94a3b8";
              return (
                <div key={sig.id} className="bg-[#111318]/40 border border-transparent p-2.5 rounded-lg flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-gray-300">{sig.intersection}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider bg-white/5" style={{ color: modeColor }}>
                      {sig.mode}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500">
                    Green duration: <span style={{ color: modeColor }} className="font-medium ml-1">{sig.greenDuration}s</span>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
