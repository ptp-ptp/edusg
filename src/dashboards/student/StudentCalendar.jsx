import React, { useEffect, useState } from "react";
import { fetchJson } from "../../lib/api";
import { useSession } from "../../context/SessionContext";
import { GoalCard, LoadingSkeleton } from "../../components/shared/DashboardWidgets";

export default function StudentCalendar() {
  const { session } = useSession();
  const [data, setData] = useState({ sessions: [], goals: [] });
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    if (!session?.student?.id) return;
    fetchJson(`/calendar/${session.student.id}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [session?.student?.id]);

  if (loading) return <LoadingSkeleton />;

  const daysInMonth = 30;
  const today = new Date().getDate();
  const sessionDays = new Set(data.sessions.map((s) => new Date(s.startedAt).getDate()));

  return (
    <div className="space-y-6" data-testid="student-calendar">
      <div>
        <h1 className="text-2xl font-black">Study calendar</h1>
        <p className="mt-1 text-slate-500">Track sessions and upcoming goals</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400">
          {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={`aspect-square rounded-md text-sm font-bold ${
                day === today ? "bg-teal text-white" : sessionDays.has(day) ? "bg-teal/20 text-teal" : "hover:bg-slate-50"
              } ${selectedDay === day ? "ring-2 ring-teal" : ""}`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {selectedDay && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="font-black">Day {selectedDay}</div>
          <div className="mt-2 space-y-2 text-sm">
            {data.sessions
              .filter((s) => new Date(s.startedAt).getDate() === selectedDay)
              .map((s) => (
                <div key={s.id}>{s.subject} · {s.minutes}m · {s.questionsAnswered} questions</div>
              ))}
            {!data.sessions.some((s) => new Date(s.startedAt).getDate() === selectedDay) && (
              <p className="text-slate-500">No sessions recorded.</p>
            )}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-black">Upcoming goals</h2>
        <div className="mt-3 space-y-2">
          {data.goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      </div>
    </div>
  );
}
