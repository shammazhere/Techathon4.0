# Elevation dataset directory
#
# Expected contents:
# - SRTM 30m or 90m DEM tiles in GeoTIFF / HGT format
# - ASTER GDEM tiles for high-resolution regions
# - Pre-processed slope/aspect rasters
#
# Naming convention (SRTM-style):
#   N<lat>E<lon>.tif    → e.g. N18E073.tif for Mumbai region
#   N<lat>W<lon>.tif    → western hemisphere tiles
#
# Download sources:
#   NASA SRTM:   https://srtm.csi.cgiar.org/
#   ASTER GDEM:  https://asterweb.jpl.nasa.gov/gdem.asp
#   OpenTopography: https://opentopography.org/
