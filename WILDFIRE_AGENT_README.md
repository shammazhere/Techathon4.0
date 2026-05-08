# 🔥 Civic Autopilot — Wildfire Prediction Agent

Autonomous wildfire spread prediction using the **NASA Next-Day Wildfire Spread** dataset and a **LangGraph** agent pipeline. No TensorFlow required.

---

## 🗂️ Project Structure

```
Techathon4.0/
│
├── wildfire_agent.py               ← LangGraph agent (main script)
├── read_tfrecord.py                ← Dataset inspector (no TF needed)
├── wildfire_prediction.png         ← Generated fire prediction map
├── wildfire_intelligence.html      ← Generated HTML dashboard
│
├── setup_wildfire_data.py          ← Download dataset via Kaggle API
├── download_kaggle_dataset.py      ← Alternate Kaggle downloader
├── generate_wildfire_sample.py     ← Generate sample wildfire CSV
├── quick_test_wildfire.py          ← Quick smoke test
├── example_wildfire_integration.py ← Integration usage example
│
├── data/
│   └── wildfire.csv                ← Sample wildfire CSV data
│
├── datasets/
│   ├── wildfire/                   ← Wildfire dataset READMEs
│   ├── elevation/
│   │   └── srtm_23_16/             ← NASA SRTM elevation tiles (.hgt/.tif)
│   ├── roads/                      ← OSM road data (place .osm files here)
│   ├── weather/                    ← Wind / weather data
│   └── disasters/                  ← GDACS / FIRMS disaster origins
│
├── gis_engine/                     ← Geographic Information System core
│   ├── graph/
│   │   ├── graph_builder.py        ← OSM → NetworkX graph
│   │   ├── dynamic_graph.py        ← Real-time road blocking
│   │   ├── node_mapper.py          ← Lat/lon ↔ node ID mapping (KDTree)
│   │   └── edge_weights.py         ← Travel time / BPR weight calculator
│   ├── osm/
│   │   ├── osm_loader.py           ← Overpass API loader
│   │   ├── road_extractor.py       ← Road edge extractor
│   │   ├── hospital_extractor.py   ← Hospital node extractor
│   │   └── wildfire_loader.py      ← CSV wildfire data loader
│   ├── terrain/
│   │   ├── elevation_loader.py     ← NASA SRTM raster reader
│   │   ├── slope_analysis.py       ← Slope / aspect per edge
│   │   └── terrain_analysis.py     ← Terrain feature aggregator
│   ├── hospitals/
│   │   ├── hospital_mapper.py      ← Map hospitals to road graph
│   │   └── hospital_capacity.py    ← Real-time capacity tracker
│   ├── shelters/
│   │   ├── shelter_mapper.py       ← Evacuation shelter mapper
│   │   └── safe_zone_mapper.py     ← Safe zone validator
│   └── weather/
│       └── openweather_loader.py   ← Live weather API loader
│
├── simulation/
│   ├── wildfire/
│   │   ├── fire_spread.py          ← Rothermel cellular automaton model
│   │   ├── wind_analysis.py        ← Wind vector field + IDW interpolation
│   │   └── burn_radius.py          ← Fire perimeter geometry
│   ├── flood/
│   │   ├── flood_spread.py         ← BFS flood propagation
│   │   ├── water_propagation.py    ← Water level model
│   │   └── flood_risk.py           ← Risk score calculator
│   ├── traffic/
│   │   ├── traffic_simulation.py   ← Emergency vehicle routing
│   │   └── congestion_model.py     ← BPR congestion function
│   └── risk/
│       └── danger_zones.py         ← Multi-hazard danger zone aggregator
│
├── models/
│   └── wildfire_model.pkl          ← Trained wildfire prediction model
│
├── requirements.txt                ← Python dependencies
├── WILDFIRE_AGENT_README.md        ← This file
└── WILDFIRE_INTEGRATION.md         ← CSV wildfire integration guide
```

---

## 📦 Dataset

