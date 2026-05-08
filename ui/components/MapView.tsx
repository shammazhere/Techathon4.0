"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Map as MapIcon, ShieldAlert } from "lucide-react";
import { useRiskStore, type DisasterType, type SeverityLevel } from "@/store/riskStore";
import { useRouteStore } from "@/store/routeStore";
import { useResourceStore } from "@/store/resourceStore";

const CITY_ZONES = [
  { id: "z1", label: "Zone A", x: 120, y: 80, w: 160, h: 110 },
  { id: "z2", label: "Zone B", x: 280, y: 80, w: 140, h: 110 },
  { id: "z3", label: "Zone C", x: 120, y: 200, w: 160, h: 130 },
  { id: "z4", label: "Zone D", x: 60, y: 110, w: 70, h: 220 },
  { id: "z5", label: "Zone E", x: 200, y: 170, w: 140, h: 100 },
  { id: "z6", label: "Zone F", x: 340, y: 200, w: 100, h: 130 },
];

const ROADS = [
  { id: "r1", d: "M 150,40 L 150,340", blocked: false },
  { id: "r2", d: "M 280,40 L 280,340", blocked: false },
  { id: "r3", d: "M 40,160 L 460,160", blocked: false },
  { id: "r4", d: "M 40,240 L 460,240", blocked: true },
  { id: "r5", d: "M 80,80 L 400,280", blocked: false },
  { id: "r6", d: "M 100,300 L 380,100", blocked: true },
];

const SHELTER_MARKS = [
  { id: "s1", x: 195, y: 130, label: "Westpark Stadium", cap: 5000, occ: 1200 },
  { id: "s2", x: 310, y: 100, label: "North High School", cap: 800, occ: 800 },
  { id: "s3", x: 330, y: 220, label: "East Community Hall", cap: 500, occ: 320 },
  { id: "s4", x: 150, y: 280, label: "Harbor Emergency Camp", cap: 1200, occ: 980 },
];

const ROUTE_PATHS: Record<string, string> = {
  r1: "M 150,80 Q 130,140 90,200 Q 80,250 90,290",
  r2: "M 310,90 Q 320,140 330,200 Q 340,230 330,270",
  r3: "M 150,270 Q 180,220 220,200 Q 260,180 280,160",
  r4: "M 80,150 Q 120,200 150,270 Q 160,290 175,300",
  r5: "M 225,170 Q 240,145 270,130 Q 300,118 310,100",
};

// Refined Professional Colors
const SEVERITY_COLOR: Record<SeverityLevel, string> = {
  critical: "#f87171", // red-400
  high: "#fb923c",     // orange-400
  medium: "#fbbf24",   // amber-400
  low: "#34d399",      // emerald-400
};

const TYPE_ICON: Record<string, string> = {
  flood: "🌊", wildfire: "🔥", earthquake: "🌍", none: "⚠️",
};

const ROUTE_STATUS_COLOR: Record<string, string> = {
  active: "#34d399",    // emerald-400
  clear: "#60a5fa",     // blue-400
  congested: "#fbbf24", // amber-400
  blocked: "#f87171",   // red-400
};

