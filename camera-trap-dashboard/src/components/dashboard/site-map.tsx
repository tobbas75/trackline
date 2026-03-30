"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons (Leaflet + webpack/Next.js bundler issue)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

interface SiteMarker {
  id: string;
  site_name: string;
  latitude: number | null;
  longitude: number | null;
}

interface SiteMapProps {
  sites: SiteMarker[];
}

/** Auto-fits the map to show all markers */
function FitBounds({ sites }: { sites: Array<{ latitude: number; longitude: number }> }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || sites.length === 0) return;
    const bounds = L.latLngBounds(
      sites.map((s) => [s.latitude, s.longitude] as L.LatLngTuple)
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    fitted.current = true;
  }, [map, sites]);

  return null;
}

export function SiteMap({ sites }: SiteMapProps) {
  const validSites = sites.filter(
    (s): s is SiteMarker & { latitude: number; longitude: number } =>
      s.latitude !== null && s.longitude !== null
  );

  const defaultCenter: L.LatLngTuple = [-25, 134];
  const defaultZoom = 4;

  return (
    <div className="h-[400px] w-full overflow-hidden rounded-lg border">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validSites.map((site) => (
          <Marker key={site.id} position={[site.latitude, site.longitude]}>
            <Popup>{site.site_name}</Popup>
          </Marker>
        ))}
        <FitBounds sites={validSites} />
      </MapContainer>
    </div>
  );
}
