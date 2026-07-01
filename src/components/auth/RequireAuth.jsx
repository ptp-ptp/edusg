import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "../../context/SessionContext";

function AuthLoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-cloud text-ink">
      <div className="rounded-lg bg-white px-8 py-6 shadow-soft">Loading EduSG...</div>
    </main>
  );
}

export default function RequireAuth({ children, roles }) {
  const { session, loading } = useSession();
  const location = useLocation();

  if (loading) return <AuthLoadingScreen />;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;

  if (roles?.length) {
    const userRoles = session.user?.roles?.length ? session.user.roles : [session.user?.role].filter(Boolean);
    if (!roles.some((role) => userRoles.includes(role))) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
