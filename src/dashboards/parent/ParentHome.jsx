import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, ChevronRight, MessageCircle } from "lucide-react";
import { fetchJson } from "../../lib/api";
import { ChildSwitcher, LoadingSkeleton, ScoreRing, StatCard } from "../../components/shared/DashboardWidgets";

export default function ParentHome() {
  const [data, setData] = useState(null);
  const [activeChildId, setActiveChildId] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchJson("/dashboard/parent")
      .then((res) => {
        setData(res);
        setActiveChildId(res.children[0]?.id || null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (!data?.children?.length) {
    return <p className="text-slate-500">No linked children. Contact admin to link accounts.</p>;
  }

  const activeChild = data.children.find((c) => c.id === activeChildId) || data.children[0];

  return (
    <div className="space-y-6" data-testid="parent-dashboard-home">
      <div>
        <h1 className="text-2xl font-black">Family dashboard</h1>
        <p className="mt-1 text-slate-500">Welcome, {data.parent.name}</p>
      </div>

      <ChildSwitcher children={data.children} activeId={activeChild.id} onChange={setActiveChildId} />

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm font-black text-teal">{activeChild.grade}</div>
            <h2 className="text-xl font-black">{activeChild.name}</h2>
            <p className="mt-1 text-sm text-slate-500">{activeChild.smartLabel} · {activeChild.commitmentLabel}</p>
          </div>
          <div className="flex gap-4">
            <ScoreRing score={activeChild.smartScore} label="Smart" />
            <ScoreRing score={activeChild.commitmentScore} label="Commitment" />
          </div>
        </div>

        {activeChild.alerts?.length > 0 && (
          <div className="mt-4 space-y-2">
            {activeChild.alerts.map((alert) => (
              <div key={alert} className="flex items-center gap-2 rounded-md bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700">
                <AlertTriangle className="h-4 w-4 shrink-0" /> {alert}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="Streak" value={activeChild.streak} />
          <StatCard label="Smart score" value={activeChild.smartScore} tone="teal" />
          <StatCard label="Commitment" value={activeChild.commitmentScore} tone="leaf" />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate(`/parent/child/${activeChild.id}`)}
            className="flex items-center gap-1 rounded-md bg-teal px-4 py-2 text-sm font-black text-white"
          >
            Full report <ChevronRight className="h-4 w-4" />
          </button>
          <Link to="/parent/messages" className="flex items-center gap-1 rounded-md border border-slate-200 px-4 py-2 text-sm font-black">
            <MessageCircle className="h-4 w-4" /> Messages
          </Link>
          <Link to="/parent/goals" className="rounded-md border border-slate-200 px-4 py-2 text-sm font-black">
            Set goals
          </Link>
        </div>
      </section>
    </div>
  );
}
