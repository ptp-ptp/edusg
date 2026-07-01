import { readFile } from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFiles, writeEnvLocal, rootDir, getProjectRef, getProductionUrl } from "./lib/env.mjs";
import {
  fetchApiKeys,
  configureAuthUrls,
  applyMigrations
} from "./lib/supabase-api.mjs";

const MIGRATIONS = [
  "20250629000000_initial_schema.sql",
  "20250629120000_users_auth_analytics.sql",
  "20250629180000_dashboard_collections.sql"
];

function log(step, message) {
  console.log(`\n[${step}] ${message}`);
}

function parseArgs(argv) {
  const args = {};
  for (const part of argv) {
    if (!part.startsWith("--")) continue;
    const [key, value] = part.slice(2).split("=");
    args[key] = value ?? true;
  }
  return args;
}

async function loadSecretsFile() {
  const secretsPath = path.join(rootDir, "setup.secrets.json");
  try {
    const secrets = JSON.parse(await readFile(secretsPath, "utf8"));
    for (const [key, value] of Object.entries(secrets)) {
      if (value && !process.env[key]) process.env[key] = String(value);
    }
    return true;
  } catch {
    return false;
  }
}

async function resolveCredentials(args) {
  await loadEnvFiles();
  await loadSecretsFile();

  const projectRef = getProjectRef();
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || `https://${projectRef}.supabase.co`;
  let anonKey = args["anon-key"] || process.env.VITE_SUPABASE_ANON_KEY;
  let serviceKey = args["service-key"] || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const accessToken = args.token || process.env.SUPABASE_ACCESS_TOKEN;

  if (accessToken && (!anonKey || !serviceKey)) {
    log("keys", "Fetching API keys from Supabase Management API...");
    const keys = await fetchApiKeys(accessToken, projectRef);
    anonKey = anonKey || keys.anon;
    serviceKey = serviceKey || keys.service;
  }

  return { projectRef, supabaseUrl, anonKey, serviceKey, accessToken };
}

function toSupabaseRow(seed) {
  return {
    id: "main",
    users: seed.users || [],
    progress: seed.progress || {},
    messages: seed.messages || [],
    questions: seed.questions || [],
    login_events: seed.loginEvents || [],
    answer_events: seed.answerEvents || [],
    achievements: seed.achievements || [],
    goals: seed.goals || [],
    study_sessions: seed.studySessions || [],
    notifications: seed.notifications || [],
    rewards_catalog: seed.rewardsCatalog || [],
    reward_redemptions: seed.rewardRedemptions || [],
    platform_settings: seed.platformSettings || {},
    audit_events: seed.auditEvents || [],
    updated_at: new Date().toISOString()
  };
}

async function syncLocalDb() {
  log("local", "Syncing data/database.json from seed...");
  execSync("node scripts/sync-local-db.mjs", { cwd: rootDir, stdio: "inherit" });
}

async function applySqlMigrations(accessToken, projectRef) {
  if (!accessToken) {
    log("migrations", "Skipped (no SUPABASE_ACCESS_TOKEN). Run: npm run db:push after supabase login");
    return false;
  }

  log("migrations", "Applying SQL migrations via Management API...");
  const migrationsDir = path.join(rootDir, "supabase", "migrations");
  for (const file of MIGRATIONS) {
    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    await applyMigrations(accessToken, projectRef, sql);
    console.log(`  ✓ ${file}`);
  }
  return true;
}

async function seedSupabase(supabaseUrl, serviceKey) {
  log("seed", "Seeding Supabase app_state...");
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  let seed;
  try {
    seed = JSON.parse(await readFile(path.join(rootDir, "data", "database.json"), "utf8"));
  } catch {
    const { seedDatabase } = await import("../server/seed.js");
    seed = seedDatabase;
  }

  const { emptyDb } = await import("../server/db.js");
  const db = { ...emptyDb(), ...seed };
  const { error } = await supabase.from("app_state").upsert(toSupabaseRow(db));
  if (error) throw new Error(`Seed failed: ${error.message}`);

  console.log(`  Users: ${db.users?.length || 0}`);
  console.log(`  Questions: ${db.questions?.length || 0}`);
  return true;
}

async function pushVercelEnv(supabaseUrl, anonKey, serviceKey) {
  const vars = {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_URL: supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: serviceKey
  };

  log("vercel", "Pushing environment variables to Vercel production...");
  for (const [name, value] of Object.entries(vars)) {
    if (!value) continue;
    execSync(`npx vercel env add ${name} production --value "${value.replace(/"/g, '\\"')}" --yes --force`, {
      cwd: rootDir,
      stdio: "inherit"
    });
    execSync(`npx vercel env add ${name} preview --value "${value.replace(/"/g, '\\"')}" --yes --force`, {
      cwd: rootDir,
      stdio: "inherit"
    });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log("EduSG auto setup");
  console.log("================");

  await syncLocalDb();

  let creds;
  try {
    creds = await resolveCredentials(args);
  } catch (error) {
    console.error("\nSetup needs Supabase credentials.");
    console.error(error.message);
    printHelp();
    process.exit(1);
  }

  const { projectRef, supabaseUrl, anonKey, serviceKey, accessToken } = creds;

  if (!anonKey || !serviceKey) {
    console.error("\nMissing Supabase API keys.");
    printHelp();
    process.exit(1);
  }

  await writeEnvLocal({
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_URL: supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: serviceKey
  });
  log("env", "Updated .env.local");

  if (accessToken) {
    const siteUrl = getProductionUrl();
    await configureAuthUrls(accessToken, projectRef, siteUrl);
    log("auth", `OAuth redirect URLs configured for ${siteUrl}`);
    await applySqlMigrations(accessToken, projectRef);
  }

  process.env.SUPABASE_URL = supabaseUrl;
  process.env.SUPABASE_SERVICE_ROLE_KEY = serviceKey;
  process.env.VITE_SUPABASE_URL = supabaseUrl;
  process.env.VITE_SUPABASE_ANON_KEY = anonKey;

  await seedSupabase(supabaseUrl, serviceKey);

  if (args.deploy !== "false") {
    try {
      await pushVercelEnv(supabaseUrl, anonKey, serviceKey);
      log("deploy", "Redeploying production...");
      execSync("npx vercel --prod --yes", { cwd: rootDir, stdio: "inherit" });
    } catch (error) {
      console.warn("Vercel env/deploy step failed:", error.message);
    }
  }

  console.log("\n✅ Setup complete");
  console.log(`   Local:  npm run dev`);
  console.log(`   Live:   ${getProductionUrl()}`);
  console.log("\nOAuth note: enable Google & Apple in Supabase → Authentication → Providers");
  console.log("https://supabase.com/dashboard/project/" + projectRef + "/auth/providers");
}

function printHelp() {
  console.log(`
Option A — one-time access token (recommended):
  1. Create token: https://supabase.com/dashboard/account/tokens
  2. Save as setup.secrets.json:
     { "SUPABASE_ACCESS_TOKEN": "sbp_..." }
  3. Run: npm run setup

Option B — paste API keys directly:
  npm run setup -- --anon-key=eyJ... --service-key=eyJ...

Option C — add keys to .env.local then run:
  npm run setup
`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
