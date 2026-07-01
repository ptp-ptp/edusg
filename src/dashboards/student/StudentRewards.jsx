import React, { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { fetchJson } from "../../lib/api";
import { useSession } from "../../context/SessionContext";
import { LoadingSkeleton } from "../../components/shared/DashboardWidgets";

export default function StudentRewards() {
  const { session, setSession } = useSession();
  const [catalog, setCatalog] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchJson("/rewards/catalog")
      .then((res) => {
        setCatalog(res.catalog || []);
        setBalance(res.balance || 0);
      })
      .finally(() => setLoading(false));
  }, []);

  async function redeem(rewardId) {
    try {
      const result = await fetchJson("/rewards/redeem", {
        method: "POST",
        body: JSON.stringify({ rewardId })
      });
      setBalance(result.stars);
      setMessage(`Redeemed ${result.reward.name}!`);
      if (session?.student) {
        setSession((current) => ({
          ...current,
          student: { ...current.student, stars: result.stars },
          user: { ...current.user, stars: result.stars }
        }));
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6" data-testid="student-rewards">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Rewards shop</h1>
          <p className="mt-1 text-slate-500">Spend stars on fun unlocks</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-sun/20 px-4 py-2 font-black text-orange-700">
          <Star className="h-5 w-5 fill-current" /> {balance}
        </div>
      </div>
      {message && <p className="rounded-md bg-teal/10 px-3 py-2 text-sm font-semibold text-teal">{message}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {catalog.map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-3xl">{item.emoji}</div>
            <div className="mt-2 font-black">{item.name}</div>
            <div className="text-xs text-slate-500 capitalize">{item.category}</div>
            <button
              type="button"
              disabled={balance < item.cost}
              onClick={() => redeem(item.id)}
              className="mt-3 w-full rounded-md bg-teal px-3 py-2 text-sm font-black text-white disabled:opacity-40"
            >
              Redeem {item.cost} stars
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
