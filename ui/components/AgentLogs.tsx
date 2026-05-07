"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRealtime } from "@/hooks/useRealtime";
import type { AgentLogEntry } from "@/services/realtime";

const AGENT_ICONS: Record<string, string> = {
  disaster: "🌪",
  route: "🛣",
  resource: "📦",
  rescue: "🚁",
  traffic: "🚦",
  explanation: "🧠",
};

const AGENT_COLORS: Record<string, string> = {
  disaster: "#ff3b3b",
  route: "#00d2ff",
  resource: "#ff9500",
  rescue: "#7c3aed",
  traffic: "#ffd700",
  explanation: "#00ff88",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#ff3b3b",
  high: "#ff6b35",
  medium: "#ffd700",
  low: "#00d2ff",
  info: "#00ff88",
};

function LogEntry({ entry, index }: { entry: AgentLogEntry; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const agentColor = AGENT_COLORS[entry.agentType] ?? "#00d2ff";
  const priorityColor = PRIORITY_COLORS[entry.priority] ?? "#00d2ff";

  return (
    <motion.div
      initial={{ opacity: 0, x: -16, height: 0 }}
      animate={{ opacity: 1, x: 0, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.28, delay: index === 0 ? 0 : 0 }}
      className="cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="glass-card p-2.5 space-y-1.5 hover:border-opacity-50 transition-all"
        style={{ borderColor: index === 0 ? `${agentColor}55` : "rgba(0,210,255,0.1)" }}>
        {/* Top row */}
        <div className="flex items-center gap-2">
          <span className="text-sm shrink-0">{AGENT_ICONS[entry.agentType] ?? "⚙"}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold shrink-0" style={{ color: agentColor }}>
                {entry.agentLabel}
              </span>
              {entry.zone && (
                <span className="text-xs px-1.5 py-0.5 rounded font-mono shrink-0"
                  style={{ background: "rgba(0,210,255,0.08)", color: "var(--neon-cyan)", fontSize: 9 }}>
                  {entry.zone}
                </span>
              )}
              <span className="text-xs px-1.5 py-0.5 rounded font-bold shrink-0"
                style={{ color: priorityColor, background: `${priorityColor}1a`, border: `1px solid ${priorityColor}33`, fontSize: 9 }}>
                {entry.priority.toUpperCase()}
              </span>
            </div>
            <div className="text-xs font-medium truncate mt-0.5" style={{ color: "var(--text-primary)" }}>
              {entry.action}
            </div>
          </div>
          <span className="text-xs shrink-0 font-mono" style={{ color: "var(--text-muted)", fontSize: 9 }}>
            {entry.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </div>

        {/* Expanded detail */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs leading-relaxed pt-1 border-t"
              style={{ color: "var(--text-secondary)", borderColor: "rgba(255,255,255,0.06)" }}
            >
              {entry.detail}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function AgentLogs() {
  const { logs, isSimulating, startSimulation, stopSimulation, clearLogs } = useRealtime();
  const [filter, setFilter] = useState<string>("all");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs, autoScroll]);

  const agentTypes = ["all", "disaster", "route", "resource", "rescue", "traffic", "explanation"];
  const filtered = filter === "all" ? logs : logs.filter((l) => l.agentType === filter);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: "rgba(0,210,255,0.12)" }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-wide neon-cyan">🤖 AI AGENT FEED</span>
            {isSimulating && (
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-glow" />
                <span className="text-xs font-mono" style={{ color: "#00ff88", fontSize: 10 }}>LIVE</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={clearLogs}
              className="px-2 py-0.5 rounded text-xs transition-all"
              style={{ color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.08)" }}>
              Clear
            </button>
            <button
              onClick={isSimulating ? stopSimulation : startSimulation}
              className="px-2 py-0.5 rounded text-xs font-bold transition-all"
              style={{
                background: isSimulating ? "rgba(255,59,59,0.15)" : "rgba(0,255,136,0.15)",
                color: isSimulating ? "#ff3b3b" : "#00ff88",
                border: `1px solid ${isSimulating ? "rgba(255,59,59,0.35)" : "rgba(0,255,136,0.35)"}`,
              }}>
              {isSimulating ? "⏹ Stop" : "▶ Start"} Sim
            </button>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-1 flex-wrap">
          {agentTypes.map((t) => (
            <button key={t} onClick={() => setFilter(t)}
              className="px-2 py-0.5 rounded text-xs font-medium transition-all capitalize"
              style={{
                background: filter === t ? `${AGENT_COLORS[t] ?? "rgba(0,210,255,1)"}22` : "rgba(255,255,255,0.04)",
                color: filter === t ? (AGENT_COLORS[t] ?? "var(--neon-cyan)") : "var(--text-muted)",
                border: `1px solid ${filter === t ? `${AGENT_COLORS[t] ?? "rgba(0,210,255,1)"}55` : "rgba(255,255,255,0.07)"}`,
                fontSize: 10,
              }}>
              {t === "all" ? "All" : `${AGENT_ICONS[t]} ${t}`}
            </button>
          ))}
        </div>
      </div>

      {/* Logs */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto side-panel px-3 py-2 space-y-1.5">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <div className="text-2xl mb-2">🤖</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                {isSimulating ? "Waiting for agent activity…" : "Start simulation to see live agent logs"}
              </div>
            </div>
          ) : (
            filtered.map((entry, i) => (
              <LogEntry key={entry.id} entry={entry} index={i} />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t shrink-0 flex items-center justify-between"
        style={{ borderColor: "rgba(0,210,255,0.08)" }}>
        <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
          {filtered.length} log{filtered.length !== 1 ? "s" : ""}
        </span>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)}
            className="accent-cyan-400 w-3 h-3" />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Auto-scroll</span>
        </label>
      </div>
    </div>
  );
}
