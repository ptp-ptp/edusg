const ACTIVITY_CAP = 5000;
const STAR_CAP = 2000;

const TIME_BUCKETS = {
  practice: "practiceMs",
  game: "gameMs",
  watch: "watchMs",
  read: "readMs",
  dictionary: "dictionaryMs",
  lesson: "practiceMs",
  quest: "practiceMs"
};

export function ensureActivityShape(db) {
  db.activityEvents = db.activityEvents || [];
  db.starEvents = db.starEvents || [];
  return db;
}

export function ensureChineseProgressBuckets(chinese) {
  chinese.watchMs = chinese.watchMs || 0;
  chinese.readMs = chinese.readMs || 0;
  chinese.dictionaryMs = chinese.dictionaryMs || 0;
  chinese.gameMs = chinese.gameMs || 0;
  chinese.practiceMs = chinese.practiceMs || 0;
  chinese.studyMinutes = chinese.studyMinutes || 0;
  chinese.lastActiveAt = chinese.lastActiveAt || null;
  chinese.recentAttempts = chinese.recentAttempts || [];
  chinese.wordTimes = chinese.wordTimes || {};
  return chinese;
}

function capList(list, cap) {
  if (list.length <= cap) return list;
  return list.slice(list.length - cap);
}

/**
 * Record a learning activity event and optionally update Chinese time buckets.
 */
export function recordActivity(db, {
  studentId,
  subject,
  kind = "practice",
  mode = "",
  meta = {},
  durationMs = 0,
  starsEarned = 0,
  at = new Date().toISOString()
}) {
  ensureActivityShape(db);
  const event = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    studentId,
    subject,
    kind,
    mode,
    meta: meta || {},
    durationMs: Math.max(0, Number(durationMs) || 0),
    starsEarned: Math.max(0, Number(starsEarned) || 0),
    at
  };
  db.activityEvents.push(event);
  db.activityEvents = capList(db.activityEvents, ACTIVITY_CAP);

  if (subject === "Chinese" && db.progress?.[studentId]?.Chinese) {
    const chinese = ensureChineseProgressBuckets(db.progress[studentId].Chinese);
    const bucket = TIME_BUCKETS[kind];
    if (bucket && event.durationMs) {
      chinese[bucket] = (chinese[bucket] || 0) + event.durationMs;
      chinese.studyMinutes = Math.round(
        ((chinese.watchMs || 0) +
          (chinese.readMs || 0) +
          (chinese.dictionaryMs || 0) +
          (chinese.gameMs || 0) +
          (chinese.practiceMs || 0)) /
          60000
      );
    }
    chinese.lastActiveAt = at;

    if (kind === "practice" && meta?.wordKey && typeof meta.correct === "boolean") {
      chinese.recentAttempts.unshift({
        wordKey: meta.wordKey,
        timeMs: meta.timeMs ?? event.durationMs ?? null,
        correct: meta.correct,
        at
      });
      chinese.recentAttempts = chinese.recentAttempts.slice(0, 50);
      if (meta.correct && typeof meta.timeMs === "number") {
        chinese.wordTimes[meta.wordKey] = meta.timeMs;
      }
    }
  }

  const student = (db.users || []).find((entry) => entry.id === studentId);
  if (student) student.lastActiveAt = at;

  return event;
}

export function recordStarEvent(db, {
  studentId,
  subject,
  amount,
  reason = "activity",
  at = new Date().toISOString()
}) {
  ensureActivityShape(db);
  const value = Number(amount) || 0;
  if (!value) return null;

  const event = {
    id: `star-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    studentId,
    subject,
    amount: value,
    reason,
    at
  };
  db.starEvents.push(event);
  db.starEvents = capList(db.starEvents, STAR_CAP);

  const student = (db.users || []).find((entry) => entry.id === studentId);
  if (student) {
    student.stars = Math.max(0, (student.stars || 0) + value);
  }

  if (value > 0 && subject && db.progress?.[studentId]?.[subject]) {
    const progress = db.progress[studentId][subject];
    if (typeof progress.starsEarnedWeek === "number") {
      progress.starsEarnedWeek += value;
    }
  }

  return event;
}

export function recordAnswerActivity(db, {
  studentId,
  subject,
  questionId,
  topic,
  level,
  correct,
  starsEarned = 0,
  durationMs = 0
}) {
  const at = new Date().toISOString();
  recordActivity(db, {
    studentId,
    subject,
    kind: "practice",
    mode: "question",
    meta: { questionId, topic, level, correct },
    durationMs,
    starsEarned,
    at
  });
  if (starsEarned) {
    recordStarEvent(db, {
      studentId,
      subject,
      amount: starsEarned,
      reason: correct ? "correct-answer" : "activity",
      at
    });
  }
}
