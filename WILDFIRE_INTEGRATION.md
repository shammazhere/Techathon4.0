# Wildfire Data Integration Guide

## Overview

This guide explains how to load wildfire datasets and integrate them into the Civic Autopilot disaster response engine.

## Files Created

1. **`gis_engine/osm/wildfire_loader.py`** — Core wildfire data loading module
2. **`setup_wildfire_data.py`** — Setup script to download and prepare data
3. **`example_wildfire_integration.py`** — Integration example
4. **`data/wildfire.csv`** — Sample wildfire dataset (replace with real data)

## Quick Start

### Option 1: Use Sample Data (Local)

```bash
python example_wildfire_integration.py
```

This demonstrates how to:
- Load wildfire data from CSV
- Auto-detect column names
- Filter by geographic region
- Extract fire locations and intensities

### Option 2: Download from Kaggle

If you have Kaggle API credentials configured:

```bash
python setup_wildfire_data.py
```

This will:
1. Download the "Next Day Wildfire Spread" dataset
2. Parse and validate the data
3. Extract fire locations
4. Save a processed CSV file

**Setup Kaggle credentials:**
1. Go to https://www.kaggle.com/settings/account
2. Click "Create New API Token" (downloads `kaggle.json`)
3. Place it in `~/.kaggle/kaggle.json`
4. Set permissions: `chmod 600 ~/.kaggle/kaggle.json` (Linux/Mac)

## Usage in Your Simulation

### Basic Integration

```python
from gis_engine.osm.wildfire_loader import load_wildfire_for_region

# Define your simulation area
SIMULATION_BBOX = (9.955, 76.255, 9.985, 76.285)

# Load wildfire data for the region
fire_points = load_wildfire_for_region("data/wildfire.csv", SIMULATION_BBOX)

# Extract coordinates and intensities
fire_origins = [(f['latitude'], f['longitude']) for f in fire_points]
fire_intensities = [f.get('intensity', 0.7) for f in fire_points]

print(f"Found {len(fire_origins)} fire origins in simulation region")
```

### Advanced: Multi-Hazard Routing

```python
from gis_engine.graph.dynamic_graph import DynamicGraph
from gis_engine.osm.wildfire_loader import load_wildfire_for_region
from simulation.wildfire.fire_spread import FireSpreadSimulator
from simulation.flood.flood_spread import FloodSpreadSimulator

# Initialize simulators
fire_sim = FireSpreadSimulator(dynamic_graph)
flood_sim = FloodSpreadSimulator(dynamic_graph)

# Load hazard data
fire_points = load_wildfire_for_region("data/wildfire.csv", BBOX)
flood_points = [(9.9601, 76.2676), (9.9583, 76.2598)]

# Seed both hazards
fire_sim.seed(fire_points)
flood_sim.seed(flood_points)

# Run simulations
for step in range(10):
    fire_sim.step()
    flood_sim.step()
    
# Now routing algorithm avoids BOTH flooded and burned roads
```

## CSV Format

Your wildfire CSV should have at minimum these columns:

| Column | Type | Description |
|--------|------|-------------|
| latitude | float | Fire location latitude |
| longitude | float | Fire location longitude |
| fire_intensity | float | Intensity (0-1 scale, optional) |

Other columns are automatically detected or ignored:
- Any column with "lat" → latitude
- Any column with "lon" → longitude
- Any column with "intensity" or "fire" → intensity

## API Reference

### `WildfireDataLoader`

```python
loader = WildfireDataLoader(data_dir="datasets/wildfire")

# Load CSV
df = loader.load_csv("data/wildfire.csv")

# Extract fire locations
fires = loader.extract_fire_locations(
    lat_col="latitude",
    lon_col="longitude", 
    intensity_col="fire_intensity"
)

# Filter by region
regional_fires = loader.filter_by_region(
    fires,
    min_lat=9.955,
    max_lat=9.985,
    min_lon=76.255,
    max_lon=76.285
)

# Get stats
stats = loader.get_stats()
# Returns: {count, lat_range, lon_range, avg_intensity, max_intensity}
```

### `load_wildfire_for_region()` (Convenience Function)

```python
fires = load_wildfire_for_region(
    csv_path="data/wildfire.csv",
    bbox=(9.955, 76.255, 9.985, 76.285)  # (min_lat, min_lon, max_lat, max_lon)
)
```

## Wildfire Simulation Integration

The `simulation/wildfire/fire_spread.py` module handles:

- **Wind influence**: Fire spreads faster downwind
- **Terrain slope**: Uphill spread is faster
- **Fuel types**: Forest > scrub > grass > urban > bare ground
- **Neighbor propagation**: BFS across road network

To use with your fire origins:

```python
from simulation.wildfire.fire_spread import FireSpreadSimulator

fire_sim = FireSpreadSimulator(
    elevation_loader=elevation_loader,
    node_mapper=node_mapper,
    dynamic_graph=dynamic_graph,
    max_spread_distance_m=1000.0
)

# Seed from loaded data
fire_sim.seed(fire_origins)

# Simulate spread
for step in range(12):
    fire_sim.step()
```

## Troubleshooting

**"Could not find latitude/longitude columns"**
- Check your CSV column names
- Use explicit column names: `loader.extract_fire_locations(lat_col="y", lon_col="x")`

**"ModuleNotFoundError: pandas / kagglehub"**
- Install: `pip install -r requirements.txt`
- Or manually: `pip install pandas kagglehub`

**Kaggle download fails**
- Verify API credentials in `~/.kaggle/kaggle.json`
- Check internet connection
- Try downloading manually from https://www.kaggle.com/datasets/fantineh/next-day-wildfire-spread

**No fires in region**
- Check your bounding box coordinates
- Verify your CSV contains data in that region
- Use `loader.get_stats()` to see lat/lon ranges

## Next Steps

1. **Real dataset**: Replace `data/wildfire.csv` with your actual wildfire data
2. **Multi-hazard routing**: Combine with flood simulation for comprehensive disaster response
3. **Visualization**: Add fire overlay to the HTML dashboard alongside flood visualization
4. **Real-time updates**: Connect to live fire tracker APIs (e.g., NASA FIRMS)

## Dataset Sources

- **Kaggle**: [Next Day Wildfire Spread](https://www.kaggle.com/datasets/fantineh/next-day-wildfire-spread)
- **NASA FIRMS**: [Fire Information for Resource Management System](https://firms.modaps.eosdis.nasa.gov/)
- **USGS**: [Landsat & Sentinel-2 data](https://www.usgs.gov/programs/VHP/MODIS_Fire_Detection)
