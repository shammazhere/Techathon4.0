"""
wildfire_loader.py
------------------
Loads wildfire point data from CSV files and converts it into
agent-ready payloads for integration with the simulation engine.

Supports:
- CSV with lat/lon columns (auto-detected)
- Optional intensity/severity columns
- Region filtering by bounding box
- Export to agent payload format
"""

import logging
import os
import pandas as pd
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)


class WildfireDataLoader:
    """
    Loads and processes wildfire incident data from CSV files.
    """

    def __init__(self, data_dir: str = "datasets/wildfire"):
        """
        Args:
            data_dir: Directory where wildfire datasets are stored.
        """
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)
        self._dataframe: Optional[pd.DataFrame] = None
        self._fire_points: List[Dict[str, Any]] = []
        self._stats: Dict[str, Any] = {}

    # ------------------------------------------------------------------
    # Data loading
    # ------------------------------------------------------------------

    def load_csv(self, csv_path: str) -> Optional[pd.DataFrame]:
        """
        Load wildfire data from a CSV file.

        Args:
            csv_path: Path to the CSV file.

        Returns:
            pandas DataFrame or None if loading failed.
        """
        try:
            df = pd.read_csv(csv_path)
            logger.info(f"Loaded {len(df)} records from {csv_path}")
            self._dataframe = df
            return df
        except FileNotFoundError:
            logger.error(f"CSV file not found: {csv_path}")
            return None
        except pd.errors.EmptyDataError:
            logger.error(f"CSV file is empty: {csv_path}")
            return None
        except Exception as e:
            logger.error(f"Failed to load CSV {csv_path}: {e}")
            return None

    def download_from_kaggle(self) -> Optional[str]:
        """
        Download the 'next-day-wildfire-spread' dataset from Kaggle.
        Returns the path to the downloaded dataset directory, or None.
        """
        try:
            import kagglehub
            path = kagglehub.dataset_download("fantineh/next-day-wildfire-spread")
            logger.info(f"Kaggle dataset downloaded to: {path}")
            return path
        except ImportError:
            logger.error("kagglehub not installed. Run: pip install kagglehub")
            return None
        except Exception as e:
            logger.error(f"Kaggle download failed: {e}")
            return None

    # ------------------------------------------------------------------
    # Column auto-detection
    # ------------------------------------------------------------------

    @staticmethod
    def _detect_column(columns: list, keywords: List[str]) -> Optional[str]:
        """Find first column name containing any of the keywords (case-insensitive)."""
        for col in columns:
            col_lower = col.lower()
            for kw in keywords:
                if kw in col_lower:
                    return col
        return None

    # ------------------------------------------------------------------
    # Fire point extraction
    # ------------------------------------------------------------------

    def extract_fire_locations(
        self,
        lat_column: str,
        lon_column: str,
        intensity_column: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Convert DataFrame rows to a list of fire point dictionaries.

        Args:
            lat_column: Name of latitude column.
            lon_column: Name of longitude column.
            intensity_column: Optional name of intensity/severity column.

        Returns:
            List of fire point dicts with lat, lon, and optional intensity.
        """
        if self._dataframe is None:
            logger.error("No data loaded. Call load_csv() first.")
            return []

        df = self._dataframe

        # Validate required columns exist
        for col in [lat_column, lon_column]:
            if col not in df.columns:
                logger.error(f"Column '{col}' not found in DataFrame")
                return []

        fire_points = []
        for _, row in df.iterrows():
            point = {
                "latitude": float(row[lat_column]),
                "longitude": float(row[lon_column]),
            }
            if intensity_column and intensity_column in df.columns:
                point["intensity"] = float(row[intensity_column])
            fire_points.append(point)

        self._fire_points = fire_points
        logger.info(f"Extracted {len(fire_points)} fire locations")
        return fire_points

    # ------------------------------------------------------------------
    # Region filtering
    # ------------------------------------------------------------------

    def filter_by_region(
        self,
        fire_points: List[Dict[str, Any]],
        min_lat: float,
        max_lat: float,
        min_lon: float,
        max_lon: float,
    ) -> List[Dict[str, Any]]:
        """
        Filter fire points within a geographic bounding box.

        Args:
            fire_points: List of fire point dicts.
            min_lat, max_lat: Latitude range.
            min_lon, max_lon: Longitude range.

        Returns:
            Filtered list of fire points.
        """
        filtered = [
            p for p in fire_points
            if min_lat <= p["latitude"] <= max_lat and min_lon <= p["longitude"] <= max_lon
        ]
        logger.info(f"Filtered to {len(filtered)} fires in region "
                    f"[{min_lat},{min_lon},{max_lat},{max_lon}]")
        return filtered

    # ------------------------------------------------------------------
    # Statistics
    # ------------------------------------------------------------------

    def get_stats(self) -> Dict[str, Any]:
        """
        Compute summary statistics for the loaded fire data.

        Returns:
            Dict with count, lat/lon ranges, average intensity, etc.
        """
        if not self._fire_points:
            return {"count": 0}

        lats = [p["latitude"] for p in self._fire_points]
        lons = [p["longitude"] for p in self._fire_points]

        stats = {
            "count": len(self._fire_points),
            "lat_range": (min(lats), max(lats)),
            "lon_range": (min(lons), max(lons)),
        }

        if any("intensity" in p for p in self._fire_points):
            intensities = [p.get("intensity", 0) for p in self._fire_points]
            stats["avg_intensity"] = sum(intensities) / len(intensities)
            stats["max_intensity"] = max(intensities)

        self._stats = stats
        return stats

    # ------------------------------------------------------------------
    # Agent payload generation
    # ------------------------------------------------------------------

    def to_agent_payload(
        self,
        fire_points: Optional[List[Dict[str, Any]]] = None,
        max_points: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Convert fire points to a format suitable for agent consumption.

        Args:
            fire_points: Specific subset of points (uses all if None).
            max_points: Cap on number of points to return (samples if exceeded).

        Returns:
            List of agent-ready dicts with lat, lon, and optional intensity.
        """
        points = fire_points or self._fire_points
        if not points:
            logger.warning("No fire points available for payload")
            return []

        payload = [
            {
                "latitude": p["latitude"],
                "longitude": p["longitude"],
                "intensity": p.get("intensity", 1.0),
            }
            for p in points
        ]

        if len(payload) > max_points:
            import random
            payload = random.sample(payload, max_points)

        return payload

    # ------------------------------------------------------------------
    # Convenience method
    # ------------------------------------------------------------------

    def get_agent_payload(
        self,
        csv_path: str,
        bbox: Optional[tuple[float, float, float, float]] = None,
        max_points: int = 100,
        include_intensity: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        One-shot method: load CSV → extract fires → optional filter → payload.

        Args:
            csv_path: Path to wildfire CSV.
            bbox: Optional (min_lat, min_lon, max_lat, max_lon) filter.
            max_points: Maximum number of points to return.
            include_intensity: Whether to include intensity values.

        Returns:
            Agent-ready list of fire point dicts.
        """
        df = self.load_csv(csv_path)
        if df is None:
            return []

        lat_col = self._detect_column(df.columns, ["lat", "latitude"])
        lon_col = self._detect_column(df.columns, ["lon", "longitude"])
        intensity_col = None

        if include_intensity:
            intensity_col = self._detect_column(
                df.columns, ["intensity", "fire", "severity", "frp"]
            )

        if not lat_col or not lon_col:
            logger.error("Could not auto-detect lat/lon columns")
            return []

        fires = self.extract_fire_locations(lat_col, lon_col, intensity_col)

        if bbox:
            fires = self.filter_by_region(fires, *bbox)

        return self.to_agent_payload(fires, max_points=max_points)


# ----------------------------------------------------------------------
# Module-level convenience function
# ----------------------------------------------------------------------

def load_wildfire_for_region(
    csv_path: str,
    bbox: tuple[float, float, float, float],
    max_points: int = 100,
) -> list[dict]:
    """
    Load wildfire data from CSV and filter by bounding box.

    Args:
        csv_path: Path to wildfire CSV.
        bbox: (min_lat, min_lon, max_lat, max_lon).
        max_points: Max points to return.

    Returns:
        List of fire point dicts.
    """
    loader = WildfireDataLoader()
    return loader.get_agent_payload(csv_path, bbox=bbox, max_points=max_points)


__all__ = ["WildfireDataLoader", "load_wildfire_for_region"]
