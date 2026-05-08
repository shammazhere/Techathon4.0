"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Route, Package, Helicopter, TrafficCone, BrainCircuit, Activity, Trash2, Play, Square } from "lucide-react";
import { useRealtime } from "@/hooks/useRealtime";
import type { AgentLogEntry } from "@/services/realtime";

const AGENT_ICONS: Record<string, React.ReactNode> = {
  disaster: <AlertTriangle size={12} />,
  route: <Route size={12} />,
  resource: <Package size={12} />,
  rescue: <Helicopter size={12} />,
  traffic: <TrafficCone size={12} />,
  explanation: <BrainCircuit size={12} />,
};

const AGENT_COLORS: Record<string, string> = {
  disaster: "text-red-400",
  route: "text-blue-400",
  resource: "text-amber-400",
  rescue: "text-purple-400",
  traffic: "text-orange-400",
  explanation: "text-emerald-400",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "text-red-400",
  high: "text-orange-400",
  medium: "text-amber-400",
  low: "text-blue-400",
  info: "text-emerald-400",
};

function LogEntry({ entry }: { entry: AgentLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const agentColorClass = AGENT_COLORS[entry.agentType] ?? "text-blue-400";
  const priorityColor = PRIORITY_COLORS[entry.priority] ?? "text-gray-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: -4, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      className="cursor-pointer border-b border-white/5 last:border-0"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="py-2.5 px-1 hover:bg-white/5 transition-colors rounded">
        {/* Top row */}
        <div className="flex items-start gap-2.5">
          <div className={`mt-0.5 ${agentColorClass}`}>
            {AGENT_ICONS[entry.agentType] ?? <Activity size={12} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[10px] font-medium ${agentColorClass}`}>
                {entry.agentLabel}
              </span>
              {entry.zone && (
                <span className="text-[9px] px-1 py-0.5 rounded-sm bg-white/5 text-gray-400 border border-white/5 uppercase tracking-wider">
                  {entry.zone}
                </span>
              )}
              <span className={`text-[9px] font-bold uppercase tracking-wider ${priorityColor}`}>
                {entry.priority}
              </span>
              <span className="text-[9px] ml-auto font-mono text-gray-500">
                {mounted ? entry.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : '---'}
              </span>
            </div>
            <div className="text-[11px] text-gray-300">
              {entry.action}
            </div>
          </div>
        </div>

        {/* Expanded detail */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-[10px] leading-relaxed mt-2 pt-2 border-t border-white/5 text-gray-500 font-mono"
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
  const [autoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs, autoScroll]);

  const agentTypes = ["all", "disaster", "route", "resource", "rescue", "traffic", "explanation"];
  const filtered = filter === "all" ? logs : logs.filter((l) => l.agentType === filter);

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-gray-400" />
            <span className="text-xs font-semibold tracking-wide text-gray-200">SYSTEM LOGS</span>
            {isSimulating && (
              <div className="flex items-center gap-1.5 ml-2 px-1.5 py-0.5 rounded bg-emerald-500/10">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-bold text-emerald-400 tracking-wider">LIVE</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={clearLogs} className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
              <Trash2 size={12} />
            </button>
            <button onClick={isSimulating ? stopSimulation : startSimulation}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-colors ${
                isSimulating ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              }`}>
              {isSimulating ? <Square size={10} className="fill-current" /> : <Play size={10} className="fill-current" />}
              {isSimulating ? "STOP" : "START"}
            </button>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-1 flex-wrap">
          {agentTypes.map((t) => (
            <button key={t} onClick={() => setFilter(t)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-medium tracking-wide uppercase transition-colors ${
                filter === t ? "bg-white/10 text-white" : "bg-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5"
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Logs */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto side-panel p-3">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <Activity size={16} className="text-gray-600 mb-2" />
              <div className="text-[10px] text-gray-500">
                {isSimulating ? "Awaiting activity..." : "Start simulation to view logs"}
              </div>
            </div>
          ) : (
            filtered.map((entry) => <LogEntry key={entry.id} entry={entry} />)
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
