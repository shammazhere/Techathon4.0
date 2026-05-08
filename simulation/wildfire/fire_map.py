"""
Wildfire Visualization on OpenStreetMap
Converts DEVS-FIRE Java visualization to Python with real disaster data
Uses: folium (OpenStreetMap), NASA FIRMS API, NIFC perimeter data

Install: pip install folium requests pandas geopandas shapely
"""

import folium
import requests
import json
import pandas as pd
from datetime import datetime, timedelta
import os


# ─── CONFIG ────────────────────────────────────────────────────────────────────
NASA_FIRMS_API_KEY = "YOUR_NASA_FIRMS_KEY"   # Get free at https://firms.modaps.eosdis.nasa.gov/api/
MAP_CENTER = [37.5, -119.5]                  # Default: California Sierra Nevada
ZOOM_START = 7

# Fuel type color mapping (mirrors Java fuelColorMap)
FUEL_COLOR_MAP = {
    0:  "#FFFFBE", 1:  "#FFFF00", 2:  "#E6C50B", 3:  "#FFD37F",
    4:  "#FFAA66", 5:  "#CDAA66", 6:  "#897044", 7:  "#D3FFBE",
    8:  "#70A800", 9:  "#267300", 10: "#E8BEFF", 11: "#7A8EF5",
    12: "#C500FF", 13: "#84008A", 91: "#9FA1F0", 92: "#E973FF",
    93: "#0000FF", 98: "#BFBFBF", 99: "#BFBFBF",
}

FIRE_COLORS = {
    1: "#FF4500",   # Burning (was red in Java)
    2: "#1a1a1a",   # Burned out (was black in Java)
}


# ─── 1. BASE MAP ───────────────────────────────────────────────────────────────
def create_base_map(center=MAP_CENTER, zoom=ZOOM_START):
    """Create OpenStreetMap base with multiple tile layers"""
    m = folium.Map(
        location=center,
        zoom_start=zoom,
        tiles=None  # We'll add tiles manually
    )

    # OpenStreetMap (default)
    folium.TileLayer(
        tiles="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attr="OpenStreetMap",
        name="Street Map",
        max_zoom=19,
    ).add_to(m)

    # ESRI Satellite (better for fire context)
    folium.TileLayer(
        tiles="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attr="Esri",
        name="Satellite",
        max_zoom=18,
    ).add_to(m)

    # ESRI Topo (shows terrain like the slope/aspect maps in Java)
    folium.TileLayer(
        tiles="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
        attr="Esri",
        name="Topographic",
        max_zoom=18,
    ).add_to(m)

    return m


# ─── 2. NASA FIRMS - REAL ACTIVE FIRE DATA ─────────────────────────────────────
def fetch_nasa_firms(api_key, area_url=None, days=1, source="VIIRS_SNPP_NRT"):
    """
    Fetch real active fire hotspots from NASA FIRMS.
    source options: MODIS_NRT, VIIRS_SNPP_NRT, VIIRS_NOAA20_NRT
    
    Get your free API key: https://firms.modaps.eosdis.nasa.gov/api/
    """
    # Default to California bounding box: W,S,E,N
    if area_url is None:
        area_url = "-124,32,-114,42"

    url = (
        f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/"
        f"{api_key}/{source}/{area_url}/{days}"
    )

    try:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        from io import StringIO
        df = pd.read_csv(StringIO(resp.text))
        print(f"[OK] Fetched {len(df)} fire hotspots from NASA FIRMS")
        return df
    except Exception as e:
        print(f"NASA FIRMS fetch failed: {e}")
        print("-> Using sample data instead")
        return _sample_firms_data()


def _sample_firms_data():
    """Fallback sample data shaped like real FIRMS CSV"""
    return pd.DataFrame({
        "latitude":   [37.85, 37.90, 37.78, 38.10, 37.65],
        "longitude":  [-119.5, -119.4, -119.6, -119.3, -119.7],
        "brightness": [320.5, 340.2, 315.8, 380.0, 295.4],
        "frp":        [45.2, 102.3, 28.7, 215.6, 12.1],   # Fire Radiative Power (MW)
        "acq_date":   [datetime.now().strftime("%Y-%m-%d")] * 5,
        "confidence": ["high", "high", "nominal", "high", "low"],
    })


