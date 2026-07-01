import React, { useEffect, useState } from "react";
import { fetchJson } from "../../lib/api";
import { useSession } from "../../context/SessionContext";
import { AchievementBadge, LoadingSkeleton } from "../../components/shared/DashboardWidgets";

const badgeCatalog = [
  { type: "questions-10", title: "10 Questions Answered" },
  { type: "questions-50", title: "50 Questions Champion" },
  { type: "level-5", title: "Level 5 Achiever" },
  { type: "level-8", title: "Level 8 Master" },
  { type: "streak-5", title: "5 Correct in a Row" },
  { type: "week-streak", title: "7-Day Streak" }
];

export default function StudentAchievements() {
  const { session } = useSession();
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.student?.id) return;
    fetchJson(`/achievements/${session.student.id}`)
      .then((res) => setAchievements(res.achievements || []))
      .finally(() => setLoading(false));
  }, [session?.student?.id]);

  if (loading) return <LoadingSkeleton />;

  const earnedTypes = new Set(achievements.map((a) => a.type));
  const earnedMap = Object.fromEntries(achievements.map((a) => [a.type, a]));

  return (
    <div className="space-y-6" data-testid="student-achievements">
      <div>
        <h1 className="text-2xl font-black">Achievements</h1>
        <p className="mt-1 text-slate-500">{achievements.length} badges earned</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {badgeCatalog.map((badge) => {
          const earned = earnedMap[badge.type];
          return (
            <AchievementBadge
              key={badge.type}
              title={earned?.title || badge.title}
              earnedAt={earned?.earnedAt}
              locked={!earnedTypes.has(badge.type)}
            />
          );
        })}
      </div>
    </div>
  );
}
