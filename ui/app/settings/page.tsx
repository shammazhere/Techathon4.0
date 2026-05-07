"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";

const SECTIONS = [
  {
    title: "System Configuration",
    icon: "⚙",
    fields: [
      { label: "Simulation Speed", type: "select", options: ["0.5x", "1x", "2x", "5x"], default: "1x" },
      { label: "Auto-Respond Mode", type: "toggle", default: true },
      { label: "LLM Explanations", type: "toggle", default: true },
      { label: "Update Interval (ms)", type: "number", default: "3500" },
    ],
  },
  {
    title: "AI Agent Settings",
    icon: "🤖",
    fields: [
      { label: "Disaster Agent", type: "toggle", default: true },
      { label: "Route Agent",    type: "toggle", default: true },
      { label: "Resource Agent", type: "toggle", default: true },
      { label: "Rescue Agent",   type: "toggle", default: true },
      { label: "Traffic Agent",  type: "toggle", default: true },
      { label: "Explanation Agent", type: "toggle", default: true },
      { label: "LLM Model", type: "select", options: ["DeepSeek-V3", "Llama 3 70B", "Mixtral 8x7B"], default: "Llama 3 70B" },
    ],
  },
  {
    title: "Map & Visualization",
    icon: "🗺",
    fields: [
      { label: "Show Risk Heatmap",   type: "toggle", default: true },
      { label: "Show Evacuation Routes", type: "toggle", default: true },
      { label: "Show Shelter Markers",   type: "toggle", default: true },
      { label: "Show Grid Lines",        type: "toggle", default: true },
      { label: "Animate Disaster Spread",type: "toggle", default: true },
      { label: "Map Style", type: "select", options: ["Dark Tactical", "Satellite", "Terrain", "Street"], default: "Dark Tactical" },
    ],
  },
  {
    title: "Alert Thresholds",
    icon: "🚨",
    fields: [
      { label: "Flood Risk Alert (%)", type: "number", default: "65" },
      { label: "Fire Risk Alert (%)",  type: "number", default: "70" },
      { label: "Shelter Capacity Alert (%)", type: "number", default: "85" },
      { label: "Fuel Low Alert (%)",   type: "number", default: "25" },
    ],
  },
  {
    title: "API & Data Sources",
    icon: "🔌",
    fields: [
      { label: "Backend URL",       type: "text",   default: "http://localhost:8000" },
      { label: "WebSocket URL",     type: "text",   default: "ws://localhost:8000/ws" },
      { label: "Groq API Key",      type: "password", default: "sk-••••••••••••••••" },
      { label: "Mapbox Token",      type: "password", default: "pk.••••••••••••••••" },
      { label: "OpenWeather Key",   type: "password", default: "ow-••••••••••••••••" },
    ],
  },
];

function ToggleSwitch({ defaultOn }: { defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button onClick={() => setOn(!on)}
      className="relative inline-flex items-center w-10 h-5 rounded-full transition-all duration-300"
      style={{ background: on ? "rgba(0,210,255,0.8)" : "rgba(255,255,255,0.1)" }}>
      <span className="absolute w-4 h-4 rounded-full transition-transform duration-300 shadow"
        style={{ background: on ? "#fff" : "#4a7a9b", transform: on ? "translateX(22px)" : "translateX(2px)" }} />
    </button>
  );
}

export default function SettingsPage() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <Navbar />
      <div className="flex-1 overflow-y-auto side-panel p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-xl font-black tracking-widest mb-1 text-shimmer">SYSTEM SETTINGS</h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Configure Civic Autopilot's AI agents, data sources, and visualization parameters.
            </p>
          </div>

          {SECTIONS.map((section) => (
            <div key={section.title} className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b"
                style={{ borderColor: "rgba(0,210,255,0.1)" }}>
                <span className="text-lg">{section.icon}</span>
                <span className="text-sm font-bold tracking-widest uppercase neon-cyan">{section.title}</span>
              </div>
              <div className="space-y-4">
                {section.fields.map((field) => (
                  <div key={field.label} className="flex items-center justify-between gap-6">
                    <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                      {field.label}
                    </label>
                    {field.type === "toggle" ? (
                      <ToggleSwitch defaultOn={field.default as boolean} />
                    ) : field.type === "select" ? (
                      <select defaultValue={field.default as string}
                        className="px-3 py-1.5 rounded text-xs font-medium outline-none transition-all"
                        style={{
                          background: "rgba(0,210,255,0.08)",
                          border: "1px solid rgba(0,210,255,0.2)",
                          color: "var(--neon-cyan)",
                        }}>
                        {(field.options ?? []).map((o) => (
                          <option key={o} value={o} style={{ background: "#020c1b" }}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        defaultValue={field.default as string}
                        className="px-3 py-1.5 rounded text-xs font-mono outline-none w-52 transition-all"
                        style={{
                          background: "rgba(0,0,0,0.4)",
                          border: "1px solid rgba(0,210,255,0.2)",
                          color: "var(--text-primary)",
                        }}
                        onFocus={(e) => e.target.style.borderColor = "rgba(0,210,255,0.6)"}
                        onBlur={(e) => e.target.style.borderColor = "rgba(0,210,255,0.2)"}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Save button */}
          <div className="flex gap-3 pb-6">
            <button className="flex-1 py-3 rounded font-bold text-sm tracking-widest uppercase transition-all"
              style={{
                background: "rgba(0,210,255,0.18)",
                color: "var(--neon-cyan)",
                border: "1px solid rgba(0,210,255,0.4)",
                boxShadow: "0 0 20px rgba(0,210,255,0.15)",
              }}>
              💾 Save Configuration
            </button>
            <button className="px-6 py-3 rounded font-bold text-sm tracking-widest uppercase transition-all"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-muted)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}>
              Reset Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
