import { buildStudentInsight, buildParentInsight, buildPlatformInsight } from "./analytics.js";

const SUBJECTS = ["Math", "English", "Science", "Chinese"];

function avgMastery(topicMastery = {}) {
  const values = Object.values(topicMastery);
  return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
}

function subjectSummary(studentId, subject, db) {
  const progress = db.progress?.[studentId] || {};
  if (subject === "Chinese") {
    const chinese = progress.Chinese || { rememberedWords: {} };
    const words = Object.values(chinese.rememberedWords || {}).flat();
    return {
      subject: "Chinese",
      level: Math.min(10, Math.max(1, Math.ceil(words.length / 10) || 1)),
      mastery: Math.min(100, words.length * 3),
      answered: words.length,
      studyMinutes: chinese.studyMinutes || 0,
      nextAction: words.length ? "Review vocab" : "Start 1A words"
    };
  }
  const data = progress[subject] || {};
  return {
    subject,
    level: data.adaptiveLevel || 1,
    mastery: avgMastery(data.topicMastery),
    answered: data.answered || 0,
    studyMinutes: data.studyMinutes || 0,
    titleRank: data.titleRank,
    nextAction: subject === "English" ? "Continue lesson" : "Practice questions"
  };
}

function ensureDailyGoals(db, studentId) {
  db.goals = db.goals || [];
  const today = new Date().toISOString().slice(0, 10);
  const existing = db.goals.filter((g) => g.studentId === studentId && g.setBy === "system" && g.dueAt?.startsWith(today));
  if (existing.length >= 3) return existing;

  const defaults = [
    { subject: "Math", target: "Answer 5 questions", targetCount: 5, progress: 0 },
    { subject: "English", target: "Complete 1 lesson", targetCount: 1, progress: 0 },
    { subject: "All", target: "Keep your streak", targetCount: 1, progress: 0 }
  ];

  const created = defaults.map((item, index) => ({
    id: `goal-${studentId}-${today}-${index}`,
    studentId,
    setBy: "system",
    subject: item.subject,
    target: item.target,
    targetCount: item.targetCount,
    progress: item.progress,
    dueAt: `${today}T23:59:59.000Z`,
    createdAt: new Date().toISOString()
  }));

  db.goals.push(...created.filter((g) => !db.goals.some((x) => x.id === g.id)));
  return db.goals.filter((g) => g.studentId === studentId && g.setBy === "system" && g.dueAt?.startsWith(today));
}

export function buildStudentDashboardPayload(user, db) {
  const studentId = user.id;
  const progress = db.progress?.[studentId] || {};
  const insight = buildStudentInsight(user, db);
  const goals = ensureDailyGoals(db, studentId);
  const sessions = (db.studySessions || []).filter((s) => s.studentId === studentId).slice(-10).reverse();
  const lastSession = sessions[0];
  const achievements = (db.achievements || []).filter((a) => a.studentId === studentId).slice(-12).reverse();
  const notifications = (db.notifications || []).filter((n) => n.userId === user.id && !n.read).slice(0, 5);
  const parentMessages = (db.messages || []).filter((m) => m.studentId === studentId && m.senderId !== studentId).slice(-1);
  const recentActivity = (db.answerEvents || []).filter((e) => e.studentId === studentId).slice(-10).reverse();

  return {
    student: {
      id: user.id,
      name: user.name,
      grade: user.grade,
      avatar: user.avatar,
      stars: user.stars || 0,
      streak: user.streak || 0,
      currentSubject: user.currentSubject || "Math"
    },
    greeting: getGreeting(),
    subjects: SUBJECTS.map((s) => subjectSummary(studentId, s, db)),
    continueLearning: lastSession
      ? { subject: lastSession.subject, topic: lastSession.topic || "Practice", minutes: lastSession.minutes }
      : { subject: user.currentSubject || "Math", topic: "Start practicing", minutes: 0 },
    goals,
    weekly: {
      studyMinutes: insight.commitment.studyMinutes,
      targetMinutes: user.dailyMinutesTarget || 120,
      accuracy: insight.smartness.overallAccuracy,
      trend: insight.smartness.accuracyTrend
    },
    achievements,
    notifications,
    parentNote: parentMessages[0] || null,
    recentActivity,
    insight: { smartScore: insight.smartness.score, commitmentScore: insight.commitment.score }
  };
}

export function buildParentDashboardPayload(user, db) {
  const childIds = user.linkedStudentIds?.length
    ? user.linkedStudentIds
    : user.linkedStudentId
      ? [user.linkedStudentId]
      : [];

  const children = childIds.map((id) => {
    const student = db.users.find((u) => u.id === id);
    if (!student) return null;
    const insight = buildStudentInsight(student, db);
    const alerts = [];
    if (insight.commitment.score < 40) alerts.push("Low commitment — encourage daily practice");
    if (insight.smartness.weakTopics?.length) {
      alerts.push(`Focus: ${insight.smartness.weakTopics.slice(0, 2).join(", ")}`);
    }
    const inactiveDays = insight.commitment.inactiveDays || 0;
    if (inactiveDays >= 2) alerts.push(`Inactive for ${inactiveDays} days`);

    return {
      id: student.id,
      name: student.name,
      grade: student.grade,
      avatar: student.avatar,
      streak: student.streak || 0,
      smartScore: insight.smartness.score,
      commitmentScore: insight.commitment.score,
      smartLabel: insight.smartness.label,
      commitmentLabel: insight.commitment.label,
      lastActiveAt: insight.commitment.lastActiveAt,
      alerts,
      subjects: SUBJECTS.map((s) => subjectSummary(student.id, s, db))
    };
  }).filter(Boolean);

  return { parent: { id: user.id, name: user.name }, children };
}

