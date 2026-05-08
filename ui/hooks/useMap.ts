"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

// Dynamic import for maplibre-gl to avoid SSR issues
const getMapLibre = () => import("maplibre-gl");

interface UseMapOptions {
  center?: [number, number];
  zoom?: number;
  style?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RASTER_STYLE = (tiles: string[]): any => ({
  version: 8,
  sources: {
    "raster-tiles": {
      type: "raster",
      tiles: tiles,
      tileSize: 256, // OpenStreetMap and CartoDB standard
      attribution: "&copy; OpenStreetMap &copy; CARTO",
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#0d1117" },
    },
    {
      id: "simple-tiles",
      type: "raster",
      source: "raster-tiles",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const STYLE_URLS: Record<string, any> = {
  "Dark Tactical": RASTER_STYLE(["https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png"]),
  "Street": RASTER_STYLE(["https://tile.openstreetmap.org/{z}/{x}/{y}.png"]),
  "Satellite": RASTER_STYLE(["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"]),
  "Terrain": RASTER_STYLE(["https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg"]),
};

export function useMap(containerRef: React.RefObject<HTMLDivElement | null>, options: UseMapOptions = {}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const libRef = useRef<typeof import("maplibre-gl") | null>(null);

  const defaultCenter: [number, number] = options.center || [77.5946, 12.9716]; // Bangalore, India
  const defaultZoom = options.zoom || 11;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initMap = async () => {
      try {
        console.log("[useMap] Starting map initialization...");
        const m = await getMapLibre();
        const maplibregl = m.default || m;
        libRef.current = maplibregl;
        
        if (!containerRef.current) {
          console.warn("[useMap] Container ref is null, skipping init.");
          return;
        }

        const map = new maplibregl.Map({
          container: containerRef.current,
          style: STYLE_URLS[options.style || "Dark Tactical"] || STYLE_URLS["Dark Tactical"],
          center: defaultCenter,
          zoom: defaultZoom,
          attributionControl: false,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).map = map;

        const resizeObserver = new ResizeObserver(() => {
          map.resize();
        });
        resizeObserver.observe(containerRef.current);

        map.on("load", () => {
          console.log("[useMap] Map loaded successfully.");
          setIsLoaded(true);
        });

        map.on("error", (e) => {
          // Log to console for debugging, but don't trigger the red error overlay
          console.log("[useMap] Internal Map Notice:", e);
        });

        mapRef.current = map;
      } catch (err) {
        console.error("[useMap] Failed to initialize map:", err);
        setError("Failed to initialize map.");
      }
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef]); // Only run on mount or container change. Style updates handled by separate effect.

  useEffect(() => {
    if (mapRef.current && options.style) {
      mapRef.current.setStyle(STYLE_URLS[options.style] || STYLE_URLS["Dark Tactical"]);
    }
  }, [options.style]);

  const flyTo = useCallback((lng: number, lat: number, zoom = 14) => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({ center: [lng, lat], zoom, duration: 2000 });
  }, []);

  const addMarker = useCallback(
    async (id: string, lng: number, lat: number, color = "#00d2ff") => {
      if (!mapRef.current) return;
      const { default: maplibregl } = await getMapLibre();
      new maplibregl.Marker({ color })
        .setLngLat([lng, lat])
        .addTo(mapRef.current);
    },
    []
  );

  const addLayer = useCallback((layerId: string, data: object) => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    
    if (map.getSource(layerId)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (map.getSource(layerId) as any).setData(data);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.addSource(layerId, { type: "geojson", data: data as any });
      map.addLayer({
        id: layerId,
        type: "fill",
        source: layerId,
        paint: {
          "fill-color": "#00d2ff",
          "fill-opacity": 0.2,
        },
      });
    }
  }, []);

  return {
    isLoaded,
    error,
    mapRef,
    defaultCenter,
    defaultZoom,
    flyTo,
    addMarker,
    addLayer,
    getLib: () => libRef.current
  };
}