def add_firms_hotspots(m, df, layer_name="🔥 Active Fire (NASA FIRMS)"):
    """Add NASA FIRMS hotspots as circles sized by fire intensity (FRP)"""
    fg = folium.FeatureGroup(name=layer_name)

    for _, row in df.iterrows():
        frp = float(row.get("frp", 10) or 10)
        conf = str(row.get("confidence", "nominal")).lower()
        radius = max(5, min(25, frp * 0.15))

        color = {
            "high":    "#FF2200",
            "nominal": "#FF6600",
            "low":     "#FF9900",
        }.get(conf, "#FF6600")

        popup_html = f"""
        <b>Active Fire Hotspot</b><br>
        Date: {row.get('acq_date', 'N/A')}<br>
        Brightness: {row.get('brightness', 'N/A')} K<br>
        Fire Power: {frp:.1f} MW<br>
        Confidence: {conf}
        """

        folium.CircleMarker(
            location=[row["latitude"], row["longitude"]],
            radius=radius,
            color=color,
            fill=True,
            fill_color=color,
            fill_opacity=0.75,
            popup=folium.Popup(popup_html, max_width=220),
            tooltip=f"FRP: {frp:.0f} MW | {conf}",
        ).add_to(fg)

    fg.add_to(m)
    return m


# ─── 3. NIFC FIRE PERIMETERS (GeoJSON) ─────────────────────────────────────────
def fetch_nifc_perimeters(year=None):
    """
    Fetch fire perimeters from NIFC (National Interagency Fire Center).
    Returns current-year active fires as GeoJSON.
    Free, no API key needed.
    """
    if year is None:
        year = datetime.now().year

    # NIFC ArcGIS REST API - current year perimeters
    url = (
        "https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/"
        f"Current_WildlandFire_Perimeters/FeatureServer/0/query"
        f"?where=1%3D1&outFields=*&f=geojson&resultRecordCount=50"
    )

    try:
        resp = requests.get(url, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        count = len(data.get("features", []))
        print(f"[OK] Fetched {count} fire perimeters from NIFC")
        return data
    except Exception as e:
        print(f"NIFC fetch failed: {e}")
        print("-> Using sample perimeter data")
        return _sample_perimeter_geojson()


def _sample_perimeter_geojson():
    """Sample GeoJSON perimeter for testing"""
    return {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {
                "IncidentName": "Sample Fire (Demo)",
                "GISAcres": 5200,
                "PercentContained": 45,
                "ModifiedOnDateTime_dt": datetime.now().isoformat(),
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [-119.55, 37.82], [-119.45, 37.82],
                    [-119.45, 37.92], [-119.55, 37.92],
                    [-119.55, 37.82],
                ]]
            }
        }]
    }


def add_fire_perimeters(m, geojson_data, layer_name="Fire Perimeters (NIFC)"):
    """Add NIFC fire perimeters as polygons"""
    # Guard against empty or malformed GeoJSON
    if not geojson_data or "type" not in geojson_data or not geojson_data.get("features"):
        print("[WARN] No fire perimeter data to display, skipping layer.")
        return m

    def style_fn(feature):
        contained = feature["properties"].get("PercentContained", 0) or 0
        # Color shifts from red → orange as containment increases
        if contained < 25:
            color = "#CC0000"
        elif contained < 50:
            color = "#FF4400"
        elif contained < 75:
            color = "#FF8800"
        else:
            color = "#FFBB00"
        return {
            "fillColor": color,
            "color": "#660000",
            "weight": 2,
            "fillOpacity": 0.35,
            "dashArray": "4 4",
        }

    def highlight_fn(feature):
        return {"weight": 3, "color": "#FF0000", "fillOpacity": 0.5}

    def popup_fn(feature):
        p = feature["properties"]
        name = p.get("IncidentName", "Unknown Fire")
        acres = p.get("GISAcres", "N/A")
        contained = p.get("PercentContained", "N/A")
        updated = p.get("ModifiedOnDateTime_dt", "N/A")
        return folium.Popup(
            f"<b>{name}</b><br>"
            f"Acres: {acres:,.0f}<br>" if isinstance(acres, (int, float)) else
            f"Acres: {acres}<br>"
            f"Contained: {contained}%<br>"
            f"Updated: {str(updated)[:10]}",
            max_width=250,
        )

    fg = folium.FeatureGroup(name=layer_name)
    folium.GeoJson(
        geojson_data,
        style_function=style_fn,
        highlight_function=highlight_fn,
        popup=folium.GeoJsonPopup(
            fields=["IncidentName", "GISAcres", "PercentContained"],
            aliases=["Fire Name", "Acres", "% Contained"],
        ),
        tooltip=folium.GeoJsonTooltip(
            fields=["IncidentName"],
            aliases=[""],
        ),
    ).add_to(fg)
    fg.add_to(m)
    return m


