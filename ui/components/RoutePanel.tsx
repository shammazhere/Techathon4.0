"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouting } from "@/hooks/useRouting";
import { useRouteStore } from "@/store/routeStore";

const STATUS_LABEL: Record<string, string> = {
  active: "ACTIVE", clear: "CLEAR", congested: "JAMMED", blocked: "BLOCKED",
};

export default function RoutePanel() {
  const {
    routes, activeRoute, activeRouteId, isComputing,
    selectRoute, getRiskColor, getStatusColor, safeRoutes, blockedRoutes,
    runSignalOptimization, lastOptimized,
  } = useRouting();
  const { signals, reroutedVehicles, evacueesMoved } = useRouteStore();
  const [tab, setTab] = useState<"routes" | "signals">("routes");

  return (
    <div className="flex flex-col h-full" style={{ color: "var(--text-primary)" }}>
      {/* Header */}
      <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: "rgba(0,210,255,0.12)" }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold tracking-wide neon-cyan">⚡ ROUTE COMMAND</span>
          {isComputing && (
            <span className="badge status-info animate-pulse-glow text-xs">COMPUTING…</span>
          )}
        </div>
        <div className="flex gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
          <span><span className="neon-green font-bold">{safeRoutes.length}</span> safe</span>
          <span><span className="neon-red font-bold">{blockedRoutes.length}</span> blocked</span>
          <span><span className="neon-cyan font-bold">{reroutedVehicles.toLocaleString()}</span> rerouted</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 px-3 py-2 shrink-0">
        {[
          { label: "Evacuees Moved", value: evacueesMoved.toLocaleString(), color: "#00ff88" },
          { label: "Vehicles Rerouted", value: reroutedVehicles.toLocaleString(), color: "#00d2ff" },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card px-3 py-2 text-center">
            <div className="text-sm font-bold" style={{ color }}>{value}</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex px-3 gap-2 mb-2 shrink-0">
        {(["routes", "signals"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-1.5 rounded text-xs font-semibold tracking-widest uppercase transition-all"
            style={{
              background: tab === t ? "rgba(0,210,255,0.15)" : "transparent",
              color: tab === t ? "var(--neon-cyan)" : "var(--text-muted)",
              border: `1px solid ${tab === t ? "rgba(0,210,255,0.3)" : "rgba(255,255,255,0.06)"}`,
            }}>
            {t === "routes" ? "🛣 Routes" : "🚦 Signals"}
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
                <motion.div key={route.id}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => selectRoute(route.id)}
                  className="glass-card p-3 cursor-pointer transition-all"
                  style={{
                    border: `1px solid ${isActive ? "rgba(0,210,255,0.5)" : "rgba(0,210,255,0.1)"}`,
                    background: isActive ? "rgba(0,210,255,0.08)" : undefined,
                  }}>
                  {/* Route name + status */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold" style={{ color: isActive ? "var(--neon-cyan)" : "var(--text-primary)" }}>
                      {route.name}
                    </span>
                    <span className="badge text-xs font-bold px-2 py-0.5 rounded"
                      style={{ color: statusColor, background: `${statusColor}1a`, border: `1px solid ${statusColor}44` }}>
                      {STATUS_LABEL[route.status]}
                    </span>
                  </div>

                  {/* Zone info */}
                  <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                    <span>{route.fromZone}</span>
                    <span className="mx-1" style={{ color: "var(--text-muted)" }}>→</span>
                    <span style={{ color: "var(--neon-cyan)" }}>{route.toShelter}</span>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {[
                      { label: "Distance", value: `${route.distance} km` },
                      { label: "ETA", value: `${route.estimatedTime} min` },
                      { label: "Capacity", value: `${route.capacity}/h` },
                    ].map(({ label, value }) => (
                      <div key={label} className="text-center">
                        <div className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{value}</div>
                        <div className="text-xs" style={{ color: "var(--text-muted)", fontSize: 10 }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Risk bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span style={{ color: "var(--text-muted)" }}>Risk Score</span>
                      <span style={{ color: riskColor }} className="font-bold">{route.riskScore}/100</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill"
                        style={{ width: `${route.riskScore}%`, background: `linear-gradient(to right, ${riskColor}88, ${riskColor})` }} />
                    </div>
                  </div>

                  {/* Blocked segments */}
                  {route.blockedSegments > 0 && (
                    <div className="mt-2 text-xs flex items-center gap-1" style={{ color: "#ff9500" }}>
                      <span>⚠</span>
                      <span>{route.blockedSegments} blocked segment{route.blockedSegments > 1 ? "s" : ""}</span>
                    </div>
                  )}

                  {isActive && (
                    <div className="mt-2 text-xs flex items-center gap-1 neon-cyan">
                      <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-glow" />
                      <span>SELECTED — A* Active</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </>
        ) : (
          <>
            <button
              onClick={runSignalOptimization}
              disabled={isComputing}
              className="w-full py-2 rounded text-xs font-bold tracking-widest uppercase mb-2 transition-all"
              style={{
                background: isComputing ? "rgba(0,210,255,0.08)" : "rgba(0,210,255,0.18)",
                color: isComputing ? "var(--text-muted)" : "var(--neon-cyan)",
                border: "1px solid rgba(0,210,255,0.35)",
              }}>
              {isComputing ? "⏳ Optimizing…" : "🚦 Run Signal Optimization"}
            </button>
            {lastOptimized && (
              <div className="text-xs text-center mb-2" style={{ color: "var(--text-muted)" }}>
                Last run: {lastOptimized.toLocaleTimeString()}
              </div>
            )}
            {signals.map((sig) => {
              const modeColor = {
                evacuation: "#00ff88", emergency: "#00d2ff",
                blocked: "#ff3b3b", normal: "#ffd700",
              }[sig.mode] ?? "#4a7a9b";
              return (
                <div key={sig.id} className="glass-card p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                      {sig.intersection}
                    </span>
                    <span className="badge text-xs px-2 py-0.5 rounded font-bold"
                      style={{ color: modeColor, background: `${modeColor}1a`, border: `1px solid ${modeColor}44` }}>
                      {sig.mode.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Green duration: <span style={{ color: modeColor }} className="font-semibold">{sig.greenDuration}s</span>
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