**Source:** [Kaggle — Next Day Wildfire Spread](https://www.kaggle.com/datasets/fantineh/next-day-wildfire-spread)

**Format:** TFRecord binary files (downloaded via `kagglehub`)

**Location after download:**
```
C:\Users\<you>\.cache\kagglehub\datasets\fantineh\next-day-wildfire-spread\versions\2\
  next_day_wildfire_spread_train_00.tfrecord
  next_day_wildfire_spread_train_01.tfrecord
  ...
  next_day_wildfire_spread_eval_00.tfrecord
  next_day_wildfire_spread_test_00.tfrecord
```

### Dataset Structure (per record)

Each record is a **64 × 64 spatial patch** with 13 features:

| Feature | Type | Description |
|---|---|---|
| `PrevFireMask` | float32 (64×64) | Current day fire presence (input) |
| `FireMask` | float32 (64×64) | **Next-day fire label** (ground truth) |
| `NDVI` | float32 (64×64) | Vegetation index — proxy for fuel load |
| `elevation` | float32 (64×64) | Terrain elevation in metres |
| `vs` | float32 (64×64) | Wind speed (m/s) |
| `th` | float32 (64×64) | Wind direction (degrees) |
| `erc` | float32 (64×64) | Energy Release Component (fire danger) |
| `pdsi` | float32 (64×64) | Palmer Drought Severity Index |
| `pr` | float32 (64×64) | Precipitation |
| `sph` | float32 (64×64) | Specific humidity |
| `tmmn` | float32 (64×64) | Min temperature (Kelvin) |
| `tmmx` | float32 (64×64) | Max temperature (Kelvin) |
| `population` | float32 (64×64) | Population density |

---

## 🔍 Step 1 — Inspect the Dataset

`read_tfrecord.py` reads TFRecord files **without TensorFlow** using a pure-Python protobuf decoder.

```powershell
cd D:\Techathon4\Techathon4.0
myenv\Scripts\python.exe -X utf8 read_tfrecord.py
```

**Output:**
- Raw byte dump of first 3 records
- All 13 feature keys with types and shapes
- Per-feature stats (min / max / mean) for the first patch
- Fire mask pixel count and unique values

---

## 🤖 Step 2 — Run the LangGraph Wildfire Agent

`wildfire_agent.py` is a **5-node LangGraph pipeline** that predicts next-day fire spread.

### Agent Graph

```
load_data → select_patch → run_simulation → evaluate → visualize → END
```

| Node | What it does |
|---|---|
| `load_data` | Reads up to 20 TFRecord patches from the dataset |
| `select_patch` | Picks the patch with the most active fire pixels in `PrevFireMask`; reads real wind speed (`vs`) and direction (`th`) |
| `run_simulation` | Runs a Rothermel-inspired cellular automaton fire spread on the 64×64 grid using real NDVI (fuel), elevation (slope), and wind |
| `evaluate` | Compares prediction vs `FireMask` ground truth — accuracy, precision, recall, F1, TP/FP/FN/TN |
| `visualize` | Saves a 4-panel PNG map and HTML dashboard |

### Run Command

```powershell
cd D:\Techathon4\Techathon4.0
myenv\Scripts\python.exe -X utf8 wildfire_agent.py
```

### View Outputs

```powershell
# Open the 4-panel prediction map
start wildfire_prediction.png

# Open the HTML intelligence dashboard
start wildfire_intelligence.html
```

---

## 🗺️ Output: `wildfire_prediction.png`

Four-panel matplotlib figure on a dark background:

| Panel | Content |
|---|---|
| Top-left | `PrevFireMask` — current day fire state (input) |
| Top-right | `FireMask` — NASA ground truth for next day + AI prediction contour overlay |
| Bottom-left | AI predicted fire spread after simulation steps + stats box + spread timeline chart |
| Bottom-right | NDVI vegetation/fuel map |

---

## 📊 Output: `wildfire_intelligence.html`

Dark-themed HTML dashboard showing:
- Prediction accuracy, fire pixel counts, wind conditions
- TP / FP / FN breakdown cards
- Embedded prediction map
- Data pipeline badge trail

---

## ⚙️ Physics Model

The fire spread uses a **probabilistic cellular automaton** on the 64×64 grid:

```
P(spread) = 0.08 × slope_factor × wind_factor × fuel_load

slope_factor = 1 + max(slope_degrees / 30, 0)
wind_factor  = 1 + (wind_speed / 10) × cos(wind_angle_alignment)
fuel_load    = NDVI / 10000  (clipped 0–1)
```

Wind speed and direction are read **directly from the `vs` and `th` dataset features** — no hardcoded values.

---

## 🛠️ Dependencies

All already installed in `myenv`:

```
langgraph
numpy
matplotlib
protobuf   ← used to decode TFRecord without TensorFlow
kagglehub  ← used to download the dataset
```

Install if missing:
```powershell
myenv\Scripts\pip.exe install langgraph numpy matplotlib protobuf kagglehub --cache-dir C:\pip_cache
```

> ⚠️ The D: drive is full — always pass `--cache-dir C:\pip_cache` when installing new packages.

---

## 📁 File Reference

| File | Purpose |
|---|---|
| `read_tfrecord.py` | Inspect TFRecord structure without TensorFlow |
| `wildfire_agent.py` | LangGraph prediction agent (main script) |
| `wildfire_prediction.png` | Generated 4-panel fire map |
| `wildfire_intelligence.html` | Generated HTML dashboard |
| `simulation/wildfire/fire_spread.py` | Rothermel spread probability model |
| `simulation/wildfire/wind_analysis.py` | Wind vector interpolation (`WindField`) |
| `simulation/wildfire/burn_radius.py` | Fire perimeter geometry estimator |
| `gis_engine/osm/wildfire_loader.py` | CSV wildfire data loader (for real lat/lon data) |
| `WILDFIRE_INTEGRATION.md` | Integration guide for real CSV wildfire datasets |

---

## 🚀 Quick Start (All Steps)

```powershell
# 1. Navigate to project
cd D:\Techathon4\Techathon4.0

# 2. Inspect dataset structure
myenv\Scripts\python.exe -X utf8 read_tfrecord.py

# 3. Run the wildfire prediction agent
myenv\Scripts\python.exe -X utf8 wildfire_agent.py

# 4. View results
start wildfire_prediction.png
start wildfire_intelligence.html
```
