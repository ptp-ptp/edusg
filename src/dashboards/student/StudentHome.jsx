import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpenText, ChevronRight, FlaskConical, Languages, LogIn, Sigma, Star, Zap } from "lucide-react";
import { fetchJson, cx } from "../../lib/api";
import { useSession } from "../../context/SessionContext";
import {
  ActivityFeed,
  GoalCard,
  LoadingSkeleton,
  ScoreRing,
  StatCard,
  SubjectProgressCard,
  TrendSparkline
} from "../../components/shared/DashboardWidgets";
import DailyQuestCard from "../../components/shared/DailyQuestCard";
import Ollie from "../../components/shared/Ollie";
import StudentInsightTabs from "../../components/insights/StudentInsightTabs";

const subjectColors = {
  Math: "bg-teal",
  English: "bg-blue-500",
  Science: "bg-leaf",
  Chinese: "bg-coral"
};

const guestSubjects = [
  { subject: "Math", icon: Sigma, color: "bg-teal", path: "/learn/math" },
  { subject: "Science", icon: FlaskConical, color: "bg-leaf", path: "/learn/science" },
  { subject: "English", icon: BookOpenText, color: "bg-blue-500", path: "/learn/english" },
  { subject: "Chinese", icon: Languages, color: "bg-coral", path: "/learn/chinese" }
];

export default function StudentHome() {
  const { session, role, openLogin } = useSession();
  const navigate = useNavigate();
  const isStudentView = Boolean(session) && role === "student";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(isStudentView);

  useEffect(() => {
    if (!isStudentView) {
      setLoading(false);
      return;
    }
    fetchJson("/dashboard/student")
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isStudentView]);

  if (!isStudentView) {
    return (
      <div className="space-y-6" data-testid="student-guest-home">
        <section className="rounded-lg bg-gradient-to-r from-ink via-teal to-leaf p-5 text-white shadow-lg md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-white/80">MOE-aligned practice</div>
              <h1 className="mt-1 text-2xl font-black md:text-3xl">Welcome to EduSG</h1>
            </div>
            <Ollie mood="happy" size={64} className="shrink-0" />
          </div>
          <p className="mt-3 max-w-2xl text-sm font-semibold text-white/90">
            {session
              ? "You are browsing the learning hub. Head back to your dashboard to see your child's progress."
              : "Explore Math, Science, English and Chinese right away. Sign in when you want to save progress, stars and streaks."}
          </p>
          {session ? (
            <button
              type="button"
              onClick={() => navigate(role === "admin" ? "/admin" : "/parent")}
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-black text-teal"
            >
              Go to {role === "admin" ? "admin console" : "parent dashboard"}
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={openLogin}
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-black text-teal"
            >
              <LogIn className="h-4 w-4" />
              Login or register
            </button>
          )}
        </section>

        <section>
          <h2 className="font-black">Start learning</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {guestSubjects.map((item) => (
              <button
                key={item.subject}
                type="button"
                onClick={() => navigate(item.path)}
                className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-teal"
              >
                <div className={`grid h-10 w-10 place-items-center rounded-md ${item.color} text-white`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="mt-3 font-black">{item.subject}</div>
                <div className="mt-1 flex items-center gap-1 text-sm font-bold text-teal">
                  Open practice <ChevronRight className="h-4 w-4" />
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (loading) return <LoadingSkeleton />;
  if (!data) return null;

  const student = data.student;

  return (
    <div className="space-y-6" data-testid="student-dashboard-home">
      <section className="pop-in rounded-lg bg-gradient-to-r from-ink via-teal to-leaf p-5 text-white shadow-lg md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-white/80">{data.greeting}</div>
            <h1 className="mt-1 text-2xl font-black md:text-3xl">{student.name.split(" ")[0]}!</h1>
          </div>
          <Ollie mood="happy" size={64} className="shrink-0" />
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          <span className={cx("flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-sm font-black", (student.streak || 0) >= 3 && "flame-hot")}>
            <Zap className="h-4 w-4 fill-current" /> {student.streak} day streak
          </span>
          <span className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-sm font-black">
            <Star className="h-4 w-4 fill-current" /> {student.stars} stars
          </span>
        </div>
      </section>

      <DailyQuestCard />

      <section className="rounded-lg border border-teal/20 bg-teal/5 p-4">
        <div className="text-xs font-black uppercase text-teal">Continue learning</div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-black">{data.continueLearning.subject}</div>
            <div className="text-sm text-slate-600">{data.continueLearning.topic}</div>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/learn/${data.continueLearning.subject.toLowerCase()}`)}
            className="flex items-center gap-1 rounded-md bg-teal px-4 py-2 text-sm font-black text-white"
          >
            Continue <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section>
        <h2 className="font-black">Your subjects</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data.subjects.map((item) => (
            <SubjectProgressCard
              key={item.subject}
              {...item}
              color={subjectColors[item.subject]}
              onClick={() => navigate(`/learn/${item.subject.toLowerCase()}`)}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="font-black">Today&apos;s missions</h2>
          <div className="mt-3 space-y-2">
            {data.goals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <ScoreRing score={data.insight.smartScore} label="Smart score" />
          <ScoreRing score={data.insight.commitmentScore} label="Commitment" />
          <div className="text-center text-xs text-slate-500">
            {data.weekly.studyMinutes}m studied · {data.weekly.accuracy}% accuracy
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-black">My insights</h2>
        <p className="mt-1 text-sm text-slate-500">See how you are doing in each subject.</p>
        <div className="mt-3">
          <StudentInsightTabs studentId={student.id} audience="student" />
        </div>
      </section>

      {data.parentNote && (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-black uppercase text-slate-400">Note from parent</div>
          <p className="mt-2 text-sm text-slate-600">{data.parentNote.text}</p>
        </section>
      )}

      <section>
        <h2 className="font-black">Recent activity</h2>
        <div className="mt-3">
          <ActivityFeed items={data.recentActivity} />
        </div>
      </section>
    </div>
  );
}
