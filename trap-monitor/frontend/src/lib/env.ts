/**
 * Centralized environment variable validation for the Next.js frontend.
 *
 * - publicEnv: validated eagerly at import time (NEXT_PUBLIC_* vars are inlined at build time)
 * - getServerEnv(): validated lazily on first call (server vars only exist at runtime)
 *
 * All missing/invalid vars are collected into a single error so operators can fix
 * everything in one pass.
 */

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

interface EnvRule {
  startsWith?: string;
}

type EnvSpec = Record<string, EnvRule | undefined>;

export function validateVars(
  spec: EnvSpec,
  source: Record<string, string | undefined>,
): { validated: Record<string, string>; errors: string[] } {
  const errors: string[] = [];
  const validated: Record<string, string> = {};

  for (const [name, rule] of Object.entries(spec)) {
    const value = source[name];

    if (!value) {
      const hint = rule?.startsWith
        ? ` (required, must start with "${rule.startsWith}")`
        : "";
      errors.push(`  - ${name}: missing${hint}`);
      continue;
    }

    if (rule?.startsWith && !value.startsWith(rule.startsWith)) {
      errors.push(
        `  - ${name}: invalid (must start with "${rule.startsWith}")`,
      );
      continue;
    }

    validated[name] = value;
  }

  return { validated, errors };
}

// ---------------------------------------------------------------------------
// Public env (NEXT_PUBLIC_*) — validated eagerly
// ---------------------------------------------------------------------------

const publicSpec: EnvSpec = {
  NEXT_PUBLIC_SUPABASE_URL: { startsWith: "https://" },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
  NEXT_PUBLIC_APP_URL: undefined,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: undefined,
};

interface PublicEnv {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  NEXT_PUBLIC_APP_URL: string;
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: string;
}

// Next.js inlines NEXT_PUBLIC_* vars at build time ONLY when referenced as
// literal `process.env.NEXT_PUBLIC_X`. Dynamic access (process.env[key]) is
// NOT replaced. So we must reference each var explicitly.
export const publicEnv: PublicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "",
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
};

// ---------------------------------------------------------------------------
// Server env — validated lazily on first call to getServerEnv()
// ---------------------------------------------------------------------------

const serverSpec: EnvSpec = {
  SUPABASE_SERVICE_ROLE_KEY: undefined,
  TELSTRA_API_TOKEN: undefined,
  DEFAULT_CMD_PIN: undefined,
  VAPID_PRIVATE_KEY: undefined,
  VAPID_EMAIL: { startsWith: "mailto:" },
  SUPABASE_WEBHOOK_SECRET: undefined,
};

interface ServerEnv {
  SUPABASE_SERVICE_ROLE_KEY: string;
  TELSTRA_API_TOKEN: string;
  DEFAULT_CMD_PIN: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_EMAIL: string;
  SUPABASE_WEBHOOK_SECRET: string;
}

let cachedServerEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;

  const { validated, errors } = validateVars(serverSpec, process.env as any); // eslint-disable-line @typescript-eslint/no-explicit-any

  if (errors.length > 0) {
    throw new Error(
      `Missing or invalid environment variables:\n${errors.join("\n")}`,
    );
  }

  cachedServerEnv = validated as unknown as ServerEnv;
  return cachedServerEnv;
}
