import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, MessageCircle, Send, Star, TrendingDown, TrendingUp, X, Zap } from "lucide-react";
import { fetchJson, cx } from "../../lib/api";
import { useSession } from "../../context/SessionContext";
import { hasGoldFrame } from "../../lib/unlocks";
import { ScoreRing } from "./DashboardWidgets";

const subjectColors = {
  Math: "bg-teal",
  English: "bg-blue-500",
  Science: "bg-leaf",
  Chinese: "bg-coral"
};

export default function StudentProfileModal({ open, onClose }) {
  const { session, setSession, logout } = useSession();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  const student = session?.student;
  const user = session?.user;
  const messages = session?.messages || [];
  const goldFrame = hasGoldFrame(user);

  useEffect(() => {
    if (!open || !student?.id) return;
    fetchJson("/dashboard/student").then(setData).catch(() => {});
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, student?.id]);

  if (!open || !session) return null;

  async function sendMessage() {
    const text = messageText.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const result = await fetchJson("/messages", {
        method: "POST",
        body: JSON.stringify({ studentId: student.id, senderId: user.id, text })
      });
      setSession((current) => ({ ...current, messages: result.messages }));
      setMessageText("");
    } finally {
      setSending(false);
    }
  }

  function handleLogout() {
    onClose();
    logout();
    navigate("/", { replace: true });
  }

  const weekly = data?.weekly;
  const insight = data?.insight;
  const trendUp = (weekly?.trend || 0) >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="My profile">
      <button type="button" className="absolute inset-0 bg-ink/50 backdrop-blur-sm" aria-label="Close profile" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-cloud shadow-2xl">
        <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-ink via-teal to-leaf px-5 py-4 text-white">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={cx(
                "grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sun to-coral text-lg font-black",
                goldFrame && "ring-[3px] ring-sun shadow-lg shadow-sun/40"
              )}
            >
              {student.avatar || student.name?.[0]}
            </div>
            <div className="min-w-0">
              <div className="truncate text-lg font-black">{student.name}</div>
              <div className="text-sm font-semibold text-white/80">
                Primary {student.grade?.slice(1)} {user?.email ? `· ${user.email}` : ""}
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 transition hover:bg-white/25" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-sm">
              <div className={cx("flex items-center justify-center gap-1 text-xl font-black text-coral", (student.streak || 0) >= 3 && "flame-hot")}>
                <Zap className="h-5 w-5 fill-current" /> {student.streak || 0}
              </div>
              <div className="text-xs font-bold text-slate-500">Day streak</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-sm">
              <div className="flex items-center justify-center gap-1 text-xl font-black text-orange-600">
                <Star className="h-5 w-5 fill-current" /> {student.stars || 0}
              </div>
              <div className="text-xs font-bold text-slate-500">Stars</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-2 text-center shadow-sm">
              <ScoreRing score={insight?.smartScore ?? 0} label="Smart score" size={72} />
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-2 text-center shadow-sm">
              <ScoreRing score={insight?.commitmentScore ?? 0} label="Commitment" size={72} />
            </div>
          </div>

          {weekly && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="font-black">This week</div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-lg font-black">{Math.floor(weekly.studyMinutes / 60)}h {weekly.studyMinutes % 60}m</div>
                  <div className="text-xs text-slate-500">Study time</div>
                </div>
                <div>
                  <div className="text-lg font-black">{weekly.accuracy}%</div>
                  <div className="text-xs text-slate-500">Accuracy</div>
                </div>
                <div>
                  <div className={cx("flex items-center justify-center gap-1 text-lg font-black", trendUp ? "text-leaf" : "text-coral")}>
                    {trendUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {Math.abs(weekly.trend || 0)}%
                  </div>
                  <div className="text-xs text-slate-500">Trend</div>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-100">
                <div
                  className="progress-fill h-full rounded-full bg-teal"
                  style={{ width: `${Math.min(100, Math.round((weekly.studyMinutes / (weekly.targetMinutes || 120)) * 100))}%` }}
                />
              </div>
              <div className="mt-1 text-right text-xs font-semibold text-slate-400">
                Goal: {weekly.targetMinutes} minutes
              </div>
            </div>
          )}

          {data?.subjects?.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="font-black">My subjects</div>
              <div className="mt-3 space-y-3">
                {data.subjects.map((item) => (
                  <div key={item.subject}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold">{item.subject}</span>
                      <span className="text-xs font-black text-slate-500">Level {item.level} · {item.mastery}%</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100">
                      <div
                        className={cx("progress-fill h-full rounded-full", subjectColors[item.subject] || "bg-teal")}
                        style={{ width: `${item.mastery}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data?.achievements?.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="font-black">Recent badges</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.achievements.slice(0, 6).map((achievement) => (
                  <span key={achievement.id} className="rounded-full bg-sun/15 px-3 py-1.5 text-xs font-black text-orange-700">
                    🏅 {achievement.title}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 font-black">
              <MessageCircle className="h-4 w-4 text-leaf" /> Family messages
            </div>
            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
              {messages.length === 0 && (
                <p className="text-sm text-slate-500">No messages yet. Say hi to your parents!</p>
              )}
              {messages.slice(0, 10).map((message) => {
                const mine = message.senderId === student.id;
                return (
                  <div key={message.id} className={cx("flex", mine ? "justify-end" : "justify-start")}>
                    <div className={cx("max-w-[80%] rounded-2xl px-3 py-2 text-sm", mine ? "rounded-br-md bg-teal text-white" : "rounded-bl-md bg-slate-100 text-slate-700")}>
                      {!mine && <div className="text-xs font-black text-slate-500">{message.senderName}</div>}
                      <p>{message.text}</p>
                      <div className={cx("mt-0.5 text-right text-[10px]", mine ? "text-white/70" : "text-slate-400")}>
                        {new Date(message.createdAt).toLocaleDateString("en-SG", { month: "short", day: "numeric" })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && sendMessage()}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal"
                placeholder="Send a message to your parents"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={sending || !messageText.trim()}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal text-white transition active:scale-95 disabled:opacity-40"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-coral/40 bg-white px-4 py-3 font-black text-coral transition hover:bg-coral/5"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
