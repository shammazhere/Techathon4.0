"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import { useRiskStore } from "@/store/riskStore";
import { useRouteStore } from "@/store/routeStore";
import { useResourceStore } from "@/store/resourceStore";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

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
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2 text-xs space-y-1" style={{ minWidth: 130 }}>
      <div className="font-bold mb-1" style={{ color: "var(--neon-cyan)" }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: "var(--text-muted)" }}>{p.name}</span>
          <span style={{ color: p.color }} className="font-bold">{typeof p.value === "number" ? p.value.toFixed(1) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Chart card wrapper ───────────────────────────────────────────────────────
function ChartCard({ title, children, span = 1 }: { title: string; children: React.ReactNode; span?: number }) {
  return (
    <div className="glass-card p-4 flex flex-col" style={{ gridColumn: span > 1 ? `span ${span}` : undefined }}>
      <div className="text-xs font-bold tracking-widest uppercase mb-4 neon-cyan">{title}</div>
      <div className="flex-1">{children}</div>
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
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <Navbar />
      <div className="flex-1 overflow-y-auto side-panel p-4">
        {/* KPI summary row */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: "City Risk Index", value: `${avgRisk}%`, color: avgRisk > 60 ? "#ff3b3b" : "#ffd700", icon: "📊" },
            { label: "Active Incidents", value: activeDisasters.length, color: "#ff3b3b", icon: "🚨" },
            { label: "Units Deployed", value: `${deployed}/${units.length}`, color: "#00d2ff", icon: "🚑" },
            { label: "Safe Routes", value: `${safeRoutes}/${routes.length}`, color: "#00ff88", icon: "🛣" },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="glass-card p-4 text-center">
              <div className="text-2xl mb-1">{icon}</div>
              <div className="text-2xl font-black mb-1" style={{ color }}>{value}</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Risk over time */}
          <ChartCard title="Risk Index Over Time (12h)">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={floodSeries} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gFlood" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00d2ff" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00d2ff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gFire" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ff6b35" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ff6b35" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" tick={{ fill: "#4a7a9b", fontSize: 9 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "#4a7a9b", fontSize: 9 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="flood"   name="Flood"   stroke="#00d2ff" fill="url(#gFlood)" strokeWidth={2} />
                <Area type="monotone" dataKey="fire"    name="Fire"    stroke="#ff6b35" fill="url(#gFire)"  strokeWidth={2} />
                <Area type="monotone" dataKey="seismic" name="Seismic" stroke="#ffd700" fill="none"         strokeWidth={1.5} strokeDasharray="4 3" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Evacuation progress */}
          <ChartCard title="Evacuation Progress (12h)">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={evacuationSeries} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" tick={{ fill: "#4a7a9b", fontSize: 9 }} />
                <YAxis tick={{ fill: "#4a7a9b", fontSize: 9 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="moved"    name="Evacuees Moved"    stroke="#00ff88" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="rerouted" name="Vehicles Rerouted" stroke="#00d2ff" strokeWidth={2} dot={false} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          {/* Resource deployment */}
          <ChartCard title="Resource Deployment">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={resourceSeries} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#4a7a9b", fontSize: 9 }} domain={[0, "dataMax"]} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#8bb8d4", fontSize: 9 }} width={72} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="deployed"  name="Deployed"  fill="#00d2ff" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="available" name="Available" fill="#00ff8844" stackId="a" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Risk radar */}
          <ChartCard title="City Risk Profile">
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="rgba(0,210,255,0.15)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "#4a7a9b", fontSize: 8 }} />
                <Radar name="Risk" dataKey="value" stroke="#00d2ff" fill="#00d2ff" fillOpacity={0.2} strokeWidth={1.5} />
              </RadarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Supply utilization */}
          <ChartCard title="Supply Utilization">
            <div className="space-y-3">
              {supplies.map((s) => {
                const pct = Math.round((s.deployed / s.total) * 100);
                return (
                  <div key={s.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: "var(--text-secondary)" }}>{s.icon} {s.category}</span>
                      <span style={{ color: s.color }} className="font-bold">{pct}%</span>
                    </div>
                    <div className="progress-bar" style={{ height: 5 }}>
                      <div className="progress-fill" style={{
                        width: `${pct}%`,
                        background: `linear-gradient(to right, ${s.color}55, ${s.color})`,
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>
        </div>

        {/* Zone risk table */}
        <div className="glass-card p-4">
          <div className="text-xs font-bold tracking-widest uppercase mb-3 neon-cyan">Zone Risk Breakdown</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: "rgba(0,210,255,0.1)" }}>
                  {["Zone", "Flood %", "Fire %", "Seismic %", "Overall %", "Population", "Elderly %", "Road"].map((h) => (
                    <th key={h} className="text-left pb-2 pr-4 font-semibold" style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {riskCells.map((c) => {
                  const oc = c.overallRisk >= 70 ? "#ff3b3b" : c.overallRisk >= 40 ? "#ff9500" : "#00ff88";
                  return (
                    <tr key={c.id} className="border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                      <td className="py-2 pr-4 font-medium" style={{ color: "var(--text-primary)" }}>{c.zone}</td>
                      <td className="py-2 pr-4" style={{ color: c.floodRisk >= 70 ? "#ff3b3b" : "#8bb8d4" }}>{c.floodRisk}</td>
                      <td className="py-2 pr-4" style={{ color: c.fireRisk  >= 70 ? "#ff6b35" : "#8bb8d4" }}>{c.fireRisk}</td>
                      <td className="py-2 pr-4" style={{ color: "var(--text-muted)" }}>{c.seismicRisk}</td>
                      <td className="py-2 pr-4 font-bold" style={{ color: oc }}>{c.overallRisk}</td>
                      <td className="py-2 pr-4" style={{ color: "var(--text-secondary)" }}>{c.population.toLocaleString()}</td>
                      <td className="py-2 pr-4" style={{ color: c.elderlyDensity > 0.25 ? "#ff9500" : "var(--text-muted)" }}>
                        {Math.round(c.elderlyDensity * 100)}%
                      </td>
                      <td className="py-2 pr-4">
                        <span style={{ color: c.roadBlocked ? "#ff3b3b" : "#00ff88" }}>
                          {c.roadBlocked ? "⛔ Blocked" : "✅ Open"}
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
