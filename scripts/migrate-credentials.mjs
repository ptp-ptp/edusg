/**
 * Apply credential + profile updates to Supabase (or local database.json).
 * Run: node scripts/migrate-credentials.mjs
 */
import { loadEnvFiles } from "./lib/env.mjs";
import { readDb, writeDb, isSupabaseEnabled } from "../server/db.js";
import { demoCredentials, managedUserIds } from "../server/auth.js";

await loadEnvFiles();
const db = await readDb();
await writeDb(db);

console.log(isSupabaseEnabled() ? "Supabase database updated." : "Local database updated.");
console.log("");
console.log("Managed accounts (progress data kept by user id):");
for (const id of managedUserIds) {
  const user = db.users.find((entry) => entry.id === id);
  const creds = demoCredentials[id];
  if (!user || !creds) continue;
  console.log(`  ${user.name}`);
  console.log(`    Email:    ${user.email}`);
  console.log(`    Password: ${creds.password}`);
  console.log(`    Stars:    ${user.stars ?? 0} · Streak: ${user.streak ?? "—"}`);
}
