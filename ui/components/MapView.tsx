"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

const SEVERITY_COLOR: Record<SeverityLevel, string> = {
  critical: "#ff3b3b", high: "#ff6b35", medium: "#ffd700", low: "#00ff88",
};

const TYPE_ICON: Record<string, string> = {
  flood: "🌊", wildfire: "🔥", earthquake: "🌍", none: "⚠️",
};

const ROUTE_STATUS_COLOR: Record<string, string> = {
  active: "#00ff88", clear: "#00d2ff", congested: "#ff9500", blocked: "#ff3b3b",
};

const ALERT_COLOR: Record<string, string> = {
  red: "#ff3b3b", orange: "#ff6b35", yellow: "#ffd700", green: "#00ff88",
};

export default function MapView() {
  const { activeDisasters, removeDisaster, alertLevel } = useRiskStore();
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
    svgR: d.severity === "critical" ? 60 : d.severity === "high" ? 42 : 28,
  }));

  return (
    <div className="relative w-full h-full flex flex-col" style={{ background: "#020c1b" }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0"
        style={{ borderColor: "rgba(0,210,255,0.12)" }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse-glow"
            style={{ background: ALERT_COLOR[alertLevel] ?? "#00ff88" }} />
          <span className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: "var(--text-secondary)" }}>
            GIS LIVE MAP — {activeDisasters.length > 0
              ? `${activeDisasters.length} INCIDENT${activeDisasters.length > 1 ? "S" : ""}`
              : "ALL CLEAR"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {[
            { l: "Grid", s: showGrid, fn: setShowGrid },
            { l: "Routes", s: showRoutes, fn: setShowRoutes },
            { l: "Shelters", s: showShelters, fn: setShowShelters },
          ].map(({ l, s, fn }) => (
            <button key={l} onClick={() => fn(!s)}
              className="px-2 py-0.5 rounded text-xs font-medium transition-all"
              style={{
                background: s ? "rgba(0,210,255,0.15)" : "rgba(255,255,255,0.04)",
                color: s ? "var(--neon-cyan)" : "var(--text-muted)",
                border: `1px solid ${s ? "rgba(0,210,255,0.3)" : "rgba(255,255,255,0.08)"}`,
              }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* SVG map */}
      <div className="flex-1 relative overflow-hidden">
        <svg viewBox="0 0 500 350" className="w-full h-full"
          style={{ background: "radial-gradient(ellipse at 50% 40%, #061323 0%, #020c1b 100%)" }}>

          {/* Grid */}
          {showGrid && (
            <g opacity="0.12">
              {Array.from({ length: 21 }).map((_, i) => (
                <line key={`gv${i}`} x1={i * 25} y1="0" x2={i * 25} y2="350" stroke="#00d2ff" strokeWidth="0.4" />
              ))}
              {Array.from({ length: 15 }).map((_, i) => (
                <line key={`gh${i}`} x1="0" y1={i * 25} x2="500" y2={i * 25} stroke="#00d2ff" strokeWidth="0.4" />
              ))}
            </g>
          )}

          {/* City zones */}
          {CITY_ZONES.map((z) => (
            <g key={z.id} style={{ cursor: "pointer" }}
              onClick={() => setSelectedZone(z.id === selectedZone ? null : z.id)}>
              <rect x={z.x} y={z.y} width={z.w} height={z.h}
                fill={selectedZone === z.id ? "rgba(0,210,255,0.1)" : "rgba(0,210,255,0.04)"}
                stroke={selectedZone === z.id ? "#00d2ff" : "rgba(0,210,255,0.2)"}
                strokeWidth={selectedZone === z.id ? 1.5 : 0.7} rx="4" />
              <text x={z.x + z.w / 2} y={z.y + 15} textAnchor="middle"
                fill="rgba(0,210,255,0.55)" fontSize="9.5" fontWeight="600"
                fontFamily="JetBrains Mono, monospace">
                {z.label}
              </text>
            </g>
          ))}

          {/* Roads */}
          {ROADS.map((rd) => (
            <path key={rd.id} d={rd.d} fill="none"
              stroke={rd.blocked ? "rgba(255,59,59,0.55)" : "rgba(0,130,255,0.35)"}
              strokeWidth={rd.blocked ? 2.5 : 1.5}
              strokeDasharray={rd.blocked ? "8,4" : undefined} />
          ))}

          {/* Evacuation routes */}
          {showRoutes && routes.map((route, idx) => {
            const path = Object.values(ROUTE_PATHS)[idx % 5];
            const color = ROUTE_STATUS_COLOR[route.status] ?? "#00d2ff";
            const isActive = route.id === activeRouteId;
            return (
              <g key={route.id}>
                <path d={path} fill="none" stroke={color}
                  strokeWidth={isActive ? 3 : 1.5}
                  strokeDasharray={route.status === "blocked" ? "6,3" : isActive ? undefined : "10,4"}
                  opacity={isActive ? 1 : 0.45}
                  style={{ filter: isActive ? `drop-shadow(0 0 5px ${color})` : undefined }} />
                {isActive && route.status !== "blocked" && (
                  <circle r="4" fill={color} opacity="0.9">
                    <animateMotion dur="2.5s" repeatCount="indefinite" path={path} />
                  </circle>
                )}
              </g>
            );
          })}

          {/* Shelters */}
          {showShelters && SHELTER_MARKS.map((s) => {
            const pct = s.occ / s.cap;
            const col = pct >= 1 ? "#ff3b3b" : pct > 0.8 ? "#ff9500" : "#00ff88";
            return (
              <g key={s.id}
                onMouseEnter={() => setTooltip({ x: s.x, y: s.y - 18, label: `${s.label}: ${s.occ}/${s.cap}` })}
                onMouseLeave={() => setTooltip(null)}>
                <circle cx={s.x} cy={s.y} r="9" fill="rgba(0,0,0,0.7)"
                  stroke={col} strokeWidth="1.5"
                  style={{ filter: `drop-shadow(0 0 4px ${col})` }} />
                <text x={s.x} y={s.y + 4} textAnchor="middle" fontSize="9">🏠</text>
              </g>
            );
          })}

          {/* Disaster overlays */}
          {mapDisasters.map((d) => {
            const col = SEVERITY_COLOR[d.severity];
            return (
              <g key={d.id}>
                {[1, 1.8, 2.6].map((sc, i) => (
                  <circle key={i} cx={d.svgX} cy={d.svgY} r={d.svgR}>
                    <animate attributeName="r" from={String(d.svgR)} to={String(d.svgR * 2.5)} dur={`${1.8 + i * 0.7}s`} repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.5" to="0" dur={`${1.8 + i * 0.7}s`} repeatCount="indefinite" />
                    <animate attributeName="stroke" from={col} to={col} dur="1s" />
                    <animate attributeName="fill" from="none" to="none" dur="1s" />
                  </circle>
                ))}
                <circle cx={d.svgX} cy={d.svgY} r={d.svgR}
                  fill={`${col}1a`} stroke={col} strokeWidth="1.5" strokeDasharray="8,3"
                  style={{ filter: `drop-shadow(0 0 8px ${col})` }}>
                  <animateTransform attributeName="transform" type="rotate"
                    from={`0 ${d.svgX} ${d.svgY}`} to={`360 ${d.svgX} ${d.svgY}`}
                    dur="10s" repeatCount="indefinite" />
                </circle>
                <text x={d.svgX} y={d.svgY + 6} textAnchor="middle" fontSize="15">
                  {TYPE_ICON[d.type]}
                </text>
                <rect x={d.svgX - 32} y={d.svgY - d.svgR - 22} width="64" height="15" rx="3"
                  fill="rgba(0,0,0,0.8)" stroke={col} strokeWidth="0.8" />
                <text x={d.svgX} y={d.svgY - d.svgR - 12} textAnchor="middle" fontSize="7.5"
                  fontWeight="700" fill={col} fontFamily="JetBrains Mono, monospace">
                  {d.type.toUpperCase()} · {d.severity.toUpperCase()}
                </text>
                <g style={{ cursor: "pointer" }} onClick={() => removeDisaster(d.id)}>
                  <circle cx={d.svgX + d.svgR} cy={d.svgY - d.svgR} r="7"
                    fill="rgba(0,0,0,0.85)" stroke={col} strokeWidth="1" />
                  <text x={d.svgX + d.svgR} y={d.svgY - d.svgR + 3.5}
                    textAnchor="middle" fontSize="8" fill={col}>✕</text>
                </g>
              </g>
            );
          })}

          {/* Tooltip */}
          {tooltip && (
            <g>
              <rect x={tooltip.x - 52} y={tooltip.y - 13} width="104" height="14" rx="3"
                fill="rgba(0,0,0,0.9)" stroke="rgba(0,210,255,0.4)" strokeWidth="0.8" />
              <text x={tooltip.x} y={tooltip.y - 3} textAnchor="middle"
                fontSize="7.5" fill="#00d2ff" fontFamily="Inter, sans-serif">
                {tooltip.label}
              </text>
            </g>
          )}

          {/* Compass */}
          <g transform="translate(468,28)">
            <circle cx="0" cy="0" r="15" fill="rgba(0,0,0,0.65)" stroke="rgba(0,210,255,0.3)" strokeWidth="1" />
            <text x="0" y="-6" textAnchor="middle" fontSize="8" fill="#00d2ff" fontWeight="700">N</text>
            <text x="0" y="13" textAnchor="middle" fontSize="7" fill="#4a7a9b">S</text>
            <line x1="0" y1="-4" x2="0" y2="-1" stroke="#00d2ff" strokeWidth="1.5" />
          </g>

          {/* Scale */}
          <g transform="translate(18,338)">
            <line x1="0" y1="0" x2="48" y2="0" stroke="rgba(0,210,255,0.45)" strokeWidth="1.5" />
            <line x1="0" y1="-3" x2="0" y2="3" stroke="rgba(0,210,255,0.45)" strokeWidth="1" />
            <line x1="48" y1="-3" x2="48" y2="3" stroke="rgba(0,210,255,0.45)" strokeWidth="1" />
            <text x="24" y="-5" textAnchor="middle" fontSize="7" fill="rgba(0,210,255,0.55)">2 km</text>
          </g>
        </svg>

        {/* Legend */}
        <div className="absolute bottom-3 right-3 glass-card p-3 space-y-1">
          <div className="text-xs font-bold mb-2 tracking-widest" style={{ color: "var(--text-secondary)" }}>LEGEND</div>
          {[
            { c: "#00ff88", l: "Clear / Active Route" },
            { c: "#ff9500", l: "Congested Route" },
            { c: "#ff3b3b", l: "Blocked Route" },
            { c: "#00d2ff", l: "Shelter (Open)" },
            { c: "#ff3b3b", l: "Shelter (Full)" },
          ].map(({ c, l }) => (
            <div key={l} className="flex items-center gap-2">
              <div className="w-3 h-1.5 rounded-full shrink-0" style={{ background: c }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{l}</span>
            </div>
          ))}
        </div>

        {/* Coords */}
        <div className="absolute top-2 left-2 font-mono text-xs" style={{ color: "rgba(0,210,255,0.35)" }}>
          37.7749°N  122.4194°W
        </div>
      </div>
    </div>
  );
}
