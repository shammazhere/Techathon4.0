"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRiskStore, type DisasterType, type SeverityLevel } from "@/store/riskStore";

const TYPE_META: Record<DisasterType, { icon: string; label: string; color: string }> = {
  flood:     { icon: "🌊", label: "Flood",     color: "#00d2ff" },
  wildfire:  { icon: "🔥", label: "Wildfire",  color: "#ff6b35" },
  earthquake:{ icon: "🌍", label: "Earthquake",color: "#ffd700" },
  none:      { icon: "⚠️", label: "Unknown",   color: "#4a7a9b" },
};

const SEV_COLOR: Record<SeverityLevel, string> = {
  critical: "#ff3b3b", high: "#ff6b35", medium: "#ffd700", low: "#00ff88",
};

const SEVERITY_OPTS: SeverityLevel[] = ["critical", "high", "medium", "low"];
const TYPE_OPTS: DisasterType[]      = ["flood", "wildfire", "earthquake"];

// Predefined trigger locations (lat/lng not shown on mock map, just labels)
const TRIGGER_ZONES = [
  { label: "Zone A – North District", lat: 37.80, lng: -122.43 },
  { label: "Zone B – East Harbor",    lat: 37.79, lng: -122.38 },
  { label: "Zone C – South Valley",   lat: 37.74, lng: -122.43 },
  { label: "Zone D – West Hills",     lat: 37.78, lng: -122.46 },
  { label: "Zone E – Central Core",   lat: 37.78, lng: -122.41 },
  { label: "Zone F – Industrial",     lat: 37.76, lng: -122.39 },
];

