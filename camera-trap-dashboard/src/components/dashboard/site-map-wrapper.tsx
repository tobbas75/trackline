"use client";

import dynamic from "next/dynamic";
import type { Site } from "@/lib/supabase/types";

const SiteMap = dynamic(() => import("@/components/dashboard/site-map").then(mod => mod.SiteMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] w-full items-center justify-center rounded-lg border bg-muted/20">
      <p className="text-sm text-muted-foreground">Loading map...</p>
    </div>
  ),
});

interface SiteMapWrapperProps {
  sites: Pick<Site, "id" | "site_name" | "latitude" | "longitude">[];
}

export function SiteMapWrapper({ sites }: SiteMapWrapperProps) {
  return <SiteMap sites={sites} />;
}
