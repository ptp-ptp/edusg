const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function uniqueDays(events, field = "at") {
  return new Set(events.map((event) => startOfDay(event[field]).toISOString())).size;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function accuracyFromEvents(events) {
  if (!events.length) return 0;
  const correct = events.filter((event) => event.correct).length;
  return Math.round((correct / events.length) * 100);
}

function loginStreakDays(loginEvents, userId) {
  const days = [...new Set(
    loginEvents
      .filter((event) => event.userId === userId)
      .map((event) => startOfDay(event.at).getTime())
  )].sort((a, b) => b - a);

  if (!days.length) return 0;

  let streak = 1;
  for (let index = 1; index < days.length; index += 1) {
    if (days[index - 1] - days[index] === DAY_MS) streak += 1;
    else break;
  }
  return streak;
}

function eventsInWindow(events, days, field = "at") {
  const cutoff = Date.now() - days * DAY_MS;
  return events.filter((event) => new Date(event[field]).getTime() >= cutoff);
}

function subjectStats(progress, subject) {
  if (subject === "Chinese") {
    const chinese = progress.Chinese || { rememberedWords: {} };
    const words = Object.values(chinese.rememberedWords || {}).flat();
    const mastery = Math.min(100, words.length * 3);
    return {
      subject: "Chinese",
      adaptiveLevel: Math.min(10, Math.max(1, Math.ceil(words.length / 10) || 1)),
      answered: words.length,
      correct: words.length,
      accuracy: words.length ? 85 : 0,
      avgMastery: mastery,
      studyMinutes: chinese.studyMinutes || 0,
      topicMastery: {}
    };
  }
  const data = progress[subject] || {};
  const topicValues = Object.values(data.topicMastery || {});
  const avgMastery = topicValues.length ? Math.round(average(topicValues)) : 0;
  const accuracy = data.answered ? Math.round((data.correct / data.answered) * 100) : 0;
  return {
    subject,
    adaptiveLevel: data.adaptiveLevel || 1,
    answered: data.answered || 0,
    correct: data.correct || 0,
    accuracy,
    avgMastery,
    studyMinutes: data.studyMinutes || 0,
    topicMastery: data.topicMastery || {}
  };
}

function weakTopicsFromProgress(progress) {
  const weak = [];
  for (const subject of ["Math", "English", "Science"]) {
    const topics = progress[subject]?.topicMastery || {};
    for (const [topic, score] of Object.entries(topics)) {
      if (score < 50) weak.push(`${subject}: ${topic}`);
    }
  }
  return weak.slice(0, 5);
}

export function buildStudentInsight(user, db) {
  const studentId = user.id;
  const progress = db.progress?.[studentId] || {};
  const math = progress.Math || {};
  const english = progress.English || {};
  const science = progress.Science || {};
  const chinese = subjectStats(progress, "Chinese");
  const mathStats = subjectStats(progress, "Math");
  const englishStats = subjectStats(progress, "English");
  const scienceStats = subjectStats(progress, "Science");

  const answerEvents = (db.answerEvents || []).filter((event) => event.studentId === studentId);
  const loginEvents = (db.loginEvents || []).filter((event) => event.userId === studentId);
  const messages = (db.messages || []).filter((event) => event.studentId === studentId);

  const overallAccuracy = Math.round(
    average([mathStats.accuracy, englishStats.accuracy, scienceStats.accuracy].filter((v) => v > 0)) || 0
  );
  const avgMastery = Math.round(
    average([mathStats.avgMastery, englishStats.avgMastery, scienceStats.avgMastery, chinese.avgMastery].filter((v) => v > 0)) || 0
  );

  const hardEvents = answerEvents.filter((event) => Number(event.level) >= 7);
  const hardAccuracy = accuracyFromEvents(hardEvents);

  const recentAnswers = answerEvents.slice(-10);
  const olderAnswers = answerEvents.slice(-20, -10);
  const recentAccuracy = accuracyFromEvents(recentAnswers);
  const olderAccuracy = accuracyFromEvents(olderAnswers);
  const accuracyTrend = recentAnswers.length && olderAnswers.length ? recentAccuracy - olderAccuracy : 0;

  const olympiadReady = Boolean(math.unlockedOlympiad);
  const avgLevel = Math.round(average([mathStats.adaptiveLevel, englishStats.adaptiveLevel, scienceStats.adaptiveLevel]));

  const smartScore = Math.min(
    100,
    Math.round(
      overallAccuracy * 0.3 +
        avgMastery * 0.25 +
        hardAccuracy * 0.12 +
        avgLevel * 5 +
        Math.max(accuracyTrend, 0) * 0.5 +
        (olympiadReady ? 6 : 0)
    )
  );

  const answers7d = eventsInWindow(answerEvents, 7, "at");
  const answers30d = eventsInWindow(answerEvents, 30, "at");
  const logins7d = eventsInWindow(loginEvents, 7, "at");
  const logins30d = eventsInWindow(loginEvents, 30, "at");

  const activeDays7 = uniqueDays([...answers7d, ...logins7d]);
  const activeDays30 = uniqueDays([...answers30d, ...logins30d]);
  const questionsPerWeek = answers7d.length;
  const studyMinutes =
    (math.studyMinutes || 0) + (english.studyMinutes || 0) + (science.studyMinutes || 0) + (chinese.studyMinutes || 0);
  const studyMinutesPerWeek = Math.round(studyMinutes / Math.max(activeDays30 / 7, 1));
  const messageCount = messages.length;
  const parentMessages = messages.filter((message) => message.senderId !== studentId).length;
  const currentLoginStreak = loginStreakDays(db.loginEvents || [], studentId);
  const lastActiveAt = [...answerEvents, ...loginEvents]
    .map((event) => new Date(event.at).getTime())
    .sort((a, b) => b - a)[0];

  const inactiveDays = lastActiveAt
    ? Math.floor((Date.now() - lastActiveAt) / DAY_MS)
    : 30;

  const commitmentScore = Math.min(
    100,
    Math.round(
      activeDays7 * 8 +
        Math.min(questionsPerWeek, 20) * 2 +
        Math.min(studyMinutesPerWeek, 180) / 6 +
        currentLoginStreak * 4 +
        Math.min(messageCount, 10) +
        (user.streak || 0) * 0.5
    )
  );

  const weeklyTrend = Array.from({ length: 7 }, (_, index) => {
    const dayStart = startOfDay(new Date(Date.now() - (6 - index) * DAY_MS)).getTime();
    const dayEnd = dayStart + DAY_MS;
    const dayEvents = answerEvents.filter((e) => {
      const t = new Date(e.at).getTime();
      return t >= dayStart && t < dayEnd;
    });
    return {
      date: new Date(dayStart).toISOString().slice(0, 10),
      questions: dayEvents.length,
      accuracy: accuracyFromEvents(dayEvents),
      minutes: Math.round(dayEvents.length * 3)
    };
  });

  const smartness = {
    overallAccuracy,
    avgMastery,
    hardAccuracy,
    hardQuestionsAttempted: hardEvents.length,
    adaptiveLevel: math.adaptiveLevel || 1,
    avgLevel,
    olympiadReady,
    accuracyTrend,
    recentAccuracy,
    topicMastery: math.topicMastery || {},
    levelHistory: math.levelHistory || [],
    weakTopics: weakTopicsFromProgress(progress),
    subjects: { math: mathStats, english: englishStats, science: scienceStats, chinese },
    score: smartScore,
    label: smartScore >= 80 ? "High performer" : smartScore >= 60 ? "Developing well" : smartScore >= 40 ? "Needs support" : "Early stage"
  };

  const commitment = {
    activeDays7,
    activeDays30,
    questionsPerWeek,
    totalQuestions: (math.answered || 0) + (english.answered || 0) + (science.answered || 0),
    studyMinutes,
    studyMinutesPerWeek,
    loginCount: user.loginCount || 0,
    loginStreak: currentLoginStreak,
    practiceStreak: user.streak || 0,
    messageCount,
    parentEngagement: parentMessages,
    lastActiveAt: lastActiveAt ? new Date(lastActiveAt).toISOString() : null,
    lastLoginAt: user.lastLoginAt || null,
    inactiveDays,
    streakAtRisk: inactiveDays >= 1,
    parentEngagementLow: parentMessages === 0,
    weeklyTrend,
    score: commitmentScore,
    label: commitmentScore >= 80 ? "Highly committed" : commitmentScore >= 60 ? "Consistent" : commitmentScore >= 40 ? "Irregular" : "At risk"
  };

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      grade: user.grade,
      avatar: user.avatar,
      stars: user.stars || 0,
      registeredAt: user.registeredAt,
      linkedParentId: user.linkedParentId
    },
    parent: db.users.find((entry) => entry.id === user.linkedParentId) || null,
    smartness,
    commitment,
    recentAnswers: answerEvents.slice(-8).reverse(),
    recentLogins: loginEvents.slice(-5).reverse()
  };
}

