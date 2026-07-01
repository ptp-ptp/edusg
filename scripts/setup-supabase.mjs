import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running setup.");
  console.error("Copy .env.example to .env and fill in keys from:");
  console.error("https://supabase.com/dashboard/project/zitukvkmyduzacnhqcxb/settings/api");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

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

async function main() {
  const migrationsDir = path.join(rootDir, "supabase", "migrations");
  const migrationFiles = [
    "20250629000000_initial_schema.sql",
    "20250629120000_users_auth_analytics.sql",
    "20250629180000_dashboard_collections.sql"
  ];

  console.log("Applying migrations via Supabase SQL API (if exec_sql is available)...");
  for (const file of migrationFiles) {
    const migrationSql = await readFile(path.join(migrationsDir, file), "utf8");
    const { error: sqlError } = await supabase.rpc("exec_sql", { query: migrationSql }).maybeSingle();
    if (sqlError) {
      console.log(`  Skipped ${file} (run manually): npm run db:push`);
    }
  }

  let seed;
  try {
    seed = JSON.parse(await readFile(path.join(rootDir, "data", "database.json"), "utf8"));
  } catch {
    const { seedDatabase } = await import("../server/seed.js");
    seed = seedDatabase;
  }

  const { emptyDb } = await import("../server/db.js");
  const db = { ...emptyDb(), ...seed };

  console.log("Seeding app_state...");
  const { error } = await supabase.from("app_state").upsert(toSupabaseRow(db));

  if (error) {
    console.error("Seed failed:", error.message);
    console.error("Ensure migrations have been applied first: npm run db:push");
    process.exit(1);
  }

  console.log("Supabase setup complete.");
  console.log(`  Users: ${db.users?.length || 0}`);
  console.log(`  Questions: ${db.questions?.length || 0}`);
  console.log(`  Achievements: ${db.achievements?.length || 0}`);
  console.log(`  Goals: ${db.goals?.length || 0}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
