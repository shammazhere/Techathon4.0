"use client";

import Navbar from "@/components/Navbar";
import { useRiskStore } from "@/store/riskStore";
import { useRouteStore } from "@/store/routeStore";
import { useResourceStore } from "@/store/resourceStore";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import {
  Activity, ShieldAlert, Ambulance, Route, Package
} from "lucide-react";

// ─── Mock time-series data ───────────────────────────────────────────────────
const HOURS = Array.from({ length: 12 }, (_, i) => `${String(i * 2).padStart(2, "0")}:00`);

const floodSeries = HOURS.map((h, i) => ({
  time: h,
  flood: Math.min(100, 10 + i * 6 + Math.random() * 8),
  fire:  Math.min(100, 20 + Math.sin(i) * 15 + Math.random() * 10),
  seismic: Math.min(100, 5 + Math.cos(i * 0.7) * 12 + Math.random() * 6),
}));

const evacuationSeries = HOURS.map((h, i) => ({
  time: h,
  moved: Math.floor(i * 2800 + Math.random() * 500),
  rerouted: Math.floor(i * 180 + Math.random() * 40),
}));

const resourceSeries = [
  { name: "Ambulances", deployed: 2, available: 1, total: 3 },
  { name: "Fire Trucks", deployed: 2, available: 0, total: 2 },
  { name: "Rescue",      deployed: 1, available: 1, total: 2 },
  { name: "Supply",      deployed: 2, available: 0, total: 2 },
];

const radarData = [
  { metric: "Flood Risk",   value: 82 },
  { metric: "Fire Risk",    value: 65 },
  { metric: "Seismic Risk", value: 28 },
  { metric: "Road Block",   value: 55 },
  { metric: "Pop. Density", value: 74 },
  { metric: "Shelter Cap.", value: 68 },
];

