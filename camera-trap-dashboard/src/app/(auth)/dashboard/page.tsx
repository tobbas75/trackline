import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrgTypeLabel } from "@/lib/auth/roles";
import type { OrgType, OrgRole } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/layout/logout-button";

interface MembershipRow {
  role: OrgRole;
  organisations: {
    id: string;
    name: string;
    slug: string;
    type: OrgType;
    region: string | null;
    is_public: boolean;
    projects: { id: string }[];
  } | null;
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Fetch user's organisations
  const { data: memberships } = await supabase
    .from("org_members")
    .select(`
      role,
      organisations (
        id, name, slug, type, region, is_public,
        projects (id)
      )
    `)
    .eq("user_id", user.id);

  const typedMemberships = (memberships ?? []) as unknown as MembershipRow[];
  const orgs = typedMemberships.map((m) => ({
    ...m.organisations,
    role: m.role,
    projectCount: Array.isArray(m.organisations?.projects)
      ? m.organisations.projects.length
      : 0,
  }));

  const { data: profile } = await supabase
    .schema("portal")
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const displayName = (profile as { display_name: string | null } | null)?.display_name;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="text-xl font-bold">
            WildTrack
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {displayName || user.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Your organisations and projects
            </p>
          </div>
          <Button asChild>
            <Link href="/org/new">New Organisation</Link>
          </Button>
        </div>

        {orgs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <h2 className="mb-2 text-xl font-semibold">Welcome to WildTrack</h2>
              <p className="mb-6 text-center text-muted-foreground">
                Create an organisation to get started — whether you&apos;re a
                ranger team, research group, or private landholder.
              </p>
              <Button asChild>
                <Link href="/org/new">Create your first organisation</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orgs.map((org) => (
              <Link key={org?.id} href={`/org/${org?.id}`}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{org?.name}</CardTitle>
                      <Badge variant="secondary">
                        {getOrgTypeLabel(org?.type ?? "other")}
                      </Badge>
                    </div>
                    <CardDescription>
                      {org?.region && <span>{org.region}</span>}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{org.projectCount} project{org.projectCount !== 1 ? "s" : ""}</span>
                      <span className="capitalize">{org.role}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
