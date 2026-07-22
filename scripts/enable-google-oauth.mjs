import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { loadEnvFiles, getProductionUrl, getProjectRef } from "./lib/env.mjs";
import { configureAuthUrls, managementRequest } from "./lib/supabase-api.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

async function loadSecretsFile() {
  try {
    const secrets = JSON.parse(await readFile(path.join(rootDir, "setup.secrets.json"), "utf8"));
    for (const [key, value] of Object.entries(secrets)) {
      if (value && !process.env[key]) process.env[key] = String(value);
    }
    return true;
  } catch {
    return false;
  }
}

function usage() {
  console.log(`
Enable Google sign-in for EduSG on Supabase.

Required environment variables (or setup.secrets.json + .env.local):
  SUPABASE_ACCESS_TOKEN   Personal access token from supabase.com/dashboard/account/tokens
  GOOGLE_CLIENT_ID        From Google Cloud Console → APIs & Services → Credentials
  GOOGLE_CLIENT_SECRET    Matching client secret

Optional:
  EDUSG_PRODUCTION_URL    Default: https://edusg-ten.vercel.app

Usage:
  GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... npm run oauth:google

Google Cloud Console setup:
  1. Create OAuth 2.0 Web client
  2. Authorized redirect URI:
     https://zitukvkmyduzacnhqcxb.supabase.co/auth/v1/callback
`);
}

async function main() {
  await loadEnvFiles();
  await loadSecretsFile();

  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const projectRef = getProjectRef();
  const siteUrl = getProductionUrl();

  if (!token || !clientId || !clientSecret) {
    usage();
    process.exit(1);
  }

  console.log("Updating Supabase redirect URLs...");
  await configureAuthUrls(token, projectRef, siteUrl);

  console.log("Enabling Google provider...");
  await managementRequest(token, "PATCH", `/projects/${projectRef}/config/auth`, {
    external_google_enabled: true,
    external_google_client_id: clientId,
    external_google_secret: clientSecret
  });

  console.log("Done. Google sign-in is enabled for", siteUrl);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
