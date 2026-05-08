# Weather dataset directory
#
# Expected contents:
# - ERA5 reanalysis wind / rainfall data (NetCDF)
# - Station-based weather observations (CSV)
# - Forecast data for simulation initialisation (GRIB / JSON)
#
# Schema (weather_stations.csv):
#   station_id, name, lat, lon, elevation_m, wind_speed_ms,
#   wind_bearing_deg, rainfall_mm, temperature_c, timestamp
#
# Download sources:
#   ERA5 (Copernicus):  https://cds.climate.copernicus.eu/
#   NOAA NCEI:          https://www.ncei.noaa.gov/
#   Open-Meteo API:     https://open-meteo.com/
