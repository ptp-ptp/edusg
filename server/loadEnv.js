import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Lightweight .env loader so the API server picks up keys (e.g. OPENAI_API_KEY)
// without requiring a dotenv dependency. Values already present in the
// environment always win.
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

for (const file of [".env.local", ".env"]) {
  try {
    const content = readFileSync(path.join(rootDir, file), "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const key = match[1];
      const value = match[2].replace(/^["']|["']$/g, "");
      if (!(key in process.env) && value) process.env[key] = value;
    }
  } catch {
    // file missing is fine
  }
}
