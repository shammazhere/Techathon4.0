# Roads dataset directory
# 
# Expected contents:
# - GeoJSON or Shapefile road network exports
# - OSM .pbf / .osm extracts for the target region
# - Pre-built graph pickles (NetworkX serialised)
#
# Naming convention:
#   <region>_roads.osm.pbf     → raw OSM road data
#   <region>_roads.geojson     → exported GeoJSON road network
#   <region>_graph.gpickle     → serialised NetworkX graph
#
# Download sources:
#   Geofabrik: https://download.geofabrik.de/
#   BBBike:    https://download.bbbike.org/osm/
