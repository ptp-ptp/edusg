import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Bell,
  BookOpenText,
  CalendarDays,
  FlaskConical,
  Gift,
  Languages,
  LayoutDashboard,
  LogIn,
  Menu,
  Settings,
  Sigma,
  Star,
  Trophy,
  X,
  Zap
} from "lucide-react";
import { cx } from "../lib/api";
import { prefetchPracticeQuestions } from "../lib/questionStore";
import { useSession } from "../context/SessionContext";
import NotificationsDrawer from "./NotificationsDrawer";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/learn/math", label: "Math", icon: Sigma },
  { to: "/learn/chinese", label: "Chinese", icon: Languages },
  { to: "/learn/english", label: "English", icon: BookOpenText },
  { to: "/learn/science", label: "Science", icon: FlaskConical },
  { to: "/achievements", label: "Achievements", icon: Trophy },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/rewards", label: "Rewards", icon: Gift },
  { to: "/settings", label: "Settings", icon: Settings }
];

function Brand() {
  return (
    <div className="flex items-center gap-2 px-2">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-teal font-black text-white">SG</div>
      <div className="font-black text-lg">EduSG</div>
    </div>
  );
}

export default function StudentLayout() {
  const { session } = useSession();
  const student = session?.student;
  const isGuest = !session;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    prefetchPracticeQuestions();
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-cloud text-ink">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-slate-200 bg-white/90 px-3 py-7 backdrop-blur lg:block">
        <Brand />
        <nav className="mt-8 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition",
                  isActive ? "bg-teal text-white shadow-lg shadow-teal/20" : "text-slate-600 hover:bg-slate-100"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-7 left-4 right-4 rounded-lg border border-slate-200 bg-white p-3">
          {isGuest ? (
            <>
              <div className="font-black">Guest explorer</div>
              <div className="text-xs text-slate-500">Sign in to save progress</div>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-teal px-3 py-2 text-sm font-black text-white"
              >
                <LogIn className="h-4 w-4" />
                Login
              </button>
            </>
          ) : (
            <>
              <div className="font-black">{student?.name}</div>
              <div className="text-xs text-slate-500">{student?.grade}</div>
            </>
          )}
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Close" onClick={() => setMobileOpen(false)} />
          <aside className="relative h-full w-[min(18rem,88vw)] bg-white px-3 py-6 shadow-2xl safe-top">
            <div className="flex justify-between"><Brand /><button onClick={() => setMobileOpen(false)}><X /></button></div>
            <nav className="mt-6 space-y-1">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMobileOpen(false)} className="flex gap-3 rounded-lg px-4 py-3 font-semibold hover:bg-slate-100">
                  <item.icon className="h-5 w-5" />{item.label}
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      )}

      <main className="lg:pl-64">
        <header className="safe-top sticky top-0 z-10 border-b border-slate-200/80 bg-cloud/95 px-4 py-3 backdrop-blur md:px-9 md:py-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <button type="button" onClick={() => setMobileOpen(true)} className="touch-target rounded-md border bg-white p-2 lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </button>
              <h1 className="truncate text-lg font-black md:text-2xl">
                {isGuest ? "EduSG learning hub" : `${student?.name?.split(" ")[0]}'s learning hub`}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {isGuest ? (
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="flex items-center gap-1.5 rounded-full border border-teal bg-teal px-3 py-1.5 text-xs font-black text-white"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Login
                </button>
              ) : (
                <>
                  <span className="flex items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-xs font-black text-coral">
                    <Zap className="h-3.5 w-3.5" /> {student?.streak || 0}
                  </span>
                  <span className="hidden items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-xs font-black text-sun sm:flex">
                    <Star className="h-3.5 w-3.5" /> {student?.stars || 0}
                  </span>
                  <button type="button" onClick={() => setNotifOpen(true)} className="touch-target relative rounded-full border bg-white p-2.5" aria-label="Notifications">
                    <Bell className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </header>
        <div className="px-4 py-6 md:px-9 md:py-8">
          <Outlet />
        </div>
      </main>
      <NotificationsDrawer open={!isGuest && notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  );
}
