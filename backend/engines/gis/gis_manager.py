import os
import networkx as nx
from typing import Dict, Any, Optional
from gis_engine.osm.osm_loader import OSMLoader

class GISManager:
    """
    Principal interface for GIS data.
    Integrates:
    - OSMnx (Roads, Buildings)
    - NASA SRTM (Terrain/Elevation)
    - WorldPop (Population)
    """
    
    def __init__(self):
        self.osm_loader = OSMLoader()
        self.cached_graphs = {}
        
    def load_city_graph(self, city_name: str) -> nx.Graph:
        """
        Load a real-world road network for a city.
        Falls back to sample graph if loading fails.
        """
        if city_name in self.cached_graphs:
            return self.cached_graphs[city_name]
            
        try:
            # Attempt to load real OSM data for the city
            # Note: For the hackathon demo, we limit this to a small area
            raw_data = self.osm_loader.load_from_place(city_name)
            
            # Convert raw OSM data to NetworkX
            G = nx.Graph()
            for node_id, data in raw_data["nodes"].items():
                G.add_node(node_id, x=data["lon"], y=data["lat"], **data.get("tags", {}))
                
            for way_id, data in raw_data["ways"].items():
                node_list = data["nodes"]
                for i in range(len(node_list) - 1):
                    G.add_edge(node_list[i], node_list[i+1], way_id=way_id, **data.get("tags", {}))
            
            if G.number_of_nodes() > 0:
                self.cached_graphs[city_name] = G
                return G
        except Exception as e:
            print(f"Failed to load real OSM data for {city_name}: {e}")
            
        # Fallback to the shared sample graph
        from shared.sample_graph import get_city_graph
        return get_city_graph()

    def get_elevation_risk(self, lat: float, lon: float) -> float:
        """
        Calculate flood risk based on elevation (NASA SRTM).
        """
        # Placeholder for real SRTM logic
        # Lower elevation = higher flood risk
        # For demo: Kochi is low-lying
        if 9.9 < lat < 10.1: # Kochi area
            return 0.8 # High elevation-based risk
        return 0.2

    def get_population_density(self, lat: float, lon: float) -> int:
        """
        Estimate population density (WorldPop).
        """
        # Placeholder for WorldPop integration
        # For demo: City centers have higher density
        return 5000 # people per sq km

gis_manager = GISManager()