export function buildChildReportPayload(childId, db) {
  const student = db.users.find((u) => u.id === childId && u.role === "student");
  if (!student) return null;
  const insight = buildStudentInsight(student, db);
  const goals = (db.goals || []).filter((g) => g.studentId === childId);
  const sessions = (db.studySessions || []).filter((s) => s.studentId === childId).slice(-30).reverse();
  const activity = (db.answerEvents || []).filter((e) => e.studentId === childId).slice(-20).reverse();

  return {
    student: { id: student.id, name: student.name, grade: student.grade, avatar: student.avatar },
    insight,
    subjects: SUBJECTS.map((s) => subjectSummary(childId, s, db)),
    goals,
    sessions,
    activity,
    messages: (db.messages || []).filter((m) => m.studentId === childId).reverse()
  };
}

export function buildAdminDashboardPayload(db) {
  return buildPlatformInsight(db);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function recordAudit(db, userId, action, meta = {}) {
  db.auditEvents = db.auditEvents || [];
  db.auditEvents.unshift({
    id: `audit-${Date.now()}`,
    userId,
    action,
    meta,
    at: new Date().toISOString()
  });
  db.auditEvents = db.auditEvents.slice(0, 200);
}

export function checkAchievements(db, studentId, progress, subject) {
  db.achievements = db.achievements || [];
  const existing = new Set(db.achievements.filter((a) => a.studentId === studentId).map((a) => a.type));
  const earned = [];

  const add = (type, title, meta = {}) => {
    if (existing.has(type)) return;
    const item = { id: `ach-${Date.now()}-${type}`, studentId, type, title, earnedAt: new Date().toISOString(), meta };
    db.achievements.push(item);
    earned.push(item);
    existing.add(type);
  };

  if (progress.answered >= 10) add("questions-10", "10 Questions Answered");
  if (progress.answered >= 50) add("questions-50", "50 Questions Champion");
  if (progress.adaptiveLevel >= 5) add("level-5", "Level 5 Achiever");
  if (progress.adaptiveLevel >= 8) add("level-8", "Level 8 Master");
  if (progress.correctStreak >= 5) add("streak-5", "5 Correct in a Row");

  const student = db.users.find((u) => u.id === studentId);
  if (student?.streak >= 7) add("week-streak", "7-Day Streak");

  return earned;
}

export function getTodayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

// Updates the daily activity streak. Consumes a streak freeze if a day was missed.
export function touchDailyStreak(db, studentId) {
  const student = db.users.find((u) => u.id === studentId);
  if (!student) return null;

  const today = getTodayKey();
  if (student.lastStreakDay === today) {
    return { streak: student.streak || 0, extended: false, freezeUsed: false };
  }

  const yesterday = getTodayKey(new Date(Date.now() - 86400000));
  let freezeUsed = false;

  if (student.lastStreakDay === yesterday) {
    student.streak = (student.streak || 0) + 1;
  } else if (student.lastStreakDay && (student.streakFreezes || 0) > 0) {
    student.streakFreezes -= 1;
    student.streak = (student.streak || 0) + 1;
    freezeUsed = true;
  } else {
    student.streak = 1;
  }

  student.lastStreakDay = today;
  return { streak: student.streak, extended: true, freezeUsed };
}

const DAILY_QUEST_TASKS = [
  { id: "answer-5", title: "Answer 5 questions", target: 5, metric: "answered" },
  { id: "correct-3", title: "Get 3 correct answers", target: 3, metric: "correct" },
  { id: "subjects-2", title: "Practise 2 different subjects", target: 2, metric: "subjects" }
];

export const DAILY_QUEST_REWARD = 20;

export function buildDailyQuest(db, studentId) {
  const today = getTodayKey();
  const todayEvents = (db.answerEvents || []).filter(
    (event) => event.studentId === studentId && String(event.at || "").slice(0, 10) === today
  );

  const answered = todayEvents.length;
  const correct = todayEvents.filter((event) => event.correct).length;
  const subjects = new Set(todayEvents.map((event) => event.subject)).size;
  const metrics = { answered, correct, subjects };

  const tasks = DAILY_QUEST_TASKS.map((task) => ({
    id: task.id,
    title: task.title,
    target: task.target,
    progress: Math.min(task.target, metrics[task.metric] || 0),
    done: (metrics[task.metric] || 0) >= task.target
  }));

  const student = db.users.find((u) => u.id === studentId);
  const claimed = Boolean(student?.dailyQuestClaims?.[today]);

  return {
    date: today,
    tasks,
    complete: tasks.every((task) => task.done),
    claimed,
    reward: DAILY_QUEST_REWARD
  };
}

export function incrementStudyMinutes(db, studentId, subject, minutes = 2) {
  if (!db.progress[studentId]) db.progress[studentId] = {};
  if (subject === "Chinese") {
    if (!db.progress[studentId].Chinese) db.progress[studentId].Chinese = { rememberedWords: {} };
    db.progress[studentId].Chinese.studyMinutes = (db.progress[studentId].Chinese.studyMinutes || 0) + minutes;
    return;
  }
  if (!db.progress[studentId][subject]) return;
  db.progress[studentId][subject].studyMinutes = (db.progress[studentId][subject].studyMinutes || 0) + minutes;
}
