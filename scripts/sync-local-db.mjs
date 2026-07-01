/**
 * Merge seed data into data/database.json (local file persistence).
 * Run: node scripts/sync-local-db.mjs
 */
import { readDb, writeDb } from "../server/db.js";

const db = await readDb();
await writeDb(db);
console.log("Local database synced.");
console.log(`  Users: ${db.users?.length || 0}`);
console.log(`  Achievements: ${db.achievements?.length || 0}`);
console.log(`  Goals: ${db.goals?.length || 0}`);
console.log(`  Study sessions: ${db.studySessions?.length || 0}`);
