import React, { useEffect, useState } from "react";
import { Check, Snowflake, Star } from "lucide-react";
import { fetchJson } from "../../lib/api";
import { useSession } from "../../context/SessionContext";
import { useCelebration } from "../../components/shared/Celebration";
import { LoadingSkeleton } from "../../components/shared/DashboardWidgets";
import { hasUnlock, THEME_BY_REWARD, getActiveTheme } from "../../lib/unlocks";
import { cx } from "../../lib/api";

export default function StudentRewards() {
  const { session, setSession } = useSession();
  const { celebrateCorrect, pushToast } = useCelebration();
  const [catalog, setCatalog] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const user = session?.user;
  const activeTheme = getActiveTheme(user);

  useEffect(() => {
    fetchJson("/rewards/catalog")
      .then((res) => {
        setCatalog(res.catalog || []);
        setBalance(res.balance || 0);
      })
      .finally(() => setLoading(false));
  }, []);

  async function redeem(item, event) {
    try {
      const result = await fetchJson("/rewards/redeem", {
        method: "POST",
        body: JSON.stringify({ rewardId: item.id })
      });
      setBalance(result.stars);
      setMessage("");
      celebrateCorrect({
        origin: event ? { x: event.clientX, y: event.clientY } : undefined
      });
      pushToast({ kind: "achievement", title: `${item.emoji} ${item.name} is yours!` });
      setSession((current) => ({
        ...current,
        student: current.student ? { ...current.student, stars: result.stars } : current.student,
        user: {
          ...current.user,
          stars: result.stars,
          unlocks: result.unlocks || current.user.unlocks,
          streakFreezes: result.streakFreezes ?? current.user.streakFreezes
        }
      }));
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function applyTheme(themeName) {
    const nextTheme = activeTheme === themeName ? "" : themeName;
    const result = await fetchJson("/users/me", {
      method: "PATCH",
      body: JSON.stringify({ activeTheme: nextTheme })
    });
    setSession((current) => ({ ...current, user: { ...current.user, activeTheme: result.user.activeTheme } }));
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6" data-testid="student-rewards">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Rewards shop</h1>
          <p className="mt-1 text-slate-500">Spend stars on fun unlocks that really work</p>
        </div>
        <div className="flex items-center gap-3">
          {(user?.streakFreezes || 0) > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-sky-100 px-3 py-2 text-sm font-black text-sky-700" title="Streak freezes protect your streak if you miss a day">
              <Snowflake className="h-4 w-4" /> {user.streakFreezes}
            </div>
          )}
          <div className="flex items-center gap-2 rounded-lg bg-sun/20 px-4 py-2 font-black text-orange-700">
            <Star className="h-5 w-5 fill-current" /> {balance}
          </div>
        </div>
      </div>
      {message && <p className="rounded-md bg-coral/10 px-3 py-2 text-sm font-semibold text-coral">{message}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {catalog.map((item) => {
          const owned = hasUnlock(user, item.id);
          const themeName = THEME_BY_REWARD[item.id];
          const themeActive = themeName && activeTheme === themeName;
          return (
            <div key={item.id} className={cx("pop-in rounded-lg border bg-white p-4 shadow-sm transition", owned ? "border-leaf/50" : "border-slate-200")}>
              <div className="flex items-start justify-between">
                <div className="text-3xl">{item.emoji}</div>
                {owned && (
                  <span className="flex items-center gap-1 rounded-full bg-leaf/15 px-2 py-1 text-[11px] font-black text-leaf">
                    <Check className="h-3 w-3" /> Owned
                  </span>
                )}
              </div>
              <div className="mt-2 font-black">{item.name}</div>
              <div className="text-xs text-slate-500">{item.description || item.category}</div>
              {owned && themeName ? (
                <button
                  type="button"
                  onClick={() => applyTheme(themeName)}
                  className={cx(
                    "mt-3 w-full rounded-md px-3 py-2 text-sm font-black transition active:scale-95",
                    themeActive ? "bg-leaf text-white" : "border border-teal text-teal hover:bg-teal/5"
                  )}
                >
                  {themeActive ? "Theme on — tap to remove" : "Use this theme"}
                </button>
              ) : owned && item.category !== "powerup" && item.category !== "treat" ? (
                <div className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-center text-sm font-bold text-slate-400">Unlocked</div>
              ) : (
                <button
                  type="button"
                  disabled={balance < item.cost}
                  onClick={(event) => redeem(item, event)}
                  className="mt-3 w-full rounded-md bg-teal px-3 py-2 text-sm font-black text-white transition hover:bg-sea active:scale-95 disabled:opacity-40"
                >
                  Redeem {item.cost} stars
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
