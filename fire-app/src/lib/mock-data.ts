import type { Database } from "@/lib/supabase/types";
import tiwiBoundariesData from "@/lib/tiwi-boundaries.json";

type Project = Database["public"]["Tables"]["project"]["Row"];
type AnalysisZone = Database["public"]["Tables"]["analysis_zone"]["Row"];

// --- Boundaries (from simplified Tiwi Islands shapefiles) ---

const bathurstBoundary: GeoJSON.Feature =
  tiwiBoundariesData.features[0] as GeoJSON.Feature;
const melvilleBoundary: GeoJSON.Feature =
  tiwiBoundariesData.features[1] as GeoJSON.Feature;

const tiwiBoundary: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Tiwi Islands" },
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          (bathurstBoundary.geometry as GeoJSON.Polygon).coordinates,
          (melvilleBoundary.geometry as GeoJSON.Polygon).coordinates,
        ],
      },
    },
  ],
};

// --- Projects ---

export const MOCK_PROJECTS: Project[] = [
  {
    id: "tiwi-001",
    organization_id: "org-001",
    name: "Tiwi Islands",
    slug: "tiwi-islands",
    description:
      "Fire management program for Bathurst and Melville Islands, covering savanna woodland and monsoon vine forest.",
    boundary: tiwiBoundary as unknown as Project["boundary"],
    area_ha: 786000,
    rainfall_zone: "high",
    state: "NT",
    status: "active",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

// --- Analysis Zones ---

export const MOCK_ANALYSIS_ZONES: AnalysisZone[] = [
  {
    id: "zone-bathurst",
    project_id: "tiwi-001",
    name: "Bathurst Island",
    slug: "bathurst-island",
    description:
      "Western island — Wurrumiyanga community, airport, mixed savanna woodland and monsoon vine forest patches.",
    boundary: {
      type: "FeatureCollection",
      features: [bathurstBoundary],
    } as unknown as AnalysisZone["boundary"],
    area_ha: 250000,
    color: "#3b82f6",
    sort_order: 1,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "zone-melville",
    project_id: "tiwi-001",
    name: "Melville Island",
    slug: "melville-island",
    description:
      "Eastern island — Milikapiti and Pirlangimpi communities, larger landmass, tall open forest and hummock grasslands.",
    boundary: {
      type: "FeatureCollection",
      features: [melvilleBoundary],
    } as unknown as AnalysisZone["boundary"],
    area_ha: 536000,
    color: "#f97316",
    sort_order: 2,
    created_at: "2024-01-01T00:00:00Z",
  },
];

export function getTiwiBoundaryGeoJSON(): GeoJSON.FeatureCollection {
  return tiwiBoundary;
}

export function getZoneBoundaryGeoJSON(
  zone: AnalysisZone
): GeoJSON.FeatureCollection {
  return zone.boundary as unknown as GeoJSON.FeatureCollection;
}

export function getZonesForProject(projectId: string): AnalysisZone[] {
  return MOCK_ANALYSIS_ZONES.filter((z) => z.project_id === projectId);
}
