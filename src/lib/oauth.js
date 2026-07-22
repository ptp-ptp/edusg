import { isSupabaseConfigured, supabase, getOAuthRedirectUrl } from "./supabase";

const providerMessages = {
  google: "Google sign-in is not set up yet. Use your EduSG email and password instead.",
  apple: "Apple sign-in is not set up yet. Use your EduSG email and password instead."
};

export async function probeOAuthProvider(provider) {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, message: "Social sign-in is not configured on this site." };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: getOAuthRedirectUrl(),
      skipBrowserRedirect: true
    }
  });

  if (error) return { ok: false, message: error.message };
  if (!data?.url) return { ok: false, message: providerMessages[provider] || "Sign-in unavailable." };

  try {
    const response = await fetch(data.url, { redirect: "manual" });
    if (response.status === 400) {
      const body = await response.json().catch(() => ({}));
      const msg = String(body.msg || body.error || "");
      if (/not enabled|unsupported provider/i.test(msg)) {
        return { ok: false, message: providerMessages[provider] || "This sign-in option is not available." };
      }
      return { ok: false, message: msg || "Could not start sign-in." };
    }
    return { ok: true, url: data.url };
  } catch {
    return { ok: true, url: data.url };
  }
}

export async function startOAuthProvider(provider) {
  const result = await probeOAuthProvider(provider);
  if (!result.ok) return result;
  window.location.assign(result.url);
  return { ok: true };
}
