# Disasters dataset directory
#
# Expected contents:
# - Historical flood event records (CSV / GeoJSON)
# - Wildfire occurrence data (shapefiles / GeoJSON)
# - Disaster impact zones from EM-DAT / GDACS / ReliefWeb
#
# Schema (flood_events.csv):
#   event_id, date, lat, lon, flood_depth_m, duration_days, source
#
# Schema (wildfire_events.csv):
#   event_id, date, lat, lon, area_ha, burn_duration_days, source
#
# Download sources:
#   EM-DAT:     https://www.emdat.be/
#   GDACS:      https://www.gdacs.org/
#   EFFIS:      https://effis.jrc.ec.europa.eu/
#   NASA FIRMS: https://firms.modaps.eosdis.nasa.gov/
