import React from "react";
import { AlertTriangle, CheckCircle2, Clock3, Star } from "lucide-react";
import { cx } from "../../lib/api";

function Metric({ label, value, hint, tone = "teal" }) {
  const tones = {
    teal: "bg-teal/10 text-teal",
    coral: "bg-coral/10 text-coral",
    sun: "bg-amber-100 text-amber-700",
    slate: "bg-slate-100 text-slate-700"
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className={cx("inline-flex rounded-md px-2 py-1 text-[11px] font-black uppercase", tones[tone])}>{label}</div>
      <div className="mt-2 text-2xl font-black text-ink">{value}</div>
      {hint ? <div className="mt-1 text-xs font-semibold text-slate-500">{hint}</div> : null}
    </div>
  );
}

function MixBar({ mix }) {
  const parts = Object.entries(mix || {}).filter(([, item]) => item.percent > 0);
  if (!parts.length) {
    return <p className="text-sm text-slate-500">No timed activity yet for this subject.</p>;
  }
  return (
    <div className="space-y-2">
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
        {parts.map(([kind, item]) => (
          <div
            key={kind}
            title={`${kind}: ${item.percent}%`}
            className={cx(
              "h-full",
              kind === "practice" && "bg-teal",
              kind === "game" && "bg-coral",
              kind === "watch" && "bg-blue-500",
              kind === "read" && "bg-leaf",
              kind === "dictionary" && "bg-amber-500",
              !["practice", "game", "watch", "read", "dictionary"].includes(kind) && "bg-slate-400"
            )}
            style={{ width: `${item.percent}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
        {parts.map(([kind, item]) => (
          <span key={kind} className="rounded-full bg-slate-100 px-2 py-1 capitalize">
            {kind} {item.percent}% · {item.minutes}m
          </span>
        ))}
      </div>
    </div>
  );
}

export default function SubjectInsightPanel({ data, audience = "admin" }) {
  if (!data) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
        Select a student to view subject insights.
      </div>
    );
  }

  const { subject, engagement, mastery, rewards, summary, hasTelemetry, recentActivity } = data;
  const isChinese = subject === "Chinese";

  return (
    <div className="space-y-4" data-testid={`subject-insight-${subject.toLowerCase()}`}>
      {!hasTelemetry && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Tracking starts when the student uses {subject}. New practice, games, watch, read and dictionary time will appear here automatically.
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="font-black">{subject} engagement</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Today" value={`${engagement.minutesToday}m`} hint="Active minutes" />
          <Metric label="Yesterday" value={`${engagement.minutesYesterday}m`} tone="slate" />
          <Metric label="Last 7 days" value={`${engagement.minutes7d}m`} hint={`${engagement.consistency7} active days`} />
          <Metric label="Sessions (7d)" value={engagement.sessions7d} hint={`Avg ${engagement.avgSessionMinutes}m`} tone="coral" />
        </div>
        <div className="mt-4">
          <div className="mb-2 text-xs font-black uppercase text-slate-500">Engagement mix (7d)</div>
          <MixBar mix={engagement.mix} />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="font-black">{isChinese ? "Chinese mastery" : `${subject} mastery`}</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Level" value={`L${mastery.level}`} />
          <Metric
            label={isChinese ? "Words learned" : "Answered"}
            value={isChinese ? mastery.wordsRemembered : mastery.answered}
            tone="coral"
          />
          <Metric label="Accuracy" value={`${mastery.accuracy}%`} hint={isChinese ? `${mastery.attemptCount7d || 0} attempts (7d)` : `${mastery.attempts7d || 0} attempts (7d)`} />
          <Metric
            label="Study time"
            value={`${mastery.studyMinutes || engagement.minutes7d}m`}
            hint={isChinese && mastery.medianResponseMs ? `Median ${Math.round(mastery.medianResponseMs / 1000)}s / word` : "Logged study"}
            tone="sun"
          />
        </div>

        {isChinese && (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <div className="text-xs font-black uppercase text-slate-500">Words / phases learned today</div>
              {mastery.wordsLearnedToday?.length ? (
                <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-sm">
                  {mastery.wordsLearnedToday.map((key) => {
                    const parts = key.split("|");
                    return (
                      <li key={key} className="rounded-md bg-coral/5 px-2 py-1 font-semibold text-slate-700">
                        <span className="text-lg text-ink">{parts[2] || parts[1]}</span>
                        <span className="ml-2 text-xs text-slate-500">{parts[1]} · {parts[0]}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-500">No new words recorded today yet.</p>
              )}
              {mastery.phasesLearnedToday?.length ? (
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  Phases: {mastery.phasesLearnedToday.join(", ")}
                </p>
              ) : null}
            </div>
            <div>
              <div className="text-xs font-black uppercase text-slate-500">Time buckets (lifetime)</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                {[
                  ["Practice", mastery.timeBuckets?.practiceMs],
                  ["Game", mastery.timeBuckets?.gameMs],
                  ["Watch", mastery.timeBuckets?.watchMs],
                  ["Read", mastery.timeBuckets?.readMs],
                  ["Dictionary", mastery.timeBuckets?.dictionaryMs]
                ].map(([label, ms]) => (
                  <div key={label} className="rounded-md bg-slate-50 px-3 py-2">
                    <div className="text-xs font-bold text-slate-500">{label}</div>
                    <div className="font-black">{Math.round((ms || 0) / 60000)}m</div>
                  </div>
                ))}
              </div>
              {mastery.weakWords?.length ? (
                <div className="mt-3">
                  <div className="text-xs font-black uppercase text-slate-500">Slow / weak words</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {mastery.weakWords.slice(0, 8).map((item) => (
                      <span key={item.wordKey} className="rounded-full bg-orange-50 px-2 py-1 text-xs font-bold text-orange-700">
                        {item.wordKey.split("|")[2] || item.wordKey} · {Math.round(item.timeMs / 1000)}s
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {!isChinese && mastery.weakTopics?.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-black uppercase text-slate-500">Weak topics</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {mastery.weakTopics.map((item) => (
                <span key={item.topic} className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                  {item.topic} · {item.score}%
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="flex items-center gap-2 font-black">
          <Star className="h-4 w-4 text-amber-500" /> Stars & streak
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Today" value={rewards.starsToday} tone="sun" />
          <Metric label="Yesterday" value={rewards.starsYesterday} tone="slate" />
          <Metric label="Last 7 days" value={rewards.stars7d} tone="coral" />
          <Metric label="Lifetime" value={rewards.starsLifetime} />
          <Metric
            label="Streak"
            value={rewards.streak}
            hint={rewards.streakAtRisk ? "At risk" : "On track"}
            tone={rewards.streakAtRisk ? "coral" : "teal"}
          />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="font-black">{audience === "student" ? "How you’re doing" : "Parent / coach summary"}</h3>
        <p className="mt-1 text-sm font-semibold text-slate-600">{summary.headline}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg bg-teal/5 p-3">
            <div className="flex items-center gap-2 text-sm font-black text-teal">
              <CheckCircle2 className="h-4 w-4" /> Strengths
            </div>
            <ul className="mt-2 list-inside list-disc text-sm text-slate-700">
              {(summary.strengths || []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg bg-orange-50 p-3">
            <div className="flex items-center gap-2 text-sm font-black text-orange-700">
              <AlertTriangle className="h-4 w-4" /> Watch-outs
            </div>
            {(summary.watchOuts || []).length ? (
              <ul className="mt-2 list-inside list-disc text-sm text-slate-700">
                {summary.watchOuts.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-600">No major risks flagged right now.</p>
            )}
          </div>
        </div>
      </section>

      {recentActivity?.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="flex items-center gap-2 font-black">
            <Clock3 className="h-4 w-4 text-slate-500" /> Recent activity
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            {recentActivity.slice(0, 8).map((event) => (
              <li key={event.id || `${event.at}-${event.kind}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2">
                <span className="font-semibold capitalize text-slate-700">
                  {event.kind || "practice"}
                  {event.meta?.topic ? ` · ${event.meta.topic}` : ""}
                  {event.meta?.wordKey ? ` · ${String(event.meta.wordKey).split("|")[2] || event.meta.wordKey}` : ""}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {event.durationMs ? `${Math.round(event.durationMs / 60000)}m · ` : ""}
                  {new Date(event.at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function InsightOverviewCards({ overview, student }) {
  if (!overview) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Metric label="Stars today" value={overview.starsToday} tone="sun" />
      <Metric label="Stars yesterday" value={overview.starsYesterday} tone="slate" />
      <Metric label="Stars (7d)" value={overview.stars7d} tone="coral" />
      <Metric label="Minutes (7d)" value={`${overview.minutes7d}m`} />
      <Metric
        label="Active days"
        value={overview.activeDays7}
        hint={student?.streak != null ? `Streak ${student.streak}` : undefined}
      />
    </div>
  );
}