# ─── 4. DEVS-FIRE SIMULATION GRID OVERLAY ──────────────────────────────────────
def parse_devs_fire_api_response(data_string):
    """
    Parse DEVS-FIRE API response string (same logic as Java visualize() method).
    Returns list of dicts: {x, y, time, state}
    """
    # Strip leading "[{" and trailing "]"
    data = data_string[2:-1]
    points = []

    for part in data.split("{"):
        if not part:
            continue
        try:
            y_idx = part.index("y")
            op_idx = part.index("Operation")
            time_idx = part.index("time")

            operation = part[op_idx + 12 : part.index("time") - 3]
            if operation != "BurnCell":
                continue

            state_idx = part.index("state")
            points.append({
                "x":     int(part[5 : y_idx - 3]),
                "y":     int(part[y_idx + 4 : op_idx - 3]),
                "time":  float(part[time_idx + 7 : state_idx - 3]),
                "state": int(part[state_idx + 8 : state_idx + 9]),
            })
        except (ValueError, IndexError):
            continue

    return points


def add_simulation_grid(m, sim_points, origin_lat, origin_lon,
                         cell_size_meters=30, layer_name="🔬 DEVS-FIRE Simulation"):
    """
    Overlay DEVS-FIRE simulation grid on the real map.
    
    origin_lat/lon: real-world coordinates of grid center (0,0 in simulation)
    cell_size_meters: each cell's real-world size (30m = Landsat resolution)
    """
    import math

    # Degrees per meter (approximate)
    lat_per_meter = 1 / 111320
    lon_per_meter = 1 / (111320 * math.cos(math.radians(origin_lat)))

    fg = folium.FeatureGroup(name=layer_name)
    cell_deg_lat = cell_size_meters * lat_per_meter
    cell_deg_lon = cell_size_meters * lon_per_meter

    for pt in sim_points:
        lat = origin_lat + pt["y"] * cell_deg_lat
        lon = origin_lon + pt["x"] * cell_deg_lon

        color = FIRE_COLORS.get(pt["state"], "#888888")
        label = "Burning" if pt["state"] == 1 else "Burned"

        folium.Rectangle(
            bounds=[
                [lat, lon],
                [lat + cell_deg_lat, lon + cell_deg_lon],
            ],
            color=color,
            fill=True,
            fill_color=color,
            fill_opacity=0.6,
            weight=0,
            popup=f"Cell ({pt['x']}, {pt['y']})<br>State: {label}<br>Time: {pt['time']:.0f}s",
        ).add_to(fg)

    fg.add_to(m)
    return m


