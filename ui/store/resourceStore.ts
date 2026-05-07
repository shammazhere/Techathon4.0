import { create } from "zustand";

export interface Shelter {
  id: string;
  name: string;
  lat: number;
  lng: number;
  capacity: number;
  occupied: number;
  hasmedical: boolean;
  hasfood: boolean;
  status: "open" | "full" | "compromised";
}

export interface ResourceUnit {
  id: string;
  type: "ambulance" | "firetruck" | "rescue" | "supply";
  label: string;
  status: "available" | "deployed" | "returning" | "offline";
  location: string;
  assignedZone?: string;
  eta?: number; // minutes
  fuelLevel: number; // 0-100
}

export interface SupplyItem {
  category: string;
  icon: string;
  total: number;
  deployed: number;
  unit: string;
  color: string;
}

interface ResourceStore {
  shelters: Shelter[];
  units: ResourceUnit[];
  supplies: SupplyItem[];
  totalUnits: number;
  deployedUnits: number;

  deployUnit: (id: string, zone: string) => void;
  recallUnit: (id: string) => void;
  updateShelter: (id: string, occupied: number) => void;
}

const MOCK_SHELTERS: Shelter[] = [
  { id: "s1", name: "Civic Center Arena", lat: 37.78, lng: -122.41, capacity: 3000, occupied: 2450, hasmedical: true, hasfood: true, status: "open" },
  { id: "s2", name: "North High School", lat: 37.80, lng: -122.43, capacity: 800, occupied: 800, hasmedical: false, hasfood: true, status: "full" },
  { id: "s3", name: "East Community Hall", lat: 37.77, lng: -122.39, capacity: 500, occupied: 320, hasmedical: true, hasfood: true, status: "open" },
  { id: "s4", name: "Westpark Stadium", lat: 37.76, lng: -122.44, capacity: 5000, occupied: 1200, hasmedical: true, hasfood: true, status: "open" },
  { id: "s5", name: "Harbor Emergency Camp", lat: 37.79, lng: -122.38, capacity: 1200, occupied: 980, hasmedical: false, hasfood: true, status: "open" },
];

const MOCK_UNITS: ResourceUnit[] = [
  { id: "u1", type: "ambulance", label: "AMB-01", status: "deployed", location: "Zone A", assignedZone: "Zone A – North District", eta: 4, fuelLevel: 78 },
  { id: "u2", type: "ambulance", label: "AMB-02", status: "deployed", location: "Zone B", assignedZone: "Zone B – East Harbor", eta: 7, fuelLevel: 62 },
  { id: "u3", type: "ambulance", label: "AMB-03", status: "available", location: "Base Station", fuelLevel: 95 },
  { id: "u4", type: "firetruck", label: "FT-01", status: "deployed", location: "Zone D", assignedZone: "Zone D – West Hills", eta: 2, fuelLevel: 88 },
  { id: "u5", type: "firetruck", label: "FT-02", status: "deployed", location: "Zone C", assignedZone: "Zone C – South Valley", eta: 11, fuelLevel: 55 },
  { id: "u6", type: "rescue", label: "RSC-01", status: "deployed", location: "Zone B", assignedZone: "Zone B – East Harbor", eta: 3, fuelLevel: 71 },
  { id: "u7", type: "rescue", label: "RSC-02", status: "available", location: "Base Station", fuelLevel: 100 },
  { id: "u8", type: "supply", label: "SUP-01", status: "returning", location: "En Route", fuelLevel: 43 },
  { id: "u9", type: "supply", label: "SUP-02", status: "deployed", location: "Zone E", assignedZone: "Zone E – Central Core", eta: 18, fuelLevel: 60 },
];

const MOCK_SUPPLIES: SupplyItem[] = [
  { category: "Medical Kits", icon: "🏥", total: 500, deployed: 340, unit: "kits", color: "#ff3b3b" },
  { category: "Food Rations", icon: "🍱", total: 12000, deployed: 7800, unit: "packs", color: "#ff9500" },
  { category: "Oxygen Tanks", icon: "🫁", total: 200, deployed: 145, unit: "tanks", color: "#00d2ff" },
  { category: "Water Supply", icon: "💧", total: 50000, deployed: 32000, unit: "liters", color: "#0080ff" },
  { category: "Blankets", icon: "🛏️", total: 3000, deployed: 1900, unit: "units", color: "#7c3aed" },
  { category: "Rescue Gear", icon: "⛑️", total: 150, deployed: 98, unit: "sets", color: "#00ff88" },
];

export const useResourceStore = create<ResourceStore>((set) => ({
  shelters: MOCK_SHELTERS,
  units: MOCK_UNITS,
  supplies: MOCK_SUPPLIES,
  totalUnits: MOCK_UNITS.length,
  deployedUnits: MOCK_UNITS.filter((u) => u.status === "deployed").length,

  deployUnit: (id, zone) =>
    set((state) => ({
      units: state.units.map((u) =>
        u.id === id ? { ...u, status: "deployed", assignedZone: zone, eta: Math.floor(Math.random() * 20) + 2 } : u
      ),
      deployedUnits: state.deployedUnits + 1,
    })),

  recallUnit: (id) =>
    set((state) => ({
      units: state.units.map((u) =>
        u.id === id ? { ...u, status: "returning", assignedZone: undefined } : u
      ),
    })),

  updateShelter: (id, occupied) =>
    set((state) => ({
      shelters: state.shelters.map((s) =>
        s.id === id ? { ...s, occupied, status: occupied >= s.capacity ? "full" : "open" } : s
      ),
    })),
}));
