"""
generate_wildfire_sample.py
---------------------------
Generates a sample wildfire CSV for Bolivia/Amazon region.
"""

import numpy as np
import pandas as pd

np.random.seed(42)

n_points = 100
lat_center, lon_center = -14.5, -64.5
lat_span, lon_span = 3.0, 2.5

lats = lat_center + np.random.uniform(-lat_span/2, lat_span/2, n_points)
lons = lon_center + np.random.uniform(-lon_span/2, lon_span/2, n_points)

intensities = np.random.beta(2, 3, n_points)

df = pd.DataFrame({
    'latitude': lats,
    'longitude': lons,
    'fire_intensity': intensities,
    'frp': intensities * 50
})

output_path = "data/wildfire.csv"
df.to_csv(output_path, index=False)
print(f"[OK] Created {output_path} with {len(df)} fire points")
print(f"  Lat range: {df.latitude.min():.3f} to {df.latitude.max():.3f}")
print(f"  Lon range: {df.longitude.min():.3f} to {df.longitude.max():.3f}")
print(f"\nColumns: {list(df.columns)}")
print(f"\nFirst 5 rows:\n{df.head()}")
