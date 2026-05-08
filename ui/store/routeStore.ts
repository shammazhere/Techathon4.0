import { create } from "zustand";

export interface EvacuationRoute {
  id: string;
  name: string;
  fromZone: string;
  toShelter: string;
  distance: number; // km
  estimatedTime: number; // minutes
  riskScore: number; // 0-100 (lower is safer)
  capacity: number; // vehicles/hour
  status: "active" | "blocked" | "congested" | "clear";
  waypoints: [number, number][];
  blockedSegments: number; // count
}

export interface TrafficSignal {
  id: string;
  intersection: string;
  mode: "normal" | "emergency" | "evacuation" | "blocked";
  greenDuration: number; // seconds
  lastUpdated: Date;
}

interface RouteStore {
  routes: EvacuationRoute[];
  activeRouteId: string | null;
  signals: TrafficSignal[];
  reroutedVehicles: number;
  evacueesMoved: number;

  selectRoute: (id: string) => void;
  updateRouteStatus: (id: string, status: EvacuationRoute["status"]) => void;
  addRoute: (route: EvacuationRoute) => void;
  optimizeSignals: () => void;
}

const MOCK_ROUTES: EvacuationRoute[] = [
  {
    id: "r1",
    name: "Himalayas Escape Route",
    fromZone: "Northern Himalayas",
    toShelter: "Chandigarh Base",
    distance: 280.4,
    estimatedTime: 320,
    riskScore: 12,
    capacity: 1200,
    status: "active",
    waypoints: [[32.2396, 77.1887], [31.5, 76.5], [30.7333, 76.7794]],
    blockedSegments: 0,
  },
  {
    id: "r2",
    name: "Western Ghats Evacuation",
    fromZone: "Western Ghats",
    toShelter: "Mumbai Safe Zone",
    distance: 148.1,
    estimatedTime: 180,
    riskScore: 35,
    capacity: 800,
    status: "congested",
    waypoints: [[18.5204, 73.8567], [18.9, 73.5], [19.0760, 72.8777]],
    blockedSegments: 1,
  },
  {
    id: "r3",
    name: "Central Forest Corridor",
    fromZone: "Central India",
    toShelter: "Indore Emergency Camp",
    distance: 195.3,
    estimatedTime: 215,
    riskScore: 28,
    capacity: 600,
    status: "active",
    waypoints: [[23.2599, 77.4126], [22.7, 76.5], [22.7196, 75.8577]],
    blockedSegments: 0,
  },
  {
    id: "r4",
    name: "Eastern Hills Route",
    fromZone: "Eastern Forests",
    toShelter: "Shillong Camp",
    distance: 98.8,
    estimatedTime: 165,
    riskScore: 62,
    capacity: 400,
    status: "blocked",
    waypoints: [[26.1445, 91.7362], [25.5, 91.8], [25.5788, 91.8933]],
    blockedSegments: 3,
  },
  {
    id: "r5",
    name: "Deccan Plateau Highway",
    fromZone: "Deccan Plateau",
    toShelter: "Vijayawada Base",
    distance: 275.2,
    estimatedTime: 290,
    riskScore: 18,
    capacity: 2000,
    status: "clear",
    waypoints: [[17.3850, 78.4867], [16.5, 79.5], [16.5062, 80.6480]],
    blockedSegments: 0,
  },
];

const MOCK_SIGNALS: TrafficSignal[] = [
  { id: "sig1", intersection: "NH-44 Alpine Pass", mode: "evacuation", greenDuration: 90, lastUpdated: new Date() },
  { id: "sig2", intersection: "Pune-Mumbai Expressway", mode: "emergency", greenDuration: 120, lastUpdated: new Date() },
  { id: "sig3", intersection: "Bhopal Forest Highway", mode: "blocked", greenDuration: 0, lastUpdated: new Date() },
  { id: "sig4", intersection: "Guwahati Bridge", mode: "evacuation", greenDuration: 75, lastUpdated: new Date() },
  { id: "sig5", intersection: "Hyderabad Outer Ring", mode: "normal", greenDuration: 45, lastUpdated: new Date() },
];

export const useRouteStore = create<RouteStore>((set) => ({
  routes: MOCK_ROUTES,
  activeRouteId: "r1",
  signals: MOCK_SIGNALS,
  reroutedVehicles: 0,
  evacueesMoved: 0,

  selectRoute: (id) => set({ activeRouteId: id }),

  updateRouteStatus: (id, status) =>
    set((state) => ({
      routes: state.routes.map((r) => (r.id === id ? { ...r, status } : r)),
    })),

  addRoute: (route) =>
    set((state) => ({ routes: [route, ...state.routes] })),

  optimizeSignals: () =>
    set((state) => ({
      signals: state.signals.map((s) =>
        s.mode !== "blocked" ? { ...s, mode: "evacuation" as const, greenDuration: 90, lastUpdated: new Date() } : s
      ),
      reroutedVehicles: state.reroutedVehicles + Math.floor(Math.random() * 200) + 50,
    })),
}));
