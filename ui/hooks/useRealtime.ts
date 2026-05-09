"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { generateLogEntry, type AgentLogEntry, startRealtimeSimulation, simulateDisasterSpread } from "@/services/realtime";

const MAX_LOGS = 50;

export function useRealtime() {
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [tickCount, setTickCount] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const cleanupRef = useRef<(() => void)[]>([]);
  const logIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Seed initial logs on mount to avoid hydration mismatch
  useEffect(() => {
    const initial: AgentLogEntry[] = Array.from({ length: 8 }, (_, i) => ({
      ...generateLogEntry(),
      timestamp: new Date(Date.now() - (8 - i) * 12000),
    }));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLogs(initial);
  }, []);

  const startSimulation = useCallback(() => {
    if (isSimulating) return;
    setIsSimulating(true);

    // Start realtime simulation loops
    const stopRealtime = startRealtimeSimulation();
    const stopSpread = simulateDisasterSpread();
    cleanupRef.current.push(stopRealtime, stopSpread);

    // Generate new log entries periodically
    logIntervalRef.current = setInterval(() => {
      const newLog = generateLogEntry();
      setLogs((prev) => [newLog, ...prev].slice(0, MAX_LOGS));
      setTickCount((n) => n + 1);
    }, 3500);
  }, [isSimulating]);

  const stopSimulation = useCallback(() => {
    setIsSimulating(false);
    cleanupRef.current.forEach((fn) => fn());
    cleanupRef.current = [];
    if (logIntervalRef.current) {
      clearInterval(logIntervalRef.current);
      logIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupRef.current.forEach((fn) => fn());
      if (logIntervalRef.current) clearInterval(logIntervalRef.current);
    };
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  return {
    logs,
    tickCount,
    isSimulating,
    startSimulation,
    stopSimulation,
    clearLogs,
  };
}