export function buildParentInsight(parent, db) {
  const childIds = parent.linkedStudentIds?.length
    ? parent.linkedStudentIds
    : parent.linkedStudentId
      ? [parent.linkedStudentId]
      : [];

  const children = childIds.map((id) => {
    const student = db.users.find((u) => u.id === id);
    return student ? buildStudentInsight(student, db) : null;
  }).filter(Boolean);

  const avgSmart = children.length
    ? Math.round(average(children.map((c) => c.smartness.score)))
    : 0;
  const avgCommitment = children.length
    ? Math.round(average(children.map((c) => c.commitment.score)))
    : 0;

  return {
    parent: { id: parent.id, name: parent.name },
    children,
    summary: { childCount: children.length, avgSmart, avgCommitment }
  };
}

export function buildPlatformInsight(db) {
  const students = (db.users || []).filter((u) => u.role === "student");
  const insights = students.map((s) => buildStudentInsight(s, db));
  const today = startOfDay(new Date()).getTime();
  const answerEvents = db.answerEvents || [];
  const loginEvents = db.loginEvents || [];

  const activeToday = new Set([
    ...answerEvents.filter((e) => new Date(e.at).getTime() >= today).map((e) => e.studentId),
    ...loginEvents.filter((e) => new Date(e.at).getTime() >= today).map((e) => e.userId)
  ]).size;

  const questionsToday = answerEvents.filter((e) => new Date(e.at).getTime() >= today).length;

  const subjectDistribution = answerEvents.reduce((acc, e) => {
    acc[e.subject] = (acc[e.subject] || 0) + 1;
    return acc;
  }, {});

  const activityFeed = [
    ...answerEvents.slice(-15).map((e) => ({
      type: "answer",
      studentId: e.studentId,
      subject: e.subject,
      correct: e.correct,
      at: e.at
    })),
    ...loginEvents.slice(-10).map((e) => ({
      type: "login",
      userId: e.userId,
      at: e.at
    })),
    ...(db.messages || []).slice(-5).map((m) => ({
      type: "message",
      studentId: m.studentId,
      senderName: m.senderName,
      at: m.createdAt
    }))
  ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 20);

  return {
    stats: {
      totalUsers: db.users?.length || 0,
      students: students.length,
      parents: (db.users || []).filter((u) => u.role === "parent").length,
      questions: db.questions?.length || 0,
      activeToday,
      questionsToday,
      avgCommitment: insights.length ? Math.round(average(insights.map((i) => i.commitment.score))) : 0,
      atRiskCount: insights.filter((i) => i.commitment.score < 40).length
    },
    subjectDistribution,
    atRiskStudents: insights.filter((i) => i.commitment.score < 40).map((i) => ({
      id: i.user.id,
      name: i.user.name,
      commitmentScore: i.commitment.score
    })),
    activityFeed,
    settings: db.platformSettings || {
      subjects: ["Math", "Chinese", "English", "Science"],
      adaptiveLevels: 10,
      featureFlags: { rewards: true, achievements: true }
    }
  };
}

export function buildAllStudentInsights(db) {
  const students = (db.users || []).filter((user) => user.role === "student");
  const insights = students.map((student) => buildStudentInsight(student, db));
  insights.sort((a, b) => b.smartness.score - a.smartness.score);
  return {
    students: insights,
    summary: {
      totalStudents: insights.length,
      avgSmartScore: insights.length ? Math.round(average(insights.map((item) => item.smartness.score))) : 0,
      avgCommitmentScore: insights.length ? Math.round(average(insights.map((item) => item.commitment.score))) : 0,
      atRiskCount: insights.filter((item) => item.commitment.score < 40).length,
      topPerformers: insights.filter((item) => item.smartness.score >= 80).length
    }
  };
}
