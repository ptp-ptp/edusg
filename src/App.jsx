import React, { useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { SessionProvider, useSession } from "./context/SessionContext";
import StudentLayout from "./layouts/StudentLayout";
import ParentLayout from "./layouts/ParentLayout";
import StudentHome from "./dashboards/student/StudentHome";
import StudentAchievements from "./dashboards/student/StudentAchievements";
import StudentCalendar from "./dashboards/student/StudentCalendar";
import StudentRewards from "./dashboards/student/StudentRewards";
import StudentSettings from "./dashboards/student/StudentSettings";
import ParentHome from "./dashboards/parent/ParentHome";
import ParentChildDetail from "./dashboards/parent/ParentChildDetail";
import ParentMessages from "./dashboards/parent/ParentMessages";
import ParentGoals from "./dashboards/parent/ParentGoals";
import { StudentLearningApp, AdminAppShell } from "./main.jsx";
import LoginScreen from "./components/auth/LoginScreen";
import RequireAuth from "./components/auth/RequireAuth";

function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-cloud text-ink">
      <div className="rounded-lg bg-white px-8 py-6 shadow-soft">Loading EduSG...</div>
    </main>
  );
}

function LoginRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    session,
    loading,
    oauthLoading,
    authForm,
    authError,
    setAuthForm,
    loginWithCredentials,
    registerWithCredentials,
    loginWithOAuth
  } = useSession();

  useEffect(() => {
    if (!loading && session) {
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
  }, [session, loading, navigate, location.state]);

  if (loading) return <LoadingScreen />;
  if (session) return null;

  return (
    <LoginScreen
      authForm={authForm}
      authError={authError}
      loading={loading}
      oauthLoading={oauthLoading}
      onChange={(field, value) => setAuthForm((current) => ({ ...current, [field]: value }))}
      onSubmit={loginWithCredentials}
      onRegister={registerWithCredentials}
      onOAuthLogin={loginWithOAuth}
      onContinueAsGuest={() => navigate("/")}
    />
  );
}

function AppRoutes() {
  const { session, loading, role } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session || loading) return;
    const path = window.location.pathname;
    if (role === "parent" && !path.startsWith("/parent")) {
      navigate("/parent", { replace: true });
      return;
    }
    if (role === "admin" && !path.startsWith("/admin")) {
      navigate("/admin", { replace: true });
      return;
    }
    if (role === "student" && (path.startsWith("/parent") || path.startsWith("/admin"))) {
      navigate("/", { replace: true });
    }
  }, [session, loading, role, navigate]);

  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />

      <Route path="/" element={<StudentLayout />}>
        <Route index element={<StudentHome />} />
        <Route
          path="achievements"
          element={
            <RequireAuth roles={["student"]}>
              <StudentAchievements />
            </RequireAuth>
          }
        />
        <Route
          path="calendar"
          element={
            <RequireAuth roles={["student"]}>
              <StudentCalendar />
            </RequireAuth>
          }
        />
        <Route
          path="rewards"
          element={
            <RequireAuth roles={["student"]}>
              <StudentRewards />
            </RequireAuth>
          }
        />
        <Route
          path="settings"
          element={
            <RequireAuth roles={["student"]}>
              <StudentSettings />
            </RequireAuth>
          }
        />
      </Route>

      <Route path="/learn/:subject" element={<StudentLearningApp />} />

      <Route
        path="/parent"
        element={
          <RequireAuth roles={["parent", "admin"]}>
            <ParentLayout />
          </RequireAuth>
        }
      >
        <Route index element={<ParentHome />} />
        <Route path="child/:id" element={<ParentChildDetail />} />
        <Route path="messages" element={<ParentMessages />} />
        <Route path="goals" element={<ParentGoals />} />
      </Route>

      <Route
        path="/admin/*"
        element={
          <RequireAuth roles={["admin"]}>
            <AdminAppShell />
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <AppRoutes />
    </SessionProvider>
  );
}
