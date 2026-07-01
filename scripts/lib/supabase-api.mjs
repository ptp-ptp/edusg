const API_BASE = "https://api.supabase.com/v1";

export async function managementRequest(token, method, path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message = data?.message || data?.error || text || response.statusText;
    throw new Error(`${method} ${path} failed: ${message}`);
  }
  return data;
}

export async function fetchApiKeys(token, projectRef) {
  const keys = await managementRequest(token, "GET", `/projects/${projectRef}/api-keys?reveal=true`);
  const list = Array.isArray(keys) ? keys : keys?.data || [];
  const anon = list.find((item) => item.name === "anon" || item.type === "publishable")?.api_key;
  const service = list.find((item) => item.name === "service_role" || item.type === "secret")?.api_key;
  return { anon, service, list };
}

export async function configureAuthUrls(token, projectRef, siteUrl) {
  const localUrl = "http://127.0.0.1:5173";
  const redirectUrls = [siteUrl, `${siteUrl}/`, `${localUrl}`, `${localUrl}/`].join(",");
  try {
    await managementRequest(token, "PATCH", `/projects/${projectRef}/config/auth`, {
      site_url: siteUrl,
      uri_allow_list: redirectUrls
    });
    return true;
  } catch (error) {
    console.warn("Auth URL config skipped:", error.message);
    return false;
  }
}

export async function runDatabaseQuery(token, projectRef, query) {
  return managementRequest(token, "POST", `/projects/${projectRef}/database/query`, { query });
}

export async function applyMigrations(token, projectRef, migrationSql) {
  try {
    await runDatabaseQuery(token, projectRef, migrationSql);
    return;
  } catch {
    // Fall back to statement-by-statement for APIs that reject multi-statement queries
  }

  const statements = migrationSql
    .split(/;\s*\n/)
    .map((part) => part.trim())
    .filter((part) => part && !part.startsWith("--"));

  for (const statement of statements) {
    try {
      await runDatabaseQuery(token, projectRef, `${statement};`);
    } catch (error) {
      if (/already exists|duplicate/i.test(error.message)) continue;
      throw error;
    }
  }
}
