"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import RoutePanel from "@/components/RoutePanel";
import { startRealtimeSimulation } from "@/services/realtime";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function MapPage() {
  useEffect(() => {
    const stop = startRealtimeSimulation();
    return stop;
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <Navbar />
      <div className="flex-1 overflow-hidden flex">
        {/* Full-width map */}
        <div className="flex-1 overflow-hidden">
          <MapView autoCenter={true} />
        </div>
        {/* Side: route panel */}
        <aside className="w-80 shrink-0 border-l overflow-hidden flex flex-col"
          style={{ borderColor: "rgba(0,210,255,0.1)" }}>
          <RoutePanel />
        </aside>
      </div>
    </div>
  );
}
