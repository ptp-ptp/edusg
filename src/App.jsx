import React, { Suspense, lazy, useEffect } from "react";
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
import LoginModal from "./components/auth/LoginModal";
import AuthCallback from "./components/auth/AuthCallback";
import RequireAuth from "./components/auth/RequireAuth";
import { CelebrationProvider } from "./components/shared/Celebration";

const StudentLearningApp = lazy(() =>
  import("./main.jsx").then((module) => ({ default: module.StudentLearningApp }))
);
const AdminAppShell = lazy(() =>
  import("./main.jsx").then((module) => ({ default: module.AdminAppShell }))
);

function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-cloud text-ink">
      <div className="rounded-lg bg-white px-8 py-6 shadow-soft">Loading EduSG...</div>
    </main>
  );
}

function LegacyLoginRedirect() {
  const navigate = useNavigate();
  const { openLogin } = useSession();

  useEffect(() => {
    openLogin();
    navigate("/", { replace: true });
  }, [openLogin, navigate]);

  return null;
}

function AppRoutes() {
  const { session, loading, role, postLoginRole, clearPostLoginRole } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthCallback = location.pathname === "/auth/callback";

  // Land parents/admins on their dashboard once right after signing in,
  // but let them browse the rest of the app freely afterwards.
  useEffect(() => {
    if (!postLoginRole || loading || isAuthCallback) return;
    clearPostLoginRole();
    const path = location.pathname;
    if (postLoginRole === "parent" && !path.startsWith("/parent")) {
      navigate("/parent", { replace: true });
    } else if (postLoginRole === "admin" && !path.startsWith("/admin")) {
      navigate("/admin", { replace: true });
    }
  }, [postLoginRole, loading, isAuthCallback, location.pathname, navigate, clearPostLoginRole]);

  useEffect(() => {
    if (!session || loading || isAuthCallback) return;
    const path = location.pathname;
    if (role === "student" && (path.startsWith("/parent") || path.startsWith("/admin"))) {
      navigate("/", { replace: true });
    }
  }, [session, loading, role, navigate, isAuthCallback, location.pathname]);

  if (loading && !isAuthCallback) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/login" element={<LegacyLoginRedirect />} />

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

      <Route
        path="/learn/:subject"
        element={
          <Suspense fallback={<LoadingScreen />}>
            <StudentLearningApp />
          </Suspense>
        }
      />

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
            <Suspense fallback={<LoadingScreen />}>
              <AdminAppShell />
            </Suspense>
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppShell() {
  return (
    <>
      <AppRoutes />
      <LoginModal />
    </>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <CelebrationProvider>
        <AppShell />
      </CelebrationProvider>
    </SessionProvider>
  );
}