// ─── Tooltip styles ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: string | number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-4 py-3 text-sm space-y-1.5 shadow-2xl border-white/10" style={{ minWidth: 150, background: "rgba(10, 15, 25, 0.9)" }}>
      <div className="font-semibold mb-2 text-gray-200">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-6">
          <span className="text-gray-400">{p.name}</span>
          <span style={{ color: p.color }} className="font-medium">{typeof p.value === "number" ? p.value.toFixed(1) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Chart card wrapper ───────────────────────────────────────────────────────
function ChartCard({ title, children, span = 1 }: { title: string; children: React.ReactNode; span?: number }) {
  return (
    <div className="flex flex-col border border-white/5 bg-[#0a0f16]/60 rounded-2xl p-6 shadow-lg backdrop-blur-md" style={{ gridColumn: span > 1 ? `span ${span}` : undefined }}>
      <div className="text-[11px] font-bold tracking-widest uppercase mb-6 text-gray-400">{title}</div>
      <div className="flex-1 w-full relative">{children}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { riskCells, activeDisasters } = useRiskStore();
  const { routes } = useRouteStore();
  const { units, supplies } = useResourceStore();

  const avgRisk = Math.round(riskCells.reduce((s, c) => s + c.overallRisk, 0) / riskCells.length);
  const deployed = units.filter((u) => u.status === "deployed").length;
  const safeRoutes = routes.filter((r) => r.status !== "blocked").length;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#050505] text-gray-200">
      <Navbar />
      
      <div className="flex-1 overflow-y-auto side-panel px-8 py-8 space-y-6">
        
        {/* KPI summary row */}
        <div className="grid grid-cols-4 gap-6">
          {[
            { label: "City Risk Index", value: `${avgRisk}%`, color: avgRisk > 60 ? "#ef4444" : "#eab308", icon: Activity },
            { label: "Active Incidents", value: activeDisasters.length, color: "#ef4444", icon: ShieldAlert },
            { label: "Units Deployed", value: `${deployed}/${units.length}`, color: "#0ea5e9", icon: Ambulance },
            { label: "Safe Routes", value: `${safeRoutes}/${routes.length}`, color: "#22c55e", icon: Route },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="border border-white/5 bg-[#0a0f16]/60 rounded-2xl p-6 flex items-center gap-5 shadow-lg backdrop-blur-md transition-all hover:bg-[#0c131c]">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 border border-white/5">
                <Icon className="w-5 h-5" style={{ color }} strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <div className="text-3xl font-bold tracking-tight" style={{ color }}>{value}</div>
                <div className="text-[11px] font-semibold tracking-widest uppercase text-gray-500 mt-1">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* Risk over time */}
          <ChartCard title="Risk Index Over Time (12h)">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={floodSeries} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gFlood" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gFire" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} dy={10} />
                <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="flood"   name="Flood"   stroke="#0ea5e9" fill="url(#gFlood)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="fire"    name="Fire"    stroke="#ef4444" fill="url(#gFire)"  strokeWidth={2.5} />
                <Area type="monotone" dataKey="seismic" name="Seismic" stroke="#eab308" fill="none"         strokeWidth={1.5} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Evacuation progress */}
          <ChartCard title="Evacuation Progress (12h)">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={evacuationSeries} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} dy={10} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="moved"    name="Evacuees Moved"    stroke="#22c55e" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="rerouted" name="Vehicles Rerouted" stroke="#0ea5e9" strokeWidth={2} dot={false} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Resource deployment */}
          <ChartCard title="Resource Deployment">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={resourceSeries} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: -10 }} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 10 }} domain={[0, "dataMax"]} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10, fontWeight: 500 }} width={80} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                <Bar dataKey="deployed"  name="Deployed"  fill="#0ea5e9" stackId="a" radius={[2, 0, 0, 2]} />
                <Bar dataKey="available" name="Available" fill="rgba(14, 165, 233, 0.2)" stackId="a" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Risk radar */}
          <ChartCard title="City Risk Profile">
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "#9ca3af", fontSize: 9 }} />
                <Radar name="Risk" dataKey="value" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Supply utilization */}
          <ChartCard title="Supply Utilization">
            <div className="flex flex-col justify-center h-full space-y-4 px-2">
              {supplies.map((s) => {
                const pct = Math.round((s.deployed / s.total) * 100);
                return (
                  <div key={s.category} className="group">
                    <div className="flex justify-between items-center text-xs mb-2">
                      <div className="flex items-center gap-2 text-gray-400 font-medium">
                        <Package className="w-3.5 h-3.5 opacity-60" />
                        {s.category}
                      </div>
                      <span style={{ color: s.color }} className="font-bold opacity-90">{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{
                        width: `${pct}%`,
                        background: s.color,
                        boxShadow: `0 0 10px ${s.color}66`,
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>
        </div>

        {/* Zone risk table */}
        <div className="border border-white/5 bg-[#0a0f16]/60 rounded-2xl p-6 shadow-lg backdrop-blur-md">
          <div className="text-[11px] font-bold tracking-widest uppercase mb-6 text-gray-400">Zone Risk Breakdown</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-gray-500 uppercase text-[10px] tracking-wider">
                  <th className="pb-3 px-4 font-semibold">Zone</th>
                  <th className="pb-3 px-4 font-semibold">Flood %</th>
                  <th className="pb-3 px-4 font-semibold">Fire %</th>
                  <th className="pb-3 px-4 font-semibold">Seismic %</th>
                  <th className="pb-3 px-4 font-semibold">Overall Risk</th>
                  <th className="pb-3 px-4 font-semibold">Population</th>
                  <th className="pb-3 px-4 font-semibold">Elderly %</th>
                  <th className="pb-3 px-4 font-semibold text-right">Road Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {riskCells.map((c) => {
                  const oc = c.overallRisk >= 70 ? "text-red-400 bg-red-400/10 border-red-400/20" : c.overallRisk >= 40 ? "text-orange-400 bg-orange-400/10 border-orange-400/20" : "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
                  return (
                    <tr key={c.id} className="hover:bg-white/2 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-200">{c.zone}</td>
                      <td className={`py-3 px-4 ${c.floodRisk >= 70 ? "text-red-400" : "text-gray-400"}`}>{c.floodRisk}</td>
                      <td className={`py-3 px-4 ${c.fireRisk  >= 70 ? "text-red-400" : "text-gray-400"}`}>{c.fireRisk}</td>
                      <td className="py-3 px-4 text-gray-500">{c.seismicRisk}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${oc}`}>
                          {c.overallRisk}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400">{c.population.toLocaleString()}</td>
                      <td className={`py-3 px-4 ${c.elderlyDensity > 0.25 ? "text-orange-400" : "text-gray-500"}`}>
                        {Math.round(c.elderlyDensity * 100)}%
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${c.roadBlocked ? "text-red-400" : "text-emerald-400"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${c.roadBlocked ? "bg-red-400" : "bg-emerald-400"}`} />
                          {c.roadBlocked ? "Blocked" : "Clear"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        
      </div>
    </div>
  );
}
