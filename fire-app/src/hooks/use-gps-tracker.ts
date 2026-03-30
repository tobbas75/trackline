"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface GpsPoint {
  lat: number;
  lng: number;
  altitude: number | null;
  accuracy: number;
  timestamp: number;
}

export interface GpsTrack {
  id: string;
  name: string;
  startedAt: string;
  endedAt: string | null;
  points: GpsPoint[];
  distanceKm: number;
}

interface UseGpsTrackerOptions {
  /** Minimum distance in metres between recorded points (reduces noise) */
  minDistanceM?: number;
  /** High accuracy mode (uses GPS hardware, more battery) */
  highAccuracy?: boolean;
}

/** Haversine distance between two points in metres */
function haversineM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function totalDistanceKm(points: GpsPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineM(
      points[i - 1].lat,
      points[i - 1].lng,
      points[i].lat,
      points[i].lng
    );
  }
  return total / 1000;
}

export function useGpsTracker(options: UseGpsTrackerOptions = {}) {
  const { minDistanceM = 10, highAccuracy = true } = options;

  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<GpsPoint | null>(null);
  const [track, setTrack] = useState<GpsPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedTracks, setSavedTracks] = useState<GpsTrack[]>([]);

  const watchIdRef = useRef<number | null>(null);
  const trackStartRef = useRef<string | null>(null);
  const lastPointRef = useRef<GpsPoint | null>(null);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported by this browser");
      return;
    }

    setError(null);
    setTrack([]);
    lastPointRef.current = null;
    trackStartRef.current = new Date().toISOString();

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const point: GpsPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          altitude: pos.coords.altitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        };

        setCurrentPosition(point);

        // Filter by minimum distance to reduce noise
        const last = lastPointRef.current;
        if (last) {
          const dist = haversineM(last.lat, last.lng, point.lat, point.lng);
          if (dist < minDistanceM) return;
        }

        lastPointRef.current = point;
        setTrack((prev) => [...prev, point]);
      },
      (err) => {
        setError(err.message);
      },
      {
        enableHighAccuracy: highAccuracy,
        maximumAge: 5000,
        timeout: 15000,
      }
    );

    watchIdRef.current = watchId;
    setIsTracking(true);
  }, [highAccuracy, minDistanceM]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  const saveTrack = useCallback(
    (name: string) => {
      if (track.length < 2) return null;

      const saved: GpsTrack = {
        id: `track-${Date.now()}`,
        name,
        startedAt: trackStartRef.current ?? new Date().toISOString(),
        endedAt: new Date().toISOString(),
        points: [...track],
        distanceKm: totalDistanceKm(track),
      };

      setSavedTracks((prev) => [saved, ...prev]);
      setTrack([]);
      lastPointRef.current = null;
      return saved;
    },
    [track]
  );

  /** Convert track to GeoJSON LineString */
  const trackToGeoJSON = useCallback(
    (points: GpsPoint[]): GeoJSON.Feature | null => {
      if (points.length < 2) return null;
      return {
        type: "Feature",
        properties: {
          pointCount: points.length,
          distanceKm: totalDistanceKm(points),
        },
        geometry: {
          type: "LineString",
          coordinates: points.map((p) => [p.lng, p.lat]),
        },
      };
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    isTracking,
    currentPosition,
    track,
    error,
    savedTracks,
    startTracking,
    stopTracking,
    saveTrack,
    trackToGeoJSON,
    trackDistanceKm: totalDistanceKm(track),
    trackDuration: trackStartRef.current
      ? Date.now() - new Date(trackStartRef.current).getTime()
      : 0,
  };
}
