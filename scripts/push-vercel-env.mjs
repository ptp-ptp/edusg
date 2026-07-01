import { execSync } from "child_process";
import { loadEnvFiles, rootDir } from "./lib/env.mjs";

await loadEnvFiles();

const vars = {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
};

for (const [name, value] of Object.entries(vars)) {
  if (!value) {
    console.warn(`Skip ${name} (missing)`);
    continue;
  }
  for (const env of ["production", "preview"]) {
    console.log(`Setting ${name} (${env})...`);
    execSync(`npx vercel env add ${name} ${env} --value "${value}" --yes --force`, {
      cwd: rootDir,
      stdio: "inherit"
    });
  }
}

console.log("Vercel env complete.");
