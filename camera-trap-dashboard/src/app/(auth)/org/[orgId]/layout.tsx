import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrgTypeLabel } from "@/lib/auth/roles";
import type { Organisation, OrgRole } from "@/lib/supabase/types";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/layout/logout-button";
import { HelpButton } from "@/components/help/help-button";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Verify user is a member of this org
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (!membership) notFound();

  const typedMembership = membership as unknown as { role: OrgRole };

  const { data: org } = await supabase
    .from("organisations")
    .select("*")
    .eq("id", orgId)
    .single();

  if (!org) notFound();

  const typedOrg = org as unknown as Organisation;
  const isAdmin = typedMembership.role === "owner" || typedMembership.role === "admin";

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-xl font-bold">
              WildTrack
            </Link>
            <span className="text-muted-foreground">/</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">{typedOrg.name}</span>
              <Badge variant="outline">
                {getOrgTypeLabel(typedOrg.type)}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HelpButton />
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="border-b bg-background">
        <div className="container mx-auto px-4">
          <nav className="flex gap-6">
            <Link
              href={`/org/${orgId}`}
              className="border-b-2 border-transparent px-1 py-3 text-sm font-medium text-muted-foreground hover:border-primary hover:text-foreground"
            >
              Projects
            </Link>
            {isAdmin && (
              <Link
                href={`/org/${orgId}/members`}
                className="border-b-2 border-transparent px-1 py-3 text-sm font-medium text-muted-foreground hover:border-primary hover:text-foreground"
              >
                Members
              </Link>
            )}
            {isAdmin && (
              <Link
                href={`/org/${orgId}/settings`}
                className="border-b-2 border-transparent px-1 py-3 text-sm font-medium text-muted-foreground hover:border-primary hover:text-foreground"
              >
                Settings
              </Link>
            )}
          </nav>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
