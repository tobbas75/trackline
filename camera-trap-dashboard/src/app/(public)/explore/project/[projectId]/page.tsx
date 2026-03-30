import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Site } from "@/lib/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Building2, Lock, MapPin, Tag } from "lucide-react";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { SiteMapWrapper } from "@/components/dashboard/site-map-wrapper";

interface ProjectWithOrg {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location_name: string | null;
  is_published: boolean;
  tags: string[];
  organisations: { name: string } | null;
}

export default async function PublicProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createServerSupabaseClient();

  // Fetch project (only if published)
  const { data: projectData } = await supabase
    .from("projects")
    .select("id, name, slug, description, location_name, is_published, tags, organisations(name)")
    .eq("id", projectId)
    .eq("is_published", true)
    .single();

  if (!projectData) notFound();

  const project = projectData as unknown as ProjectWithOrg;

  // Fetch stats and sites in parallel
  const [sitesRes, sitesCountRes, speciesCountRes, obsCountRes, siteDatesRes] =
    await Promise.all([
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
    ]);

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

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold">
            WildTrack
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Back link */}
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Explore
        </Link>

        {/* Project header */}
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <Badge variant="default">Published</Badge>
          </div>
          {project.organisations?.name && (
            <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building2 className="size-3.5" />
              {project.organisations.name}
            </div>
          )}
          {project.location_name && (
            <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5" />
              {project.location_name}
            </div>
          )}
          {project.description && (
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              {project.description}
            </p>
          )}
          {project.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {project.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  <Tag className="mr-1 size-3" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <StatsCards stats={stats} />

        {/* Site Map */}
        <Card>
          <CardHeader>
            <CardTitle>Site Locations</CardTitle>
            <CardDescription>
              Camera trap deployment sites across the study area
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <SiteMapWrapper sites={sites} />
          </div>
        </Card>

        {/* Analytics placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
            <CardDescription>
              Detailed charts and detection analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Lock className="mb-3 size-8 text-muted-foreground" />
            <p className="text-center text-muted-foreground">
              Sign in to view detailed analytics for this project.
            </p>
            <Button asChild className="mt-4" variant="outline">
              <Link href="/auth/login">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
