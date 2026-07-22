import React, { useEffect, useState } from "react";
import { cx } from "../../lib/api";

export function StatCard({ label, value, sub, tone = "teal", icon: Icon }) {
  const toneClass = tone === "coral" ? "text-coral" : tone === "leaf" ? "text-leaf" : tone === "sun" ? "text-sun" : "text-teal";
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-black uppercase text-slate-400">{label}</div>
          <div className={cx("mt-1 text-2xl font-black", toneClass)}>{value}</div>
          {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
        </div>
        {Icon && (
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-cloud text-teal">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}

export function ScoreRing({ score, label, size = 88 }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const offset = mounted ? circumference - (score / 100) * circumference : circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          className="ring-animate"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#11a6a6"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="-mt-14 text-center">
        <div className="text-xl font-black">{score}</div>
        <div className="text-[10px] font-bold text-slate-500">{label}</div>
      </div>
    </div>
  );
}

export function TrendSparkline({ data = [], label }) {
  const max = Math.max(...data.map((d) => d.questions || d.value || 0), 1);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-black uppercase text-slate-400">{label}</div>
      <div className="mt-3 flex h-16 items-end gap-1">
        {data.map((point, index) => {
          const value = point.questions ?? point.value ?? 0;
          const height = Math.max(8, (value / max) * 100);
          return (
            <div key={point.date || index} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-t bg-teal/80" style={{ height: `${height}%` }} title={`${value}`} />
              <span className="text-[9px] text-slate-400">{(point.date || "").slice(8)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SubjectProgressCard({ subject, level, mastery, answered, nextAction, onClick, color = "bg-teal" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-teal hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className={cx("rounded-md px-2 py-1 text-xs font-black text-white", color)}>{subject}</span>
        <span className="text-sm font-black text-teal">L{level}</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-100">
        <div className="progress-fill h-full rounded-full bg-teal" style={{ width: `${mastery}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-slate-500">
        <span>{mastery}% mastery</span>
        <span>{answered} done</span>
      </div>
      <div className="mt-2 text-xs font-bold text-slate-600">{nextAction}</div>
    </button>
  );
}

export function ChildSwitcher({ children, activeId, onChange }) {
  if (!children?.length) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {children.map((child) => (
        <button
          key={child.id}
          type="button"
          onClick={() => onChange(child.id)}
          className={cx(
            "shrink-0 rounded-lg border px-4 py-2 text-sm font-black transition",
            activeId === child.id ? "border-teal bg-teal text-white" : "border-slate-200 bg-white text-slate-600"
          )}
        >
          {child.name} · {child.grade}
        </button>
      ))}
    </div>
  );
}

export function GoalCard({ goal }) {
  const pct = goal.targetCount ? Math.min(100, Math.round((goal.progress / goal.targetCount) * 100)) : 0;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex justify-between gap-2">
        <div className="text-sm font-black">{goal.target}</div>
        <span className="text-xs font-bold text-slate-400">{goal.subject}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100">
        <div className="progress-fill h-full rounded-full bg-leaf" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 text-xs text-slate-500">{goal.progress}/{goal.targetCount} · by {new Date(goal.dueAt).toLocaleDateString()}</div>
    </div>
  );
}

export function AchievementBadge({ title, earnedAt, locked = false }) {
  return (
    <div className={cx("rounded-lg border p-3 text-center transition", locked ? "border-dashed border-slate-200 opacity-50" : "pop-in border-sun/40 bg-white shadow-sm hover:-translate-y-0.5 hover:shadow-md")}>
      <div className="text-2xl">{locked ? "🔒" : "🏅"}</div>
      <div className="mt-2 text-xs font-black leading-tight">{title}</div>
      {!locked && earnedAt && (
        <div className="mt-1 text-[10px] text-slate-400">{new Date(earnedAt).toLocaleDateString()}</div>
      )}
    </div>
  );
}

export function ActivityFeed({ items = [] }) {
  return (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No recent activity.</p>
      ) : (
        items.map((item, index) => (
          <div key={item.id || index} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm">
            <span className={cx("h-2 w-2 shrink-0 rounded-full", item.correct === false ? "bg-coral" : item.correct === true ? "bg-leaf" : "bg-teal")} />
            <div className="min-w-0 flex-1">
              <div className="font-bold">{item.subject || item.type} · {item.topic || item.senderName || ""}</div>
              <div className="text-xs text-slate-500">{item.at ? new Date(item.at).toLocaleString() : ""}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function EmptyState({ title, body, action }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center">
      <h3 className="font-black">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{body}</p>
      {action}
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-24 rounded-lg bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-32 rounded-lg bg-slate-200" />
        <div className="h-32 rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}
