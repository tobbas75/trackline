"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, MapPin, PawPrint, Eye } from "lucide-react";

interface ExportMenuProps {
  projectId: string;
}

export function ExportMenu({ projectId }: ExportMenuProps) {
  const baseUrl = `/api/projects/${projectId}/export`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="size-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => window.open(`${baseUrl}?type=observations`, "_blank")}
        >
          <Eye className="size-4" />
          Export Observations CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => window.open(`${baseUrl}?type=sites`, "_blank")}
        >
          <MapPin className="size-4" />
          Export Sites CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => window.open(`${baseUrl}?type=species`, "_blank")}
        >
          <PawPrint className="size-4" />
          Export Species CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
