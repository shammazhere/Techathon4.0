"""
wind_analysis.py
----------------
Processes meteorological wind data for use in wildfire and disaster simulations.

Provides:
- Wind speed / direction parsing from weather datasets
- Wind vectors at arbitrary geographic coordinates (interpolation)
- Prevailing wind direction for a region
- Wind-bearing influence on fire and flood risk
"""

import logging
import math
from typing import Optional

logger = logging.getLogger(__name__)


def degrees_to_vector(bearing_degrees: float, speed_ms: float) -> tuple[float, float]:
    """
    Convert wind bearing and speed to a 2-D Cartesian vector.

    Bearing convention: 0° = North, 90° = East (meteorological FROM direction).

    Args:
        bearing_degrees: Wind origin bearing in degrees [0, 360).
        speed_ms: Wind speed in m/s.

    Returns:
        (u, v) vector where u = West→East component, v = South→North component.
    """
    rad = math.radians(bearing_degrees)
    # Wind blows FROM bearing → TO opposite
    u = -speed_ms * math.sin(rad)
    v = -speed_ms * math.cos(rad)
    return u, v


def vector_to_degrees(u: float, v: float) -> tuple[float, float]:
    """
    Convert a wind vector back to bearing (FROM) and speed.

    Args:
        u: West→East component (m/s).
        v: South→North component (m/s).

    Returns:
        (bearing_degrees, speed_ms)
    """
    speed = math.hypot(u, v)
    if speed == 0:
        return 0.0, 0.0
    bearing = (math.degrees(math.atan2(-u, -v)) + 360) % 360
    return bearing, speed


def wind_alignment_factor(wind_bearing: float, edge_bearing: float) -> float:
    """
    Compute how much the wind aligns with a directed edge.

    Returns +1.0 if wind blows exactly along the edge (tailwind),
    -1.0 if directly opposing, 0.0 if perpendicular.

    Args:
        wind_bearing: Wind direction in degrees (FROM).
        edge_bearing: Edge direction in degrees (FROM source to target).

    Returns:
        Alignment factor in [-1.0, 1.0].
    """
    diff = (edge_bearing - wind_bearing + 360) % 360
    return math.cos(math.radians(diff))


class WindField:
    """
    Represents a spatially interpolated wind field over a geographic region.

    Supports:
    - Uniform wind (single station)
    - Bilinear interpolation between weather stations
    """

    def __init__(self):
        self._stations: list[dict] = []   # {lat, lon, bearing, speed_ms}

    def add_station(
        self,
        lat: float,
        lon: float,
        bearing_degrees: float,
        speed_ms: float,
    ) -> None:
        """
        Register a weather observation point.

        Args:
            lat: Station latitude.
            lon: Station longitude.
            bearing_degrees: Wind FROM direction.
            speed_ms: Wind speed in m/s.
        """
        u, v = degrees_to_vector(bearing_degrees, speed_ms)
        self._stations.append({"lat": lat, "lon": lon, "u": u, "v": v})
        logger.debug(f"Wind station added at ({lat:.4f}, {lon:.4f}): "
                     f"{speed_ms:.1f} m/s @ {bearing_degrees:.1f}°")

    def load_from_records(self, records: list[dict]) -> None:
        """
        Bulk-load station data from a list of dicts.

        Expected keys: lat, lon, bearing_degrees, speed_ms.
        """
        for r in records:
            self.add_station(
                r["lat"], r["lon"], r["bearing_degrees"], r["speed_ms"]
            )

    def get_wind_at(self, lat: float, lon: float) -> tuple[float, float]:
        """
        Interpolate wind at a geographic coordinate using inverse-distance weighting.

        Args:
            lat: Query latitude.
            lon: Query longitude.

        Returns:
            (bearing_degrees, speed_ms) at the query point.
        """
        if not self._stations:
            return 0.0, 0.0

        if len(self._stations) == 1:
            s = self._stations[0]
            return vector_to_degrees(s["u"], s["v"])

        # IDW interpolation
        total_weight = 0.0
        u_sum = 0.0
        v_sum = 0.0

        for s in self._stations:
            dist = self._haversine(lat, lon, s["lat"], s["lon"])
            dist = max(dist, 1.0)  # avoid division by zero
            w = 1.0 / (dist ** 2)
            u_sum += w * s["u"]
            v_sum += w * s["v"]
            total_weight += w

        return vector_to_degrees(u_sum / total_weight, v_sum / total_weight)

    def get_prevailing_wind(self) -> tuple[float, float]:
        """
        Compute the mean wind across all stations.

        Returns:
            (bearing_degrees, speed_ms) for the prevailing wind.
        """
        if not self._stations:
            return 0.0, 0.0
        u = sum(s["u"] for s in self._stations) / len(self._stations)
        v = sum(s["v"] for s in self._stations) / len(self._stations)
        return vector_to_degrees(u, v)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _haversine(lat1, lon1, lat2, lon2) -> float:
        R = 6_371_000
        p1, p2 = math.radians(lat1), math.radians(lat2)
        a = (math.sin((p2 - p1) / 2) ** 2
             + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2)
        return R * 2 * math.asin(math.sqrt(a))
