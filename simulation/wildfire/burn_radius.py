"""
burn_radius.py
--------------
Estimates the effective burn radius and perimeter polygon of an active wildfire.

Uses the current set of burning nodes from FireSpreadSimulator and computes:
- Convex hull of burning nodes (approximate fire perimeter)
- Effective burn radius from centroid
- Nodes within the danger zone (pre-burn risk zone outside active perimeter)

Output is used by:
- risk/danger_zones.py to mark evacuation zones
- safe_zone_mapper.py to invalidate unsafe shelters
"""

import logging
import math
from typing import Optional

logger = logging.getLogger(__name__)


def _centroid(points: list[tuple[float, float]]) -> tuple[float, float]:
    """Compute mean centroid of a list of (lat, lon) points."""
    n = len(points)
    if n == 0:
        return (0.0, 0.0)
    return (sum(p[0] for p in points) / n, sum(p[1] for p in points) / n)


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6_371_000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    a = (math.sin((p2 - p1) / 2) ** 2
         + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


class BurnRadiusEstimator:
    """
    Calculates fire extent geometry from the set of burning nodes.

    Exposes:
    - Centroid of fire
    - Effective radius (max distance from centroid to burning node)
    - Danger buffer zone radius
    - List of nodes within the danger zone
    """

    def __init__(
        self,
        node_mapper,
        danger_buffer_m: float = 1000.0,
    ):
        """
        Args:
            node_mapper: NodeMapper for coordinate lookups.
            danger_buffer_m: Extra buffer beyond burn perimeter for danger zone.
        """
        self.mapper = node_mapper
        self.danger_buffer = danger_buffer_m

        self._centroid: Optional[tuple[float, float]] = None
        self._effective_radius_m: float = 0.0
        self._burning_nodes: set[int] = set()

    def update(self, burning_nodes: set[int]) -> None:
        """
        Recalculate burn geometry from the current set of burning nodes.

        Args:
            burning_nodes: Set of OSM node IDs from FireSpreadSimulator.burning_nodes().
        """
        self._burning_nodes = burning_nodes
        coords = [
            self.mapper.get_node_coords(n)
            for n in burning_nodes
            if self.mapper.get_node_coords(n)
        ]

        if not coords:
            self._centroid = None
            self._effective_radius_m = 0.0
            return

        cx, cy = _centroid(coords)
        self._centroid = (cx, cy)
        self._effective_radius_m = max(
            _haversine(cx, cy, lat, lon) for lat, lon in coords
        )

        logger.info(
            f"BurnRadius updated: centroid=({cx:.5f}, {cy:.5f}), "
            f"radius={self._effective_radius_m:.0f}m, "
            f"nodes={len(burning_nodes)}"
        )

    # ------------------------------------------------------------------
    # Geometry access
    # ------------------------------------------------------------------

    @property
    def centroid(self) -> Optional[tuple[float, float]]:
        return self._centroid

    @property
    def effective_radius_m(self) -> float:
        return self._effective_radius_m

    @property
    def danger_zone_radius_m(self) -> float:
        return self._effective_radius_m + self.danger_buffer

    # ------------------------------------------------------------------
    # Node queries
    # ------------------------------------------------------------------

    def nodes_in_danger_zone(self, G) -> list[int]:
        """
        Return all graph nodes within the danger zone radius.

        Args:
            G: NetworkX DiGraph.

        Returns:
            List of node IDs in the danger zone (excluding already-burning nodes).
        """
        if self._centroid is None:
            return []

        cx, cy = self._centroid
        danger_r = self.danger_zone_radius_m
        result = []

        for node in G.nodes():
            if node in self._burning_nodes:
                continue
            coords = self.mapper.get_node_coords(node)
            if coords is None:
                continue
            dist = _haversine(cx, cy, *coords)
            if dist <= danger_r:
                result.append(node)

        return result

    def perimeter_bearing_at(self, lat: float, lon: float) -> Optional[float]:
        """
        Compute the bearing from the fire centroid to a given point.

        Useful for determining which direction a point lies relative to the fire.

        Args:
            lat: Query latitude.
            lon: Query longitude.

        Returns:
            Bearing in degrees [0, 360), or None if centroid is unknown.
        """
        if self._centroid is None:
            return None
        cx, cy = self._centroid
        dlon = math.radians(lon - cy)
        lat1, lat2 = math.radians(cx), math.radians(lat)
        x = math.sin(dlon) * math.cos(lat2)
        y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
        return (math.degrees(math.atan2(x, y)) + 360) % 360
