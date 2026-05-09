"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ZoomControl, MapContainer, TileLayer, Marker, Popup,
  Polyline, Circle, useMap,
} from "react-leaflet";

import L from "leaflet";
import { useRiskStore, type SeverityLevel } from "@/store/riskStore";
import { useRouteStore, type EvacuationRoute } from "@/store/routeStore";
import { useResourceStore } from "@/store/resourceStore";

// ─── Constants ─────────────────────────────────────────────────────────────────
const SEVERITY_COLOR: Record<SeverityLevel, string> = {
  critical: "#f87171", high: "#fb923c", medium: "#fbbf24", low: "#34d399",
};

const UNIT_COLORS: Record<string, string> = {
  ambulance: "#f87171",
  firetruck: "#fb923c",
  rescue: "#60a5fa",
  supply: "#a78bfa",
};

const UNIT_ICONS: Record<string, string> = {
  ambulance: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M10 10H6"/><path d="M8 8v4"/><path d="M17 18a2 2 0 1 0 4 0 2 2 0 1 0-4 0"/><path d="M3 18a2 2 0 1 0 4 0 2 2 0 1 0-4 0"/><path d="M7 18h10"/><path d="M3 18V6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v2h3l3 3v5h-2"/><path d="M16 8h4l3 3"/></svg>`,
  firetruck: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#fb923c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M12 12V4"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 12h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M20 12h2"/><path d="m6 20 6-6 6 6"/><path d="M12 14v8"/></svg>`,
  rescue: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="M2 12h4"/><path d="M18 12h4"/></svg>`,
  supply: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,
};

// ─── Route risk → color mapping ────────────────────────────────────────────────
function routeColor(riskScore: number, status: string): string {
  if (status === "blocked") return "#ef4444";
  if (status === "congested") return "#fbbf24";
  if (riskScore >= 50) return "#ef4444";
  if (riskScore >= 25) return "#fb923c";
  return "#22c55e";
}

// ─── Auto-center helper ────────────────────────────────────────────────────────
function MapAutoCenter({ disasters }: { disasters: { lat: number; lng: number }[] }) {
  const map = useMap();
  useEffect(() => {
    if (disasters.length > 0) {
      const latest = disasters[disasters.length - 1];
      map.flyTo([latest.lat, latest.lng], 12, { duration: 2 });
    }
  }, [disasters, map]);
  return null;
}

// ─── Animated route polyline (marching ants via CSS) ───────────────────────────
function AnimatedPolyline({ positions, color, weight, dashArray, glow }: {
  positions: [number, number][];
  color: string;
  weight: number;
  dashArray?: string;
  glow?: boolean;
}) {
  return (
    <>
      {/* Glow layer behind */}
      {glow && (
        <Polyline
          positions={positions}
          pathOptions={{
            color,
            weight: weight + 6,
            opacity: 0.25,
            lineCap: "round",
            lineJoin: "round",
          }}
        />
      )}
      <Polyline
        positions={positions}
        pathOptions={{
          color,
          weight,
          opacity: 0.85,
          dashArray: dashArray || undefined,
          lineCap: "round",
          lineJoin: "round",
        }}
      />
    </>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function MapView({ autoCenter = false }: { autoCenter?: boolean }) {
  const { activeDisasters, removeDisaster } = useRiskStore();
  const { routes, activeRouteId } = useRouteStore();
  const { shelters, units } = useResourceStore();
  const [mounted, setMounted] = useState(false);
  const [pulsePhase, setPulsePhase] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Pulse animation for fire circles
  useEffect(() => {
    if (activeDisasters.length === 0) return;
    const interval = setInterval(() => {
      setPulsePhase((p) => (p + 1) % 100);
    }, 80);
    return () => clearInterval(interval);
  }, [activeDisasters.length]);

  const safestRoute = useMemo(() => {
    const open = routes.filter(r => r.status !== "blocked");
    return open.length ? open.reduce((a, b) => a.riskScore < b.riskScore ? a : b) : null;
  }, [routes]);

  if (!mounted) return <div className="w-full h-full bg-[#080B10]" />;


  // ── Icon factories ─────────────────────────────────────────────────────────
  const createUnitIcon = (type: string) => {
    const color = UNIT_COLORS[type] || "#60a5fa";
    const svg = UNIT_ICONS[type] || UNIT_ICONS.rescue;
    return L.divIcon({
      html: `
        <div style="
          display:flex;align-items:center;justify-content:center;
          width:32px;height:32px;border-radius:8px;
          background:rgba(10,15,25,0.9);
          border:2px solid ${color};
          box-shadow:0 0 12px ${color}60, 0 0 4px ${color}40;
        ">${svg}</div>
      `,
      className: "",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  const createShelterIcon = (occupied: number, capacity: number, status: string) => {
    const pct = capacity > 0 ? occupied / capacity : 0;
    const borderColor = status === "compromised" ? "#ef4444"
      : status === "full" ? "#fb923c"
        : pct > 0.8 ? "#fbbf24"
          : "#22c55e";
    return L.divIcon({
      html: `
        <div style="
          display:flex;align-items:center;justify-content:center;
          width:28px;height:28px;border-radius:6px;
          background:rgba(10,15,25,0.9);
          border:2px solid ${borderColor};
          box-shadow:0 0 10px ${borderColor}50;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${borderColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
      `,
      className: "",
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  };

  const createFireIcon = () => L.divIcon({
    html: `<div style="font-size:28px;filter:drop-shadow(0 0 10px rgba(251,146,60,0.9));transform:translate(-50%,-50%);">🔥</div>`,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  // ── Pulse math ─────────────────────────────────────────────────────────────
  const pulseOpacity = 0.08 + Math.sin(pulsePhase * 0.063) * 0.06;

  return (
    <div className="relative w-full h-full bg-[#080B10] overflow-hidden">
      <MapContainer
        center={[20.5937, 78.9629]}
        zoom={5}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        {autoCenter && <MapAutoCenter disasters={activeDisasters} />}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />

        {/* ═══════ FIRE ZONE CIRCLES ═══════ */}
        {activeDisasters.map((d) => (
          <Circle
            key={`fire-zone-${d.id}`}
            center={[d.lat, d.lng]}
            radius={d.radius * 1000} // km → meters
            pathOptions={{
              color: SEVERITY_COLOR[d.severity],
              weight: 2,
              opacity: 0.6,
              fillColor: SEVERITY_COLOR[d.severity],
              fillOpacity: pulseOpacity,
              dashArray: "8 6",
            }}
          />
        ))}

        {/* Slowly Spreading Fire Wave */}
        {activeDisasters.map((d) => {
          // pulsePhase increments by 1 every frame (approx 60/sec).
          // We want a wave that goes from 400 to 1200 over 3-4 seconds
          const waveCycle = (pulsePhase % 240) / 240; // 0 to 1
          const spreadRadius = (d.radius * 400) + (waveCycle * d.radius * 800);
          const waveOpacity = 1 - waveCycle; // Fades out as it expands

          return (
            <Circle
              key={`fire-wave-${d.id}`}
              center={[d.lat, d.lng]}
              radius={spreadRadius}
              pathOptions={{
                color: "#ff4500",
                weight: 3,
                opacity: waveOpacity * 0.8,
                fillColor: "transparent",
              }}
            />
          );
        })}

        {/* Inner intense core */}
        {activeDisasters.map((d) => (
          <Circle
            key={`fire-core-${d.id}`}
            center={[d.lat, d.lng]}
            radius={d.radius * 400} // smaller core
            pathOptions={{
              color: "#ff4500",
              weight: 1,
              opacity: 0.5,
              fillColor: "#ff6b35",
              fillOpacity: pulseOpacity * 2.5,
            }}
          />
        ))}

        {/* ═══════ FIRE EMOJI MARKERS ═══════ */}
        {activeDisasters.map((d) => (
          <Marker
            key={d.id}
            position={[d.lat, d.lng]}
            icon={createFireIcon()}
          >
            <Popup>
              <div style={{ background: '#0A0C10', color: 'white', padding: '10px 14px', borderRadius: '10px', fontFamily: 'Inter, system-ui', minWidth: 180 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '18px' }}>🔥</span>
                  <span style={{ fontWeight: 'bold', fontSize: '13px', color: SEVERITY_COLOR[d.severity] }}>
                    {d.type.toUpperCase()} ALERT
                  </span>
                </div>
                <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '4px' }}>
                  Severity: <strong style={{ color: SEVERITY_COLOR[d.severity] }}>{d.severity.toUpperCase()}</strong>
                </div>
                <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '4px' }}>
                  Radius: <strong>{d.radius} km</strong>
                </div>
                <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '8px' }}>
                  Affected: <strong>{d.affectedPopulation.toLocaleString()}</strong> people
                </div>
                <button
                  onClick={() => removeDisaster(d.id)}
                  style={{ width: '100%', padding: '5px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', fontSize: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, letterSpacing: '0.05em' }}
                >RESOLVE</button>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* ═══════ EVACUATION ROUTE POLYLINES ═══════ */}
        {activeDisasters.length > 0 && routes.map((r: EvacuationRoute) => {
          const isSafest = safestRoute?.id === r.id;
          const isActive = activeRouteId === r.id;
          const color = routeColor(r.riskScore, r.status);
          const isBlocked = r.status === "blocked";

          return (
            <AnimatedPolyline
              key={`route-${r.id}`}
              positions={r.waypoints}
              color={isSafest ? "#22c55e" : color}
              weight={isSafest ? 5 : isActive ? 4 : 3}
              dashArray={isBlocked ? "12 8" : isSafest ? undefined : "6 4"}
              glow={isSafest}
            />
          );
        })}

        {/* Route labels (start marker) */}
        {activeDisasters.length > 0 && routes.map((r: EvacuationRoute) => {
          if (r.waypoints.length === 0) return null;
          const isSafest = safestRoute?.id === r.id;
          const color = isSafest ? "#22c55e" : routeColor(r.riskScore, r.status);
          const startPt = r.waypoints[0];
          return (
            <Marker
              key={`route-label-${r.id}`}
              position={startPt}
              icon={L.divIcon({
                html: `
                  <div style="
                    background:rgba(10,15,25,0.92);
                    border:1px solid ${color};
                    border-radius:6px;
                    padding:3px 8px;
                    font-size:9px;
                    font-weight:700;
                    color:${color};
                    white-space:nowrap;
                    box-shadow:0 0 8px ${color}40;
                    letter-spacing:0.05em;
                    font-family:Inter,system-ui,sans-serif;
                  ">
                    ${isSafest ? "★ SAFEST — " : ""}${r.name}
                    ${r.status === "blocked" ? " ⛔" : ""}
                  </div>
                `,
                className: "",
                iconSize: [120, 22],
                iconAnchor: [0, 22],
              })}
            >
              <Popup>
                <div style={{ background: '#0A0C10', color: 'white', padding: '10px 14px', borderRadius: '10px', fontFamily: 'Inter, system-ui', minWidth: 200 }}>
                  <p style={{ fontWeight: 'bold', fontSize: '12px', margin: 0, color }}>{r.name}</p>
                  <p style={{ fontSize: '10px', opacity: 0.7, margin: '4px 0' }}>{r.fromZone} → {r.toShelter}</p>
                  <p style={{ fontSize: '10px', opacity: 0.7, margin: '2px 0' }}>Distance: {r.distance} km | ETA: {r.estimatedTime} min</p>
                  <p style={{ fontSize: '10px', opacity: 0.7, margin: '2px 0' }}>Risk Score: <strong style={{ color }}>{r.riskScore}</strong> | Status: {r.status.toUpperCase()}</p>
                  {isSafest && <p style={{ fontSize: '10px', color: '#22c55e', fontWeight: 700, margin: '4px 0 0' }}>★ SAFEST ROUTE</p>}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* ═══════ SHELTERS ═══════ */}
        {activeDisasters.length > 0 && shelters.map((s) => (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={createShelterIcon(s.occupied, s.capacity, s.status)}
          >
            <Popup>
              <div style={{ background: '#0A0C10', color: 'white', padding: '10px 14px', borderRadius: '10px', fontFamily: 'Inter, system-ui', minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '16px' }}>🏠</span>
                  <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{s.name}</span>
                </div>
                {/* Capacity bar */}
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', opacity: 0.7, marginBottom: '3px' }}>
                    <span>Occupancy</span>
                    <span>{s.occupied}/{s.capacity}</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '2px',
                      width: `${Math.min(100, (s.occupied / s.capacity) * 100)}%`,
                      background: s.occupied >= s.capacity ? '#ef4444' : s.occupied / s.capacity > 0.8 ? '#fbbf24' : '#22c55e',
                    }} />
                  </div>
                </div>
                <div style={{ fontSize: '10px', opacity: 0.7 }}>
                  {s.hasmedical && <span style={{ marginRight: 8 }}>🏥 Medical</span>}
                  {s.hasfood && <span>🍲 Food</span>}
                </div>
                <div style={{ fontSize: '10px', marginTop: '4px', fontWeight: 600, color: s.status === 'open' ? '#22c55e' : s.status === 'full' ? '#fb923c' : '#ef4444' }}>
                  Status: {s.status.toUpperCase()}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* ═══════ UNITS ═══════ */}
        {activeDisasters.length > 0 && units.map((u) =>
          u.lat && u.lng ? (
            <Marker
              key={u.id}
              position={[u.lat, u.lng]}
              icon={createUnitIcon(u.type)}
            >
              <Popup>
                <div style={{ background: '#0A0C10', color: 'white', padding: '10px 14px', borderRadius: '10px', fontFamily: 'Inter, system-ui', minWidth: 180 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '13px', color: UNIT_COLORS[u.type] }}>{u.label}</span>
                    <span style={{
                      fontSize: '9px', padding: '1px 6px', borderRadius: '4px', fontWeight: 600,
                      background: u.status === 'deployed' ? 'rgba(34,197,94,0.15)' : u.status === 'returning' ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.08)',
                      color: u.status === 'deployed' ? '#22c55e' : u.status === 'returning' ? '#fbbf24' : '#9ca3af',
                    }}>{u.status.toUpperCase()}</span>
                  </div>
                  <p style={{ fontSize: '10px', opacity: 0.7, margin: '2px 0' }}>Type: {u.type}</p>
                  {u.assignedZone && <p style={{ fontSize: '10px', opacity: 0.7, margin: '2px 0' }}>Zone: {u.assignedZone}</p>}
                  {u.eta !== undefined && u.eta > 0 && <p style={{ fontSize: '10px', opacity: 0.7, margin: '2px 0' }}>ETA: {u.eta} min</p>}
                  <p style={{ fontSize: '10px', opacity: 0.7, margin: '2px 0' }}>Fuel: {Math.round(u.fuelLevel)}%</p>
                </div>
              </Popup>
            </Marker>
          ) : null
        )}

      </MapContainer>

      {/* ═══════ Glassmorphic Tactical Overlay - Top Left ═══════ */}
      <div className="absolute top-6 left-6 z-1000 flex flex-col gap-4 pointer-events-none">
        <div className="bg-[#080B10]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl w-72">
          <div className="flex items-center gap-3 mb-1">
            <div className={`w-2 h-2 rounded-full ${activeDisasters.length > 0 ? "bg-red-500 animate-pulse" : "bg-emerald-500 animate-pulse"}`} />
            <span className="text-xs font-bold text-white tracking-widest uppercase">
              {activeDisasters.length > 0 ? "Emergency Active" : "System Operational"}
            </span>
          </div>
          <p className="text-[10px] text-white/50 font-mono">NATIONAL COMMAND CENTER — LEAFLET ENGINE</p>
        </div>
      </div>

      {/* ═══════ Map Legend - Bottom Left ═══════ */}
      {activeDisasters.length > 0 && (
        <div className="absolute bottom-6 left-6 z-1000 pointer-events-none">
          <div className="bg-[#0A0C10]/80 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-2xl w-52 flex flex-col gap-3 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-white/10 pb-2">Map Legend</span>

            <div className="flex flex-col gap-2">
              {/* Units */}
              {Object.entries(UNIT_COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color, boxShadow: `0 0 8px ${color}80` }} />
                  <span className="text-[10px] font-medium text-gray-300 capitalize">{type === "firetruck" ? "Fire Trucks" : type === "ambulance" ? "Ambulances" : type === "rescue" ? "Rescue" : "Supply"}</span>
                </div>
              ))}

              {/* Shelter */}
              <div className="flex items-center gap-3 mt-1">
                <div className="w-3 h-3 rounded border-2 border-[#22c55e] bg-[#0A0C10]" style={{ borderRadius: '4px' }} />
                <span className="text-[10px] font-medium text-gray-300">Evacuation Shelter</span>
              </div>

              {/* Routes */}
              <div className="border-t border-white/5 pt-2 mt-1 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-0.5 rounded-full bg-[#22c55e]" style={{ boxShadow: '0 0 6px #22c55e80' }} />
                  <span className="text-[10px] font-medium text-gray-300">Safe Route</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-0.5 rounded-full bg-[#fb923c]" />
                  <span className="text-[10px] font-medium text-gray-300">Moderate Route</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-0.5 rounded-full bg-[#ef4444]" style={{ borderTop: '2px dashed #ef4444', height: 0 }} />
                  <span className="text-[10px] font-medium text-gray-300">Blocked Route</span>
                </div>

                {/* Fire zone */}
                <div className="flex items-center gap-3 mt-1">
                  <div className="w-3 h-3 rounded-full border border-[#f87171] bg-[#f8717120]" />
                  <span className="text-[10px] font-medium text-gray-300">Fire Zone</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
