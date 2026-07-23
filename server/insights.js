import { ensureActivityShape, ensureChineseProgressBuckets } from "./activity.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const SUBJECTS = ["Math", "English", "Chinese", "Science"];

function startOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function dayKey(iso) {
  return startOfDay(iso).toISOString().slice(0, 10);
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function eventsForStudent(events, studentId, subject) {
  return (events || []).filter(
    (event) => event.studentId === studentId && (!subject || event.subject === subject)
  );
}

function inWindow(events, days, field = "at") {
  const cutoff = Date.now() - days * DAY_MS;
  return events.filter((event) => new Date(event[field]).getTime() >= cutoff);
}

function onDay(events, offsetDays = 0) {
  const target = startOfDay();
  target.setDate(target.getDate() - offsetDays);
  const key = target.toISOString().slice(0, 10);
  return events.filter((event) => dayKey(event.at) === key);
}

function sumDuration(events) {
  return events.reduce((sum, event) => sum + (Number(event.durationMs) || 0), 0);
}

function sumStars(events) {
  return events.reduce((sum, event) => sum + (Number(event.amount ?? event.starsEarned) || 0), 0);
}

function msToMinutes(ms) {
  return Math.round((ms / 60000) * 10) / 10;
}

function uniqueActiveDays(events, days) {
  const windowed = inWindow(events, days);
  return new Set(windowed.map((event) => dayKey(event.at))).size;
}

function engagementByKind(events) {
  const kinds = ["practice", "game", "watch", "read", "dictionary", "lesson", "quest"];
  const totals = Object.fromEntries(kinds.map((kind) => [kind, 0]));
  for (const event of events) {
    const kind = totals[event.kind] !== undefined ? event.kind : "practice";
    totals[kind] += Number(event.durationMs) || 0;
  }
  const total = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
  const mix = {};
  for (const [kind, ms] of Object.entries(totals)) {
    mix[kind] = {
      ms,
      minutes: msToMinutes(ms),
      percent: Math.round((ms / total) * 100)
    };
  }
  return mix;
}

function buildParentSummary({ engagement, mastery, rewards, subject }) {
  const strengths = [];
  const watchOuts = [];

  if (mastery.accuracy >= 80) strengths.push(`Strong ${subject} accuracy (${mastery.accuracy}%)`);
  if (engagement.minutes7d >= 30) strengths.push(`Solid weekly engagement (${engagement.minutes7d} min in 7 days)`);
  if (mastery.level >= 5) strengths.push(`Working at level ${mastery.level}`);
  if ((mastery.wordsRemembered || 0) >= 20) strengths.push(`Has locked in ${mastery.wordsRemembered} Chinese words`);

  if (engagement.minutes7d < 10) watchOuts.push("Low platform engagement this week — aim for short daily sessions");
  if (mastery.accuracy > 0 && mastery.accuracy < 55) watchOuts.push("Accuracy is still developing — review weak items together");
  if (engagement.consistency7 < 3) watchOuts.push("Practice is irregular (fewer than 3 active days this week)");
  if (subject === "Chinese" && engagement.mix?.watch?.percent < 5 && engagement.minutes7d > 0) {
    watchOuts.push("Little watch/listen time vs practice — mix input with vocab drills");
  }
  if (rewards.streakAtRisk) watchOuts.push("Streak is at risk — a short session today helps");

  if (!strengths.length && !watchOuts.length) {
    return {
      strengths: ["Tracking starts when the student uses this subject."],
      watchOuts: [],
      headline: "No activity recorded yet"
    };
  }

  return {
    strengths,
    watchOuts,
    headline: watchOuts.length
      ? "Some focus areas need attention"
      : "Healthy learning pattern overall"
  };
}

function chineseMastery(db, studentId, activity, stars) {
  const chinese = ensureChineseProgressBuckets(
    structuredClone(db.progress?.[studentId]?.Chinese || { rememberedWords: {} })
  );
  const rememberedByGrade = chinese.rememberedWords || {};
  const allWords = Object.values(rememberedByGrade).flat();
  const attempts = chinese.recentAttempts || [];
  const attemptWindow = inWindow(attempts, 7);
  const correctAttempts = attemptWindow.filter((item) => item.correct);
  const times = attemptWindow.map((item) => item.timeMs).filter((value) => typeof value === "number");
  const todayAttempts = onDay(attempts, 0);
  const wordsLearnedToday = [
    ...new Set(todayAttempts.filter((item) => item.correct).map((item) => item.wordKey))
  ];
  const wordsLearned7d = [
    ...new Set(attemptWindow.filter((item) => item.correct).map((item) => item.wordKey))
  ];

  const slowWords = Object.entries(chinese.wordTimes || {})
    .filter(([, ms]) => ms > 8000)
    .map(([wordKey, timeMs]) => ({ wordKey, timeMs }))
    .slice(0, 12);

  const accuracy = attemptWindow.length
    ? Math.round((correctAttempts.length / attemptWindow.length) * 100)
    : allWords.length
      ? 85
      : 0;

  return {
    wordsRemembered: allWords.length,
    wordsByGrade: Object.fromEntries(
      Object.entries(rememberedByGrade).map(([grade, words]) => [grade, words.length])
    ),
    wordsLearnedToday,
    wordsLearned7dCount: wordsLearned7d.length,
    phasesLearnedToday: [...new Set(wordsLearnedToday.map((key) => key.split("|")[1]).filter(Boolean))],
    level: Math.min(10, Math.max(1, Math.ceil(allWords.length / 10) || 1)),
    accuracy,
    medianResponseMs: median(times),
    avgResponseMs: Math.round(average(times) || 0),
    attemptCount7d: attemptWindow.length,
    weakWords: slowWords,
    timeBuckets: {
      watchMs: chinese.watchMs || 0,
      readMs: chinese.readMs || 0,
      dictionaryMs: chinese.dictionaryMs || 0,
      gameMs: chinese.gameMs || 0,
      practiceMs: chinese.practiceMs || 0
    },
    studyMinutes: chinese.studyMinutes || 0,
    lastActiveAt: chinese.lastActiveAt || null,
    answered: allWords.length,
    topicMastery: {}
  };
}

function standardMastery(db, studentId, subject, answerEvents) {
  const progress = db.progress?.[studentId]?.[subject] || {};
  const subjectAnswers = eventsForStudent(answerEvents, studentId, subject);
  const recent = inWindow(subjectAnswers, 7);
  const accuracy = progress.answered
    ? Math.round(((progress.correct || 0) / progress.answered) * 100)
    : 0;
  const topicEntries = Object.entries(progress.topicMastery || {});
  const weakTopics = topicEntries
    .filter(([, score]) => score < 50)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 8)
    .map(([topic, score]) => ({ topic, score }));

  return {
    level: progress.adaptiveLevel || 1,
    answered: progress.answered || 0,
    correct: progress.correct || 0,
    accuracy,
    studyMinutes: progress.studyMinutes || 0,
    topicMastery: progress.topicMastery || {},
    weakTopics,
    attempts7d: recent.length,
    accuracy7d: recent.length
      ? Math.round((recent.filter((event) => event.correct).length / recent.length) * 100)
      : 0,
    lastActiveAt: subjectAnswers.at(-1)?.at || null
  };
}

