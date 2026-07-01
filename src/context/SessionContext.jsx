import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchJson, getUserId } from "../lib/api";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

const SessionContext = createContext(null);

export const roleOptions = ["student", "parent", "admin"];

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const requestedRole = new URLSearchParams(window.location.search).get("role");
  const initialRole = roleOptions.includes(requestedRole) ? requestedRole : localStorage.getItem("edusg-role") || "student";
  const [role, setRole] = useState(initialRole);

  useEffect(() => {
    restoreSession();
  }, []);

  async function applySession(data, nextRole) {
    const userRoles = data.user?.roles?.length ? data.user.roles : [data.user?.role].filter(Boolean);
    const activeRole = userRoles.includes(nextRole) ? nextRole : data.user.role;
    localStorage.setItem("edusg-user-id", data.user.id);
    localStorage.setItem("edusg-role", activeRole);
    setRole(activeRole);
    setSession(data);
    setAuthError("");
    setLoading(false);
    setOauthLoading(false);
    return activeRole;
  }

  async function completeOAuthLogin() {
    if (!supabase) return false;
    const { data: authData } = await supabase.auth.getSession();
    const email = authData.session?.user?.email;
    if (!email) return false;

    try {
      const provider = authData.session.user.app_metadata?.provider || "oauth";
      const data = await fetchJson("/auth/oauth", {
        method: "POST",
        body: JSON.stringify({ email, provider })
      });
      await supabase.auth.signOut();
      await applySession(data, data.user.role);
      if (window.location.hash || window.location.search.includes("code=")) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      return true;
    } catch (error) {
      await supabase.auth.signOut();
      setAuthError(error.message || "Could not sign in with this account");
      setLoading(false);
      setOauthLoading(false);
      if (window.location.hash) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      return true;
    }
  }

  async function restoreSession() {
    setLoading(true);
    try {
      if (await completeOAuthLogin()) return;

      const savedUserId = getUserId();
      const savedRole = localStorage.getItem("edusg-role");
      if (savedUserId) {
        const query = savedRole ? `?role=${encodeURIComponent(savedRole)}` : "";
        const data = await fetchJson(`/session/${savedUserId}${query}`);
        const userRoles = data.user?.roles?.length ? data.user.roles : [data.user.role];
        const nextRole = userRoles.includes(savedRole) ? savedRole : data.user.role;
        await applySession(data, nextRole);
        return;
      }
      setSession(null);
      setLoading(false);
    } catch {
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
      await applySession(data, data.user.role);
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
      await applySession(data, data.user.role);
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
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin }
    });
    if (error) {
      setAuthError(error.message);
      setOauthLoading(false);
    }
  }

  async function login(nextRole) {
    setLoading(true);
    setAuthError("");
    const data = await fetchJson("/login", {
      method: "POST",
      body: JSON.stringify({ role: nextRole })
    });
    await applySession(data, nextRole);
  }

  async function switchRole(nextRole) {
    const userRoles = session?.user?.roles?.length ? session.user.roles : [session?.user?.role].filter(Boolean);
    if (!userRoles.includes(nextRole)) return;
    setLoading(true);
    setAuthError("");
    try {
      const savedUserId = getUserId();
      const data = await fetchJson(`/session/${savedUserId}?role=${encodeURIComponent(nextRole)}`);
      await applySession(data, nextRole);
    } catch (error) {
      setAuthError(error.message || "Could not switch role");
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("edusg-user-id");
    localStorage.removeItem("edusg-role");
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
        loginWithCredentials,
        registerWithCredentials,
        loginWithOAuth,
        login,
        switchRole,
        logout,
        restoreSession
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
