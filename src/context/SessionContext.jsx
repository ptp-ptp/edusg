import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchJson, getUserId } from "../lib/api";
import {
  clearAuthCredentials,
  getRememberDevice,
  getSavedRole,
  saveAuthCredentials,
  setRememberDevice as persistRememberDevice
} from "../lib/authStorage";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { probeOAuthProvider, startOAuthProvider } from "../lib/oauth";

const SessionContext = createContext(null);
const OAUTH_RETURN_KEY = "edusg-oauth-return";

export const roleOptions = ["student", "parent", "admin"];

function readOAuthReturnPath() {
  const saved = sessionStorage.getItem(OAUTH_RETURN_KEY);
  sessionStorage.removeItem(OAUTH_RETURN_KEY);
  if (!saved) return "/";
  try {
    const url = new URL(saved, window.location.origin);
    if (url.origin !== window.location.origin) return "/";
    return `${url.pathname}${url.search}${url.hash}` || "/";
  } catch {
    return "/";
  }
}

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [rememberDevice, setRememberDeviceState] = useState(getRememberDevice);
  const [loginOpen, setLoginOpen] = useState(false);
  const [oauthProviders, setOauthProviders] = useState({ google: null, apple: null });
  const [postLoginRole, setPostLoginRole] = useState(null);
  const requestedRole = new URLSearchParams(window.location.search).get("role");
  const initialRole = roleOptions.includes(requestedRole) ? requestedRole : getSavedRole() || "student";
  const [role, setRole] = useState(initialRole);

  useEffect(() => {
    if (window.location.pathname === "/auth/callback") return;
    restoreSession();
  }, []);

  useEffect(() => {
    if (!loginOpen || !isSupabaseConfigured) return;
    let active = true;
    (async () => {
      const [google, apple] = await Promise.all([
        probeOAuthProvider("google"),
        probeOAuthProvider("apple")
      ]);
      if (!active) return;
      setOauthProviders({
        google: google.ok,
        apple: apple.ok
      });
    })();
    return () => {
      active = false;
    };
  }, [loginOpen]);

  function setRememberDevice(remember) {
    setRememberDeviceState(remember);
    persistRememberDevice(remember);
  }

  async function applySession(data, nextRole, remember = rememberDevice, { landing = true } = {}) {
    const userRoles = data.user?.roles?.length ? data.user.roles : [data.user?.role].filter(Boolean);
    const activeRole = userRoles.includes(nextRole) ? nextRole : data.user.role;
    saveAuthCredentials(data.user.id, activeRole, remember);
    setRole(activeRole);
    setSession(data);
    setAuthError("");
    setLoginOpen(false);
    if (landing && (activeRole === "parent" || activeRole === "admin")) {
      setPostLoginRole(activeRole);
    }
    setLoading(false);
    setOauthLoading(false);
    return activeRole;
  }

  async function completeOAuthLogin(remember = getRememberDevice()) {
    if (!supabase) return false;
    const { data: authData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const email = authData.session?.user?.email;
    if (!email) return false;

    try {
      const provider = authData.session.user.app_metadata?.provider || "oauth";
      const data = await fetchJson("/auth/oauth", {
        method: "POST",
        body: JSON.stringify({ email, provider })
      });
      await supabase.auth.signOut();
      await applySession(data, data.user.role, remember);
      return true;
    } catch (error) {
      await supabase.auth.signOut();
      setAuthError(error.message || "Could not sign in with this account");
      setLoading(false);
      setOauthLoading(false);
      throw error;
    }
  }

  async function finishOAuthCallback() {
    setLoading(true);
    setOauthLoading(true);
    setAuthError("");

    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error_description") || params.get("error");
    if (oauthError) {
      const message = decodeURIComponent(oauthError.replace(/\+/g, " "));
      const friendly = /not enabled|unsupported provider/i.test(message)
        ? "Google sign-in is not set up yet. Use your EduSG email and password instead."
        : message;
      setAuthError(friendly);
      setLoading(false);
      setOauthLoading(false);
      setLoginOpen(true);
      window.history.replaceState({}, document.title, "/auth/callback");
      throw new Error(message);
    }

    try {
      if (!supabase) throw new Error("Google sign-in is not configured on this site.");

      const code = params.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
      }

      const remember = getRememberDevice();
      await completeOAuthLogin(remember);
      return readOAuthReturnPath();
    } catch (error) {
      setAuthError(error.message || "Google sign-in failed");
      setLoading(false);
      setOauthLoading(false);
      setLoginOpen(true);
      throw error;
    }
  }

  async function restoreSession() {
    setLoading(true);
    try {
      const savedUserId = getUserId();
      const savedRole = getSavedRole();
      if (savedUserId) {
        const query = savedRole ? `?role=${encodeURIComponent(savedRole)}` : "";
        const data = await fetchJson(`/session/${savedUserId}${query}`);
        const userRoles = data.user?.roles?.length ? data.user.roles : [data.user.role];
        const nextRole = userRoles.includes(savedRole) ? savedRole : data.user.role;
        await applySession(data, nextRole, getRememberDevice(), { landing: false });
        return;
      }
      setSession(null);
      setLoading(false);
    } catch {
      clearAuthCredentials();
      setSession(null);
      setLoading(false);
    }
  }

  async function loginWithCredentials(event) {
    event?.preventDefault();
    setLoading(true);
    setAuthError("");
    try {
      const data = await fetchJson("/auth/login", {
        method: "POST",
        body: JSON.stringify(authForm)
      });
      await applySession(data, data.user.role, rememberDevice);
    } catch (error) {
      setAuthError(error.message || "Login failed");
      setLoading(false);
    }
  }

  async function registerWithCredentials(form) {
    setLoading(true);
    setAuthError("");
    try {
      const data = await fetchJson("/auth/register", {
        method: "POST",
        body: JSON.stringify({ ...form, role: "student" })
      });
      await applySession(data, data.user.role, rememberDevice);
    } catch (error) {
      setAuthError(error.message || "Registration failed");
      setLoading(false);
    }
  }

  async function loginWithOAuth(provider) {
    setAuthError("");
    if (!isSupabaseConfigured || !supabase) {
      setAuthError("Google and Apple sign-in require Supabase OAuth keys. Use your EduSG email and password.");
      return;
    }
    setOauthLoading(true);
    persistRememberDevice(rememberDevice);
    const returnPath = `${window.location.pathname}${window.location.search}`;
    sessionStorage.setItem(OAUTH_RETURN_KEY, returnPath);
    const result = await startOAuthProvider(provider);
    if (!result.ok) {
      setAuthError(result.message);
      setOauthLoading(false);
      sessionStorage.removeItem(OAUTH_RETURN_KEY);
      setOauthProviders((current) => ({ ...current, [provider]: false }));
    }
  }

  async function login(nextRole) {
    setLoading(true);
    setAuthError("");
    const data = await fetchJson("/login", {
      method: "POST",
      body: JSON.stringify({ role: nextRole })
    });
    await applySession(data, nextRole, rememberDevice);
  }

  async function switchRole(nextRole) {
    const userRoles = session?.user?.roles?.length ? session.user.roles : [session?.user?.role].filter(Boolean);
    if (!userRoles.includes(nextRole)) return;
    setLoading(true);
    setAuthError("");
    try {
      const savedUserId = getUserId();
      const data = await fetchJson(`/session/${savedUserId}?role=${encodeURIComponent(nextRole)}`);
      await applySession(data, nextRole, getRememberDevice());
    } catch (error) {
      setAuthError(error.message || "Could not switch role");
      setLoading(false);
    }
  }

  function openLogin() {
    setAuthError("");
    setLoginOpen(true);
  }

  function closeLogin() {
    setLoginOpen(false);
    setAuthError("");
  }

  function logout() {
    clearAuthCredentials();
    if (supabase) supabase.auth.signOut();
    setSession(null);
    setLoading(false);
  }

  return (
    <SessionContext.Provider
      value={{
        session,
        setSession,
        loading,
        oauthLoading,
        role,
        setRole,
        authError,
        authForm,
        setAuthForm,
        rememberDevice,
        setRememberDevice,
        loginWithCredentials,
        registerWithCredentials,
        loginWithOAuth,
        login,
        switchRole,
        logout,
        restoreSession,
        finishOAuthCallback,
        oauthProviders,
        loginOpen,
        openLogin,
        closeLogin,
        postLoginRole,
        clearPostLoginRole: () => setPostLoginRole(null)
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
