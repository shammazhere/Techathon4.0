import { useRiskStore } from "@/store/riskStore";

const NASA_FIRMS_API_KEY = "695471fc9b1756546bbf5c0e29e5044f";
// Bounding box for India roughly
const INDIA_BBOX = "68,8,97,37";

export async function fetchNasaFires() {
  try {
    // We fetch MODIS_NRT for the last 1 day. 
    // You can also use VIIRS_SNPP_NRT which has higher resolution.
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${NASA_FIRMS_API_KEY}/MODIS_NRT/${INDIA_BBOX}/1`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch NASA FIRMS data");
    }
    const csv = await response.text();
    const lines = csv.split("\n").filter(line => line.trim() !== "");
    if (lines.length <= 1) {
      console.log("No fires found from NASA FIRMS in the specified area.");
      return;
    }

    // Skip header
    const dataLines = lines.slice(1);

    // We only take the top 10 most severe fires (by FRP - Fire Radiative Power)
    // to avoid overloading the map.
    const fires = dataLines.map(line => {
      const parts = line.split(",");
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      const frp = parseFloat(parts[12]); // FRP is typically at index 12 for MODIS
      return { lat, lng, frp };
    }).sort((a, b) => b.frp - a.frp).slice(0, 10);

    const { triggerDisaster } = useRiskStore.getState();

    // Call dev fire API to orchestrate backend agents
    try {
      fetch("http://localhost:8000/disaster/start?type=wildfire", { method: "POST" })
        .catch(err => console.warn("Dev fire API not reachable:", err));
    } catch {
      // ignore
    }

    fires.forEach((fire, idx) => {
      // Determine severity based on FRP
      let severity: "critical" | "high" | "medium" | "low" = "low";
      if (fire.frp > 100) severity = "critical";
      else if (fire.frp > 50) severity = "high";
      else if (fire.frp > 20) severity = "medium";

      // Slight delay so they don't all trigger at exactly the same millisecond
      setTimeout(async () => {
        triggerDisaster(fire.lat, fire.lng, severity);

        // Generate real road routes from GIS Engine (OSRM)
        const { generateRoutesForDisaster } = (await import("@/store/routeStore")).useRouteStore.getState();
        const routes = await generateRoutesForDisaster(fire.lat, fire.lng);

        // Auto-deploy FULL TACTICAL FLEET to the top incidents
        const { autoDeployUnit } = (await import("@/store/resourceStore")).useResourceStore.getState();
        if (routes && routes.length > 0) {
          // Deploy different units with staggered delays
          autoDeployUnit('firetruck', fire.lat, fire.lng, routes[0].waypoints);

          setTimeout(() => {
            autoDeployUnit('ambulance', fire.lat, fire.lng, routes[0].waypoints);
          }, 400);

          setTimeout(() => {
            autoDeployUnit('rescue', fire.lat, fire.lng, routes[0].waypoints);
          }, 800);

          setTimeout(() => {
            autoDeployUnit('supply', fire.lat, fire.lng, routes[0].waypoints);
          }, 1200);
        }

      }, idx * 200);
    });

    console.log(`Integrated ${fires.length} live fires from NASA FIRMS. Full tactical fleet dispatched.`);


  } catch (error) {
    console.error("Error fetching NASA FIRMS:", error);
  }
}
