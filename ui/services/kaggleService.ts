import { useRiskStore } from "@/store/riskStore";
import { useResourceStore } from "@/store/resourceStore";


// High-risk zones in India to project Kaggle intensities onto
const INDIA_ZONES = [
  { name: "Northern Himalayas", lat: 30.3165, lng: 78.0322 },
  { name: "Eastern Forests", lat: 21.9320, lng: 86.4428 },
  { name: "Western Ghats", lat: 11.7588, lng: 76.2415 },
  { name: "Central India", lat: 22.3340, lng: 78.0322 },
  { name: "Deccan Plateau", lat: 15.3173, lng: 75.7139 },
  { name: "Northeast Region", lat: 26.5775, lng: 93.1711 },
];

export async function fetchKaggleFires() {
  try {
    const response = await fetch("/data/wildfire.csv");
    if (!response.ok) throw new Error("Failed to fetch Kaggle wildfire data");

    const csv = await response.text();
    const lines = csv.split("\n").filter(line => line.trim() !== "");
    if (lines.length <= 1) return;

    // Skip header
    const dataLines = lines.slice(1);

    // Pick ONE random fire from the dataset to avoid overwhelming the system
    const randomIndex = Math.floor(Math.random() * dataLines.length);
    const parts = dataLines[randomIndex].split(",");

    const frp = parseFloat(parts[3]);

    // Map this intensity to a random India High-Risk Zone
    const targetZone = INDIA_ZONES[Math.floor(Math.random() * INDIA_ZONES.length)];

    // Add a tiny bit of random jitter so multiple clicks in the same zone don't overlap perfectly
    const lat = targetZone.lat + (Math.random() - 0.5) * 0.5;
    const lng = targetZone.lng + (Math.random() - 0.5) * 0.5;

    const { triggerDisaster } = useRiskStore.getState();

    // Determine severity based on Kaggle FRP data
    let severity: "critical" | "high" | "medium" | "low" = "low";
    if (frp > 40) severity = "critical";
    else if (frp > 25) severity = "high";
    else if (frp > 15) severity = "medium";

    // Trigger on map
    triggerDisaster(lat, lng, severity);

    // Generate real road routes and deploy resources
    const { generateRoutesForDisaster } = (await import("@/store/routeStore")).useRouteStore.getState();
    const routes = await generateRoutesForDisaster(lat, lng);

    // Auto-deploy a FULL TACTICAL FLEET to the epicenter
    const { autoDeployUnit } = useResourceStore.getState();
    if (routes && routes.length > 0) {
      // 1. Send Fire Truck (Suppress)
      autoDeployUnit('firetruck', lat, lng, routes[0].waypoints);

      // 2. Send Ambulance (Evac) - using safest route if available
      autoDeployUnit('ambulance', lat, lng, routes[0].waypoints);

      // 3. Send Rescue Team (Search) - slight delay for staging
      setTimeout(() => autoDeployUnit('rescue', lat, lng, routes[0].waypoints), 500);

      // 4. Send Supply Unit (Support) - slight delay for staging
      setTimeout(() => autoDeployUnit('supply', lat, lng, routes[0].waypoints), 1000);
    }

    console.log(`[Full Fleet Dispatch] Tactical units deployed to ${targetZone.name}: 🚒 FT, 🚑 AMB, 🚁 RSC, 📦 SUP`);
  } catch (error) {
    console.error("Error loading Kaggle data:", error);
  }
}



