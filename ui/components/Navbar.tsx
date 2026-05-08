"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRiskStore } from "@/store/riskStore";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/map",       label: "Full Map" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings",  label: "Settings" },
];

const ALERT_STYLES: Record<string, { bg: string; shadow: string; label: string }> = {
  green:  { bg: "bg-emerald-400", shadow: "shadow-emerald-500/50", label: "System Operational" },
  yellow: { bg: "bg-amber-400", shadow: "shadow-amber-500/50", label: "Elevated Alert" },
  orange: { bg: "bg-orange-400", shadow: "shadow-orange-500/50", label: "High Alert" },
  red:    { bg: "bg-red-500", shadow: "shadow-red-500/50", label: "Critical Priority" },
};

export default function Navbar() {
  const pathname = usePathname();
  const { alertLevel, activeDisasters } = useRiskStore();
  const alert = ALERT_STYLES[alertLevel] ?? ALERT_STYLES.green;

  return (
    <header className="flex items-center justify-between px-6 h-14 shrink-0 border-b bg-black/40 backdrop-blur-xl border-white/10 z-50">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600 shadow-lg shadow-blue-900/20">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
        </div>
        <div className="text-sm font-black tracking-tight text-white uppercase">Civic Autopilot</div>
      </div>

      {/* Nav links */}
      <nav className="flex items-center gap-8">
        {NAV.map(({ href, label }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link key={href} href={href}
              className={`flex items-center px-3 py-1.5 rounded text-[11px] font-semibold tracking-wider uppercase transition-colors ${
                active ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
              }`}>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Status */}
      <div className="flex items-center gap-4">
        {/* System status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/5 border border-white/5">
          <div className={`w-1.5 h-1.5 rounded-full ${alert.bg} shadow-sm ${alert.shadow}`} />
          <span className="text-[9px] font-bold tracking-widest uppercase text-gray-300">
            {alert.label}
          </span>
        </div>

        {/* Active disasters count */}
        {activeDisasters.length > 0 && (
          <div className="px-2 py-1 rounded text-[9px] font-bold tracking-widest uppercase bg-red-500/10 text-red-400 border border-red-500/20">
            {activeDisasters.length} ACTIVE INCIDENT{activeDisasters.length > 1 ? "S" : ""}
          </div>
        )}

        {/* Live dot */}
        <div className="flex items-center gap-1.5 pl-3 border-l border-white/5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-mono text-gray-400 font-medium tracking-wider">
            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>
    </header>
  );
}
