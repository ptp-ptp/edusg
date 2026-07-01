import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchJson } from "../../lib/api";
import {
  ActivityFeed,
  GoalCard,
  LoadingSkeleton,
  ScoreRing,
  SubjectProgressCard,
  TrendSparkline
} from "../../components/shared/DashboardWidgets";

const subjectColors = { Math: "bg-teal", English: "bg-blue-500", Science: "bg-leaf", Chinese: "bg-coral" };

export default function ParentChildDetail() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson(`/dashboard/parent/${id}`)
      .then(setReport)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSkeleton />;
  if (!report) return <p>Child not found.</p>;

  const { student, insight, subjects, goals, activity } = report;

  return (
    <div className="space-y-6" data-testid="parent-child-detail">
      <div>
        <div className="text-sm font-black text-teal">{student.grade}</div>
        <h1 className="text-2xl font-black">{student.name}&apos;s report</h1>
        <p className="mt-1 text-slate-500">Read-only progress overview</p>
      </div>

      <div className="flex flex-wrap gap-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <ScoreRing score={insight.smartness.score} label="Smart score" />
        <ScoreRing score={insight.commitment.score} label="Commitment" />
        <div className="min-w-[200px] flex-1 space-y-2 text-sm">
          <div><span className="font-bold">Accuracy:</span> {insight.smartness.overallAccuracy}%</div>
          <div><span className="font-bold">Active days (7d):</span> {insight.commitment.activeDays7}</div>
          <div><span className="font-bold">Study minutes:</span> {insight.commitment.studyMinutes}</div>
          <div><span className="font-bold">Last active:</span> {insight.commitment.lastActiveAt ? new Date(insight.commitment.lastActiveAt).toLocaleString() : "—"}</div>
        </div>
      </div>

      <TrendSparkline data={insight.commitment.weeklyTrend || []} label="7-day activity" />

      <section>
        <h2 className="font-black">Subjects</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {subjects.map((item) => (
            <SubjectProgressCard key={item.subject} {...item} color={subjectColors[item.subject]} />
          ))}
        </div>
      </section>

      {insight.smartness.weakTopics?.length > 0 && (
        <section className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <div className="font-black text-orange-700">Focus areas</div>
          <ul className="mt-2 list-inside list-disc text-sm text-slate-700">
            {insight.smartness.weakTopics.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-black">Goals</h2>
        <div className="mt-3 space-y-2">
          {goals.length ? goals.map((g) => <GoalCard key={g.id} goal={g} />) : <p className="text-sm text-slate-500">No goals set yet.</p>}
        </div>
      </section>

      <section>
        <h2 className="font-black">Recent activity</h2>
        <div className="mt-3">
          <ActivityFeed items={activity} />
        </div>
      </section>
    </div>
  );
}
