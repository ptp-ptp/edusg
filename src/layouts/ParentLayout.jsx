import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { ArrowLeft, Home, MessageCircle, Target } from "lucide-react";
import { cx } from "../lib/api";
import { useSession } from "../context/SessionContext";

const nav = [
  { to: "/parent", label: "Overview", icon: Home, end: true },
  { to: "/parent/messages", label: "Messages", icon: MessageCircle },
  { to: "/parent/goals", label: "Goals", icon: Target }
];

function getMainPageTarget(user) {
  const roles = user?.roles?.length ? user.roles : [user?.role].filter(Boolean);
  if (roles.includes("admin")) return { path: "/admin", role: "admin" };
  if (roles.includes("student")) return { path: "/", role: "student" };
  return null;
}

export default function ParentLayout() {
  const { session, switchRole } = useSession();
  const navigate = useNavigate();
  const mainPageTarget = session?.user ? getMainPageTarget(session.user) : null;

  async function goToMainPage() {
    if (!mainPageTarget) return;
    await switchRole(mainPageTarget.role);
    navigate(mainPageTarget.path);
  }

  return (
    <div className="min-h-screen bg-cloud text-ink">
      <header className="border-b border-slate-200 bg-white px-4 py-4 md:px-9">
        {mainPageTarget && (
          <button
            type="button"
            onClick={goToMainPage}
            data-testid="parent-main-page-btn"
            className="mb-3 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 transition hover:border-teal hover:text-teal"
          >
            <ArrowLeft className="h-4 w-4" />
            Main page
          </button>
        )}

        <div>
          <div className="text-sm font-black text-teal">Parent dashboard</div>
          <h1 className="text-xl font-black">{session?.user?.name}</h1>
        </div>

        <nav className="mt-4 flex gap-2 overflow-x-auto">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx(
                  "flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-black",
                  isActive ? "bg-teal text-white" : "bg-slate-100 text-slate-600"
                )
              }
            >
              <item.icon className="h-4 w-4" /> {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="px-4 py-6 md:px-9 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}
