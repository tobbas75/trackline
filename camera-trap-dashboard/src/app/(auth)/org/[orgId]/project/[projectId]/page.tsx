import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Project, Site, OrgRole } from "@/lib/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Upload, Settings } from "lucide-react";
import { HelpTooltip } from "@/components/help/help-tooltip";
import { pageHelp } from "@/lib/help-content";
import { ExportMenu } from "@/components/dashboard/export-menu";
import { ProjectDeleteButton } from "@/components/dashboard/project-delete-button";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { DetectionRateChart } from "@/components/dashboard/detection-rate-chart";
import { SpeciesRichnessChart } from "@/components/dashboard/species-richness-chart";
import { TemporalChart } from "@/components/dashboard/temporal-chart";
import { ActivityPatternChart } from "@/components/dashboard/activity-pattern-chart";
import { SpeciesAccumulationChart } from "@/components/dashboard/species-accumulation-chart";
import { NaiveOccupancyChart } from "@/components/dashboard/naive-occupancy-chart";
import { DiversityChart } from "@/components/dashboard/diversity-chart";
import { SiteMapWrapper } from "@/components/dashboard/site-map-wrapper";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ orgId: string; projectId: string }>;
}) {
  const { orgId, projectId } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Fetch project, sites, membership, and stats in parallel
  const [projectRes, sitesRes, sitesCountRes, speciesCountRes, obsCountRes, siteDatesRes, membershipRes] =
    await Promise.all([
      supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .eq("org_id", orgId)
        .single(),
      supabase
        .from("sites")
        .select("id, site_name, latitude, longitude")
        .eq("project_id", projectId),
      supabase
        .from("sites")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId),
      supabase
        .from("species")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId),
      supabase
        .from("observations")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId),
      supabase
        .from("sites")
        .select("date_deployed, date_end")
        .eq("project_id", projectId),
      supabase
        .from("org_members")
        .select("role")
        .eq("org_id", orgId)
        .eq("user_id", user.id)
        .single(),
    ]);

  if (!projectRes.data) notFound();

  const project = projectRes.data as unknown as Project;
  const sites = (sitesRes.data ?? []) as unknown as Pick<
    Site,
    "id" | "site_name" | "latitude" | "longitude"
  >[];

  // Calculate trap-nights from site deployment dates
  let trapNights = 0;
  if (siteDatesRes.data) {
    for (const site of siteDatesRes.data as unknown as Array<{
      date_deployed: string | null;
      date_end: string | null;
    }>) {
      if (site.date_deployed && site.date_end) {
        const start = new Date(site.date_deployed);
        const end = new Date(site.date_end);
        trapNights += Math.max(
          0,
          Math.round(
            (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
          )
        );
      }
    }
  }

  const stats = {
    totalSites: sitesCountRes.count ?? 0,
    totalSpecies: speciesCountRes.count ?? 0,
    totalObservations: obsCountRes.count ?? 0,
    trapNights,
  };

  // Check user's role in the org
  const userRole = (membershipRes?.data as { role: OrgRole } | null)?.role;
  const isOrgAdmin = userRole === "admin" || userRole === "owner";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.is_published ? (
              <Badge variant="default">Published</Badge>
            ) : (
              <Badge variant="secondary">Draft</Badge>
            )}
          </div>
          {project.location_name && (
            <p className="text-muted-foreground">{project.location_name}</p>
          )}
          {project.description && (
            <p className="mt-2 text-sm text-muted-foreground">
              {project.description}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <ExportMenu projectId={projectId} />
          <Button asChild variant="outline" size="sm">
            <Link href={`/org/${orgId}/project/${projectId}/upload`}>
              <Upload className="size-4" />
              Upload
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/org/${orgId}/settings`}>
              <Settings className="size-4" />
              Settings
            </Link>
          </Button>
          {isOrgAdmin && (
            <ProjectDeleteButton
              projectId={projectId}
              projectName={project.name}
              orgId={orgId}
            />
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <StatsCards stats={stats} />

      {/* Site Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1">
            Site Locations
            <HelpTooltip text={pageHelp.siteLocations} side="top" />
          </CardTitle>
          <CardDescription>
            Camera trap deployment sites across the study area
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          <SiteMapWrapper sites={sites} />
        </div>
      </Card>

      {/* Quick Navigation */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href={`/org/${orgId}/project/${projectId}/sites`}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg">Sites</CardTitle>
              <CardDescription>
                View and manage camera stations and sampling locations
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href={`/org/${orgId}/project/${projectId}/species`}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg">Species</CardTitle>
              <CardDescription>
                Manage the species registry for this project
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href={`/org/${orgId}/project/${projectId}/observations`}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg">Observations</CardTitle>
              <CardDescription>
                Browse and filter detection records
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href={`/org/${orgId}/project/${projectId}/detection-histories`}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg">Detection Histories</CardTitle>
              <CardDescription>
                View and import occupancy-format detection matrices
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Analytics Charts */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Analytics</h2>

        {/* Temporal chart full width */}
        <TemporalChart projectId={projectId} />

        {/* Detection rates and species richness side by side */}
        <div className="grid gap-6 lg:grid-cols-2">
          <DetectionRateChart projectId={projectId} />
          <SpeciesRichnessChart projectId={projectId} />
        </div>

        {/* Activity pattern and species accumulation side by side */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ActivityPatternChart projectId={projectId} />
          <SpeciesAccumulationChart projectId={projectId} />
        </div>

        {/* Naive occupancy full width */}
        <NaiveOccupancyChart projectId={projectId} />

        {/* Diversity per site full width */}
        <DiversityChart projectId={projectId} />
      </div>
    </div>
  );
}
