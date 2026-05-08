"use client";

import { useState, useEffect } from "react";
import { ZoomControl, MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";

function MapAutoCenter({ disasters }: { disasters: any[] }) {
  const map = useMap();
  useEffect(() => {
    if (disasters.length > 0) {
      const latest = disasters[disasters.length - 1];
      map.flyTo([latest.lat, latest.lng], 12, { duration: 2 });
    }
  }, [disasters, map]);
  return null;
}

import L from "leaflet";
import { useRiskStore, type SeverityLevel } from "@/store/riskStore";
import { useRouteStore } from "@/store/routeStore";
import { useResourceStore } from "@/store/resourceStore";

// Professional Colors for Map Overlays
const SEVERITY_COLOR: Record<SeverityLevel, string> = {
  critical: "#f87171", high: "#fb923c", medium: "#fbbf24", low: "#34d399",
};

export default function MapView({ autoCenter = false }: { autoCenter?: boolean }) {
  const { activeDisasters, removeDisaster } = useRiskStore();
  const { routes, activeRouteId } = useRouteStore();
  const { shelters, units } = useResourceStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { 
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true); 
  }, []);

  if (!mounted) return <div className="w-full h-full bg-[#080B10]" />;

  // Custom DivIcon for Markers
  const createDivIcon = (html: string) => L.divIcon({ 
    html, 
    className: '', 
    iconSize: [20, 20], 
    iconAnchor: [10, 10] 
  });

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

        {/* Shelters */}
        {shelters.map(s => (
          <Marker 
            key={s.id} 
            position={[s.lat, s.lng]}
            icon={createDivIcon(`
              <div style="width: 14px; height: 14px; border-radius: 50%; border: 2px solid ${s.occupied >= s.capacity ? '#f87171' : '#34d399'}; background: #0A0C10; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>
            `)}
          >
            <Popup>
              <div style={{ background: '#0A0C10', color: 'white', padding: '8px', borderRadius: '8px', fontFamily: 'Inter' }}>
                <p style={{ fontWeight: 'bold', fontSize: '12px', margin: 0 }}>{s.name}</p>
                <p style={{ fontSize: '10px', opacity: 0.7, margin: '4px 0 0' }}>Occupancy: {s.occupied}/{s.capacity}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Disasters */}
        {activeDisasters.map(d => (
          <Marker 
            key={d.id} 
            position={[d.lat, d.lng]}
            icon={createDivIcon(`
              <div className="font-sans text-2xl filter drop-shadow-[0_0_8px_rgba(251,146,60,0.8)] transform -translate-x-1/2 -translate-y-1/2">
                🔥
              </div>
            `)}
          >
            <Popup>
              <div style={{ background: '#0A0C10', color: 'white', padding: '8px', borderRadius: '8px', fontFamily: 'Inter' }}>
                <p style={{ fontWeight: 'bold', fontSize: '12px', color: SEVERITY_COLOR[d.severity], margin: 0 }}>{d.type.toUpperCase()} ALERT</p>
                <p style={{ fontSize: '10px', opacity: 0.8, margin: '4px 0' }}>Severity: {d.severity.toUpperCase()}</p>
                <button 
                  onClick={() => removeDisaster(d.id)}
                  style={{ width: '100%', padding: '4px', background: 'rgba(255,255,255,0.1)', border: '1px solid white/20', color: 'white', fontSize: '9px', borderRadius: '4px', cursor: 'pointer' }}
                >RESOLVE</button>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Units */}
        {units.map(u => (
          u.lat && u.lng && (
            <Marker 
              key={u.id} 
              position={[u.lat, u.lng]}
              icon={createDivIcon(`
                <div style="width: 10px; height: 10px; background: ${u.type === 'ambulance' ? '#f87171' : u.type === 'firetruck' ? '#fb923c' : '#60a5fa'}; border-radius: 2px; box-shadow: 0 0 8px rgba(0,0,0,0.8);"></div>
              `)}
            />
          )
        ))}

        {/* Routes */}
        {routes.map(r => (
          <Polyline
            key={r.id}
            positions={r.waypoints}
            color={r.id === activeRouteId ? "#00d2ff" : "#ffffff22"}
            weight={r.id === activeRouteId ? 4 : 2}
            dashArray={r.status === 'blocked' ? "5, 5" : undefined}
          />
        ))}

      </MapContainer>

      {/* Glassmorphic Tactical Overlay */}
      <div className="absolute top-6 left-6 z-1000 flex flex-col gap-4 pointer-events-none">
        <div className="bg-[#080B10]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl w-72">
           <div className="flex items-center gap-3 mb-1">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-xs font-bold text-white tracking-widest uppercase">System Operational</span>
           </div>
           <p className="text-[10px] text-white/50 font-mono">NATIONAL COMMAND CENTER — LEAFLET ENGINE</p>
        </div>
      </div>
    </div>
  );
}
