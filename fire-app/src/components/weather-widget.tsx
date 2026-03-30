"use client";

import { useWeather } from "@/hooks/use-weather";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Cloud,
  Droplets,
  Thermometer,
  Wind,
} from "lucide-react";

interface WeatherWidgetProps {
  lat?: number;
  lng?: number;
}

export function WeatherWidget({ lat = -11.55, lng = 130.85 }: WeatherWidgetProps) {
  const { data, isLoading, error } = useWeather(lat, lng);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          Loading weather...
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          Weather unavailable
        </CardContent>
      </Card>
    );
  }

  const current = data.current;
  const daily = data.daily;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Weather</CardTitle>
          <Badge variant="outline" className="text-xs">
            BOM ACCESS-G
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current conditions */}
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <Thermometer className="mx-auto h-4 w-4 text-orange-500" />
            <p className="mt-1 text-lg font-bold">{current.temperature_2m}°</p>
            <p className="text-xs text-muted-foreground">Temp</p>
          </div>
          <div>
            <Droplets className="mx-auto h-4 w-4 text-blue-500" />
            <p className="mt-1 text-lg font-bold">{current.relative_humidity_2m}%</p>
            <p className="text-xs text-muted-foreground">Humidity</p>
          </div>
          <div>
            <Wind className="mx-auto h-4 w-4 text-gray-500" />
            <p className="mt-1 text-lg font-bold">
              {current.wind_speed_10m}
            </p>
            <p className="text-xs text-muted-foreground">km/h</p>
          </div>
          <div>
            <Cloud className="mx-auto h-4 w-4 text-gray-400" />
            <p className="mt-1 text-lg font-bold">
              {windDirection(current.wind_direction_10m)}
            </p>
            <p className="text-xs text-muted-foreground">Wind dir</p>
          </div>
        </div>

        {/* 7-day forecast */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">7-Day Forecast</p>
          <div className="grid grid-cols-7 gap-1 text-center">
            {daily.time.map((date: string, i: number) => (
              <div key={date} className="rounded bg-muted/50 px-1 py-2">
                <p className="text-xs font-medium">
                  {new Date(date).toLocaleDateString("en-AU", {
                    weekday: "short",
                  })}
                </p>
                <p className="text-xs font-bold text-orange-600">
                  {daily.temperature_2m_max[i]}°
                </p>
                <p className="text-xs text-blue-500">
                  {daily.temperature_2m_min[i]}°
                </p>
                <p className="text-xs text-muted-foreground">
                  {daily.precipitation_sum[i]}mm
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function windDirection(degrees: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degrees / 45) % 8;
  return dirs[index];
}
