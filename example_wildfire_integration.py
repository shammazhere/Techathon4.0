"""
example_wildfire_integration.py
--------------------------------
Demonstrates how to integrate wildfire data into the disaster response simulation.
Shows: data loading → region filtering → integration with GIS engine
"""

import logging
import os
from gis_engine.osm.wildfire_loader import WildfireDataLoader, load_wildfire_for_region
from gis_engine.weather.openweather_loader import get_openweather_current

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def load_dotenv(path: str = ".env") -> None:
    """Load simple key=value pairs from a .env file into os.environ."""
    if not os.path.exists(path):
        return

    with open(path, encoding="utf-8") as env_file:
        for line in env_file:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and value and key not in os.environ:
                os.environ[key] = value


def main():
    print("\n" + "═"*60)
    print("  WILDFIRE DATA INTEGRATION EXAMPLE")
    print("═"*60)
    
    # ── STEP 1: Initialize loader ─────────────────────
    print("\n[STEP 1] Initializing wildfire data loader...")
    loader = WildfireDataLoader(data_dir="datasets/wildfire")
    
    # Load .env values first, so open_weather_api is available
    load_dotenv()

    # ── STEP 2: Load CSV data ────────────────────────
    # NOTE: Replace with your actual CSV path
    csv_path = "data/wildfire.csv"  # Or use the preprocessed file from setup
    print(f"\n[STEP 2] Loading data from: {csv_path}")
    
    df = loader.load_csv(csv_path)
    if df is None:
        print("[ERROR] Failed to load CSV. Check file path and format.")
        return
    
    # ── STEP 3: Display column info ──────────────────
    print(f"\n[STEP 3] Available columns in dataset:")
    for i, col in enumerate(df.columns, 1):
        print(f"  {i}. {col}")
        if i <= 5:  # Show sample data for first 5 columns
            print(f"     Sample: {df[col].iloc[0] if len(df) > 0 else 'N/A'}")
    
    # ── STEP 4: Extract fire locations ───────────────
    print(f"\n[STEP 4] Extracting fire locations...")
    
    # Auto-detect column names (customize as needed)
    lat_col = next((c for c in df.columns if 'lat' in c.lower()), None)
    lon_col = next((c for c in df.columns if 'lon' in c.lower()), None)
    intensity_col = next((c for c in df.columns if 'intensity' in c.lower() or 'fire' in c.lower()), None)
    
    print(f"  Detected columns:")
    print(f"  • Latitude:  {lat_col}")
    print(f"  • Longitude: {lon_col}")
    print(f"  • Intensity: {intensity_col}")
    
    if not lat_col or not lon_col:
        print("[ERROR] Could not auto-detect latitude/longitude columns!")
        print("Please manually specify column names in the code.")
        return
    
    # Extract fire points
    fire_points = loader.extract_fire_locations(lat_col, lon_col, intensity_col)
    
    if not fire_points:
        print("[ERROR] No fire locations extracted!")
        return
    
    # ── STEP 5: Show dataset statistics ──────────────
    print(f"\n[STEP 5] Dataset Statistics:")
    stats = loader.get_stats()
    for key, value in stats.items():
        print(f"  • {key}: {value}")
    
    # ── STEP 6: Filter by region (example) ───────────
    print(f"\n[STEP 6] Filtering by geographic region...")
    
    # Example: Kochi region (from your flood simulation)
    KOCHI_BBOX = (9.955, 76.255, 9.985, 76.285)
    min_lat, min_lon, max_lat, max_lon = KOCHI_BBOX
    
    regional_fires = loader.filter_by_region(
        fire_points,
        min_lat, max_lat,
        min_lon, max_lon
    )
    
    print(f"  Fires in Kochi region: {len(regional_fires)}")
    
    if regional_fires:
        print(f"\n  Sample fire locations:")
        for fire in regional_fires[:3]:
            print(f"    • Lat: {fire['latitude']:.4f}, Lon: {fire['longitude']:.4f}, "
                  f"Intensity: {fire.get('intensity', 'N/A')}")

    # ── STEP 7: Build agent payload ───────────────────
    print(f"\n[STEP 7] Building agent payload...")
    agent_payload = loader.to_agent_payload(regional_fires, max_points=100)
    print(f"  Agent payload items: {len(agent_payload)}")
    print("  Sample payload:")
    for item in agent_payload[:3]:
        print(f"    {item}")

    # ── STEP 8: Fetch current weather for the region ───
    weather = None
    openweather_key = os.getenv("open_weather_api") or os.getenv("OPENWEATHER_KEY")
    if openweather_key:
        print("\n[STEP 8] Fetching OpenWeather data at Kochi center...")
        weather = get_openweather_current(9.9601, 76.2676, openweather_key)
        print("  Weather payload:")
        for k, v in weather.items():
            print(f"    {k}: {v}")
    else:
        print("\n[STEP 8] open_weather_api not set. Skipping live weather fetch.")

    # ── STEP 9: Build combined agent input ───────────
    agent_input = {
        "fires": agent_payload,
        "weather": weather if openweather_key else None,
        "region": {
            "min_lat": 9.955,
            "min_lon": 76.255,
            "max_lat": 9.985,
            "max_lon": 76.285,
        }
    }

    print("\n  Combined agent input prepared:")
    print(f"    fires: {len(agent_input['fires'])} items")
    print(f"    weather included: {agent_input['weather'] is not None}")

    # ── STEP 10: Integration hints ───────────────────
    print(f"\n[STEP 10] Integration with Disaster Response Engine:")
    print("""
  To integrate with your GIS simulation:
  
  1. In your main simulation script, add:
  
     from gis_engine.osm.wildfire_loader import WildfireDataLoader
     
     loader = WildfireDataLoader(data_dir="datasets/wildfire")
     agent_payload = loader.get_agent_payload(
         "data/wildfire.csv",
         bbox=SIMULATION_BBOX,
         max_points=100,
         include_intensity=True
     )
     
     # Use payload in your agent or simulation
     for fire in agent_payload:
         wildfire_sim.seed([(fire['latitude'], fire['longitude'])])
     
  2. The WildfireSpreadSimulator can then propagate these fire origins
     across your road network based on:
     • Wind patterns (wind_analysis.py)
     • Terrain slope (slope_analysis.py)
     • Fuel types (fire_spread.py FUEL_LOAD)
     
  3. Combine with flood data for multi-hazard routing:
     • Avoid flooded roads
     • Avoid fire-affected areas
     • Optimize emergency routes
    """)
    
    print("\n" + "═"*60)
    print("  ✓ INTEGRATION EXAMPLE COMPLETE")
    print("═"*60 + "\n")


if __name__ == "__main__":
    main()
