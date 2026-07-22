import React, { useEffect } from "react";
import { X } from "lucide-react";
import { useSession } from "../../context/SessionContext";
import LoginScreen from "./LoginScreen";

export default function LoginModal() {
  const {
    loginOpen,
    closeLogin,
    loading,
    oauthLoading,
    authForm,
    authError,
    setAuthForm,
    rememberDevice,
    setRememberDevice,
    loginWithCredentials,
    registerWithCredentials,
    loginWithOAuth,
    oauthProviders,
    session
  } = useSession();

  useEffect(() => {
    if (!loginOpen) return;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      document.documentElement.style.overflow = "";
    };
  }, [loginOpen]);

  useEffect(() => {
    if (session && loginOpen) closeLogin();
  }, [session, loginOpen, closeLogin]);

  useEffect(() => {
    if (!loginOpen) return;
    function onKeyDown(event) {
      if (event.key === "Escape") closeLogin();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [loginOpen, closeLogin]);

  if (!loginOpen) return null;

  return (
    <div className="login-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="login-modal-title">
      <button type="button" className="login-modal-backdrop" aria-label="Close login" onClick={closeLogin} />
      <div className="login-modal-panel">
        <button type="button" className="login-modal-close" onClick={closeLogin} aria-label="Close">
          <X className="h-4 w-4" />
        </button>
        <LoginScreen
          variant="modal"
          authForm={authForm}
          authError={authError}
          loading={loading}
          oauthLoading={oauthLoading}
          onChange={(field, value) => setAuthForm((current) => ({ ...current, [field]: value }))}
          onSubmit={loginWithCredentials}
          onRegister={registerWithCredentials}
          onOAuthLogin={loginWithOAuth}
          onClose={closeLogin}
          rememberDevice={rememberDevice}
          onRememberDeviceChange={setRememberDevice}
          oauthProviders={oauthProviders}
        />
      </div>
    </div>
  );
}
