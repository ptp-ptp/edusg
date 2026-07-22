import React, { useState } from "react";
import { fetchJson } from "../../lib/api";
import { useSession } from "../../context/SessionContext";
import { useCelebration } from "../../components/shared/Celebration";
import { formatPracticeMs } from "../../utils/formatTime";

export default function StudentSettings() {
  const { session, setSession, logout } = useSession();
  const { setSoundEnabled } = useCelebration();
  const [soundOn, setSoundOn] = useState(localStorage.getItem("edusg-sound") !== "off");
  const user = session?.user;
  const chinese = session?.chineseProgress;
  const timing = chinese?.timingSummary;
  const rememberedTotal = Object.values(chinese?.rememberedWords || {}).flat().length;
  const [prefs, setPrefs] = useState(user?.notificationPrefs || { achievements: true, parentMessages: true, reminders: true });
  const [dailyTarget, setDailyTarget] = useState(user?.dailyMinutesTarget || 120);
  const [saved, setSaved] = useState(false);

  async function save() {
    const result = await fetchJson("/users/me", {
      method: "PATCH",
      body: JSON.stringify({ notificationPrefs: prefs, dailyMinutesTarget: dailyTarget })
    });
    setSession((current) => ({ ...current, user: result.user }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6" data-testid="student-settings">
      <div>
        <h1 className="text-2xl font-black">Settings</h1>
        <p className="mt-1 text-slate-500">Profile and preferences</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="font-black">Profile</div>
        <div className="mt-3 space-y-2 text-sm">
          <div><span className="text-slate-500">Name:</span> {user?.name}</div>
          <div><span className="text-slate-500">Email:</span> {user?.email}</div>
          <div><span className="text-slate-500">Grade:</span> {session?.student?.grade}</div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="font-black">Chinese practice</div>
        <div className="mt-3 space-y-2 text-sm">
          {timing?.attemptCount > 0 ? (
            <>
              <div>
                <span className="text-slate-500">Average time per question:</span>{" "}
                {formatPracticeMs(timing.avgTimeMs)}
              </div>
              {chinese?.lastQuestionTimeMs != null && (
                <div>
                  <span className="text-slate-500">Last question:</span>{" "}
                  {formatPracticeMs(chinese.lastQuestionTimeMs)}
                </div>
              )}
              <div>
                <span className="text-slate-500">Words remembered:</span> {rememberedTotal}
              </div>
              {timing.slowThresholdMs && timing.attemptCount >= 5 && (
                <p className="text-xs leading-5 text-slate-500">
                  Correct answers slower than {formatPracticeMs(timing.slowThresholdMs)} are not saved as remembered.
                </p>
              )}
            </>
          ) : (
            <p className="text-slate-500">
              Complete a few Chinese practice questions to see your average time here.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="font-black">Daily study goal (minutes)</div>
        <input
          type="number"
          min={15}
          max={240}
          value={dailyTarget}
          onChange={(e) => setDailyTarget(Number(e.target.value))}
          className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2"
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label className="flex items-center justify-between">
          <div>
            <div className="font-black">Sound effects</div>
            <div className="text-xs text-slate-500">Chimes for correct answers and celebrations</div>
          </div>
          <input
            type="checkbox"
            checked={soundOn}
            onChange={(e) => {
              setSoundOn(e.target.checked);
              setSoundEnabled(e.target.checked);
            }}
          />
        </label>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="font-black">Notifications</div>
        {Object.entries(prefs).map(([key, value]) => (
          <label key={key} className="flex items-center justify-between text-sm">
            <span className="capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => setPrefs((current) => ({ ...current, [key]: e.target.checked }))}
            />
          </label>
        ))}
      </div>

      <button type="button" onClick={save} className="w-full rounded-md bg-teal px-4 py-3 font-black text-white">
        {saved ? "Saved!" : "Save preferences"}
      </button>

      <button type="button" onClick={logout} className="w-full rounded-md border border-slate-200 px-4 py-3 font-bold text-slate-600">
        Sign out
      </button>
    </div>
  );
}
