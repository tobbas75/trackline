"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Shield, AlertTriangle, MapPin, Eye } from "lucide-react";
import { InfoTooltip } from "@/components/info-tooltip";

interface CulturalZone {
  id: string;
  name: string;
  type: "no_go" | "restricted" | "sensitive" | "heritage";
  area_ha: number;
  description: string;
  restrictions: string;
  lastReviewed: string;
}

const MOCK_ZONES: CulturalZone[] = [
  {
    id: "cz-001",
    name: "Pularumpi Sacred Site",
    type: "no_go",
    area_ha: 450,
    description: "Men's ceremonial ground — no entry without Traditional Owner permission",
    restrictions: "No burning, no flyover below 1000ft AGL",
    lastReviewed: "2025-12-01",
  },
  {
    id: "cz-002",
    name: "Wurrumiyanga Burial Grounds",
    type: "no_go",
    area_ha: 120,
    description: "Historic and active burial area",
    restrictions: "No burning, no vehicle access",
    lastReviewed: "2025-11-15",
  },
  {
    id: "cz-003",
    name: "Monsoon Vine Forest — Coastal Strip",
    type: "sensitive",
    area_ha: 3200,
    description: "Fire-sensitive monsoon vine forest patches along northern coast",
    restrictions: "EDS burning only, 100m buffer, ground crew only",
    lastReviewed: "2026-01-20",
  },
  {
    id: "cz-004",
    name: "Milikapiti Rock Art Complex",
    type: "heritage",
    area_ha: 85,
    description: "Rock art and artefact sites of national significance",
    restrictions: "200m buffer from aerial incendiary, ground crew escort required",
    lastReviewed: "2025-10-10",
  },
  {
    id: "cz-005",
    name: "Eastern Mangrove Buffer",
    type: "restricted",
    area_ha: 1800,
    description: "Mangrove and saltflat transition zone — nesting habitat",
    restrictions: "No burning Jun–Sep (nesting season), cool burns only",
    lastReviewed: "2026-02-01",
  },
  {
    id: "cz-006",
    name: "Airstrip Safety Corridor",
    type: "restricted",
    area_ha: 250,
    description: "Buffer around Bathurst Island aerodrome",
    restrictions: "Coordinated burns only, with CASA notification",
    lastReviewed: "2026-01-05",
  },
];

const ZONE_TYPE_CONFIG: Record<
  CulturalZone["type"],
  { label: string; variant: "destructive" | "default" | "secondary" | "outline"; icon: React.ReactNode }
> = {
  no_go: {
    label: "No-Go Zone",
    variant: "destructive",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  restricted: {
    label: "Restricted",
    variant: "default",
    icon: <Shield className="h-3 w-3" />,
  },
  sensitive: {
    label: "Sensitive",
    variant: "secondary",
    icon: <Eye className="h-3 w-3" />,
  },
  heritage: {
    label: "Heritage",
    variant: "outline",
    icon: <MapPin className="h-3 w-3" />,
  },
};

export default function CulturalZonesPage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cultural Zones</h1>
          <p className="text-sm text-muted-foreground">
            Manage no-go zones, restricted areas, and culturally sensitive sites
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Zone
        </Button>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <ZoneCountCard
          label="No-Go Zones"
          count={MOCK_ZONES.filter((z) => z.type === "no_go").length}
          totalHa={MOCK_ZONES.filter((z) => z.type === "no_go").reduce(
            (sum, z) => sum + z.area_ha,
            0
          )}
          variant="destructive"
          tooltip="Absolute restriction — no burning, no access without written Traditional Owner approval."
        />
        <ZoneCountCard
          label="Restricted Areas"
          count={MOCK_ZONES.filter((z) => z.type === "restricted").length}
          totalHa={MOCK_ZONES.filter((z) => z.type === "restricted").reduce(
            (sum, z) => sum + z.area_ha,
            0
          )}
          variant="default"
          tooltip="Limited access with conditions — e.g. ground crew only, seasonal restrictions, CASA coordination."
        />
        <ZoneCountCard
          label="Sensitive Sites"
          count={MOCK_ZONES.filter((z) => z.type === "sensitive").length}
          totalHa={MOCK_ZONES.filter((z) => z.type === "sensitive").reduce(
            (sum, z) => sum + z.area_ha,
            0
          )}
          variant="secondary"
          tooltip="Areas requiring special care — e.g. fire-sensitive vegetation with buffer requirements."
        />
        <ZoneCountCard
          label="Heritage Sites"
          count={MOCK_ZONES.filter((z) => z.type === "heritage").length}
          totalHa={MOCK_ZONES.filter((z) => z.type === "heritage").reduce(
            (sum, z) => sum + z.area_ha,
            0
          )}
          variant="outline"
          tooltip="Heritage-listed sites of cultural or national significance requiring protective buffers."
        />
      </div>

      {/* Zones table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Cultural Zones</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Area (ha)</TableHead>
                <TableHead className="max-w-75">Restrictions</TableHead>
                <TableHead>Last Reviewed</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_ZONES.map((zone) => {
                const config = ZONE_TYPE_CONFIG[zone.type];
                return (
                  <TableRow key={zone.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{zone.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {zone.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={config.variant}
                        className="gap-1"
                      >
                        {config.icon}
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{zone.area_ha.toLocaleString()}</TableCell>
                    <TableCell className="max-w-75 text-sm text-muted-foreground">
                      {zone.restrictions}
                    </TableCell>
                    <TableCell className="text-sm">{zone.lastReviewed}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Important notice */}
      <Card className="mt-6 border-amber-500/50">
        <CardContent className="flex items-start gap-3 pt-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="font-medium text-sm">Cultural Sensitivity Notice</p>
            <p className="text-sm text-muted-foreground">
              All cultural zone data is managed in consultation with Traditional
              Owners. Zones must be reviewed annually and updated before each
              fire season. Contact the cultural liaison officer before modifying
              any zone boundaries or restrictions. No-go zones are absolute —
              no exceptions without written Traditional Owner approval.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ZoneCountCard({
  label,
  count,
  totalHa,
  variant,
  tooltip,
}: {
  label: string;
  count: number;
  totalHa: number;
  variant: "destructive" | "default" | "secondary" | "outline";
  tooltip?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{label} {tooltip && <InfoTooltip text={tooltip} />}</p>
          <Badge variant={variant}>{count}</Badge>
        </div>
        <p className="mt-1 text-xl font-bold">
          {totalHa.toLocaleString()}{" "}
          <span className="text-sm font-normal text-muted-foreground">ha</span>
        </p>
      </CardContent>
    </Card>
  );
}
