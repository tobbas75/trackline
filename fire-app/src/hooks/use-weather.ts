"use client";

import { useEffect, useState } from "react";

interface WeatherCurrent {
  temperature_2m: number;
  relative_humidity_2m: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
}

interface WeatherDaily {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  wind_speed_10m_max: number[];
  wind_direction_10m_dominant: number[];
  relative_humidity_2m_max: number[];
  relative_humidity_2m_min: number[];
}

export interface WeatherData {
  current: WeatherCurrent;
  daily: WeatherDaily;
}

interface WeatherState {
  data: WeatherData | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetches BOM weather forecast via our API proxy (Open-Meteo ACCESS-G model).
 */
export function useWeather(lat?: number, lng?: number) {
  const [state, setState] = useState<WeatherState>({
    data: null,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    if (lat === undefined || lng === undefined) return;

    async function fetchWeather() {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch(
          `/api/weather?lat=${lat}&lng=${lng}`
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        setState({ data, isLoading: false, error: null });
      } catch (err) {
        setState({
          data: null,
          isLoading: false,
          error:
            err instanceof Error ? err.message : "Failed to fetch weather",
        });
      }
    }

    fetchWeather();
  }, [lat, lng]);

  return state;
}