function formatRelative(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function DisasterTimeline() {
  const { activeDisasters, disasterHistory, triggerDisaster, removeDisaster, clearAll } = useRiskStore();
  const [selType, setSelType] = useState<DisasterType>("flood");
  const [selSev,  setSelSev]  = useState<SeverityLevel>("high");
  const [selZone, setSelZone] = useState(0);
  const [triggering, setTriggering] = useState(false);
  const [tab, setTab] = useState<"trigger" | "history">("trigger");

  async function handleTrigger() {
    setTriggering(true);
    await new Promise((r) => setTimeout(r, 900));
    const zone = TRIGGER_ZONES[selZone];
    triggerDisaster(selType, zone.lat, zone.lng, selSev);
    setTriggering(false);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: "rgba(0,210,255,0.12)" }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-bold tracking-wide neon-cyan">⚡ DISASTER CONTROL</span>
          {activeDisasters.length > 0 && (
            <button onClick={clearAll}
              className="text-xs px-2 py-0.5 rounded transition-all"
              style={{ color: "#ff3b3b", background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.3)" }}>
              Clear All
            </button>
          )}
        </div>
        <div className="flex gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
          <span>Active: <span className="neon-red font-bold">{activeDisasters.length}</span></span>
          <span>Total Events: <span className="neon-cyan font-bold">{disasterHistory.length}</span></span>
        </div>
      </div>

      {/* Active incidents strip */}
      {activeDisasters.length > 0 && (
        <div className="px-3 pt-2 shrink-0 space-y-1.5">
          {activeDisasters.map((d) => {
            const meta = TYPE_META[d.type];
            const sc   = SEV_COLOR[d.severity];
            return (
              <div key={d.id} className="glass-card px-3 py-2 alert-flash flex items-center justify-between gap-2"
                style={{ borderColor: `${sc}55` }}>
                <div className="flex items-center gap-2">
                  <span className="text-base">{meta.icon}</span>
                  <div>
                    <div className="text-xs font-bold" style={{ color: sc }}>{meta.label} — {d.severity.toUpperCase()}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)", fontSize: 10 }}>
                      Pop. affected: {d.affectedPopulation.toLocaleString()} · Started {formatRelative(d.startTime)}
                    </div>
                  </div>
                </div>
                <button onClick={() => removeDisaster(d.id)}
                  className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs transition-all"
                  style={{ color: sc, background: `${sc}1a`, border: `1px solid ${sc}44` }}>
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex px-3 gap-1.5 py-2 shrink-0">
        {(["trigger", "history"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-1.5 rounded text-xs font-semibold tracking-widest uppercase transition-all"
            style={{
              background: tab === t ? "rgba(0,210,255,0.15)" : "transparent",
              color: tab === t ? "var(--neon-cyan)" : "var(--text-muted)",
              border: `1px solid ${tab === t ? "rgba(0,210,255,0.3)" : "rgba(255,255,255,0.06)"}`,
            }}>
            {t === "trigger" ? "🎯 Trigger" : "📋 History"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto side-panel px-3 pb-3">
        {tab === "trigger" ? (
          <div className="space-y-4">
            {/* Disaster type */}
            <div>
              <div className="text-xs font-semibold mb-2 tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
                Disaster Type
              </div>
              <div className="grid grid-cols-3 gap-2">
                {TYPE_OPTS.map((t) => {
                  const m = TYPE_META[t];
                  const active = selType === t;
                  return (
                    <button key={t} onClick={() => setSelType(t)}
                      className="flex flex-col items-center gap-1 py-2.5 rounded transition-all"
                      style={{
                        background: active ? `${m.color}20` : "rgba(255,255,255,0.03)",
                        border: `1px solid ${active ? `${m.color}60` : "rgba(255,255,255,0.08)"}`,
                        color: active ? m.color : "var(--text-muted)",
                      }}>
                      <span className="text-xl">{m.icon}</span>
                      <span className="text-xs font-semibold">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Severity */}
            <div>
              <div className="text-xs font-semibold mb-2 tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
                Severity Level
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SEVERITY_OPTS.map((s) => {
                  const c = SEV_COLOR[s];
                  const active = selSev === s;
                  return (
                    <button key={s} onClick={() => setSelSev(s)}
                      className="py-2 rounded text-xs font-bold uppercase tracking-widest transition-all"
                      style={{
                        background: active ? `${c}20` : "rgba(255,255,255,0.03)",
                        border: `1px solid ${active ? `${c}60` : "rgba(255,255,255,0.08)"}`,
                        color: active ? c : "var(--text-muted)",
                      }}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Zone selector */}
            <div>
              <div className="text-xs font-semibold mb-2 tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
                Target Zone
              </div>
              <div className="space-y-1.5">
                {TRIGGER_ZONES.map((z, i) => (
                  <button key={i} onClick={() => setSelZone(i)}
                    className="w-full text-left px-3 py-2 rounded text-xs transition-all"
                    style={{
                      background: selZone === i ? "rgba(0,210,255,0.12)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${selZone === i ? "rgba(0,210,255,0.4)" : "rgba(255,255,255,0.07)"}`,
                      color: selZone === i ? "var(--neon-cyan)" : "var(--text-secondary)",
                    }}>
                    {z.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Trigger button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleTrigger}
              disabled={triggering}
              className="w-full py-3 rounded font-bold text-sm tracking-widest uppercase transition-all"
              style={{
                background: triggering
                  ? "rgba(255,59,59,0.1)"
                  : `linear-gradient(135deg, ${SEV_COLOR[selSev]}33, ${SEV_COLOR[selSev]}55)`,
                border: `1px solid ${SEV_COLOR[selSev]}88`,
                color: SEV_COLOR[selSev],
                boxShadow: triggering ? "none" : `0 0 20px ${SEV_COLOR[selSev]}33`,
              }}>
              {triggering
                ? "⏳ Initializing Response…"
                : `🚨 TRIGGER ${TYPE_META[selType].label.toUpperCase()} — ${selSev.toUpperCase()}`}
            </motion.button>
          </div>
        ) : (
          <div className="space-y-2">
            {disasterHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <div className="text-2xl mb-2">📋</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>No events triggered yet</div>
              </div>
            ) : (
              disasterHistory.map((d, i) => {
                const meta = TYPE_META[d.type];
                const sc   = SEV_COLOR[d.severity];
                return (
                  <div key={d.id} className="flex gap-3">
                    {/* Timeline spine */}
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full border-2 mt-1"
                        style={{ borderColor: sc, background: i === 0 ? sc : "transparent" }} />
                      {i < disasterHistory.length - 1 && (
                        <div className="w-px flex-1 mt-1" style={{ background: "rgba(0,210,255,0.15)" }} />
                      )}
                    </div>
                    {/* Event card */}
                    <div className="glass-card p-2.5 flex-1 mb-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span>{meta.icon}</span>
                        <span className="text-xs font-bold" style={{ color: sc }}>{meta.label}</span>
                        <span className="text-xs px-1 py-0.5 rounded font-bold ml-auto"
                          style={{ color: sc, background: `${sc}1a`, border: `1px solid ${sc}33`, fontSize: 9 }}>
                          {d.severity.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Pop: {d.affectedPopulation.toLocaleString()} · {formatRelative(d.startTime)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
