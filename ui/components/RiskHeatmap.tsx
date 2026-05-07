"use client";

import { useRiskStore } from "@/store/riskStore";

const getRiskColor = (v: number) => {
  if (v >= 80) return "#ff3b3b";
  if (v >= 60) return "#ff6b35";
  if (v >= 40) return "#ffd700";
  if (v >= 20) return "#00d2ff";
  return "#00ff88";
};

const RiskBar = ({ value, color }: { value: number; color: string }) => (
  <div className="flex items-center gap-2">
    <div className="progress-bar flex-1" style={{ height: 5 }}>
      <div className="progress-fill" style={{ width: `${value}%`, background: `linear-gradient(to right, ${color}66, ${color})` }} />
    </div>
    <span className="text-xs font-bold w-8 text-right" style={{ color }}>{value}</span>
  </div>
);

export default function RiskHeatmap() {
  const { riskCells, activeDisasters, alertLevel } = useRiskStore();

  const avgFlood = Math.round(riskCells.reduce((s, c) => s + c.floodRisk, 0) / riskCells.length);
  const avgFire = Math.round(riskCells.reduce((s, c) => s + c.fireRisk, 0) / riskCells.length);
  const avgOverall = Math.round(riskCells.reduce((s, c) => s + c.overallRisk, 0) / riskCells.length);
  const blockedCount = riskCells.filter((c) => c.roadBlocked).length;

  const alertColors: Record<string, string> = {
    green: "#00ff88", yellow: "#ffd700", orange: "#ff6b35", red: "#ff3b3b",
  };
  const alertColor = alertColors[alertLevel] ?? "#00ff88";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: "rgba(0,210,255,0.12)" }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-bold tracking-wide neon-cyan">🌡 RISK HEATMAP</span>
          <span className="badge text-xs font-bold px-2 py-0.5 rounded"
            style={{ color: alertColor, background: `${alertColor}1a`, border: `1px solid ${alertColor}44` }}>
            ALERT: {alertLevel.toUpperCase()}
          </span>
        </div>
        <div className="flex gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
          <span>Flood avg: <span className="font-bold" style={{ color: getRiskColor(avgFlood) }}>{avgFlood}%</span></span>
          <span>Fire avg: <span className="font-bold" style={{ color: getRiskColor(avgFire) }}>{avgFire}%</span></span>
          <span><span className="neon-red font-bold">{blockedCount}</span> roads blocked</span>
        </div>
      </div>

      {/* City-wide summary */}
      <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: "rgba(0,210,255,0.08)" }}>
        <div className="text-xs font-semibold mb-2 tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
          City-wide Averages
        </div>
        <div className="space-y-2">
          {[
            { label: "🌊 Flood Risk", value: avgFlood },
            { label: "🔥 Fire Risk", value: avgFire },
            { label: "⚡ Overall Risk", value: avgOverall },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: "var(--text-secondary)" }}>{label}</span>
              </div>
              <RiskBar value={value} color={getRiskColor(value)} />
            </div>
          ))}
        </div>
      </div>

      {/* Active disaster count */}
      {activeDisasters.length > 0 && (
        <div className="px-4 py-2 shrink-0 alert-flash rounded mx-3 mt-2"
          style={{ background: "rgba(255,59,59,0.08)", border: "1px solid rgba(255,59,59,0.35)" }}>
          <div className="text-xs font-bold neon-red flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse-glow" />
            {activeDisasters.length} ACTIVE INCIDENT{activeDisasters.length > 1 ? "S" : ""} DETECTED
          </div>
          <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {activeDisasters.map((d) => `${d.type} (${d.severity})`).join(" · ")}
          </div>
        </div>
      )}

      {/* Zone risk table */}
      <div className="flex-1 overflow-y-auto side-panel px-3 pb-3 mt-2 space-y-2">
        <div className="text-xs font-semibold mb-2 tracking-widest uppercase px-1" style={{ color: "var(--text-muted)" }}>
          Zone Breakdown
        </div>
        {riskCells.map((cell) => {
          const overallColor = getRiskColor(cell.overallRisk);
          return (
            <div key={cell.id} className="glass-card p-3 space-y-2">
              {/* Zone header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                  {cell.zone}
                </span>
                <div className="flex items-center gap-1.5">
                  {cell.roadBlocked && (
                    <span className="text-xs px-1.5 py-0.5 rounded font-bold"
                      style={{ color: "#ff3b3b", background: "rgba(255,59,59,0.15)", border: "1px solid rgba(255,59,59,0.3)", fontSize: 10 }}>
                      ROAD BLOCKED
                    </span>
                  )}
                  <span className="text-xs font-bold w-8 text-right" style={{ color: overallColor }}>
                    {cell.overallRisk}
                  </span>
                </div>
              </div>

              {/* Risk bars */}
              <div className="space-y-1.5">
                <div>
                  <div className="text-xs mb-0.5" style={{ color: "var(--text-muted)", fontSize: 10 }}>🌊 Flood</div>
                  <RiskBar value={cell.floodRisk} color={getRiskColor(cell.floodRisk)} />
                </div>
                <div>
                  <div className="text-xs mb-0.5" style={{ color: "var(--text-muted)", fontSize: 10 }}>🔥 Fire</div>
                  <RiskBar value={cell.fireRisk} color={getRiskColor(cell.fireRisk)} />
                </div>
                <div>
                  <div className="text-xs mb-0.5" style={{ color: "var(--text-muted)", fontSize: 10 }}>🌍 Seismic</div>
                  <RiskBar value={cell.seismicRisk} color={getRiskColor(cell.seismicRisk)} />
                </div>
              </div>

              {/* Population */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div>
                  <div className="text-xs" style={{ color: "var(--text-muted)", fontSize: 10 }}>Population</div>
                  <div className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                    {cell.population.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: "var(--text-muted)", fontSize: 10 }}>Elderly Density</div>
                  <div className="text-xs font-bold" style={{ color: cell.elderlyDensity > 0.25 ? "#ff9500" : "var(--text-primary)" }}>
                    {Math.round(cell.elderlyDensity * 100)}%
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
