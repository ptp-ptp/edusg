import React, { useEffect, useState } from "react";
import { Check, Gift, Star } from "lucide-react";
import { fetchJson, cx } from "../../lib/api";
import { useSession } from "../../context/SessionContext";
import { useCelebration } from "./Celebration";

export default function DailyQuestCard() {
  const { session, setSession } = useSession();
  const { confettiCelebration, celebrateCorrect, pushToast } = useCelebration();
  const [quest, setQuest] = useState(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!session?.student?.id) return;
    fetchJson("/daily-quest").then(setQuest).catch(() => {});
  }, [session?.student?.id]);

  if (!quest) return null;

  async function claim(event) {
    if (claiming) return;
    setClaiming(true);
    try {
      const result = await fetchJson("/daily-quest/claim", { method: "POST" });
      setQuest(result.quest);
      confettiCelebration();
      celebrateCorrect({
        stars: result.reward,
        origin: event ? { x: event.clientX, y: event.clientY } : undefined
      });
      pushToast({ kind: "achievement", title: `Daily chest opened! +${result.reward} stars` });
      setSession((current) => ({
        ...current,
        student: current.student ? { ...current.student, stars: result.stars } : current.student,
        user: { ...current.user, stars: result.stars }
      }));
    } catch {
      // quest state may be stale; refresh it
      fetchJson("/daily-quest").then(setQuest).catch(() => {});
    } finally {
      setClaiming(false);
    }
  }

  return (
    <section className="rounded-lg border border-sun/40 bg-gradient-to-r from-sun/10 to-coral/5 p-4" data-testid="daily-quest">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase text-orange-600">Daily quest</div>
          <div className="mt-0.5 text-sm font-bold text-slate-600">
            {quest.claimed
              ? "Chest opened — see you tomorrow!"
              : quest.complete
                ? "All done! Open your chest!"
                : "Finish all 3 to open the chest"}
          </div>
        </div>
        {quest.claimed ? (
          <span className="text-3xl" aria-label="Chest opened">🎁</span>
        ) : quest.complete ? (
          <button
            type="button"
            onClick={claim}
            disabled={claiming}
            className="chest-ready rounded-xl bg-gradient-to-b from-sun to-orange-400 px-4 py-2.5 text-2xl shadow-lg shadow-sun/40 transition active:scale-95"
            aria-label={`Open chest for ${quest.reward} stars`}
          >
            🎁
          </button>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-black text-orange-600 shadow-sm">
            <Gift className="h-3.5 w-3.5" /> +{quest.reward} <Star className="h-3 w-3 fill-current text-sun" />
          </span>
        )}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {quest.tasks.map((task) => (
          <div
            key={task.id}
            className={cx(
              "rounded-lg border bg-white/80 p-2.5",
              task.done ? "border-leaf/50" : "border-slate-200"
            )}
          >
            <div className="flex items-center gap-1.5 text-xs font-black">
              <span
                className={cx(
                  "grid h-4 w-4 place-items-center rounded-full",
                  task.done ? "bg-leaf text-white" : "bg-slate-200 text-slate-400"
                )}
              >
                {task.done && <Check className="h-3 w-3" />}
              </span>
              <span className={task.done ? "text-slate-700" : "text-slate-500"}>{task.title}</span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-slate-100">
              <div
                className="progress-fill h-full rounded-full bg-leaf"
                style={{ width: `${Math.round((task.progress / task.target) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
