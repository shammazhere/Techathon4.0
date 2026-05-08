"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Ambulance, Truck, Helicopter, Flame, Package, Home, Activity, Check, X } from "lucide-react";
import { useResourceStore } from "@/store/resourceStore";

const UNIT_ICONS: Record<string, React.ReactNode> = {
  ambulance: <Ambulance size={12} />,
  firetruck: <Flame size={12} />,
  rescue: <Helicopter size={12} />,
  supply: <Truck size={12} />,
};

const STATUS_COLORS: Record<string, string> = {
  available: "text-emerald-400", deployed: "text-blue-400", returning: "text-amber-400", offline: "text-gray-500",
};

export default function ResourceTracker() {
  const { units, shelters, supplies } = useResourceStore();
  const [tab, setTab] = useState<"units" | "shelters" | "supplies">("units");

  const deployedCount = units.filter((u) => u.status === "deployed").length;
  const availableCount = units.filter((u) => u.status === "available").length;

  return (
    <div className="flex flex-col h-full bg-transparent text-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package size={14} className="text-gray-400" />
          <span className="text-xs font-semibold tracking-wide text-gray-200">RESOURCE OPS</span>
        </div>
        <div className="flex gap-3 text-[10px] text-gray-500 font-medium">
          <span><span className="text-blue-400 font-semibold">{deployedCount}</span> deployed</span>
          <span><span className="text-emerald-400 font-semibold">{availableCount}</span> avail</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-3 gap-1 py-3 shrink-0">
        {(["units", "shelters", "supplies"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-semibold tracking-wider uppercase transition-colors ${tab === t ? "bg-white/10 text-white" : "bg-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5"
              }`}>
            {t === "units" ? <Ambulance size={12} /> : t === "shelters" ? <Home size={12} /> : <Package size={12} />}
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto side-panel px-3 pb-3 space-y-2">
        {tab === "units" && units.map((unit) => {
          const sc = STATUS_COLORS[unit.status] ?? "text-gray-400";
          return (
            <div key={unit.id} className="bg-[#111318]/40 border border-transparent p-3 rounded-lg hover:bg-white/5 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`mt-0.5 ${sc}`}>{UNIT_ICONS[unit.type]}</div>
                  <div>
                    <div className="text-[11px] font-medium text-gray-300">{unit.label}</div>
                  </div>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider bg-white/5 ${sc}`}>
                  {unit.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-gray-500 mb-3">
                <div className="flex items-center gap-1">
                  <Activity size={10} />
                  <span>{unit.assignedZone || unit.location}</span>
                </div>
                {unit.eta !== undefined && (
                  <span className="font-mono text-gray-400">{unit.eta}m ETA</span>
                )}
              </div>

              {/* Fuel bar */}
              <div>
                <div className="flex justify-between text-[9px] mb-1 font-medium uppercase tracking-widest text-gray-500">
                  <span>Fuel</span>
                  <span className={unit.fuelLevel < 30 ? "text-red-400" : "text-gray-400"}>{Math.round(unit.fuelLevel)}%</span>
                </div>
                <div className="h-[2px] rounded-full bg-white/5 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${unit.fuelLevel < 30 ? "bg-red-500" : "bg-blue-400"}`}
                    style={{ width: `${unit.fuelLevel}%` }} />
                </div>
              </div>
            </div>
          );
        })}

        {tab === "shelters" && shelters.map((s) => {
          const pct = Math.round((s.occupied / s.capacity) * 100);
          const colClass = pct >= 100 ? "text-red-400" : pct >= 85 ? "text-amber-400" : "text-emerald-400";
          const barColor = pct >= 100 ? "bg-red-500" : pct >= 85 ? "bg-amber-500" : "bg-emerald-500";
          return (
            <div key={s.id} className="bg-[#111318]/40 border border-transparent p-3 rounded-lg hover:bg-white/5 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-gray-300">{s.name}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider bg-white/5 ${colClass}`}>
                  {s.status}
                </span>
              </div>
              <div className="flex justify-between text-[9px] mb-1 font-medium tracking-widest uppercase text-gray-500">
                <span>Occupancy</span>
                <span className={colClass}>{s.occupied.toLocaleString()} / {s.capacity.toLocaleString()}</span>
              </div>
              <div className="h-[2px] rounded-full bg-white/5 overflow-hidden mb-3">
                <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="flex items-center gap-3 text-[9px] text-gray-500 uppercase tracking-widest font-medium">
                <span className="flex items-center gap-1">
                  {s.hasmedical ? <Check size={10} className="text-emerald-400" /> : <X size={10} className="text-gray-600" />}
                  Med
                </span>
                <span className="flex items-center gap-1">
                  {s.hasfood ? <Check size={10} className="text-emerald-400" /> : <X size={10} className="text-gray-600" />}
                  Food
                </span>
                <span className={`ml-auto font-bold ${colClass}`}>{pct}% full</span>
              </div>
            </div>
          );
        })}

        {tab === "supplies" && supplies.map((item) => {
          const pct = Math.round((item.deployed / item.total) * 100);
          return (
            <div key={item.category} className="bg-[#111318]/40 border border-transparent p-3 rounded-lg hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-lg opacity-80">{item.icon}</div>
                <div className="flex-1">
                  <div className="text-[11px] font-medium text-gray-300 mb-0.5">{item.category}</div>
                  <div className="text-[9px] text-gray-500 font-medium uppercase tracking-widest">
                    <span className="text-gray-400">{item.deployed.toLocaleString()}</span> / {item.total.toLocaleString()} {item.unit}
                  </div>
                </div>
                <span className="text-[10px] font-bold" style={{ color: item.color }}>{pct}%</span>
              </div>
              <div className="h-[2px] rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: item.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
