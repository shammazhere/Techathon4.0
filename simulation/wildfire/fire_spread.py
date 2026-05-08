"""
fire_spread.py
--------------
Simulates wildfire spread using a cellular automaton / graph-propagation model.

Spread probability at each step depends on:
- Wind speed and direction (from wind_analysis.py)
- Terrain slope (uphill fires spread faster)
- Fuel type (land cover / vegetation)
- Current burn state of adjacent cells
"""

import logging
import math
import random
from enum import Enum
from typing import Optional

logger = logging.getLogger(__name__)


class BurnState(str, Enum):
    UNBURNED = "UNBURNED"
    IGNITING = "IGNITING"     # transition state — will burn next step
    BURNING = "BURNING"
    BURNED = "BURNED"         # extinguished, no longer spreading


# Fuel load coefficients by land-cover type
FUEL_LOAD = {
    "forest": 1.0,
    "scrub": 0.8,
    "grass": 0.6,
    "urban": 0.3,
    "bare_ground": 0.1,
    "water": 0.0,
}

# Base spread probability per time step (tuned empirically)
BASE_SPREAD_PROB = 0.35


def spread_probability(
    slope_degrees: float,
    wind_speed_ms: float,
    wind_bearing: float,
    edge_bearing: float,
    fuel_load: float,
) -> float:
    """
    Compute the probability that fire spreads across an edge in one step.

    Args:
        slope_degrees: Terrain slope in degrees (uphill = positive).
        wind_speed_ms: Wind speed in m/s.
        wind_bearing: Wind direction in degrees (direction wind blows FROM).
        edge_bearing: Direction of edge from source to target in degrees.
        fuel_load: Normalised fuel load [0.0, 1.0].

    Returns:
        Spread probability [0.0, 1.0].
    """
    if fuel_load <= 0:
        return 0.0

    # Slope factor: uphill increases spread (Rothermel-inspired)
    slope_factor = 1.0 + max(slope_degrees / 30.0, 0.0)

    # Wind factor: tailwind (fire in wind direction) increases spread
    wind_angle_diff = abs((edge_bearing - wind_bearing + 360) % 360)
    if wind_angle_diff > 180:
        wind_angle_diff = 360 - wind_angle_diff
    wind_alignment = math.cos(math.radians(wind_angle_diff))   # +1 = tailwind
    wind_factor = 1.0 + (wind_speed_ms / 10.0) * max(wind_alignment, 0.0)

    prob = BASE_SPREAD_PROB * slope_factor * wind_factor * fuel_load
    return min(prob, 1.0)


class FireSpreadSimulator:
    """
    Iterative wildfire spread simulation on the road/terrain graph.

    Nodes represent terrain cells; edges carry slope and aspect.
    """

    def __init__(
        self,
        node_mapper,
        slope_map: dict,
        aspect_map: dict,
        fuel_map: Optional[dict] = None,
        burn_duration_steps: int = 3,
    ):
        """
        Args:
            node_mapper: NodeMapper instance.
            slope_map: {(u,v): slope_degrees} from SlopeAnalyzer.
            aspect_map: {(u,v): aspect_degrees} from SlopeAnalyzer.
            fuel_map: {node_id: fuel_load} override; defaults to 0.6.
            burn_duration_steps: Steps a node burns before becoming BURNED.
        """
        self.mapper = node_mapper
        self.slope_map = slope_map
        self.aspect_map = aspect_map
        self.fuel_map = fuel_map or {}
        self.burn_duration = burn_duration_steps

        self._state: dict[int, BurnState] = {}
        self._burn_countdown: dict[int, int] = {}
        self._time_step = 0
        self._wind_speed = 5.0   # m/s default
        self._wind_bearing = 0.0  # degrees

    # ------------------------------------------------------------------
    # Initialisation
    # ------------------------------------------------------------------

    def seed_ignition(self, origin_nodes: list[int]) -> None:
        """Set initial ignition points."""
        self._state = {}
        self._burn_countdown = {}
        self._time_step = 0

        for n in origin_nodes:
            self._state[n] = BurnState.BURNING
            self._burn_countdown[n] = self.burn_duration

        logger.info(f"Fire ignited at {len(origin_nodes)} node(s).")

    def set_wind(self, speed_ms: float, bearing_degrees: float) -> None:
        """Update wind conditions for subsequent steps."""
        self._wind_speed = speed_ms
        self._wind_bearing = bearing_degrees

    # ------------------------------------------------------------------
    # Simulation step
    # ------------------------------------------------------------------

    def step(self, G) -> dict[int, BurnState]:
        """
        Advance the fire simulation by one time step.

        Args:
            G: NetworkX DiGraph (ideally active_graph from DynamicGraph).

        Returns:
            Current state dict {node_id: BurnState}.
        """
        new_state = dict(self._state)

        for node, state in self._state.items():
            if state != BurnState.BURNING:
                continue

            for _, v, data in G.out_edges(node, data=True):
                if new_state.get(v) in (BurnState.BURNING, BurnState.BURNED):
                    continue

                slope = self.slope_map.get((node, v), 0.0)
                aspect = self.aspect_map.get((node, v), 0.0)
                fuel = self.fuel_map.get(v, 0.6)
                prob = spread_probability(
                    slope, self._wind_speed, self._wind_bearing, aspect, fuel
                )

                if random.random() < prob:
                    new_state[v] = BurnState.BURNING
                    self._burn_countdown[v] = self.burn_duration

            # Decrement burn countdown
            self._burn_countdown[node] -= 1
            if self._burn_countdown[node] <= 0:
                new_state[node] = BurnState.BURNED

        self._state = new_state
        self._time_step += 1

        burning_count = sum(1 for s in self._state.values() if s == BurnState.BURNING)
        logger.info(f"[Fire step {self._time_step}] Burning nodes: {burning_count}")
        return dict(self._state)

    # ------------------------------------------------------------------
    # State access
    # ------------------------------------------------------------------

    def burning_nodes(self) -> set[int]:
        return {n for n, s in self._state.items() if s == BurnState.BURNING}

    def burned_nodes(self) -> set[int]:
        return {n for n, s in self._state.items() if s == BurnState.BURNED}

    @property
    def time_step(self) -> int:
        return self._time_step
