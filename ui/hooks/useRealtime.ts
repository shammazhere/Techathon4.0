"use client";

import { useEffect, useState, useCallback } from "react";
import { disasterApi, routeApi, simulationApi } from "@/services/api";
import { wsService } from "@/services/websocket";
import { useRiskStore } from "@/store/riskStore";
import { useRouteStore } from "@/store/routeStore";
import { useResourceStore } from "@/store/resourceStore";

export type AgentLogEntry = {
  id: string;
  agentType: string;
  agentLabel: string;
  action: string;
  detail: string;
  priority: "critical" | "high" | "medium" | "low" | "info";
  timestamp: Date;
  zone?: string;
};

export function useRealtime() {
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [tickCount, setTickCount] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchLiveState = useCallback(async () => {
    try {
      const riskData = await simulationApi.getRiskCells();
      if (Array.isArray(riskData)) {
        useRiskStore.setState({ riskCells: riskData });
      }
      
      const resourceData: any = await simulationApi.getResources();
      if (resourceData) {
        useResourceStore.setState({
          units: (resourceData.units || []).map((u: any, i: number) => ({
             ...u,
             id: u.id || u.resource_id || `unit-${i}`,
             type: u.type || 'ambulance',
             lat: u.lat || (u.coords && u.coords[0]),
             lng: u.lng || (u.coords && u.coords[1]),
             status: u.status || 'available'
          })),
          shelters: (resourceData.shelters || []).map((s: any, i: number) => ({
             ...s,
             id: s.id || s.shelter_id || `shelter-${i}`,
             occupied: s.occupied || s.current_occupants || 0,
             capacity: s.capacity || s.max_capacity || 0,
             // Map Kochi nodes approx lat/lng
             lat: s.lat || (s.node === 1 ? 9.9712 : 9.9683),
             lng: s.lng || (s.node === 1 ? 76.2729 : 76.2425),
          }))
        });
      }
    } catch (e) {
      console.error("Failed to fetch live state", e);
    }
  }, []);

  useEffect(() => {
    fetchLiveState();
    // Connect WebSocket
    wsService.connect();

    // Listeners
    const handleOrchestration = (data: any) => {
      const riskStore = useRiskStore.getState();
      const routeStore = useRouteStore.getState();

      setLogs((prev) => [{
        id: `log-${Date.now()}`,
        agentType: "explanation",
        agentLabel: "Orchestrator",
        action: "Pipeline Complete",
        detail: `Agents finished analyzing disaster. ${data.simulation?.evac_needed || 0} people affected.`,
        priority: "high",
        timestamp: new Date()
      }, ...prev]);
      
      if (data.simulation) {
         useRiskStore.setState({
           totalAffected: data.simulation.evac_needed || 0,
           systemStatus: data.simulation.severity === "CRITICAL" ? "critical" : "active"
         });
         // Refetch risk grid after disaster update
         fetchLiveState();
      }

      if (data.agents && data.agents.summary) {
        setLogs((prev) => [{
          id: `log-summary-${Date.now()}`,
          agentType: "explanation",
          agentLabel: "Summary",
          action: "Status Update",
          detail: data.agents.summary,
          priority: "info",
          timestamp: new Date()
        }, ...prev]);
      }
    };

    const handleTick = (data: any) => {
      setTickCount((n) => n + 1);
      
      const routeStore = useRouteStore.getState();
      
      // Increment stats based on tick events
      if (data.data && data.data.events) {
        const moveCount = data.data.events.filter((e: any) => e.event === "moved").length;
        const rerouteCount = data.data.events.filter((e: any) => e.event === "rerouted").length;
        
        useRouteStore.setState({
          evacueesMoved: routeStore.evacueesMoved + (moveCount * 50), // Arbitrary multiplier for effect
          reroutedVehicles: routeStore.reroutedVehicles + rerouteCount
        });
      }
    };

    const handleHazard = (data: any) => {
      setLogs((prev) => [{
        id: `log-${Date.now()}`,
        agentType: "route",
        agentLabel: "Hazard Monitor",
        action: "Road Blocked",
        detail: `Road blocked mid-transit! Triggering A* reroute.`,
        priority: "critical",
        timestamp: new Date()
      }, ...prev]);
    };

    wsService.on("orchestration_complete", handleOrchestration);
    wsService.on("live_tracking_tick", handleTick);
    wsService.on("hazard_detected", handleHazard);

    return () => {
      wsService.off("orchestration_complete", handleOrchestration);
      wsService.off("live_tracking_tick", handleTick);
      wsService.off("hazard_detected", handleHazard);
      wsService.disconnect();
    };
  }, []);

  const startSimulation = useCallback(async () => {
    if (isSimulating) return;
    setIsSimulating(true);

    try {
      setLogs([{
        id: `log-start`,
        agentType: "disaster",
        agentLabel: "System",
        action: "Disaster Triggered",
        detail: "Calling backend orchestrator...",
        priority: "info",
        timestamp: new Date()
      }]);

      const response = await disasterApi.triggerDisaster({ type: "flood" });
      const simData = response.data;

      if (simData && simData.weather) {
        useRiskStore.getState().updateWeather(simData.weather);
      }

      if (simData && simData.resources) {
        useResourceStore.setState({
          units: (simData.resources.ambulances || []).map((u: any, i: number) => ({
             ...u,
             id: u.id || u.resource_id || `unit-${i}`,
             type: u.type || 'ambulance',
             lat: u.lat || (u.coords && u.coords[0]),
             lng: u.lng || (u.coords && u.coords[1]),
             status: u.status || 'available'
          })),
          shelters: (simData.resources.shelters || []).map((s: any, i: number) => ({
             ...s,
             id: s.id || s.shelter_id || `shelter-${i}`,
             occupied: s.occupied || s.current_occupants || 0,
             capacity: s.capacity || s.max_capacity || 0,
             lat: s.lat || (s.node === 1 ? 9.9712 : 9.9683),
             lng: s.lng || (s.node === 1 ? 76.2729 : 76.2425),
          }))
        });
      }
      
      // Automatically start live tracking loop
      setInterval(async () => {
         try {
           await routeApi.tickSimulation();
         } catch(e) {}
      }, 2000);
      
    } catch (err) {
      console.error(err);
      setIsSimulating(false);
    }
  }, [isSimulating]);

  const stopSimulation = useCallback(() => {
    setIsSimulating(false);
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
