"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface UseMapOptions {
  center?: [number, number];
  zoom?: number;
  style?: string;
}

export function useMap(containerRef: React.RefObject<HTMLDivElement | null>, options: UseMapOptions = {}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<unknown>(null);

  const defaultCenter: [number, number] = options.center || [-122.41, 37.78];
  const defaultZoom = options.zoom || 12;

  useEffect(() => {
    if (!containerRef.current) return;

    // Simulate map load (replace with actual Mapbox initialization)
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 800);

    return () => clearTimeout(timer);
  }, [containerRef]);

  const flyTo = useCallback((lng: number, lat: number, zoom = 14) => {
    if (!mapRef.current) return;
    console.log("[Map] Flying to", { lng, lat, zoom });
  }, []);

  const addMarker = useCallback(
    (id: string, lng: number, lat: number, color = "#00d2ff") => {
      if (!mapRef.current) return;
      console.log("[Map] Adding marker", { id, lng, lat, color });
    },
    []
  );

  const addLayer = useCallback((layerId: string, data: unknown) => {
    if (!mapRef.current) return;
    console.log("[Map] Adding layer", { layerId, data });
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
  };
}
