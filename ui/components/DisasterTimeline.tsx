"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRiskStore, type DisasterType, type SeverityLevel } from "@/store/riskStore";
import { Waves, Flame, Activity, AlertTriangle, ShieldAlert, Target, History, X } from "lucide-react";

const TYPE_META: Record<DisasterType, { icon: React.ReactNode; label: string; color: string }> = {
  flood: { icon: <Waves size={16} />, label: "Flood", color: "text-blue-400" },
  wildfire: { icon: <Flame size={16} />, label: "Wildfire", color: "text-orange-400" },
  earthquake: { icon: <Activity size={16} />, label: "Earthquake", color: "text-amber-400" },
  none: { icon: <AlertTriangle size={16} />, label: "Unknown", color: "text-gray-400" },
};

const SEV_COLOR: Record<SeverityLevel, string> = {
  critical: "text-red-400", high: "text-orange-400", medium: "text-amber-400", low: "text-emerald-400",
};

const SEV_BG: Record<SeverityLevel, string> = {
  critical: "bg-red-500/10 border-red-500/20",
  high: "bg-orange-500/10 border-orange-500/20",
  medium: "bg-amber-500/10 border-amber-500/20",
  low: "bg-emerald-500/10 border-emerald-500/20",
};

const SEVERITY_OPTS: SeverityLevel[] = ["critical", "high", "medium", "low"];
const TYPE_OPTS: DisasterType[] = ["flood", "wildfire", "earthquake"];

// Predefined trigger locations (lat/lng not shown on mock map, just labels)
const TRIGGER_ZONES = [
  { label: "Zone A – North District", lat: 37.80, lng: -122.43 },
  { label: "Zone B – East Harbor", lat: 37.79, lng: -122.38 },
  { label: "Zone C – South Valley", lat: 37.74, lng: -122.43 },
  { label: "Zone D – West Hills", lat: 37.78, lng: -122.46 },
  { label: "Zone E – Central Core", lat: 37.78, lng: -122.41 },
  { label: "Zone F – Industrial", lat: 37.76, lng: -122.39 },
];