# ─── 5. LEGEND + CONTROLS ──────────────────────────────────────────────────────
def add_legend(m):
    """Add a floating legend to the map"""
    legend_html = """
    <div style="
        position: fixed; bottom: 30px; left: 30px; z-index: 1000;
        background: white; padding: 14px 18px; border-radius: 8px;
        border: 1px solid #ccc; font-family: sans-serif; font-size: 13px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15); min-width: 200px;">
      <b style="font-size:14px">Wildfire Map Legend</b><br><br>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="width:14px;height:14px;background:#FF2200;border-radius:50%;display:inline-block"></span>
        NASA FIRMS Hotspot (high)
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="width:14px;height:14px;background:#FF6600;border-radius:50%;display:inline-block"></span>
        NASA FIRMS Hotspot (nominal)
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="width:14px;height:14px;background:rgba(204,0,0,0.4);border:1px dashed #660000;display:inline-block"></span>
        Fire Perimeter &lt;25% contained
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="width:14px;height:14px;background:rgba(255,187,0,0.4);border:1px dashed #660000;display:inline-block"></span>
        Fire Perimeter &gt;75% contained
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="width:14px;height:14px;background:#FF4500;display:inline-block"></span>
        DEVS-FIRE: Burning cell
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="width:14px;height:14px;background:#1a1a1a;display:inline-block"></span>
        DEVS-FIRE: Burned cell
      </div>
      <hr style="margin:10px 0; border-color:#eee">
      <small style="color:#888">
        Circle size = Fire Radiative Power (MW)<br>
        Data: NASA FIRMS + NIFC
      </small>
    </div>
    """
    m.get_root().html.add_child(folium.Element(legend_html))
    return m


# ─── 6. MAIN ───────────────────────────────────────────────────────────────────
def build_wildfire_map(
    api_key=NASA_FIRMS_API_KEY,
    center=MAP_CENTER,
    bbox="-124,32,-114,42",   # California bounding box
    days=2,
    sim_data_string=None,
    sim_origin_lat=37.7,
    sim_origin_lon=-119.5,
    output_path="wildfire_map.html",
):
    """
    Build the complete wildfire map.
    
    Parameters:
        api_key: NASA FIRMS API key (get free at firms.modaps.eosdis.nasa.gov)
        center: [lat, lon] map center
        bbox: "W,S,E,N" bounding box for FIRMS query
        days: days of fire data to fetch (1-10)
        sim_data_string: optional DEVS-FIRE API response string
        sim_origin_lat/lon: real-world anchor for simulation grid
        output_path: where to save the HTML map
    """
    print("Building wildfire map...")

    # Base map
    m = create_base_map(center, zoom=ZOOM_START)

    # Real fire data layers
    print("Fetching NASA FIRMS hotspots...")
    firms_df = fetch_nasa_firms(api_key, bbox, days)
    add_firms_hotspots(m, firms_df)

    print("Fetching NIFC fire perimeters...")
    perimeters = fetch_nifc_perimeters()
    add_fire_perimeters(m, perimeters)

    # Optional simulation overlay
    if sim_data_string:
        print("Adding DEVS-FIRE simulation grid...")
        sim_points = parse_devs_fire_api_response(sim_data_string)
        add_simulation_grid(m, sim_points, sim_origin_lat, sim_origin_lon)

    # Legend + layer control
    add_legend(m)
    folium.LayerControl(collapsed=False).add_to(m)

    # Save
    m.save(output_path)
    print(f"\n[OK] Map saved to: {output_path}")
    print(f"  Open in browser: file://{os.path.abspath(output_path)}")
    return m


# ─── QUICK START ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    """
    USAGE:
    
    1. Install dependencies:
       pip install folium requests pandas geopandas

    2. Get NASA FIRMS API key (free, instant):
       https://firms.modaps.eosdis.nasa.gov/api/

    3. Run:
       python fire_map.py

    4. Open wildfire_map.html in your browser.

    TO USE YOUR OWN AREA:
       Change bbox to "W,S,E,N" for your region.
       Example for Australia: "112,-44,154,-10"
       Example for Greece:    "19,34,29,43"

    TO OVERLAY DEVS-FIRE SIMULATION:
       Pass sim_data_string=<your API response> to build_wildfire_map()
       and set sim_origin_lat/lon to the real-world location.
    """
    build_wildfire_map(
        api_key="695471fc9b1756546bbf5c0e29e5044f",
        center=[8.5, 105.0],          # Southeast Asia
        bbox="100,2,110,15",
        days=2,
        output_path="wildfire_map.html",
    )
