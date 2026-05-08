"""
quick_test_wildfire.py
---------------------
Tests the wildfire data pipeline end-to-end.
"""

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from gis_engine.osm.wildfire_loader import WildfireDataLoader, load_wildfire_for_region

print("\n" + "="*50)
print("  WILDFIRE DATA PIPELINE TEST")
print("="*50)

# Test 1: Load sample CSV
print("\n[Test 1] Loading data/wildfire.csv...")
loader = WildfireDataLoader()
df = loader.load_csv("data/wildfire.csv")
print(f"  Loaded: {len(df)} records")
print(f"  Columns: {list(df.columns)}")

# Test 2: Auto-detect columns
print("\n[Test 2] Auto-detecting lat/lon/intensity columns...")
lat_col = loader._detect_column(df.columns, ["lat", "latitude"])
lon_col = loader._detect_column(df.columns, ["lon", "longitude"])
int_col = loader._detect_column(df.columns, ["intensity", "fire", "frp"])
print(f"  latitude column:  {lat_col}")
print(f"  longitude column: {lon_col}")
print(f"  intensity column: {int_col}")

# Test 3: Extract fire locations
print("\n[Test 3] Extracting fire locations...")
fires = loader.extract_fire_locations(lat_col, lon_col, int_col)
print(f"  Extracted {len(fires)} fire points")
print(f"  Sample: {fires[0]}")

# Test 4: Filter by region (Kochi bbox from example)
print("\n[Test 4] Filtering by region (Kochi waterfront)...")
kochi_bbox = (9.955, 76.255, 9.985, 76.285)
regional = loader.filter_by_region(fires, *kochi_bbox)
print(f"  Fires in Kochi bbox: {len(regional)}")

# Test 5: Payload generation
print("\n[Test 5] Generating agent payload...")
payload = loader.to_agent_payload(fires, max_points=50)
print(f"  Payload size: {len(payload)}")
print(f"  First payload item: {payload[0]}")

# Test 6: Convenience function
print("\n[Test 6] Testing load_wildfire_for_region()...")
payload2 = load_wildfire_for_region("data/wildfire.csv", bbox=kochi_bbox, max_points=10)
print(f"  Convenience function returned: {len(payload2)} points")

# Test 7: Show stats
print("\n[Test 7] Dataset statistics:")
stats = loader.get_stats()
for k, v in stats.items():
    print(f"  {k}: {v}")

print("\n" + "="*50)
print("  ✓ ALL TESTS PASSED")
print("="*50 + "\n")
