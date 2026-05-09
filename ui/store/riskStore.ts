import { create } from "zustand";

export type DisasterType = "wildfire" | "none";
export type SeverityLevel = "critical" | "high" | "medium" | "low";

export interface DisasterZone {
  id: string;
  type: "wildfire";
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
  fireRisk: number;      // 0-100
  overallRisk: number;   // 0-100
  fuelDensity: number;   // 0-1
  windSpeed: number;     // km/h
  evacPriority: number;  // 0-100
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

  triggerDisaster: (lat: number, lng: number, severity: SeverityLevel) => void;
  removeDisaster: (id: string) => void;
  updateRiskCells: (cells: RiskCell[]) => void;
  setSystemStatus: (status: "idle" | "monitoring" | "active" | "critical") => void;
  clearAll: () => void;
}

const MOCK_RISK_CELLS: RiskCell[] = [
  { id: "z1", zone: "Northern Himalayas", fireRisk: 42, overallRisk: 42, fuelDensity: 0.4, windSpeed: 12, evacPriority: 15, population: 45200, elderlyDensity: 0.28, roadBlocked: false },
  { id: "z2", zone: "Eastern Forests", fireRisk: 28, overallRisk: 28, fuelDensity: 0.3, windSpeed: 15, evacPriority: 10, population: 32100, elderlyDensity: 0.22, roadBlocked: false },
  { id: "z3", zone: "Western Ghats", fireRisk: 74, overallRisk: 74, fuelDensity: 0.85, windSpeed: 28, evacPriority: 82, population: 28700, elderlyDensity: 0.31, roadBlocked: false },
  { id: "z4", zone: "Central India", fireRisk: 88, overallRisk: 88, fuelDensity: 0.92, windSpeed: 35, evacPriority: 94, population: 19400, elderlyDensity: 0.19, roadBlocked: true },
  { id: "z5", zone: "Deccan Plateau", fireRisk: 40, overallRisk: 40, fuelDensity: 0.5, windSpeed: 10, evacPriority: 45, population: 67800, elderlyDensity: 0.15, roadBlocked: false },
  { id: "z6", zone: "Northeast Region", fireRisk: 62, overallRisk: 62, fuelDensity: 0.7, windSpeed: 22, evacPriority: 68, population: 12300, elderlyDensity: 0.08, roadBlocked: false },
];

export const useRiskStore = create<RiskStore>((set) => ({
  activeDisasters: [],
  riskCells: MOCK_RISK_CELLS,
  systemStatus: "monitoring",
  alertLevel: "green",
  totalAffected: 0,
  disasterHistory: [],

  triggerDisaster: (lat, lng, severity) => {
    const newDisaster: DisasterZone = {
      id: `dis-${Date.now()}`,
      type: "wildfire",
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