function formatRelative(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function DisasterTimeline() {
  const { activeDisasters, disasterHistory, triggerDisaster, removeDisaster, clearAll } = useRiskStore();
  const [selType, setSelType] = useState<DisasterType>("flood");
  const [selSev, setSelSev] = useState<SeverityLevel>("high");
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
    <div className="flex flex-col h-full bg-[#0d0f14] text-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-gray-300" />
            <span className="text-sm font-semibold tracking-wide text-gray-100">DISASTER CONTROL</span>
          </div>
          {activeDisasters.length > 0 && (
            <button onClick={clearAll}
              className="text-[10px] px-2 py-1 rounded border font-semibold uppercase tracking-wider transition-colors text-red-400 bg-red-500/10 border-red-500/20 hover:bg-red-500/20">
              Clear All
            </button>
          )}
        </div>
        <div className="flex gap-4 text-xs text-gray-500">
          <span>Active: <span className="text-red-400 font-semibold">{activeDisasters.length}</span></span>
          <span>Total Events: <span className="text-cyan-400 font-semibold">{disasterHistory.length}</span></span>
        </div>
      </div>

      {/* Active incidents strip */}
      {activeDisasters.length > 0 && (
        <div className="px-3 pt-3 shrink-0 space-y-2">
          {activeDisasters.map((d) => {
            const meta = TYPE_META[d.type];
            const sc = SEV_COLOR[d.severity];
            const bgClass = SEV_BG[d.severity];
            return (
              <div key={d.id} className={`rounded-lg p-3 border flex items-start justify-between gap-3 ${bgClass}`}>
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${meta.color}`}>{meta.icon}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold ${sc}`}>{meta.label}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider border bg-black/20 ${sc} ${bgClass.replace('bg-', 'border-')}`}>
                        {d.severity}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400">
                      Pop. affected: <span className="text-gray-300">{d.affectedPopulation.toLocaleString()}</span> • Started {formatRelative(d.startTime)}
                    </div>
                  </div>
                </div>
                <button onClick={() => removeDisaster(d.id)}
                  className="shrink-0 p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex px-3 gap-2 py-3 shrink-0">
        {(["trigger", "history"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-[11px] font-bold tracking-wider uppercase transition-colors ${tab === t
                ? "bg-white/10 text-white border border-white/10"
                : "bg-transparent text-gray-500 border border-transparent hover:text-gray-300 hover:bg-white/5"
              }`}
          >
            {t === "trigger" ? <Target size={14} /> : <History size={14} />}
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto side-panel px-3 pb-3">
        {tab === "trigger" ? (
          <div className="space-y-5">
            {/* Disaster type */}
            <div>
              <div className="text-[10px] font-semibold mb-2 tracking-wider uppercase text-gray-500">
                Disaster Type
              </div>
              <div className="grid grid-cols-3 gap-2">
                {TYPE_OPTS.map((t) => {
                  const m = TYPE_META[t];
                  const active = selType === t;
                  return (
                    <button key={t} onClick={() => setSelType(t)}
                      className={`flex flex-col items-center gap-2 py-3 rounded-lg border transition-all ${active
                          ? `bg-blue-500/10 border-blue-500/30 ${m.color}`
                          : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                        }`}
                    >
                      {m.icon}
                      <span className="text-[11px] font-medium">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Severity */}
            <div>
              <div className="text-[10px] font-semibold mb-2 tracking-wider uppercase text-gray-500">
                Severity Level
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SEVERITY_OPTS.map((s) => {
                  const active = selSev === s;
                  const c = SEV_COLOR[s];
                  const bgClass = SEV_BG[s];
                  return (
                    <button key={s} onClick={() => setSelSev(s)}
                      className={`py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider border transition-all ${active
                          ? `${bgClass} ${c} border-opacity-30`
                          : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                        }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Zone selector */}
            <div>
              <div className="text-[10px] font-semibold mb-2 tracking-wider uppercase text-gray-500">
                Target Zone
              </div>
              <div className="space-y-1.5">
                {TRIGGER_ZONES.map((z, i) => (
                  <button key={i} onClick={() => setSelZone(i)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium border transition-all ${selZone === i
                        ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                        : "bg-white/5 border-transparent text-gray-400 hover:bg-white/10"
                      }`}
                  >
                    {z.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Trigger button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleTrigger}
              disabled={triggering}
              className={`w-full py-3 rounded-lg font-bold text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 border ${triggering
                  ? "bg-white/5 text-gray-500 border-white/10 cursor-not-allowed"
                  : `${SEV_BG[selSev]} ${SEV_COLOR[selSev]} border-opacity-40 hover:bg-opacity-20`
                }`}
            >
              {triggering ? (
                <>
                  <Activity size={16} className="animate-spin" />
                  Initializing Response...
                </>
              ) : (
                <>
                  <AlertTriangle size={16} />
                  Trigger {TYPE_META[selType].label} — {selSev}
                </>
              )}
            </motion.button>
          </div>
        ) : (
          <div className="space-y-3">
            {disasterHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <History size={24} className="text-gray-600 mb-3" />
                <div className="text-xs text-gray-500">No events triggered yet</div>
              </div>
            ) : (
              disasterHistory.map((d, i) => {
                const meta = TYPE_META[d.type];
                const sc = SEV_COLOR[d.severity];
                const bgClass = SEV_BG[d.severity];
                return (
                  <div key={d.id} className="flex gap-3">
                    {/* Timeline spine */}
                    <div className="flex flex-col items-center shrink-0">
                      <div className={`w-2.5 h-2.5 rounded-full border-2 mt-1.5 ${i === 0 ? `${bgClass.split(' ')[0]} border-current ${sc}` : "border-gray-600 bg-[#0d0f14]"}`} />
                      {i < disasterHistory.length - 1 && (
                        <div className="w-px flex-1 my-1 bg-white/10" />
                      )}
                    </div>
                    {/* Event card */}
                    <div className="bg-[#111318]/50 border border-white/5 rounded-lg p-3 flex-1 mb-1 hover:bg-[#1a1c20] transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={sc}>{meta.icon}</div>
                        <span className={`text-xs font-semibold ${sc}`}>{meta.label}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider ml-auto border bg-black/20 ${sc} ${bgClass.split(' ')[1]}`}>
                          {d.severity}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400">
                        Pop: <span className="text-gray-300">{d.affectedPopulation.toLocaleString()}</span> • {formatRelative(d.startTime)}
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
