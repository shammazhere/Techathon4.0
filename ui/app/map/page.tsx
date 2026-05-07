"use client";

import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import RoutePanel from "@/components/RoutePanel";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function MapPage() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <Navbar />
      <div className="flex-1 overflow-hidden flex">
        {/* Full-width map */}
        <div className="flex-1 overflow-hidden">
          <MapView />
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
