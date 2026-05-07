"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useResourceStore } from "@/store/resourceStore";

const UNIT_ICONS: Record<string, string> = {
  ambulance: "🚑", firetruck: "🚒", rescue: "🚁", supply: "🚛",
};

const STATUS_COLORS: Record<string, string> = {
  available: "#00ff88", deployed: "#00d2ff", returning: "#ffd700", offline: "#4a7a9b",
};

export default function ResourceTracker() {
  const { units, shelters, supplies } = useResourceStore();
  const [tab, setTab] = useState<"units" | "shelters" | "supplies">("units");

  const deployedCount = units.filter((u) => u.status === "deployed").length;
  const availableCount = units.filter((u) => u.status === "available").length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: "rgba(0,210,255,0.12)" }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold tracking-wide neon-cyan">📦 RESOURCE OPS</span>
        </div>
        <div className="flex gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
          <span><span className="neon-cyan font-bold">{deployedCount}</span> deployed</span>
          <span><span className="neon-green font-bold">{availableCount}</span> available</span>
          <span><span className="neon-yellow font-bold">{units.filter(u => u.status === "returning").length}</span> returning</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-3 gap-1.5 py-2 shrink-0">
        {(["units", "shelters", "supplies"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-1.5 rounded text-xs font-semibold tracking-widest uppercase transition-all"
            style={{
              background: tab === t ? "rgba(0,210,255,0.15)" : "transparent",
              color: tab === t ? "var(--neon-cyan)" : "var(--text-muted)",
              border: `1px solid ${tab === t ? "rgba(0,210,255,0.3)" : "rgba(255,255,255,0.06)"}`,
            }}>
            {t === "units" ? "🚑" : t === "shelters" ? "🏠" : "📊"} {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto side-panel px-3 pb-3 space-y-2">
        {tab === "units" && units.map((unit) => {
          const sc = STATUS_COLORS[unit.status] ?? "#4a7a9b";
          return (
            <div key={unit.id} className="glass-card p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{UNIT_ICONS[unit.type]}</span>
                  <div>
                    <div className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{unit.label}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)", fontSize: 10 }}>{unit.location}</div>
                  </div>
                </div>
                <span className="badge text-xs font-bold px-2 py-0.5 rounded"
                  style={{ color: sc, background: `${sc}1a`, border: `1px solid ${sc}44` }}>
                  {unit.status.toUpperCase()}
                </span>
              </div>
              {unit.assignedZone && (
                <div className="text-xs mb-2 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                  <span>→</span>
                  <span style={{ color: "var(--neon-cyan)" }}>{unit.assignedZone}</span>
                  {unit.eta !== undefined && (
                    <span className="ml-auto font-mono" style={{ color: "#ffd700" }}>{unit.eta} min</span>
                  )}
                </div>
              )}
              {/* Fuel bar */}
              <div>
                <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-muted)", fontSize: 10 }}>
                  <span>Fuel</span>
                  <span style={{ color: unit.fuelLevel < 30 ? "#ff3b3b" : "var(--text-secondary)" }}>{Math.round(unit.fuelLevel)}%</span>
                </div>
                <div className="progress-bar" style={{ height: 4 }}>
                  <div className="progress-fill" style={{
                    width: `${unit.fuelLevel}%`,
                    background: unit.fuelLevel < 30
                      ? "linear-gradient(to right,#ff3b3b88,#ff3b3b)"
                      : "linear-gradient(to right,#00d2ff66,#00d2ff)",
                  }} />
                </div>
              </div>
            </div>
          );
        })}

        {tab === "shelters" && shelters.map((s) => {
          const pct = Math.round((s.occupied / s.capacity) * 100);
          const col = pct >= 100 ? "#ff3b3b" : pct >= 85 ? "#ff9500" : "#00ff88";
          return (
            <div key={s.id} className="glass-card p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{s.name}</span>
                <span className="badge text-xs font-bold px-2 py-0.5 rounded"
                  style={{ color: col, background: `${col}1a`, border: `1px solid ${col}44` }}>
                  {s.status.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: "var(--text-muted)" }}>Occupancy</span>
                <span style={{ color: col }} className="font-bold">{s.occupied.toLocaleString()} / {s.capacity.toLocaleString()}</span>
              </div>
              <div className="progress-bar mb-2" style={{ height: 6 }}>
                <div className="progress-fill" style={{
                  width: `${pct}%`,
                  background: `linear-gradient(to right,${col}66,${col})`,
                }} />
              </div>
              <div className="flex gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                <span>{s.hasmedical ? "✅" : "❌"} Medical</span>
                <span>{s.hasfood ? "✅" : "❌"} Food</span>
                <span className="ml-auto font-bold" style={{ color: col }}>{pct}% full</span>
              </div>
            </div>
          );
        })}

        {tab === "supplies" && supplies.map((item) => {
          const pct = Math.round((item.deployed / item.total) * 100);
          return (
            <div key={item.category} className="glass-card p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{item.icon}</span>
                <div className="flex-1">
                  <div className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{item.category}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {item.deployed.toLocaleString()} / {item.total.toLocaleString()} {item.unit} deployed
                  </div>
                </div>
                <span className="text-xs font-bold" style={{ color: item.color }}>{pct}%</span>
              </div>
              <div className="progress-bar" style={{ height: 5 }}>
                <div className="progress-fill" style={{
                  width: `${pct}%`,
                  background: `linear-gradient(to right,${item.color}55,${item.color})`,
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
