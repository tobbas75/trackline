import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProjectSearch } from "@/components/explore/project-search";

interface ProjectWithOrg {
  id: string;
  name: string;
  description: string | null;
  location_name: string | null;
  tags: string[];
  organisations: { name: string; slug: string } | null;
}

export default async function ExplorePage() {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("projects")
    .select("id, name, description, location_name, tags, organisations(name, slug)")
    .eq("is_published", true)
    .order("name");

  const rows = (data ?? []) as unknown as ProjectWithOrg[];

  const projects = rows.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    location_name: p.location_name,
    tags: p.tags ?? [],
    org_name: p.organisations?.name ?? "Unknown",
  }));

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
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Explore Projects</h1>
          <p className="mt-1 text-muted-foreground">
            Browse published camera-trap monitoring projects
          </p>
        </div>
        <ProjectSearch projects={projects} />
      </main>
    </div>
  );
}
