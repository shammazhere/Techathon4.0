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
    name: "Safest Route Alpha",
    fromZone: "Zone A – North District",
    toShelter: "Hebbal Stadium",
    distance: 8.4,
    estimatedTime: 22,
    riskScore: 12,
    capacity: 1200,
    status: "active",
    waypoints: [[12.99, 77.62], [13.01, 77.61], [13.02, 77.60], [13.03, 77.59]],
    blockedSegments: 0,
  },
  {
    id: "r2",
    name: "Route Beta – Harbor",
    fromZone: "Zone B – East Harbor",
    toShelter: "Koramangala Hall",
    distance: 5.1,
    estimatedTime: 18,
    riskScore: 35,
    capacity: 800,
    status: "congested",
    waypoints: [[12.98, 77.59], [12.96, 77.60], [12.93, 77.62]],
    blockedSegments: 1,
  },
  {
    id: "r3",
    name: "Route Gamma – Valley",
    fromZone: "Zone C – South Valley",
    toShelter: "Cubbon Park Center",
    distance: 12.3,
    estimatedTime: 35,
    riskScore: 28,
    capacity: 600,
    status: "active",
    waypoints: [[12.94, 77.63], [12.95, 77.61], [12.97, 77.59]],
    blockedSegments: 0,
  },
  {
    id: "r4",
    name: "Route Delta – Hills",
    fromZone: "Zone D – West Hills",
    toShelter: "Indiranagar High",
    distance: 7.8,
    estimatedTime: 28,
    riskScore: 62,
    capacity: 400,
    status: "blocked",
    waypoints: [[12.98, 77.56], [12.97, 77.60], [12.98, 77.64]],
    blockedSegments: 3,
  },
  {
    id: "r5",
    name: "Emergency Corridor E",
    fromZone: "Zone E – Central Core",
    toShelter: "MG Road Emergency Camp",
    distance: 4.2,
    estimatedTime: 12,
    riskScore: 18,
    capacity: 2000,
    status: "clear",
    waypoints: [[12.97, 77.59], [12.97, 77.60], [12.97, 77.61]],
    blockedSegments: 0,
  },
];

const MOCK_SIGNALS: TrafficSignal[] = [
  { id: "sig1", intersection: "Main St & Harbor Blvd", mode: "evacuation", greenDuration: 90, lastUpdated: new Date() },
  { id: "sig2", intersection: "North Ave & Valley Rd", mode: "emergency", greenDuration: 120, lastUpdated: new Date() },
  { id: "sig3", intersection: "West Hills Dr & Park Ln", mode: "blocked", greenDuration: 0, lastUpdated: new Date() },
  { id: "sig4", intersection: "Central Pkwy & East St", mode: "evacuation", greenDuration: 75, lastUpdated: new Date() },
  { id: "sig5", intersection: "South Blvd & River Rd", mode: "normal", greenDuration: 45, lastUpdated: new Date() },
];

export const useRouteStore = create<RouteStore>((set) => ({
  routes: MOCK_ROUTES,
  activeRouteId: "r1",
  signals: MOCK_SIGNALS,
  reroutedVehicles: 1842,
  evacueesMoved: 28430,

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
