import React, { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
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
import { hasGoldFrame, getActiveTheme } from "../lib/unlocks";
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

const bottomNavItems = [
  { to: "/", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/learn/math", label: "Learn", icon: Sigma },
  { to: "/achievements", label: "Badges", icon: Trophy },
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

function ProfileAvatar({ student, goldFrame }) {
  return (
    <div
      className={cx(
        "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sea to-teal font-black text-white",
        goldFrame && "ring-[3px] ring-sun shadow-lg shadow-sun/30"
      )}
      title={goldFrame ? "Gold Star Frame equipped" : undefined}
    >
      {student?.avatar || student?.name?.[0] || "S"}
    </div>
  );
}

export default function StudentLayout() {
  const { session, role, openLogin } = useSession();
  const student = session?.student;
  const user = session?.user;
  const isGuest = !session;
  const isStudent = Boolean(session) && role === "student";
  const goldFrame = hasGoldFrame(user);
  const theme = getActiveTheme(user);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  useEffect(() => {
    prefetchPracticeQuestions();
  }, []);

  return (
    <div className={cx("min-h-screen overflow-x-hidden text-ink", theme === "ocean" ? "theme-ocean" : theme === "sunset" ? "theme-sunset" : "bg-cloud")}>
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
                onClick={openLogin}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-teal px-3 py-2 text-sm font-black text-white"
              >
                <LogIn className="h-4 w-4" />
                Login
              </button>
            </>
          ) : isStudent ? (
            <div className="flex items-center gap-3">
              <ProfileAvatar student={student} goldFrame={goldFrame} />
              <div className="min-w-0">
                <div className="truncate font-black">{student?.name}</div>
                <div className="text-xs text-slate-500">{student?.grade}</div>
              </div>
            </div>
          ) : (
            <>
              <div className="truncate font-black">{user?.name}</div>
              <div className="text-xs capitalize text-slate-500">{role}</div>
              <NavLink
                to={role === "admin" ? "/admin" : "/parent"}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-teal px-3 py-2 text-sm font-black text-white"
              >
                My dashboard
              </NavLink>
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

      <main className="mobile-main-pad lg:pl-64">
        <header className="safe-top sticky top-0 z-10 border-b border-slate-200/80 bg-cloud/95 px-4 py-3 backdrop-blur md:px-9 md:py-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <button type="button" onClick={() => setMobileOpen(true)} className="touch-target rounded-md border bg-white p-2 lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </button>
              <h1 className="truncate text-lg font-black md:text-2xl">
                {isStudent ? `${student?.name?.split(" ")[0]}'s learning hub` : "EduSG learning hub"}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {isGuest ? (
                <button
                  type="button"
                  onClick={openLogin}
                  className="flex items-center gap-1.5 rounded-full border border-teal bg-teal px-3 py-1.5 text-xs font-black text-white"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Login
                </button>
              ) : !isStudent ? (
                <NavLink
                  to={role === "admin" ? "/admin" : "/parent"}
                  className="flex items-center gap-1.5 rounded-full border border-teal bg-teal px-3 py-1.5 text-xs font-black text-white"
                >
                  My dashboard
                </NavLink>
              ) : (
                <>
                  <span className={cx("flex items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-xs font-black text-coral", (student?.streak || 0) >= 3 && "flame-hot")}>
                    <Zap className="h-3.5 w-3.5 fill-current" /> {student?.streak || 0}
                  </span>
                  <span className="flex items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-xs font-black text-sun">
                    <Star className="h-3.5 w-3.5 fill-current" /> {student?.stars || 0}
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

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur safe-bottom lg:hidden" aria-label="Main">
        <div className="grid grid-cols-5">
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx(
                  "flex flex-col items-center gap-0.5 py-2 text-[10px] font-black transition",
                  isActive ? "text-teal" : "text-slate-400"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <NotificationsDrawer open={!isGuest && notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  );
}
