import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../../context/SessionContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { finishOAuthCallback } = useSession();

  useEffect(() => {
    let active = true;
    finishOAuthCallback()
      .then((returnPath) => {
        if (!active) return;
        navigate(returnPath || "/", { replace: true });
      })
      .catch(() => {
        if (!active) return;
        navigate("/", { replace: true });
      });
    return () => {
      active = false;
    };
  }, [finishOAuthCallback, navigate]);

  return (
    <main className="grid min-h-screen place-items-center bg-cloud text-ink">
      <div className="rounded-lg bg-white px-8 py-6 shadow-soft">Signing you in…</div>
    </main>
  );
}
