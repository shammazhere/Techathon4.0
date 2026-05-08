import os
from typing import Dict, Any
from gis_engine.weather.openweather_loader import get_openweather_current

class WeatherService:
    def __init__(self):
        self.api_key = os.getenv("OPENWEATHER_API_KEY", "88383838383838383838") # Placeholder
        
    def get_weather_for_disaster(self, lat: float, lon: float) -> Dict[str, Any]:
        """Fetch real-time weather for the disaster epicenter."""
        try:
            # For hackathon demo, if API key is placeholder, return realistic simulated data
            if self.api_key == "88383838383838383838":
                return {
                    "temperature_c": 28.5,
                    "humidity_pct": 82,
                    "wind_speed_ms": 5.4,
                    "wind_deg": 210,
                    "rain_1h_mm": 12.5 if lat < 10 else 0.5, # Rain in Kochi
                    "weather_main": "Rain" if lat < 10 else "Clear"
                }
            
            return get_openweather_current(lat, lon, self.api_key)
        except Exception as e:
            print(f"Weather fetch failed: {e}")
            return {
                "temperature_c": 25.0,
                "humidity_pct": 70,
                "wind_speed_ms": 3.0,
                "wind_deg": 0,
                "rain_1h_mm": 0.0,
                "weather_main": "Unknown"
            }

weather_service = WeatherService()
