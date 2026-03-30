import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { slugify, rolePriority } from "./orgs.helpers";

type OrgMemberRow = {
  org_id: string;
  role: string;
  organisations: {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
  } | null;
};

type FormattedOrg = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  role: string;
};

// GET /api/orgs - List user's organizations
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: orgs, error } = await supabase
    .from("org_members")
    .select(`
      org_id,
      role,
      organisations (
        id,
        name,
        description,
        created_at
      )
    `)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (orgs ?? []) as unknown as OrgMemberRow[];

  // Deduplicate: keep highest-priority role per org
  const orgMap = new Map<string, FormattedOrg>();

  for (const row of rows) {
    if (!row.organisations) continue;

    const org = row.organisations;
    const existing = orgMap.get(org.id);

    if (!existing || rolePriority(row.role) > rolePriority(existing.role)) {
      orgMap.set(org.id, {
        id: org.id,
        name: org.name,
        description: org.description,
        created_at: org.created_at,
        role: row.role,
      });
    }
  }

  const formatted = Array.from(orgMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json(formatted);
}

// POST /api/orgs - Create new organization
export async function POST(req: Request) {
  const supabase = await createClient();
  const body = await req.json();

  const { name, description } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const baseSlug = slugify(name) || "org";

  let org:
    | {
        id: string;
        name: string;
      }
    | null = null;

  let orgErrorMessage: string | null = null;

  // Shared schema has unique slug; retry with suffix if collision.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug =
      attempt === 0 ? baseSlug : `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

    const { data, error: orgError } = await supabase
      .from("organisations")
      .insert({
        name,
        slug,
        description: description ?? null,
      })
      .select("id, name")
      .single();

    if (!orgError && data) {
      org = data;
      break;
    }

    orgErrorMessage = orgError?.message ?? "Failed to create organization";

    // Not a slug collision - do not retry.
    if (orgError?.code !== "23505") {
      break;
    }
  }

  if (!org) {
    return NextResponse.json({ error: orgErrorMessage ?? "Failed to create organization" }, { status: 500 });
  }

  // Add creator as owner
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { error: memberError } = await supabase.from("org_members").insert({
      org_id: org.id,
      user_id: user.id,
      role: "owner",
    });

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }
  }

  return NextResponse.json(org, { status: 201 });
}
