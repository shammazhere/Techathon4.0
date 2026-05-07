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
    toShelter: "Westpark Stadium",
    distance: 8.4,
    estimatedTime: 22,
    riskScore: 12,
    capacity: 1200,
    status: "active",
    waypoints: [[37.80, -122.43], [37.79, -122.44], [37.78, -122.44], [37.76, -122.44]],
    blockedSegments: 0,
  },
  {
    id: "r2",
    name: "Route Beta – Harbor",
    fromZone: "Zone B – East Harbor",
    toShelter: "East Community Hall",
    distance: 5.1,
    estimatedTime: 18,
    riskScore: 35,
    capacity: 800,
    status: "congested",
    waypoints: [[37.79, -122.38], [37.78, -122.39], [37.77, -122.39]],
    blockedSegments: 1,
  },
  {
    id: "r3",
    name: "Route Gamma – Valley",
    fromZone: "Zone C – South Valley",
    toShelter: "Civic Center Arena",
    distance: 12.3,
    estimatedTime: 35,
    riskScore: 28,
    capacity: 600,
    status: "active",
    waypoints: [[37.74, -122.43], [37.76, -122.42], [37.78, -122.41]],
    blockedSegments: 0,
  },
  {
    id: "r4",
    name: "Route Delta – Hills",
    fromZone: "Zone D – West Hills",
    toShelter: "North High School",
    distance: 7.8,
    estimatedTime: 28,
    riskScore: 62,
    capacity: 400,
    status: "blocked",
    waypoints: [[37.78, -122.46], [37.79, -122.45], [37.80, -122.43]],
    blockedSegments: 3,
  },
  {
    id: "r5",
    name: "Emergency Corridor E",
    fromZone: "Zone E – Central Core",
    toShelter: "Harbor Emergency Camp",
    distance: 4.2,
    estimatedTime: 12,
    riskScore: 18,
    capacity: 2000,
    status: "clear",
    waypoints: [[37.78, -122.41], [37.785, -122.40], [37.79, -122.38]],
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
