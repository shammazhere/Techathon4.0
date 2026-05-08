import { create } from "zustand";

export type DisasterType = "flood" | "wildfire" | "earthquake" | "none";
export type SeverityLevel = "critical" | "high" | "medium" | "low";

export interface DisasterZone {
  id: string;
  type: DisasterType;
  lat: number;
  lng: number;
  radius: number; // km
  severity: SeverityLevel;
  affectedPopulation: number;
  spreadRate: number; // 0-1
  startTime: Date;
}

export interface RiskCell {
  id: string;
  zone: string;
  floodRisk: number;     // 0-100
  fireRisk: number;      // 0-100
  seismicRisk: number;   // 0-100
  overallRisk: number;   // 0-100
  population: number;
  elderlyDensity: number; // 0-1
  roadBlocked: boolean;
}

interface RiskStore {
  activeDisasters: DisasterZone[];
  riskCells: RiskCell[];
  systemStatus: "idle" | "monitoring" | "active" | "critical";
  alertLevel: "green" | "yellow" | "orange" | "red";
  totalAffected: number;
  disasterHistory: DisasterZone[];

  triggerDisaster: (type: DisasterType, lat: number, lng: number, severity: SeverityLevel) => void;
  removeDisaster: (id: string) => void;
  updateRiskCells: (cells: RiskCell[]) => void;
  setSystemStatus: (status: "idle" | "monitoring" | "active" | "critical") => void;
  clearAll: () => void;
}

const MOCK_RISK_CELLS: RiskCell[] = [
  { id: "z1", zone: "Zone A – North District", floodRisk: 82, fireRisk: 12, seismicRisk: 20, overallRisk: 78, population: 45200, elderlyDensity: 0.28, roadBlocked: true },
  { id: "z2", zone: "Zone B – East Harbor", floodRisk: 91, fireRisk: 8, seismicRisk: 15, overallRisk: 88, population: 32100, elderlyDensity: 0.22, roadBlocked: true },
  { id: "z3", zone: "Zone C – South Valley", floodRisk: 35, fireRisk: 74, seismicRisk: 18, overallRisk: 65, population: 28700, elderlyDensity: 0.31, roadBlocked: false },
  { id: "z4", zone: "Zone D – West Hills", floodRisk: 15, fireRisk: 88, seismicRisk: 12, overallRisk: 72, population: 19400, elderlyDensity: 0.19, roadBlocked: true },
  { id: "z5", zone: "Zone E – Central Core", floodRisk: 55, fireRisk: 40, seismicRisk: 30, overallRisk: 52, population: 67800, elderlyDensity: 0.15, roadBlocked: false },
  { id: "z6", zone: "Zone F – Industrial Sector", floodRisk: 68, fireRisk: 62, seismicRisk: 25, overallRisk: 70, population: 12300, elderlyDensity: 0.08, roadBlocked: false },
];

export const useRiskStore = create<RiskStore>((set) => ({
  activeDisasters: [],
  riskCells: MOCK_RISK_CELLS,
  systemStatus: "monitoring",
  alertLevel: "green",
  totalAffected: 0,
  disasterHistory: [],

  triggerDisaster: (type, lat, lng, severity) => {
    const newDisaster: DisasterZone = {
      id: `dis-${Date.now()}`,
      type,
      lat,
      lng,
      radius: severity === "critical" ? 8 : severity === "high" ? 5 : 3,
      severity,
      affectedPopulation: Math.floor(Math.random() * 50000) + 10000,
      spreadRate: severity === "critical" ? 0.8 : severity === "high" ? 0.5 : 0.2,
      startTime: new Date(),
    };

    const alertMap = { critical: "red", high: "orange", medium: "yellow", low: "green" } as const;

    set((state) => ({
      activeDisasters: [...state.activeDisasters, newDisaster],
      systemStatus: severity === "critical" ? "critical" : "active",
      alertLevel: alertMap[severity],
      totalAffected: state.totalAffected + newDisaster.affectedPopulation,
      disasterHistory: [newDisaster, ...state.disasterHistory],
    }));
  },

  removeDisaster: (id) => {
    set((state) => {
      const remaining = state.activeDisasters.filter((d) => d.id !== id);
      return {
        activeDisasters: remaining,
        systemStatus: remaining.length === 0 ? "monitoring" : state.systemStatus,
        alertLevel: remaining.length === 0 ? "green" : state.alertLevel,
      };
    });
  },

  updateRiskCells: (cells) => set({ riskCells: cells }),

  setSystemStatus: (status) => set({ systemStatus: status }),

  clearAll: () =>
    set({
      activeDisasters: [],
      systemStatus: "monitoring",
      alertLevel: "green",
      totalAffected: 0,
    }),
}));
