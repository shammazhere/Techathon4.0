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
  lat?: number;
  lng?: number;
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
  { id: "s1", name: "Dehradun Relief Center", lat: 30.3165, lng: 78.0322, capacity: 3000, occupied: 2450, hasmedical: true, hasfood: true, status: "open" },
  { id: "s2", name: "Simlipal Base Camp", lat: 21.9320, lng: 86.4428, capacity: 800, occupied: 800, hasmedical: false, hasfood: true, status: "full" },
  { id: "s3", name: "Wayanad Evac Zone", lat: 11.7588, lng: 76.2415, capacity: 500, occupied: 320, hasmedical: true, hasfood: true, status: "open" },
  { id: "s4", name: "Bhopal Emergency Unit", lat: 23.2599, lng: 77.4126, capacity: 5000, occupied: 1200, hasmedical: true, hasfood: true, status: "open" },
  { id: "s5", name: "Guwahati Safehouse", lat: 26.1445, lng: 91.7362, capacity: 1200, occupied: 980, hasmedical: false, hasfood: true, status: "open" },
];

const MOCK_UNITS: ResourceUnit[] = [
  { id: "u1", type: "ambulance", label: "AMB-01", status: "deployed", location: "Himalayas", assignedZone: "Northern Himalayas", eta: 4, fuelLevel: 78, lat: 30.3, lng: 78.0 },
  { id: "u2", type: "ambulance", label: "AMB-02", status: "deployed", location: "Odisha", assignedZone: "Eastern Forests", eta: 7, fuelLevel: 62, lat: 21.9, lng: 86.4 },
  { id: "u3", type: "ambulance", label: "AMB-03", status: "available", location: "Delhi Base", fuelLevel: 95, lat: 28.6, lng: 77.2 },
  { id: "u4", type: "firetruck", label: "FT-01", status: "deployed", location: "Central", assignedZone: "Central India", eta: 2, fuelLevel: 88, lat: 22.3, lng: 78.0 },
  { id: "u5", type: "firetruck", label: "FT-02", status: "deployed", location: "Wayanad", assignedZone: "Western Ghats", eta: 11, fuelLevel: 55, lat: 11.7, lng: 76.2 },
  { id: "u6", type: "rescue", label: "RSC-01", status: "deployed", location: "Odisha", assignedZone: "Eastern Forests", eta: 3, fuelLevel: 71, lat: 21.8, lng: 86.3 },
  { id: "u7", type: "rescue", label: "RSC-02", status: "available", location: "Mumbai Base", fuelLevel: 100, lat: 19.0, lng: 72.8 },
  { id: "u8", type: "supply", label: "SUP-01", status: "returning", location: "En Route", fuelLevel: 43, lat: 23.0, lng: 78.0 },
  { id: "u9", type: "supply", label: "SUP-02", status: "deployed", location: "Assam", assignedZone: "Northeast Region", eta: 18, fuelLevel: 60, lat: 26.5, lng: 93.1 },
];

const MOCK_SUPPLIES: SupplyItem[] = [
  { category: "Fire Retardant", icon: "🛢️", total: 50000, deployed: 34000, unit: "gal", color: "#fb923c" },
  { category: "Burn Kits", icon: "🏥", total: 12000, deployed: 7800, unit: "packs", color: "#f87171" },
  { category: "Respirators", icon: "🫁", total: 2000, deployed: 1450, unit: "units", color: "#38bdf8" },
  { category: "Water Supply", icon: "💧", total: 500000, deployed: 320000, unit: "liters", color: "#60a5fa" },
  { category: "Thermal Blankets", icon: "🛏️", total: 3000, deployed: 1900, unit: "units", color: "#a78bfa" },
  { category: "Drone Batteries", icon: "🔋", total: 150, deployed: 98, unit: "packs", color: "#34d399" },
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
