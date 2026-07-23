import React, { useEffect, useState } from "react";
import { BookOpenText, Brain, FlaskConical, Languages, Sigma } from "lucide-react";
import { cx } from "../../lib/api";
import { fetchStudentInsights } from "../../lib/activityApi";
import SubjectInsightPanel, { InsightOverviewCards } from "./SubjectInsightPanel";

const TABS = [
  { id: "overview", label: "Overview", icon: Brain },
  { id: "Math", label: "Math", icon: Sigma },
  { id: "English", label: "English", icon: BookOpenText },
  { id: "Chinese", label: "Chinese", icon: Languages },
  { id: "Science", label: "Science", icon: FlaskConical }
];

export default function StudentInsightTabs({
  studentId,
  audience = "admin",
  initialTab = "overview",
  className = ""
}) {
  const [tab, setTab] = useState(initialTab);
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!studentId) {
      setPayload(null);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setError("");
    fetchStudentInsights(studentId)
      .then((data) => {
        if (active) setPayload(data);
      })
      .catch((err) => {
        if (active) setError(err.message || "Could not load insights");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [studentId]);

  if (!studentId) {
    return <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">Choose a student to inspect.</div>;
  }

  return (
    <div className={cx("space-y-4", className)} data-testid="student-insight-tabs">
      <div className="flex items-end gap-1 overflow-x-auto border-b border-slate-300" role="tablist" aria-label="Subject insights">
        {TABS.map((item) => {
          const activeTab = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={activeTab}
              onClick={() => setTab(item.id)}
              className={cx(
                "-mb-px flex shrink-0 items-center gap-2 rounded-t-lg border px-4 py-2.5 text-sm font-black transition",
                activeTab
                  ? "border-slate-300 border-b-white bg-white text-ink shadow-sm"
                  : "border-transparent text-slate-500 hover:bg-white/70 hover:text-ink"
              )}
            >
              <item.icon className={cx("h-4 w-4", activeTab ? "text-teal" : "text-slate-400")} />
              {item.label}
            </button>
          );
        })}
      </div>

      {loading && <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading insights…</div>}
      {error && <div className="rounded-lg border border-coral/30 bg-coral/5 p-4 text-sm font-semibold text-coral">{error}</div>}

      {!loading && !error && payload && tab === "overview" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-bold text-teal">{payload.student.grade}</div>
            <h3 className="text-xl font-black">{payload.student.name}</h3>
            <p className="text-sm text-slate-500">{payload.student.email}</p>
          </div>
          <InsightOverviewCards overview={payload.overview} student={payload.student} />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {["Math", "English", "Chinese", "Science"].map((subject) => {
              const item = payload.subjects[subject];
              return (
                <button
                  key={subject}
                  type="button"
                  onClick={() => setTab(subject)}
                  className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-teal"
                >
                  <div className="font-black">{subject}</div>
                  <div className="mt-2 text-sm text-slate-600">
                    Level {item?.mastery?.level || 1} · {item?.engagement?.minutes7d || 0}m this week
                  </div>
                  <div className="mt-1 text-xs font-bold text-teal">Open {subject} tab →</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!loading && !error && payload && tab !== "overview" && (
        <SubjectInsightPanel data={payload.subjects[tab]} audience={audience} />
      )}
    </div>
  );
}
