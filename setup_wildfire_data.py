"""
setup_wildfire_data.py
----------------------
Downloads and prepares wildfire dataset from Kaggle.
Run this once to initialize the wildfire data for the simulation.
"""

import os
import logging
from pathlib import Path
from gis_engine.osm.wildfire_loader import WildfireDataLoader

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def setup_wildfire_dataset():
    """Download and prepare wildfire dataset from Kaggle."""
    
    print("\n" + "="*60)
    print("  WILDFIRE DATASET SETUP")
    print("="*60)
    
    loader = WildfireDataLoader(data_dir="datasets/wildfire")
    
    # Step 1: Check if Kaggle API is configured
    kaggle_config = Path.home() / ".kaggle" / "kaggle.json"
    
    if not kaggle_config.exists():
        print("\n  [INFO] Kaggle API credentials not found.")
        print("  To download from Kaggle:")
        print("  1. Go to https://www.kaggle.com/settings/account")
        print("  2. Click 'Create New API Token' (downloads kaggle.json)")
        print("  3. Place it in ~/.kaggle/kaggle.json")
        print("  4. chmod 600 ~/.kaggle/kaggle.json (Linux/Mac)")
        
        use_local = input("\n  Continue with local CSV instead? (y/n): ")
        if use_local.lower() != 'y':
            return False
    
    # Step 2: Try to download from Kaggle
    if kaggle_config.exists():
        print("\n  [STEP 1] Downloading from Kaggle...")
        kaggle_path = loader.download_from_kaggle()
        
        if kaggle_path:
            print(f"  ✓ Downloaded to: {kaggle_path}")
            
            # Look for CSV files in the downloaded path
            csv_files = list(Path(kaggle_path).glob("*.csv"))
            if csv_files:
                csv_path = str(csv_files[0])
                print(f"  ✓ Found CSV: {csv_path}")
            else:
                print("  [WARN] No CSV files found in downloaded data")
                return False
        else:
            return False
    else:
        # Use local CSV if available
        local_csv_candidates = [
            Path("data/wildfire.csv"),
            Path("datasets/wildfire/wildfire.csv")
        ]
        csv_path = None
        for candidate in local_csv_candidates:
            if candidate.exists():
                csv_path = str(candidate)
                print(f"\n  [STEP 1] Using local CSV: {csv_path}")
                break

        if csv_path is None:
            print("  [ERROR] No wildfire CSV found in data/ or datasets/wildfire/")
            print("  Place the dataset at data/wildfire.csv or datasets/wildfire/wildfire.csv")
            return False
    
    # Step 3: Load the data
    print("\n  [STEP 2] Loading wildfire data...")
    df = loader.load_csv(csv_path)
    
    if df is None:
        return False
    
    # Step 4: Show available columns
    print(f"\n  Available columns: {list(df.columns)}")
    
    # Step 5: Extract fire locations
    print("\n  [STEP 3] Extracting fire locations...")
    
    # Auto-detect column names
    lat_col = next((c for c in df.columns if 'lat' in c.lower()), None)
    lon_col = next((c for c in df.columns if 'lon' in c.lower()), None)
    intensity_col = next((c for c in df.columns if 'intensity' in c.lower() or 'fire' in c.lower()), None)
    
    if not lat_col or not lon_col:
        print(f"  [ERROR] Could not auto-detect latitude/longitude columns")
        print(f"  Please specify manually. Available: {list(df.columns)}")
        return False
    
    print(f"  ✓ Using columns: lat={lat_col}, lon={lon_col}, intensity={intensity_col}")
    
    fire_points = loader.extract_fire_locations(lat_col, lon_col, intensity_col)
    
    if not fire_points:
        print("  [ERROR] Failed to extract fire locations")
        return False
    
    # Step 6: Show statistics
    stats = loader.get_stats()
    print(f"\n  [STEP 4] Dataset Statistics:")
    print(f"  ↳ Total fire records: {stats['count']}")
    print(f"  ↳ Latitude range:     {stats['lat_range'][0]:.4f} to {stats['lat_range'][1]:.4f}")
    print(f"  ↳ Longitude range:    {stats['lon_range'][0]:.4f} to {stats['lon_range'][1]:.4f}")
    print(f"  ↳ Avg intensity:      {stats['avg_intensity']:.2f}")
    print(f"  ↳ Max intensity:      {stats['max_intensity']:.2f}")
    
    # Save preprocessed data
    output_path = Path("datasets/wildfire/wildfire_processed.csv")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    print(f"\n  [STEP 5] Saving processed data...")
    
    # Create a clean CSV with standardized columns
    processed_df = pd.DataFrame(fire_points)
    processed_df.to_csv(output_path, index=False)
    print(f"  ✓ Saved to: {output_path}")
    
    print("\n" + "="*60)
    print("  ✓ WILDFIRE DATA SETUP COMPLETE")
    print("="*60 + "\n")
    
    return True


if __name__ == "__main__":
    import pandas as pd  # Import here for setup script
    setup_wildfire_dataset()
