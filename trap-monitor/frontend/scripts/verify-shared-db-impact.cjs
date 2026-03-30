const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

function loadEnv(filePath) {
  const env = {};
  const text = fs.readFileSync(filePath, "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 0) continue;
    env[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return env;
}

async function run() {
  const env = loadEnv(".env.local");

  const admin = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const anon = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const results = [];

  // 1) Existing member user checks
  const demoLogin = await anon.auth.signInWithPassword({
    email: "demo@det.com",
    password: "12sd233",
  });

  if (demoLogin.error) {
    throw new Error(`demo login failed: ${demoLogin.error.message}`);
  }

  const demoOrgMembers = await anon
    .from("org_members")
    .select("org_id, role")
    .limit(5);

  const demoUnits = await anon
    .from("units")
    .select("id, org_id")
    .limit(20);

  const demoOrgs = await anon
    .from("organisations")
    .select("id, name, is_public")
    .limit(20);

  results.push({
    check: "demo_org_members",
    error: demoOrgMembers.error?.message ?? null,
    rows: Array.isArray(demoOrgMembers.data) ? demoOrgMembers.data.length : 0,
  });
  results.push({
    check: "demo_units",
    error: demoUnits.error?.message ?? null,
    rows: Array.isArray(demoUnits.data) ? demoUnits.data.length : 0,
  });
  results.push({
    check: "demo_organisations",
    error: demoOrgs.error?.message ?? null,
    rows: Array.isArray(demoOrgs.data) ? demoOrgs.data.length : 0,
  });

  await anon.auth.signOut();

  // 2) Temporary outsider user checks
  const outsiderEmail = `tm-outsider-${Date.now()}@det.com`;
  const outsiderPassword = "TmpPass123!";

  const created = await admin.auth.admin.createUser({
    email: outsiderEmail,
    password: outsiderPassword,
    email_confirm: true,
  });

  if (created.error || !created.data.user) {
    throw new Error(`outsider create failed: ${created.error?.message ?? "unknown"}`);
  }

  const outsiderId = created.data.user.id;

  try {
    const outsiderLogin = await anon.auth.signInWithPassword({
      email: outsiderEmail,
      password: outsiderPassword,
    });

    if (outsiderLogin.error) {
      throw new Error(`outsider login failed: ${outsiderLogin.error.message}`);
    }

    const outsiderOrgMembers = await anon
      .from("org_members")
      .select("org_id, role")
      .limit(5);

    const outsiderUnits = await anon
      .from("units")
      .select("id, org_id")
      .limit(20);

    const outsiderOrgs = await anon
      .from("organisations")
      .select("id, name, is_public")
      .limit(20);

    results.push({
      check: "outsider_org_members",
      error: outsiderOrgMembers.error?.message ?? null,
      rows: Array.isArray(outsiderOrgMembers.data) ? outsiderOrgMembers.data.length : 0,
    });
    results.push({
      check: "outsider_units",
      error: outsiderUnits.error?.message ?? null,
      rows: Array.isArray(outsiderUnits.data) ? outsiderUnits.data.length : 0,
    });
    results.push({
      check: "outsider_organisations",
      error: outsiderOrgs.error?.message ?? null,
      rows: Array.isArray(outsiderOrgs.data) ? outsiderOrgs.data.length : 0,
    });

    await anon.auth.signOut();
  } finally {
    await admin.auth.admin.deleteUser(outsiderId);
  }

  for (const row of results) {
    console.log(`${row.check}: rows=${row.rows}; error=${row.error ?? "none"}`);
  }
}

run().catch((err) => {
  console.error(`VERIFY_ERROR: ${err.message}`);
  process.exit(1);
});
