"use client";

import { useRiskStore } from "@/store/riskStore";
import { Waves, Flame, Activity as Seismic, ShieldAlert, AlertTriangle } from "lucide-react";

const getRiskColorClass = (v: number) => {
  if (v >= 80) return "text-red-400";
  if (v >= 60) return "text-orange-400";
  if (v >= 40) return "text-amber-400";
  if (v >= 20) return "text-blue-400";
  return "text-emerald-400";
};



const MinimalRiskBar = ({ value, colorClass }: { value: number; colorClass: string }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 h-[2px] bg-white/5 rounded-full overflow-hidden">
      <div className={`h-full ${colorClass.replace('text-', 'bg-')}`} style={{ width: `${value}%` }} />
    </div>
    <span className={`text-[10px] font-medium w-6 text-right ${colorClass}`}>{value}</span>
  </div>
);

export default function RiskHeatmap() {
  const { riskCells, activeDisasters, alertLevel } = useRiskStore();

  const avgFlood = riskCells.length ? Math.round(riskCells.reduce((s, c) => s + c.floodRisk, 0) / riskCells.length) : 0;
  const avgFire = riskCells.length ? Math.round(riskCells.reduce((s, c) => s + c.fireRisk, 0) / riskCells.length) : 0;

  const blockedCount = riskCells.filter((c) => c.roadBlocked).length;

  const alertColors: Record<string, string> = {
    green: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    yellow: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    orange: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    red: "text-red-400 bg-red-500/10 border-red-500/20",
  };
  const alertTheme = alertColors[alertLevel] ?? alertColors.green;

  return (
    <div className="flex flex-col h-full bg-transparent text-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert size={14} className="text-gray-400" />
            <span className="text-xs font-semibold tracking-wide text-gray-200">RISK HEATMAP</span>
          </div>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider border ${alertTheme}`}>
            Alert: {alertLevel}
          </span>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-gray-500 font-medium">
          <span className="flex items-center gap-1"><Waves size={10} /> {avgFlood}%</span>
          <span className="flex items-center gap-1"><Flame size={10} /> {avgFire}%</span>
          <span className="flex items-center gap-1 text-red-400"><AlertTriangle size={10} /> {blockedCount} blocked</span>
        </div>
      </div>

      {/* Active disaster count */}
      {activeDisasters.length > 0 && (
        <div className="px-3 py-2 shrink-0 border-b border-white/5 bg-red-500/5">
          <div className="text-[10px] font-semibold text-red-400 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {activeDisasters.length} ACTIVE INCIDENT{activeDisasters.length > 1 ? "S" : ""}
          </div>
          <div className="text-[9px] mt-0.5 text-gray-500">
            {activeDisasters.map((d) => `${d.type} (${d.severity})`).join(" · ")}
          </div>
        </div>
      )}

      {/* Zone risk table */}
      <div className="flex-1 overflow-y-auto side-panel px-3 py-3 space-y-2">
        {riskCells.map((cell) => {
          const overallColorClass = getRiskColorClass(cell.overallRisk);
          return (
            <div key={cell.id} className="p-3 rounded-lg border border-white/5 bg-[#111318]/40 hover:bg-[#1a1c20]/60 transition-colors">
              {/* Zone header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-medium text-gray-300">
                  {cell.zone}
                </span>
                <div className="flex items-center gap-2">
                  {cell.roadBlocked && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded border border-red-500/20 bg-red-500/10 text-red-400 font-medium tracking-wide">
                      BLOCKED
                    </span>
                  )}
                  <div className={`flex items-center justify-center w-6 h-6 rounded-md bg-white/5 text-[10px] font-bold ${overallColorClass}`}>
                    {cell.overallRisk}
                  </div>
                </div>
              </div>

              {/* Risk bars */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2">
                  <Waves size={10} className="text-gray-500" />
                  <MinimalRiskBar value={cell.floodRisk} colorClass={getRiskColorClass(cell.floodRisk)} />
                </div>
                <div className="flex items-center gap-2">
                  <Flame size={10} className="text-gray-500" />
                  <MinimalRiskBar value={cell.fireRisk} colorClass={getRiskColorClass(cell.fireRisk)} />
                </div>
                <div className="flex items-center gap-2">
                  <Seismic size={10} className="text-gray-500" />
                  <MinimalRiskBar value={cell.seismicRisk} colorClass={getRiskColorClass(cell.seismicRisk)} />
                </div>
              </div>

              {/* Population */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px]">
                <div className="flex gap-1.5">
                  <span className="text-gray-500">Pop:</span>
                  <span className="text-gray-300 font-medium">{cell.population.toLocaleString()}</span>
                </div>
                <div className="flex gap-1.5">
                  <span className="text-gray-500">Elderly:</span>
                  <span className={`font-medium ${cell.elderlyDensity > 0.25 ? "text-orange-400" : "text-gray-300"}`}>
                    {Math.round(cell.elderlyDensity * 100)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
