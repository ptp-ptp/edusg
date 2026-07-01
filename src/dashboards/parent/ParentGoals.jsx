import React, { useEffect, useState } from "react";
import { fetchJson } from "../../lib/api";
import { ChildSwitcher, GoalCard, LoadingSkeleton } from "../../components/shared/DashboardWidgets";

export default function ParentGoals() {
  const [children, setChildren] = useState([]);
  const [activeChildId, setActiveChildId] = useState(null);
  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState({ subject: "Math", target: "Practice 15 minutes daily", targetCount: 15 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson("/dashboard/parent")
      .then((res) => {
        setChildren(res.children);
        setActiveChildId(res.children[0]?.id);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeChildId) return;
    fetchJson(`/dashboard/parent/${activeChildId}`).then((res) => setGoals(res.goals || []));
  }, [activeChildId]);

  async function createGoal(event) {
    event.preventDefault();
    const result = await fetchJson(`/dashboard/parent/${activeChildId}/goals`, {
      method: "PATCH",
      body: JSON.stringify(form)
    });
    setGoals((current) => [...current, result.goal]);
    setForm({ subject: "Math", target: "Practice 15 minutes daily", targetCount: 15 });
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6" data-testid="parent-goals">
      <div>
        <h1 className="text-2xl font-black">Goals</h1>
        <p className="mt-1 text-slate-500">Set weekly targets for your children</p>
      </div>
      <ChildSwitcher children={children} activeId={activeChildId} onChange={setActiveChildId} />
      <form onSubmit={createGoal} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="font-black">New goal</div>
        <select value={form.subject} onChange={(e) => setForm((c) => ({ ...c, subject: e.target.value }))} className="w-full rounded-md border px-3 py-2">
          {["Math", "English", "Science", "Chinese", "All"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <input
          value={form.target}
          onChange={(e) => setForm((c) => ({ ...c, target: e.target.value }))}
          className="w-full rounded-md border px-3 py-2"
          placeholder="Goal description"
        />
        <input
          type="number"
          value={form.targetCount}
          onChange={(e) => setForm((c) => ({ ...c, targetCount: Number(e.target.value) }))}
          className="w-full rounded-md border px-3 py-2"
          placeholder="Target count"
        />
        <button type="submit" className="rounded-md bg-teal px-4 py-2 font-black text-white">Add goal</button>
      </form>
      <div className="space-y-2">
        {goals.map((g) => (
          <GoalCard key={g.id} goal={g} />
        ))}
      </div>
    </div>
  );
}
