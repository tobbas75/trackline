"use client";

import dynamic from "next/dynamic";

// MapLibre must be client-side only (uses WebGL)
const FireMap = dynamic(() => import("@/components/map/fire-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <p className="text-muted-foreground">Loading map...</p>
    </div>
  ),
});

export default function MapPage() {
  return (
    <div className="relative h-[calc(100vh-3.5rem)]">
      <FireMap />
    </div>
  );
}
