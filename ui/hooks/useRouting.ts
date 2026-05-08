"use client";

import { useState, useCallback } from "react";
import { useRouteStore, type EvacuationRoute } from "@/store/routeStore";

export function useRouting() {
  const { routes, activeRouteId, selectRoute, updateRouteStatus, optimizeSignals } = useRouteStore();
  const [isComputing, setIsComputing] = useState(false);
  const [lastOptimized, setLastOptimized] = useState<Date | null>(null);

  const activeRoute = routes.find((r) => r.id === activeRouteId) ?? null;

  const computeOptimalRoute = useCallback(
    async (fromZone: string) => {
      setIsComputing(true);
      // Simulate A* computation delay
      await new Promise((r) => setTimeout(r, 1800));

      // Find safest available route for zone
      const available = routes
        .filter((r) => r.fromZone === fromZone && r.status !== "blocked")
        .sort((a, b) => a.riskScore - b.riskScore);

      if (available[0]) selectRoute(available[0].id);
      setIsComputing(false);
      return available[0] ?? null;
    },
    [routes, selectRoute]
  );

  const runSignalOptimization = useCallback(async () => {
    setIsComputing(true);
    await new Promise((r) => setTimeout(r, 1200));
    optimizeSignals();
    setLastOptimized(new Date());
    setIsComputing(false);
  }, [optimizeSignals]);

  const safeRoutes = routes.filter((r) => r.status !== "blocked");
  const blockedRoutes = routes.filter((r) => r.status === "blocked");
  const avgRisk = routes.length
    ? Math.round(routes.reduce((s, r) => s + r.riskScore, 0) / routes.length)
    : 0;

  const getRiskColor = (score: number) => {
    if (score >= 60) return "#ff3b3b";
    if (score >= 35) return "#ff9500";
    if (score >= 15) return "#ffd700";
    return "#00ff88";
  };

  const getStatusColor = (status: EvacuationRoute["status"]) => {
    const map = {
      active: "#00ff88",
      clear: "#00d2ff",
      congested: "#ff9500",
      blocked: "#ff3b3b",
    };
    return map[status];
  };

  return {
    routes,
    activeRoute,
    activeRouteId,
    isComputing,
    lastOptimized,
    safeRoutes,
    blockedRoutes,
    avgRisk,
    selectRoute,
    updateRouteStatus,
    computeOptimalRoute,
    runSignalOptimization,
    getRiskColor,
    getStatusColor,
  };
}
