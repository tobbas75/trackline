/**
 * Server-side Supabase client with service role privileges.
 * Used for operations that bypass RLS — e.g. Supabase Storage uploads.
 *
 * NEVER import this in client code. Server-only (API routes, server actions).
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function getAdminClient() {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Set these in .env.local for Supabase Storage to work."
    );
  }

  adminClient = createClient<Database>(url, key, {
    auth: { persistSession: false },
  });

  return adminClient;
}

/** Check if the service role key is configured */
export function isAdminConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
