"use client";

import {
  MapPin,
  PawPrint,
  Eye,
  Moon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HelpTooltip } from "@/components/help/help-tooltip";
import { statCardHelp } from "@/lib/help-content";

interface StatsCardsProps {
  stats: {
    totalSites: number;
    totalSpecies: number;
    totalObservations: number;
    trapNights: number;
  };
}

const cards = [
  {
    key: "totalSites" as const,
    label: "Total Sites",
    icon: MapPin,
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: "totalSpecies" as const,
    label: "Total Species",
    icon: PawPrint,
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: "totalObservations" as const,
    label: "Total Observations",
    icon: Eye,
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: "trapNights" as const,
    label: "Trap-Nights",
    icon: Moon,
    format: (v: number) => v.toLocaleString(),
  },
] as const;

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ key, label, icon: Icon, format }) => (
        <Card key={key}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-1">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              {statCardHelp[key] && (
                <HelpTooltip text={statCardHelp[key]} side="bottom" />
              )}
            </div>
            <Icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{format(stats[key])}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
