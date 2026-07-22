import React, { useState } from "react";
import { BookOpenText, Eye, EyeOff, FlaskConical, Languages, Sigma } from "lucide-react";
import { cx } from "../../lib/api";

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

function PasswordField({ value, onChange, placeholder, autoComplete, minLength, required = true }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="login-password-wrap">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        className="login-field login-field-password"
        placeholder={placeholder}
        autoComplete={autoComplete}
        minLength={minLength}
        required={required}
      />
      <button
        type="button"
        className="login-password-toggle"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
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
  variant = "page",
  authForm,
  authError,
  onChange,
  onSubmit,
  onRegister,
  onOAuthLogin,
  onContinueAsGuest,
  onClose,
  rememberDevice = true,
  onRememberDeviceChange,
  oauthProviders = { google: null, apple: null },
  oauthLoading,
  loading
}) {
  const isModal = variant === "modal";
  const [mode, setMode] = useState("login");
  const [registerForm, setRegisterForm] = useState({ name: "", email: "", password: "", grade: "P4" });
  const showGoogle = oauthProviders.google !== false;
  const showApple = oauthProviders.apple !== false;
  const showSocial = showGoogle || showApple;

  function updateRegister(field, value) {
    setRegisterForm((current) => ({ ...current, [field]: value }));
  }

  function handleRegisterSubmit(event) {
    event.preventDefault();
    onRegister?.(registerForm);
  }

  const card = (
      <div className={cx("login-glass", isModal && "login-glass-modal")} data-testid="login-screen">
        <div className="login-glass-head">
          <h1 id={isModal ? "login-modal-title" : undefined} className="login-glass-title">
            {mode === "login" ? "Welcome back" : "Join EduSG"}
          </h1>
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

        {authError && <p className="login-error login-error-banner">{authError}</p>}

        {showSocial && (
          <>
        <div className="login-social">
          {showGoogle && (
          <button type="button" disabled={loading || oauthLoading} onClick={() => onOAuthLogin?.("google")} className="login-social-btn" title="Google">
            <GoogleIcon />
            <span>Google</span>
          </button>
          )}
          {showApple && (
          <button type="button" disabled={loading || oauthLoading} onClick={() => onOAuthLogin?.("apple")} className="login-social-btn" title="Apple">
            <AppleIcon />
            <span>Apple</span>
          </button>
          )}
        </div>

        <div className="login-divider"><span>or email</span></div>
          </>
        )}

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
            <PasswordField
              value={authForm.password}
              onChange={(event) => onChange("password", event.target.value)}
              placeholder="Password"
              autoComplete="current-password"
            />
            <label className="login-remember">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(event) => onRememberDeviceChange?.(event.target.checked)}
              />
              <span>Remember me on this device — stay signed in</span>
            </label>
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
            <PasswordField
              value={registerForm.password}
              onChange={(event) => updateRegister("password", event.target.value)}
              placeholder="Password (6+ chars)"
              autoComplete="new-password"
              minLength={6}
            />
            <select value={registerForm.grade} onChange={(event) => updateRegister("grade", event.target.value)} className="login-field">
              {["P1", "P2", "P3", "P4", "P5", "P6"].map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
            <button type="submit" disabled={loading || oauthLoading} className="login-btn-primary">
              {loading ? "Creating…" : "Create account"}
            </button>
          </form>
        )}

        <div className="login-foot">
          {(onContinueAsGuest || (isModal && onClose)) && (
            <button
              type="button"
              onClick={onContinueAsGuest || onClose}
              className="login-foot-link"
            >
              {isModal ? "Continue browsing" : "Browse without signing in"}
            </button>
          )}
        </div>
      </div>
  );

  if (isModal) return card;

  return (
    <main className="login-scene">
      <LandingBackdrop />
      {card}
    </main>
  );
}
