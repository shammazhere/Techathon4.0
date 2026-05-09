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
  generateRoutesForDisaster: (lat: number, lng: number) => Promise<EvacuationRoute[]>;
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

  generateRoutesForDisaster: async (lat: number, lng: number) => {
    // Generate some fake shelter destinations roughly 10-20km away
    const shelters = [
      { id: `sh-${Date.now()}-1`, name: "Alpha Safe Zone", lat: lat + 0.1, lng: lng + 0.1, capacity: 500, occupied: 120, hasmedical: true, hasfood: true, status: "open" as const },
      { id: `sh-${Date.now()}-2`, name: "Beta Evac Camp", lat: lat - 0.15, lng: lng + 0.05, capacity: 800, occupied: 300, hasmedical: false, hasfood: true, status: "open" as const },
      { id: `sh-${Date.now()}-3`, name: "Gamma Relief", lat: lat + 0.08, lng: lng - 0.12, capacity: 400, occupied: 390, hasmedical: true, hasfood: true, status: "open" as const },
      { id: `sh-${Date.now()}-4`, name: "Delta Hospital Base", lat: lat - 0.1, lng: lng - 0.1, capacity: 1500, occupied: 1000, hasmedical: true, hasfood: true, status: "open" as const },
    ];

    // Dynamically inject the shelters into the resource store so they appear on the map!
    const { useResourceStore } = await import("@/store/resourceStore");
    useResourceStore.getState().addShelters(shelters);

    const newRoutes = await Promise.all(shelters.map(async (sh, i) => {
      let waypoints: [number, number][] = [[lat, lng], [sh.lat, sh.lng]];
      try {
        // Use OSRM GIS Engine to fetch actual road polyline
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${lng},${lat};${sh.lng},${sh.lat}?overview=full&geometries=geojson`);
        const data = await res.json();
        if (data.routes && data.routes[0]) {
          waypoints = data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        }
      } catch (e) {
        console.warn("OSRM GIS Engine failed", e);
      }

      return {
        id: `r-${sh.id}`,
        name: `${sh.name} Route`,
        fromZone: "Disaster Epicenter",
        toShelter: sh.name,
        distance: Math.floor(Math.random() * 20) + 10,
        estimatedTime: Math.floor(Math.random() * 40) + 20,
        riskScore: [12, 35, 62, 18][i] || 20,
        capacity: 1000,
        status: (["active", "congested", "blocked", "clear"] as const)[i] || "active",
        waypoints,
        blockedSegments: i === 2 ? 3 : 0,
      };
    }));

    // Find the safest route and set it as active
    const safestRoute = newRoutes.reduce((prev, curr) => (prev.riskScore < curr.riskScore ? prev : curr));
    set({ routes: newRoutes, activeRouteId: safestRoute.id });

    return newRoutes;
  },

}));
