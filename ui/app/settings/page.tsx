"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import {
  Settings,
  Cpu,
  Map as MapIcon,
  Bell,
  Save,
  RotateCcw,
  Zap
} from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";

const SECTIONS = [
  {
    title: "System Configuration",
    icon: Settings,
    color: "text-blue-400",
    fields: [
      { label: "Simulation Speed", type: "select", options: ["0.5x", "1x", "2x", "5x"], default: "1x" },
      { label: "Auto-Respond Mode", type: "toggle", default: true },
      { label: "LLM Explanations", type: "toggle", default: true },
      { label: "Update Interval (ms)", type: "number", default: "3500" },
    ],
  },
  {
    title: "AI Agent Settings",
    icon: Cpu,
    color: "text-purple-400",
    fields: [
      { label: "Disaster Agent", type: "toggle", default: true },
      { label: "Route Agent", type: "toggle", default: true },
      { label: "Resource Agent", type: "toggle", default: true },
      { label: "Rescue Agent", type: "toggle", default: true },
      { label: "Traffic Agent", type: "toggle", default: true },
      { label: "LLM Model", type: "select", options: ["DeepSeek-V3", "Llama 3 70B", "Mixtral 8x7B"], default: "Llama 3 70B" },
    ],
  },
  {
    title: "Map & Visualization",
    icon: MapIcon,
    color: "text-emerald-400",
    fields: [
      { label: "Show Risk Heatmap", type: "toggle", default: true },
      { label: "Show Evacuation Routes", type: "toggle", default: true },
      { label: "Show Shelter Markers", type: "toggle", default: true },
      { label: "Show Grid Lines", type: "toggle", default: true },
      { label: "Map Style", type: "select", options: ["Dark Tactical", "Satellite", "Terrain", "Street"], default: "Dark Tactical" },
    ],
  },
  {
    title: "Alert Thresholds",
    icon: Bell,
    color: "text-amber-400",
    fields: [
      { label: "Flood Risk Alert (%)", type: "number", default: "65" },
      { label: "Fire Risk Alert (%)", type: "number", default: "70" },
      { label: "Shelter Capacity Alert (%)", type: "number", default: "85" },
      { label: "Fuel Low Alert (%)", type: "number", default: "25" },
    ],
  },
];

function ToggleSwitch({ defaultOn }: { defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button onClick={() => setOn(!on)}
      className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors duration-200 outline-none focus:ring-2 focus:ring-blue-500/20 ${on ? "bg-blue-600" : "bg-white/10"}`}>
      <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ${on ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

export default function SettingsPage() {
  const mapStyle = useSettingsStore((state) => state.mapStyle);
  const setMapStyle = useSettingsStore((state) => state.setMapStyle);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#050505] text-gray-200">
      <Navbar />

      <main className="flex-1 overflow-y-auto side-panel">
        <div className="max-w-6xl mx-auto px-8 py-10 space-y-10">

          {/* Header & Actions */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold tracking-tight text-white">System Settings</h1>
              <p className="text-gray-400">Configure your autonomous disaster response engine parameters.</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200 transition-all active:scale-95">
                <RotateCcw className="w-4 h-4" />
                Reset Defaults
              </button>
              <button className="flex items-center gap-2 px-8 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-500 shadow-lg transition-all active:scale-95">
                <Save className="w-4 h-4" />
                Save Configuration
              </button>
            </div>
          </header>

          {/* Settings Sections Container */}
          <div className="flex flex-wrap gap-8">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <section key={section.title} className="flex-1 min-w-[400px] flex flex-col border border-white/5 bg-[#0a0f16]/60 rounded-2xl p-6 shadow-xl backdrop-blur-md transition-all hover:bg-[#0c131c]">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/5 ${section.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h2 className="text-sm font-bold tracking-widest uppercase text-gray-200">{section.title}</h2>
                  </div>

                  <div className="flex flex-col gap-5">
                    {section.fields.map((field) => (
                      <div key={field.label} className="flex items-center justify-between gap-6 group">
                        <label className="text-sm font-medium text-gray-400 group-hover:text-gray-200 transition-colors">
                          {field.label}
                        </label>
                        <div className="shrink-0">
                          {field.type === "toggle" ? (
                            <ToggleSwitch defaultOn={field.default as boolean} />
                          ) : field.type === "select" ? (
                            <select 
                              value={field.label === "Map Style" ? mapStyle : undefined}
                              defaultValue={field.label !== "Map Style" ? field.default as string : undefined}
                              onChange={(e) => {
                                if (field.label === "Map Style") {
                                  setMapStyle(e.target.value);
                                }
                              }}
                              className="bg-[#050505] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-200 outline-none focus:border-blue-500/50 transition-all cursor-pointer">
                              {(field.options ?? []).map((o) => (
                                <option key={o} value={o}>{o}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={field.type}
                              defaultValue={field.default as string}
                              className="bg-[#050505] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-gray-200 outline-none w-48 focus:border-blue-500/50 transition-all"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Footer Branding */}
          <footer className="pt-10 flex justify-between items-center opacity-30 grayscale transition-all duration-700">
            <div className="flex items-center gap-2">
              <img src="/logo_transparent.png" alt="" className="w-5 h-5 object-contain" />
              <span className="text-[10px] font-black tracking-widest uppercase">Civic Autopilot v4.2.0</span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
