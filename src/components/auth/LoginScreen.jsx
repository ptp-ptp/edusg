import React, { useState } from "react";
import { BookOpenText, FlaskConical, Languages, Sigma } from "lucide-react";
import { cx } from "../../lib/api";

const demoAccounts = [
  { label: "Jayden", email: "jayden@edusg.sg" },
  { label: "Mum", email: "mum@edusg.sg" },
  { label: "Philip", email: "philip@edusg.sg" }
];

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function LandingBackdrop() {
  const subjects = [
    { name: "Math", icon: Sigma, color: "bg-teal" },
    { name: "English", icon: BookOpenText, color: "bg-blue-500" },
    { name: "Science", icon: FlaskConical, color: "bg-leaf" },
    { name: "Chinese", icon: Languages, color: "bg-coral" }
  ];

  return (
    <div className="login-landing" aria-hidden="true">
      <div className="login-landing-inner">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal font-black text-white">SG</div>
          <span className="text-lg font-black text-ink">EduSG</span>
        </div>
        <h2 className="login-landing-title">Learn smarter, every day</h2>
        <p className="login-landing-sub">Math · English · Science · Chinese for P1–P6</p>
        <div className="login-landing-cards">
          {subjects.map((item) => (
            <div key={item.name} className="login-landing-card">
              <span className={cx("login-landing-icon", item.color)}>
                <item.icon className="h-4 w-4 text-white" />
              </span>
              <span className="font-bold text-ink">{item.name}</span>
            </div>
          ))}
        </div>
        <div className="login-landing-streak">12-day streak · 2,450 stars</div>
      </div>
    </div>
  );
}

export default function LoginScreen({
  authForm,
  authError,
  onChange,
  onSubmit,
  onRegister,
  onOAuthLogin,
  onContinueAsGuest,
  oauthLoading,
  loading
}) {
  const [mode, setMode] = useState("login");
  const [showDemo, setShowDemo] = useState(false);
  const [registerForm, setRegisterForm] = useState({ name: "", email: "", password: "", grade: "P4" });

  function updateRegister(field, value) {
    setRegisterForm((current) => ({ ...current, [field]: value }));
  }

  function handleRegisterSubmit(event) {
    event.preventDefault();
    onRegister?.(registerForm);
  }

  return (
    <main className="login-scene">
      <LandingBackdrop />

      <div className="login-glass" data-testid="login-screen">
        <div className="login-glass-head">
          <h1 className="login-glass-title">{mode === "login" ? "Welcome back" : "Join EduSG"}</h1>
          <p className="login-glass-sub">
            {mode === "login" ? "Sign in to pick up where you left off." : "A quick setup and you're ready to learn."}
          </p>
        </div>

        <div className="login-tabs">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={cx("login-tab", mode === "login" && "login-tab-active")}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={cx("login-tab", mode === "register" && "login-tab-active")}
          >
            Sign up
          </button>
        </div>

        <div className="login-social">
          <button type="button" disabled={loading || oauthLoading} onClick={() => onOAuthLogin?.("google")} className="login-social-btn" title="Google">
            <GoogleIcon />
            <span>Google</span>
          </button>
          <button type="button" disabled={loading || oauthLoading} onClick={() => onOAuthLogin?.("apple")} className="login-social-btn" title="Apple">
            <AppleIcon />
            <span>Apple</span>
          </button>
        </div>

        <div className="login-divider"><span>or email</span></div>

        {mode === "login" ? (
          <form onSubmit={onSubmit} className="login-form">
            <input
              type="email"
              value={authForm.email}
              onChange={(event) => onChange("email", event.target.value)}
              className="login-field"
              placeholder="Email"
              autoComplete="email"
              required
            />
            <input
              type="password"
              value={authForm.password}
              onChange={(event) => onChange("password", event.target.value)}
              className="login-field"
              placeholder="Password"
              autoComplete="current-password"
              required
            />
            {authError && <p className="login-error">{authError}</p>}
            <button type="submit" disabled={loading || oauthLoading} className="login-btn-primary">
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="login-form">
            <input
              type="text"
              value={registerForm.name}
              onChange={(event) => updateRegister("name", event.target.value)}
              className="login-field"
              placeholder="Your name"
              required
            />
            <input
              type="email"
              value={registerForm.email}
              onChange={(event) => updateRegister("email", event.target.value)}
              className="login-field"
              placeholder="Email"
              autoComplete="email"
              required
            />
            <input
              type="password"
              value={registerForm.password}
              onChange={(event) => updateRegister("password", event.target.value)}
              className="login-field"
              placeholder="Password (6+ chars)"
              autoComplete="new-password"
              minLength={6}
              required
            />
            <select value={registerForm.grade} onChange={(event) => updateRegister("grade", event.target.value)} className="login-field">
              {["P1", "P2", "P3", "P4", "P5", "P6"].map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
            {authError && <p className="login-error">{authError}</p>}
            <button type="submit" disabled={loading || oauthLoading} className="login-btn-primary">
              {loading ? "Creating…" : "Create account"}
            </button>
          </form>
        )}

        <div className="login-foot">
          <button type="button" onClick={() => setShowDemo((v) => !v)} className="login-foot-link">
            {showDemo ? "Hide demos" : "Try a demo account"}
          </button>
          {showDemo && (
            <div className="login-demo">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setMode("login");
                    onChange("email", account.email);
                    onChange("password", "edusg123");
                  }}
                  className="login-demo-btn"
                >
                  {account.label}
                </button>
              ))}
            </div>
          )}
          {onContinueAsGuest && (
            <button type="button" onClick={onContinueAsGuest} className="login-foot-link">
              Browse without signing in
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
