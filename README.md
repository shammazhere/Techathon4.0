# Civic Autopilot

**Autonomous Disaster Response Operating System**

Civic Autopilot is an **AI‑powered autonomous city coordination platform** that **simulates** disaster scenarios and **automatically generates** optimized emergency actions in real time. It goes beyond detection – it **orchestrates** evacuation, resource allocation, and traffic management without human lag.

---

## 📂 Project Architecture

The core backend is split into two primary Python modules that work together to simulate disaster propagation on a real-world mathematical graph.

### 1. `gis_engine/` (Geographic Information System)
This module builds our intelligent view of the world from raw data.
- **`osm/`**: Loads OpenStreetMap data. Connects to the Overpass API to fetch real-world road networks, hospitals, and critical infrastructure.
- **`graph/`**: Converts raw map lines into a mathematical `NetworkX` graph. Uses `DynamicGraph` to allow real-time blocking of roads during disasters.
- **`terrain/`**: Loads NASA SRTM satellite data to understand elevations. The `SlopeAnalyzer` calculates how steep roads are (impacting travel speeds and flood vulnerability).
- **`hospitals/` & `shelters/`**: Maps safe zones to the road graph and tracks real-time capacity during an evacuation.

### 2. `simulation/` (Hazard Propagation)
This module simulates how disasters move through the physical space.
- **`flood/`**: Uses Breadth-First Search and topographical elevation data to model how water spreads through a city and inundates roads.
- **`wildfire/`**: A probabilistic cellular automaton model that uses wind speed and terrain slope to predict fire spread.
- **`traffic/`**: Models congestion using BPR functions to reroute emergency vehicles dynamically when roads are blocked.
- **`risk/`**: Aggregates all live disaster threats to establish absolute "Danger Zones."

### 3. `datasets/` (Input Data)
- **`roads/`**: Place raw `.osm` or `.osm.pbf` files here.
- **`elevation/`**: Place `.tif` or `.hgt` NASA SRTM files here.
- **`weather/` & `disasters/`**: Folders for live wind data or historical FIRMS/GDACS disaster origin points.

---

## 🚀 How to Run the Simulation Engine

We have provided a demo script, `example_run.py`, which pulls real data from Sucre, Bolivia, and runs a live flood simulation.

### Step 1: Set up the environment
Make sure you are using Git Bash or an equivalent terminal. Navigate to the root directory and activate the virtual environment:
```bash
cd /d/Techathon4/Techathon4.0
source myenv/Scripts/activate
```

### Step 2: Install Dependencies
If you haven't already, install the required packages:
```bash
pip install -r requirements.txt
```
*(Dependencies include `networkx`, `numpy`, `rasterio`, and `matplotlib`)*

### Step 3: Run the Engine
Execute the demo script:
```bash
python example_run.py
```

**What the script does:**
1. Fetches real road networks from the Overpass API (Sucre, Bolivia).
2. Builds the spatial `NetworkX` graph.
3. Uses `EdgeWeightCalculator` to assign mathematically accurate travel times to all roads.
4. Uses **A\* Pathfinding** to calculate the fastest route for an emergency vehicle.
5. Spawns a flood at a specific origin coordinate which spreads dynamically across the map.
6. Automatically marks flooded roads as "impassable".
7. **AI Reroute**: Runs the pathfinding algorithm again, automatically generating a new, safe route that navigates around the danger zone!
8. Saves a visual representation of the map (Original Route vs AI Reroute) as `simulation_result.png`.

---

## 🛠️ Technology Stack
- **GIS Processing:** NetworkX, Rasterio
- **Visualization:** Matplotlib
- **Future Frontend:** Next.js, Mapbox GL JS
- **AI Integration:** LangGraph, Groq API (Planned for Command Center orchestration)
