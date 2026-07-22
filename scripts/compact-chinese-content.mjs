/**
 * One-time maintenance: shrink bloated chinese_content in Supabase.
 * Keeps admin overrides; drops packs identical to bundled seed JSON.
 *
 * Usage: node scripts/compact-chinese-content.mjs
 */
import "../server/loadEnv.js";
import { createClient } from "@supabase/supabase-js";
import { compactChineseStorage } from "../server/chineseContent.js";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data, error } = await supabase
  .from("app_state")
  .select("chinese_content")
  .eq("id", "main")
  .maybeSingle();

if (error) throw error;
if (!data) {
  console.log("No app_state row found.");
  process.exit(0);
}

const before = JSON.stringify(data.chinese_content || {}).length;
const content = structuredClone(data.chinese_content || { packs: {}, p1TopicClusters: null });
const changed = compactChineseStorage(content);
const after = JSON.stringify(content).length;

if (!changed) {
  console.log(`No redundant packs (${before} bytes). Nothing to do.`);
  process.exit(0);
}

const { error: updateError } = await supabase
  .from("app_state")
  .update({ chinese_content: content, updated_at: new Date().toISOString() })
  .eq("id", "main");

if (updateError) throw updateError;
console.log(`Compacted chinese_content: ${before} → ${after} bytes`);