export function buildSubjectInsight(db, studentId, subject) {
  ensureActivityShape(db);
  const student = (db.users || []).find((entry) => entry.id === studentId);
  if (!student) return null;

  const activity = eventsForStudent(db.activityEvents, studentId, subject);
  const stars = eventsForStudent(db.starEvents, studentId, subject);
  const answers = eventsForStudent(db.answerEvents, studentId, subject);
  const combinedForEngagement = [
    ...activity,
    ...answers.map((event) => ({
      ...event,
      kind: "practice",
      durationMs: event.durationMs || 120000
    }))
  ];

  const todayActivity = onDay(combinedForEngagement, 0);
  const yesterdayActivity = onDay(combinedForEngagement, 1);
  const weekActivity = inWindow(combinedForEngagement, 7);
  const monthActivity = inWindow(combinedForEngagement, 30);

  const engagement = {
    minutesToday: msToMinutes(sumDuration(todayActivity)),
    minutesYesterday: msToMinutes(sumDuration(yesterdayActivity)),
    minutes7d: msToMinutes(sumDuration(weekActivity)),
    minutes30d: msToMinutes(sumDuration(monthActivity)),
    sessions7d: weekActivity.length,
    avgSessionMinutes: weekActivity.length
      ? msToMinutes(sumDuration(weekActivity) / weekActivity.length)
      : 0,
    lastActiveAt:
      combinedForEngagement.map((event) => event.at).sort().at(-1) ||
      student.lastActiveAt ||
      null,
    consistency7: uniqueActiveDays(combinedForEngagement, 7),
    consistency30: uniqueActiveDays(combinedForEngagement, 30),
    mix: engagementByKind(weekActivity)
  };

  const mastery =
    subject === "Chinese"
      ? chineseMastery(db, studentId, activity, stars)
      : standardMastery(db, studentId, subject, db.answerEvents);

  const todayStars = sumStars(onDay(stars, 0));
  const yesterdayStars = sumStars(onDay(stars, 1));
  const weekStars = sumStars(inWindow(stars, 7));
  const activityStarsWeek = sumStars(
    inWindow(activity, 7).map((event) => ({ amount: event.starsEarned || 0 }))
  );

  const rewards = {
    starsToday: todayStars,
    starsYesterday: yesterdayStars,
    stars7d: weekStars || activityStarsWeek,
    starsLifetime: student.stars || 0,
    streak: student.streak || 0,
    streakAtRisk: Boolean(
      student.lastActiveAt &&
        Date.now() - new Date(student.lastActiveAt).getTime() > DAY_MS &&
        (student.streak || 0) > 0
    )
  };

  const hasTelemetry =
    combinedForEngagement.length > 0 ||
    (subject === "Chinese" && (mastery.wordsRemembered || 0) > 0) ||
    (mastery.answered || 0) > 0;

  return {
    subject,
    student: {
      id: student.id,
      name: student.name,
      grade: student.grade,
      avatar: student.avatar,
      email: student.email
    },
    hasTelemetry,
    engagement,
    mastery,
    rewards,
    summary: buildParentSummary({ engagement, mastery, rewards, subject }),
    recentActivity: combinedForEngagement
      .slice()
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 12)
  };
}

export function buildStudentInsightsPayload(db, studentId) {
  const student = (db.users || []).find((entry) => entry.id === studentId && entry.role === "student");
  if (!student) return null;

  const subjects = {};
  for (const subject of SUBJECTS) {
    subjects[subject] = buildSubjectInsight(db, studentId, subject);
  }

  const allActivity = eventsForStudent(db.activityEvents, studentId);
  const allStars = eventsForStudent(db.starEvents, studentId);

  return {
    student: {
      id: student.id,
      name: student.name,
      grade: student.grade,
      avatar: student.avatar,
      email: student.email,
      stars: student.stars || 0,
      streak: student.streak || 0
    },
    overview: {
      starsToday: sumStars(onDay(allStars, 0)),
      starsYesterday: sumStars(onDay(allStars, 1)),
      stars7d: sumStars(inWindow(allStars, 7)),
      minutes7d: msToMinutes(sumDuration(inWindow(allActivity, 7))),
      activeDays7: uniqueActiveDays(allActivity, 7),
      lastActiveAt: student.lastActiveAt || null
    },
    subjects
  };
}

export { SUBJECTS as INSIGHT_SUBJECTS };