export default function MapView() {
  const { activeDisasters, removeDisaster } = useRiskStore();
  const { routes, activeRouteId } = useRouteStore();
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string } | null>(null);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showShelters, setShowShelters] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  // Map disasters to SVG coords
  const mapDisasters = activeDisasters.map((d, i) => ({
    ...d,
    svgX: 120 + (i % 3) * 110 + 40,
    svgY: 100 + Math.floor(i / 3) * 120 + 30,
    svgR: d.severity === "critical" ? 50 : d.severity === "high" ? 35 : 25,
  }));

  return (
    <div className="relative w-full h-full bg-[#030508] overflow-hidden">

      {/* Map Controls Overlay (Floating top-left center) */}
      <div className="absolute top-6 left-[360px] z-20 flex items-center gap-2 bg-[#080B10]/90 backdrop-blur-md border border-white/[0.05] rounded-full px-3 py-1.5 shadow-xl">
        <MapIcon size={14} className="text-gray-400" />
        <div className="w-px h-3 bg-white/10 mx-1" />
        {[
          { l: "Grid", s: showGrid, fn: setShowGrid },
          { l: "Routes", s: showRoutes, fn: setShowRoutes },
          { l: "Shelters", s: showShelters, fn: setShowShelters },
        ].map(({ l, s, fn }) => (
          <button key={l} onClick={() => fn(!s)}
            className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all ${s ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]"
              }`}>
            {l}
          </button>
        ))}
      </div>

      {/* SVG map */}
      <svg viewBox="0 0 500 350" preserveAspectRatio="xMidYMid slice" className="w-full h-full"
        style={{ background: "radial-gradient(ellipse at 50% 50%, #080c14 0%, #030508 100%)" }}>

        {/* Grid */}
        {showGrid && (
          <g opacity="0.4">
            {Array.from({ length: 21 }).map((_, i) => (
              <line key={`gv${i}`} x1={i * 25} y1="0" x2={i * 25} y2="350" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
            ))}
            {Array.from({ length: 15 }).map((_, i) => (
              <line key={`gh${i}`} x1="0" y1={i * 25} x2="500" y2={i * 25} stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
            ))}
          </g>
        )}

        {/* City zones */}
        {CITY_ZONES.map((z) => (
          <g key={z.id} style={{ cursor: "pointer" }}
            onClick={() => setSelectedZone(z.id === selectedZone ? null : z.id)}>
            <rect x={z.x} y={z.y} width={z.w} height={z.h}
              fill={selectedZone === z.id ? "rgba(96,165,250,0.05)" : "rgba(255,255,255,0.01)"}
              stroke={selectedZone === z.id ? "rgba(96,165,250,0.5)" : "rgba(255,255,255,0.05)"}
              strokeWidth={selectedZone === z.id ? 1.5 : 1} rx="8" />
            <text x={z.x + z.w / 2} y={z.y + 16} textAnchor="middle"
              fill={selectedZone === z.id ? "#60a5fa" : "rgba(255,255,255,0.2)"} fontSize="10" fontWeight="600"
              fontFamily="Inter, sans-serif" letterSpacing="1">
              {z.label}
            </text>
          </g>
        ))}

        {/* Roads */}
        {ROADS.map((rd) => (
          <path key={rd.id} d={rd.d} fill="none"
            stroke={rd.blocked ? "rgba(248,113,113,0.3)" : "rgba(255,255,255,0.06)"}
            strokeWidth={rd.blocked ? 2 : 1.5}
            strokeDasharray={rd.blocked ? "6,4" : undefined} />
        ))}

        {/* Evacuation routes */}
        {showRoutes && routes.map((route, idx) => {
          const path = Object.values(ROUTE_PATHS)[idx % 5];
          const color = ROUTE_STATUS_COLOR[route.status] ?? "#60a5fa";
          const isActive = route.id === activeRouteId;
          return (
            <g key={route.id}>
              <path d={path} fill="none" stroke={color}
                strokeWidth={isActive ? 3 : 1.5}
                strokeDasharray={route.status === "blocked" ? "6,3" : isActive ? undefined : "8,4"}
                opacity={isActive ? 0.9 : 0.3}
                style={{ filter: isActive ? `drop-shadow(0 0 6px ${color}66)` : undefined }} />
              {isActive && route.status !== "blocked" && (
                <circle r="3.5" fill={color} opacity="1">
                  <animateMotion dur="3s" repeatCount="indefinite" path={path} />
                </circle>
              )}
            </g>
          );
        })}

        {/* Shelters */}
        {showShelters && SHELTER_MARKS.map((s) => {
          const pct = s.occ / s.cap;
          const col = pct >= 1 ? "#f87171" : pct > 0.8 ? "#fb923c" : "#34d399";
          return (
            <g key={s.id}
              onMouseEnter={() => setTooltip({ x: s.x, y: s.y - 18, label: `${s.label}: ${s.occ}/${s.cap}` })}
              onMouseLeave={() => setTooltip(null)}>
              <circle cx={s.x} cy={s.y} r="7" fill="#0A0C10"
                stroke={col} strokeWidth="1.5"
                style={{ filter: `drop-shadow(0 0 4px ${col}44)` }} />
              <rect x={s.x - 3} y={s.y - 3} width="6" height="6" fill={col} rx="1" opacity="0.8" />
            </g>
          );
        })}

        {/* Disaster overlays */}
        {mapDisasters.map((d) => {
          const col = SEVERITY_COLOR[d.severity];
          return (
            <g key={d.id}>
              <circle cx={d.svgX} cy={d.svgY} r={d.svgR}
                fill={`${col}1a`} stroke={col} strokeWidth="1" strokeDasharray="4,4"
                style={{ filter: `drop-shadow(0 0 10px ${col}33)` }}>
                <animateTransform attributeName="transform" type="rotate"
                  from={`0 ${d.svgX} ${d.svgY}`} to={`360 ${d.svgX} ${d.svgY}`}
                  dur="20s" repeatCount="indefinite" />
              </circle>
              {/* Center icon bg */}
              <circle cx={d.svgX} cy={d.svgY} r="12" fill="#0A0C10" stroke={col} strokeWidth="1.5" />
              <text x={d.svgX} y={d.svgY + 4} textAnchor="middle" fontSize="10">
                {TYPE_ICON[d.type]}
              </text>
              <rect x={d.svgX - 32} y={d.svgY - d.svgR - 20} width="64" height="14" rx="4"
                fill="rgba(10,12,16,0.9)" stroke={col} strokeWidth="0.5" />
              <text x={d.svgX} y={d.svgY - d.svgR - 10} textAnchor="middle" fontSize="7"
                fontWeight="600" fill={col} fontFamily="Inter, sans-serif" letterSpacing="0.5">
                {d.type.toUpperCase()} · {d.severity.toUpperCase()}
              </text>
              <g style={{ cursor: "pointer" }} onClick={() => removeDisaster(d.id)}>
                <circle cx={d.svgX + d.svgR} cy={d.svgY - d.svgR} r="6"
                  fill="rgba(10,12,16,0.9)" stroke={col} strokeWidth="1" />
                <text x={d.svgX + d.svgR} y={d.svgY - d.svgR + 2.5}
                  textAnchor="middle" fontSize="6" fill={col}>✕</text>
              </g>
            </g>
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <g>
            <rect x={tooltip.x - 52} y={tooltip.y - 13} width="104" height="14" rx="4"
              fill="rgba(10,12,16,0.95)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <text x={tooltip.x} y={tooltip.y - 4} textAnchor="middle"
              fontSize="7" fill="#e5e7eb" fontFamily="Inter, sans-serif" fontWeight="500">
              {tooltip.label}
            </text>
          </g>
        )}

      </svg>

      {/* Map Legend (Floating Bottom Center, tucked into empty space) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-[#080B10]/90 backdrop-blur-md border border-white/[0.05] p-5 rounded-2xl shadow-xl w-52 pointer-events-none">
        <div className="text-[10px] font-bold mb-4 tracking-widest uppercase text-gray-500 flex items-center gap-2">
          <Layers size={12} className="text-gray-400" /> Terrain Legend
        </div>

        <div className="space-y-4">
          <div className="space-y-2.5">
            {[
              { c: "#60a5fa", l: "Clear Route", type: "line" },
              { c: "#fbbf24", l: "Congested", type: "dashed" },
              { c: "#f87171", l: "Blocked", type: "dotted" },
            ].map(({ c, l, type }) => (
              <div key={l} className="flex items-center gap-3">
                <div className="w-6 shrink-0 flex items-center justify-center">
                  <div className={`h-[2px] w-full ${type === "line" ? "" : type === "dashed" ? "border-t-2 border-dashed" : "border-t-2 border-dotted"}`} style={{ borderColor: type !== "line" ? c : "transparent", backgroundColor: type === "line" ? c : "transparent" }} />
                </div>
                <span className="text-xs text-gray-300 font-medium tracking-wide">{l}</span>
              </div>
            ))}
          </div>

          <div className="h-px w-full bg-white/[0.05]" />

          <div className="space-y-2.5">
            {[
              { c: "#34d399", l: "Shelter (Open)" },
              { c: "#f87171", l: "Shelter (Full)" },
            ].map(({ c, l }) => (
              <div key={l} className="flex items-center gap-3">
                <div className="w-6 shrink-0 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full border-[1.5px] border-current flex items-center justify-center" style={{ color: c }}>
                    <div className="w-1.5 h-1.5 rounded-sm bg-current opacity-80" />
                  </div>
                </div>
                <span className="text-xs text-gray-300 font-medium tracking-wide">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
