"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRiskStore } from "@/store/riskStore";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "⚡" },
  { href: "/map",       label: "Full Map",   icon: "🗺" },
  { href: "/analytics", label: "Analytics",  icon: "📊" },
  { href: "/settings",  label: "Settings",   icon: "⚙" },
];

const ALERT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  green:  { bg: "#00ff88", text: "#000", label: "ALL CLEAR" },
  yellow: { bg: "#ffd700", text: "#000", label: "ELEVATED" },
  orange: { bg: "#ff6b35", text: "#fff", label: "HIGH ALERT" },
  red:    { bg: "#ff3b3b", text: "#fff", label: "CRITICAL" },
};

export default function Navbar() {
  const pathname = usePathname();
  const { alertLevel, activeDisasters, systemStatus } = useRiskStore();
  const alert = ALERT_STYLES[alertLevel] ?? ALERT_STYLES.green;

  return (
    <header className="flex items-center justify-between px-5 h-16 shrink-0 border-b"
      style={{
        background: "rgba(2,4,8,0.95)",
        backdropFilter: "blur(20px)",
        borderColor: "rgba(0,210,255,0.12)",
        gridColumn: "1 / -1",
      }}>
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 rounded-full border-2 animate-spin-slow"
            style={{ borderColor: "rgba(0,210,255,0.5)", borderTopColor: "var(--neon-cyan)" }} />
          <div className="absolute inset-1.5 rounded-full flex items-center justify-center text-xs"
            style={{ background: "rgba(0,210,255,0.15)" }}>
            🛡
          </div>
        </div>
        <div>
          <div className="text-sm font-black tracking-widest text-shimmer">CIVIC AUTOPILOT</div>
          <div className="text-xs tracking-widest uppercase" style={{ color: "var(--text-muted)", fontSize: 9 }}>
            Autonomous Disaster Response OS
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex items-center gap-1">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link key={href} href={href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all"
              style={{
                background: active ? "rgba(0,210,255,0.15)" : "transparent",
                color: active ? "var(--neon-cyan)" : "var(--text-muted)",
                border: `1px solid ${active ? "rgba(0,210,255,0.3)" : "transparent"}`,
              }}>
              <span>{icon}</span>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Status */}
      <div className="flex items-center gap-3">
        {/* System status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded glass-card">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse-glow"
            style={{ background: alert.bg }} />
          <span className="text-xs font-bold tracking-widest"
            style={{ color: alert.bg }}>{alert.label}</span>
        </div>

        {/* Active disasters count */}
        {activeDisasters.length > 0 && (
          <div className="px-2.5 py-1 rounded text-xs font-bold tracking-widest animate-pulse-glow"
            style={{ background: "rgba(255,59,59,0.15)", color: "#ff3b3b", border: "1px solid rgba(255,59,59,0.4)" }}>
            {activeDisasters.length} ACTIVE
          </div>
        )}

        {/* Live dot */}
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: "#00ff88" }} />
          <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>
    </header>
  );
}
