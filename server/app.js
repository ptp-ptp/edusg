import cors from "cors";
import express from "express";
import path from "path";
import { readDb, writeDb, uploadQuestionImage, rootDir, isSupabaseEnabled } from "./db.js";
import { verifyPassword, hashPassword, ensureUserAuthFields } from "./auth.js";
import { buildAllStudentInsights, buildStudentInsight } from "./analytics.js";
import { requireAuth, requireRole, getLinkedStudentIds, getUserRoles } from "./middleware/auth.js";
import {
  buildStudentDashboardPayload,
  buildParentDashboardPayload,
  buildChildReportPayload,
  buildAdminDashboardPayload,
  recordAudit,
  checkAchievements,
  incrementStudyMinutes
} from "./dashboardHelpers.js";
import { englishP4Questions } from "./englishQuestions.js";

const auth = requireAuth(readDb);

const app = express();

app.use(cors());
app.use(express.json({ limit: "6mb" }));

function questionStats(db) {
  const bySubject = {};
  const byRole = {};
  for (const question of db.questions || []) {
    bySubject[question.subject] = (bySubject[question.subject] || 0) + 1;
  }
  for (const user of db.users || []) {
    byRole[user.role] = (byRole[user.role] || 0) + 1;
  }
  return {
    users: db.users?.length || 0,
    questions: db.questions?.length || 0,
    messages: db.messages?.length || 0,
    subjects: bySubject,
    roles: byRole
  };
}

function ensureChineseProgress(db, studentId) {
  if (!db.progress[studentId]) db.progress[studentId] = {};
  if (!db.progress[studentId].Chinese) {
    db.progress[studentId].Chinese = { rememberedWords: {} };
  }
  if (!db.progress[studentId].Chinese.rememberedWords) {
    db.progress[studentId].Chinese.rememberedWords = {};
  }
  return db.progress[studentId].Chinese;
}

function defaultEnglishProgress(grade = "P4") {
  return {
    grade,
    adaptiveLevel: 1,
    correctStreak: 0,
    struggleStreak: 0,
    answered: 0,
    correct: 0,
    studyMinutes: 0,
    starsEarnedWeek: 0,
    unlockedChampionLeague: false,
    topicMastery: {},
    levelHistory: [1],
    recentAnswers: [],
    completedLessons: [],
    unlockedGames: ["word-quest"]
  };
}

function ensureEnglishProgress(db, studentId, grade = "P4") {
  if (!db.progress[studentId]) db.progress[studentId] = {};
  if (!db.progress[studentId].English) {
    db.progress[studentId].English = defaultEnglishProgress(grade);
  }
  const progress = db.progress[studentId].English;
  if (!progress.completedLessons) progress.completedLessons = [];
  if (!progress.unlockedGames) progress.unlockedGames = ["word-quest"];
  if (!progress.topicMastery) progress.topicMastery = {};
  updateEnglishGameUnlocks(progress);
  return progress;
}

function englishTitleRank(level) {
  if (level >= 10) return "English Champion";
  if (level >= 7) return "Story Master";
  if (level >= 4) return "Sentence Builder";
  return "Word Explorer";
}

function updateEnglishGameUnlocks(progress) {
  const unlocks = new Set(progress.unlockedGames || ["word-quest"]);
  if (progress.adaptiveLevel >= 2) unlocks.add("grammar-ninja");
  if (progress.adaptiveLevel >= 2) unlocks.add("sentence-scramble");
  if (progress.adaptiveLevel >= 3) unlocks.add("vocab-match");
  if (progress.adaptiveLevel >= 3) unlocks.add("spelling-bee");
  if (progress.adaptiveLevel >= 4) unlocks.add("story-builder");
  if (progress.adaptiveLevel >= 5) unlocks.add("comprehension-castle");
  if (progress.adaptiveLevel >= 6) unlocks.add("edit-escape");
  if (progress.adaptiveLevel >= 8) unlocks.add("psle-boss");
  progress.unlockedGames = Array.from(unlocks);
  progress.unlockedChampionLeague = progress.adaptiveLevel >= 8;
  progress.titleRank = englishTitleRank(progress.adaptiveLevel);
}

function defaultScienceProgress(grade = "P4") {
  return {
    grade,
    adaptiveLevel: 1,
    correctStreak: 0,
    struggleStreak: 0,
    answered: 0,
    correct: 0,
    studyMinutes: 0,
    starsEarnedWeek: 0,
    topicMastery: {},
    levelHistory: [1],
    recentAnswers: []
  };
}

function ensureScienceProgress(db, studentId, grade = "P4") {
  if (!db.progress[studentId]) db.progress[studentId] = {};
  if (!db.progress[studentId].Science) {
    db.progress[studentId].Science = defaultScienceProgress(grade);
  }
  return db.progress[studentId].Science;
}

function resolveStudentForUser(db, user) {
  if (user.role === "student") return db.users.find((entry) => entry.id === user.id);
  if (user.role === "parent") {
    const ids = getLinkedStudentIds(user);
    const childId = ids[0];
    return db.users.find((entry) => entry.id === childId);
  }
  return db.users.find((entry) => entry.role === "student");
}

function resolveViewRole(user, viewAsRole) {
  const roles = getUserRoles(user);
  if (viewAsRole && roles.includes(viewAsRole)) return viewAsRole;
  return user.role;
}

function visibleSession(db, user, viewAsRole) {
  const effectiveRole = resolveViewRole(user, viewAsRole);

  if (effectiveRole === "admin") {
    const student = db.users.find((entry) => entry.role === "student");
    const parent = db.users.find((entry) => entry.id === student?.linkedParentId);
    if (student) {
      ensureChineseProgress(db, student.id);
      ensureEnglishProgress(db, student.id, student.grade);
      ensureScienceProgress(db, student.id, student.grade);
    }
    return {
      user,
      student,
      parent,
      children: db.users.filter((u) => u.role === "student"),
      subjects: ["Math", "Chinese", "English", "Science"],
      progress: db.progress[student?.id]?.Math,
      chineseProgress: student ? ensureChineseProgress(db, student.id) : { rememberedWords: {} },
      englishProgress: student ? ensureEnglishProgress(db, student.id, student.grade) : defaultEnglishProgress(),
      scienceProgress: student ? ensureScienceProgress(db, student.id, student.grade) : defaultScienceProgress(),
      messages: db.messages.filter((message) => message.studentId === student?.id).slice(-8).reverse()
    };
  }

  if (effectiveRole === "parent") {
    const childIds = getLinkedStudentIds(user);
    const children = childIds.map((id) => db.users.find((entry) => entry.id === id)).filter(Boolean);
    const student = children[0];
    if (student) {
      ensureChineseProgress(db, student.id);
      ensureEnglishProgress(db, student.id, student.grade);
      ensureScienceProgress(db, student.id, student.grade);
    }
    return {
      user,
      student,
      parent: user,
      children,
      subjects: ["Math", "Chinese", "English", "Science"],
      progress: student ? db.progress[student.id]?.Math : null,
      chineseProgress: student ? ensureChineseProgress(db, student.id) : { rememberedWords: {} },
      englishProgress: student ? ensureEnglishProgress(db, student.id, student.grade) : defaultEnglishProgress(),
      scienceProgress: student ? ensureScienceProgress(db, student.id, student.grade) : defaultScienceProgress(),
      messages: student ? db.messages.filter((message) => message.studentId === student.id).slice(-8).reverse() : []
    };
  }

  const studentId = user.id;
  const student = db.users.find((entry) => entry.id === studentId);
  const parent = db.users.find((entry) => entry.id === student?.linkedParentId);
  ensureChineseProgress(db, studentId);
  ensureEnglishProgress(db, studentId, student?.grade);
  ensureScienceProgress(db, studentId, student?.grade);
  return {
    user,
    student,
    parent,
    subjects: ["Math", "Chinese", "English", "Science"],
    progress: db.progress[studentId]?.Math,
    chineseProgress: ensureChineseProgress(db, studentId),
    englishProgress: ensureEnglishProgress(db, studentId, student?.grade),
    scienceProgress: ensureScienceProgress(db, studentId, student?.grade),
    messages: db.messages.filter((message) => message.studentId === studentId).slice(-8).reverse()
  };
}

function getNextQuestion(db, studentId) {
  const progress = db.progress[studentId].Math;
  const sameLevel = db.questions.filter(
    (question) => question.subject === "Math" && question.grade === progress.grade && question.level === progress.adaptiveLevel
  );
  const fallback = db.questions.filter((question) => question.subject === "Math" && question.grade === progress.grade);
  const pool = sameLevel.length ? sameLevel : fallback;
  const index = progress.answered % pool.length;
  return pool[index];
}

function getEnglishQuestionPool(db, studentId, options = {}) {
  const progress = ensureEnglishProgress(db, studentId);
  const grade = options.grade || progress.grade;
  const mode = options.mode || "smart";
  const topic = options.topic || "";
  let pool = db.questions.filter((question) => question.subject === "English" && question.grade === grade);

  if (mode === "topic" && topic) {
    pool = pool.filter((question) => question.topic === topic);
  } else if (mode === "weak") {
    const weakTopics = Object.entries(progress.topicMastery || {})
      .filter(([, value]) => value < 60)
      .map(([name]) => name);
    if (weakTopics.length) {
      pool = pool.filter((question) => weakTopics.includes(question.topic));
    }
  } else if (mode === "mixed") {
    const completedTopics = new Set(
      (progress.completedLessons || []).map((key) => key.split("|")[1]).filter(Boolean)
    );
    if (completedTopics.size) {
      pool = pool.filter((question) => completedTopics.has(question.topic));
    }
  } else if (mode === "psle") {
    pool = pool.filter((question) => ["P5", "P6"].includes(grade) || question.level >= 6);
  } else if (mode === "game" && options.game) {
    const gameTracks = {
      "word-quest": ["Inference & Vocabulary", "Prepositions & Conjunctions"],
      "grammar-ninja": ["Editing", "Subject-Verb Agreement"],
      "sentence-scramble": ["Subject-Verb Agreement", "Synthesis Basics"]
    };
    const topics = gameTracks[options.game] || [];
    if (topics.length) pool = pool.filter((question) => topics.includes(question.topic) || question.track === "Game");
  }

  if (mode === "smart" || mode === "psle") {
    const sameLevel = pool.filter((question) => question.level === progress.adaptiveLevel);
    if (sameLevel.length) pool = sameLevel;
  }

  if (!pool.length) {
    pool = db.questions.filter((question) => question.subject === "English" && question.grade === grade);
  }
  return { pool, progress };
}

function getNextEnglishQuestion(db, studentId, options = {}) {
  const { pool, progress } = getEnglishQuestionPool(db, studentId, options);
  if (!pool.length) return null;
  const index = progress.answered % pool.length;
  return pool[index];
}

function applyEnglishAnswer(progress, question, isCorrect) {
  progress.answered += 1;
  progress.correct += isCorrect ? 1 : 0;
  progress.correctStreak = isCorrect ? progress.correctStreak + 1 : 0;
  progress.struggleStreak = isCorrect ? 0 : progress.struggleStreak + 1;
  progress.recentAnswers.unshift({ topic: question.topic, correct: isCorrect, level: progress.adaptiveLevel });
  progress.recentAnswers = progress.recentAnswers.slice(0, 8);

  if (isCorrect) {
    progress.topicMastery[question.topic] = Math.min(100, (progress.topicMastery[question.topic] || 40) + 5);
    if (progress.correctStreak >= 3 && progress.adaptiveLevel < 10) {
      progress.adaptiveLevel += 1;
      progress.correctStreak = 0;
      progress.levelHistory.push(progress.adaptiveLevel);
    }
    progress.starsEarnedWeek = (progress.starsEarnedWeek || 0) + 2;
  } else {
    progress.topicMastery[question.topic] = Math.max(10, (progress.topicMastery[question.topic] || 40) - 4);
    if (progress.struggleStreak >= 2 && progress.adaptiveLevel > 1) {
      progress.adaptiveLevel -= 1;
      progress.struggleStreak = 0;
      progress.levelHistory.push(progress.adaptiveLevel);
    }
  }
  updateEnglishGameUnlocks(progress);
}

function normalizeAnswer(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "").replace(/,/g, "");
}

function normalizeQuestionPayload(payload, existingQuestion = {}) {
  const nextQuestion = { ...existingQuestion };
  const allowedFields = [
    "subject",
    "grade",
    "ageLevel",
    "topic",
    "level",
    "difficulty",
    "track",
    "prompt",
    "helpText",
    "type",
    "options",
    "answer",
    "acceptedAnswers",
    "explanation",
    "hint",
    "source",
    "imageUrl"
  ];

  for (const field of allowedFields) {
    if (field in payload) {
      if (field === "level") {
        nextQuestion[field] = Number(payload[field]);
      } else if (field === "options" || field === "acceptedAnswers") {
        nextQuestion[field] = Array.isArray(payload[field]) ? payload[field].map((item) => String(item).trim()).filter(Boolean) : [];
      } else {
        nextQuestion[field] = String(payload[field] || "").trim();
      }
    }
  }

  return nextQuestion;
}

function validateQuestion(question) {
  if (!question.id || !question.subject || !question.grade || !question.topic || !question.prompt || !question.answer) {
    return "Question requires id, subject, grade, topic, prompt and answer";
  }
  if (!Number.isInteger(question.level) || question.level < 1 || question.level > 10) {
    return "Level must be an integer from 1 to 10";
  }
  if (!["multiple", "input"].includes(question.type)) {
    return "Type must be multiple or input";
  }
  if (question.type === "multiple" && (!Array.isArray(question.options) || question.options.length < 2)) {
    return "Multiple-choice questions need at least two options";
  }
  return null;
}

app.get("/api/health", (_req, res) => {
  const storage = isSupabaseEnabled() ? "supabase" : process.env.VERCEL ? "memory" : "local";
  res.json({
    ok: true,
    name: "EduSG API",
    storage,
    persistent: storage !== "memory",
    collections: [
      "users",
      "progress",
      "questions",
      "messages",
      "achievements",
      "goals",
      "studySessions",
      "notifications",
      "rewardsCatalog",
      "platformSettings",
      "auditEvents"
    ]
  });
});

function recordLogin(db, user, method = "password") {
  db.loginEvents = db.loginEvents || [];
  const at = new Date().toISOString();
  db.loginEvents.push({ id: `login-${Date.now()}`, userId: user.id, method, at });
  user.loginCount = (user.loginCount || 0) + 1;
  user.lastLoginAt = at;
}

app.post("/api/auth/login", async (req, res) => {
  const db = await readDb();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  const user = db.users.find((entry) => String(entry.email || "").toLowerCase() === email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  recordLogin(db, user);
  await writeDb(db);
  res.json(visibleSession(db, user, req.body.role));
});

app.post("/api/auth/oauth", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const provider = String(req.body.provider || "oauth").trim();
  if (!email) return res.status(400).json({ error: "Email is required" });

  const db = await readDb();
  const user = db.users.find((entry) => String(entry.email || "").toLowerCase() === email);
  if (!user) {
    return res.status(404).json({
      error: "No pre-registered EduSG account for this email. Use your school email or contact an admin."
    });
  }

  recordLogin(db, user, provider);
  await writeDb(db);
  res.json(visibleSession(db, user));
});

app.post("/api/auth/register", async (req, res) => {
  const db = await readDb();
  const role = String(req.body.role || "student").trim();
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!name || !email || password.length < 6) {
    return res.status(400).json({ error: "Name, email and password (6+ chars) are required" });
  }
  if (db.users.some((entry) => String(entry.email || "").toLowerCase() === email)) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const idBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || role;
  let id = `${role}-${idBase}`;
  if (db.users.some((entry) => entry.id === id)) id = `${id}-${Date.now()}`;

  const user = ensureUserAuthFields({
    id,
    role,
    name,
    email,
    passwordHash: hashPassword(password),
    grade: req.body.grade ? String(req.body.grade).trim() : undefined,
    avatar: String(req.body.avatar || name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "U"),
    linkedStudentId: req.body.linkedStudentId ? String(req.body.linkedStudentId).trim() : undefined,
    linkedParentId: req.body.linkedParentId ? String(req.body.linkedParentId).trim() : undefined,
    currentSubject: role === "student" ? "Math" : undefined,
    stars: role === "student" ? 0 : undefined,
    streak: role === "student" ? 0 : undefined,
    loginCount: 0,
    registeredAt: new Date().toISOString(),
    lastLoginAt: null
  });

  db.users.push(user);
  if (role === "student") {
    db.progress[user.id] = {
      Math: {
        grade: user.grade || "P4",
        adaptiveLevel: 1,
        correctStreak: 0,
        struggleStreak: 0,
        answered: 0,
        correct: 0,
        studyMinutes: 0,
        starsEarnedWeek: 0,
        unlockedOlympiad: false,
        topicMastery: {},
        levelHistory: [1],
        recentAnswers: []
      },
      English: defaultEnglishProgress(user.grade || "P4")
    };
  }

  recordLogin(db, user, "register");
  await writeDb(db);
  res.status(201).json(visibleSession(db, user));
});

app.get("/api/admin/student-insights", auth, requireRole("admin"), async (req, res) => {
  res.json(buildAllStudentInsights(req.db));
});

app.get("/api/admin/student-insights/:studentId", auth, requireRole("admin"), async (req, res) => {
  const user = req.db.users.find((entry) => entry.id === req.params.studentId && entry.role === "student");
  if (!user) return res.status(404).json({ error: "Student not found" });
  res.json(buildStudentInsight(user, req.db));
});

app.post("/api/login", async (req, res) => {
  const db = await readDb();
  if (req.body.email && req.body.password) {
    const email = String(req.body.email).trim().toLowerCase();
    const user = db.users.find((entry) => String(entry.email || "").toLowerCase() === email);
    if (!user || !verifyPassword(req.body.password, user.passwordHash)) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    recordLogin(db, user, "password");
    await writeDb(db);
    return res.json(visibleSession(db, user));
  }

  const role = req.body.role || "student";
  const user = db.users.find((entry) => entry.role === role) || db.users[0];
  recordLogin(db, user, "demo-role");
  await writeDb(db);
  res.json(visibleSession(db, user));
});

app.get("/api/session/:userId", async (req, res) => {
  const db = await readDb();
  const user = db.users.find((entry) => entry.id === req.params.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(visibleSession(db, user, req.query.role));
});

app.get("/api/question/:studentId", async (req, res) => {
  const db = await readDb();
  if (!db.progress[req.params.studentId]) return res.status(404).json({ error: "Student progress not found" });
  res.json(getNextQuestion(db, req.params.studentId));
});

app.get("/api/admin/questions", async (req, res) => {
  const db = await readDb();
  const grade = req.query.grade;
  const subject = req.query.subject || "Math";
  let questions = db.questions.filter((question) => question.subject === subject);
  if (grade) {
    questions = questions.filter((question) => question.grade === grade);
  }
  questions.sort((a, b) => {
      const trackCompare = String(a.track || "").localeCompare(String(b.track || ""));
      if (trackCompare !== 0) return trackCompare;
      const levelCompare = Number(a.level || 0) - Number(b.level || 0);
      if (levelCompare !== 0) return levelCompare;
      return String(a.id).localeCompare(String(b.id));
    });
  res.json({ questions });
});

app.get("/api/admin/platform", auth, requireRole("admin"), async (req, res) => {
  res.json({
    stats: questionStats(req.db),
    settings: {
      ...req.db.platformSettings,
      adaptiveLevels: req.db.platformSettings?.adaptiveLevels || 10,
      aiSimilarGeneration: Boolean(process.env.OPENAI_API_KEY),
      questionImageUploads: true,
      subjects: req.db.platformSettings?.subjects || ["Math", "Chinese", "English", "Science"]
    }
  });
});

app.get("/api/admin/platform-public", async (_req, res) => {
  const db = await readDb();
  res.json({
    stats: questionStats(db),
    settings: db.platformSettings || {}
  });
});

app.get("/api/admin/users", async (_req, res) => {
  const db = await readDb();
  res.json({ users: db.users || [] });
});

app.post("/api/admin/users", async (req, res) => {
  const db = await readDb();
  const role = String(req.body.role || "student").trim();
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ error: "Name is required" });
  const idBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || role;
  let id = `${role}-${idBase}`;
  if ((db.users || []).some((user) => user.id === id)) id = `${id}-${Date.now()}`;
  const user = {
    id,
    role,
    name,
    email: req.body.email ? String(req.body.email).trim().toLowerCase() : undefined,
    passwordHash: req.body.password ? hashPassword(String(req.body.password)) : undefined,
    grade: req.body.grade ? String(req.body.grade).trim() : undefined,
    avatar: String(req.body.avatar || name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "U"),
    linkedStudentId: req.body.linkedStudentId ? String(req.body.linkedStudentId).trim() : undefined,
    linkedParentId: req.body.linkedParentId ? String(req.body.linkedParentId).trim() : undefined,
    currentSubject: req.body.currentSubject ? String(req.body.currentSubject).trim() : undefined,
    stars: role === "student" ? 0 : undefined,
    streak: role === "student" ? 0 : undefined
  };
  Object.keys(user).forEach((key) => user[key] === undefined && delete user[key]);
  ensureUserAuthFields(user);
  db.users.push(user);
  if (role === "student") {
    db.progress[user.id] = db.progress[user.id] || {
      Math: {
        grade: user.grade || "P4",
        adaptiveLevel: 1,
        correctStreak: 0,
        struggleStreak: 0,
        answered: 0,
        correct: 0,
        studyMinutes: 0,
        starsEarnedWeek: 0,
        unlockedOlympiad: false,
        topicMastery: {},
        levelHistory: [1],
        recentAnswers: []
      },
      English: defaultEnglishProgress(user.grade || "P4")
    };
  }
  await writeDb(db);
  res.status(201).json({ user });
});

app.patch("/api/admin/users/:userId", async (req, res) => {
  const db = await readDb();
  const user = db.users.find((entry) => entry.id === req.params.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  for (const field of ["role", "name", "grade", "avatar", "linkedStudentId", "linkedParentId", "currentSubject"]) {
    if (field in req.body) user[field] = String(req.body[field] || "").trim();
  }
  if (Array.isArray(req.body.linkedStudentIds)) {
    user.linkedStudentIds = req.body.linkedStudentIds;
    user.linkedStudentId = req.body.linkedStudentIds[0] || user.linkedStudentId;
  }
  recordAudit(db, req.body.adminUserId || "system", "user.update", { userId: user.id });
  await writeDb(db);
  res.json({ user });
});

app.post("/api/admin/question-images", async (req, res) => {
  const dataUrl = String(req.body.dataUrl || "");
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
  if (!match) return res.status(400).json({ error: "Upload must be a PNG, JPG or WEBP data URL" });
  const ext = match[1] === "jpeg" ? "jpg" : match[1];
  const safeName = String(req.body.filename || `question-${Date.now()}`)
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "question";
  const fileName = `${safeName}-${Date.now()}.${ext}`;
  const mimeTypes = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };

  try {
    const imageUrl = await uploadQuestionImage(Buffer.from(match[2], "base64"), fileName, mimeTypes[ext] || "image/png");
    res.status(201).json({ imageUrl });
  } catch (error) {
    res.status(500).json({ error: error.message || "Upload failed" });
  }
});

app.patch("/api/admin/questions/:questionId", async (req, res) => {
  const db = await readDb();
  const question = db.questions.find((entry) => entry.id === req.params.questionId);
  if (!question) return res.status(404).json({ error: "Question not found" });

  Object.assign(question, normalizeQuestionPayload(req.body, question));

  const validationError = validateQuestion(question);
  if (validationError) return res.status(400).json({ error: validationError });

  await writeDb(db);
  res.json({ question });
});

app.post("/api/admin/questions", async (req, res) => {
  const db = await readDb();
  const idBase = String(req.body.id || req.body.prompt || "question")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  let id = req.body.id ? String(req.body.id).trim() : `admin-${Date.now()}-${idBase || "question"}`;
  if (db.questions.some((entry) => entry.id === id)) {
    id = `${id}-${Date.now()}`;
  }

  const question = normalizeQuestionPayload(req.body, {
    id,
    subject: "Math",
    grade: "P4",
    ageLevel: "P4",
    topic: "Olympiad Patterns",
    level: 8,
    difficulty: "Medium",
    track: "Olympiad",
    type: "multiple",
    options: ["A", "B", "C", "D"],
    acceptedAnswers: [],
    helpText: "",
    explanation: "",
    hint: "",
    source: "Admin-created",
    imageUrl: ""
  });
  question.id = id;

  const validationError = validateQuestion(question);
  if (validationError) return res.status(400).json({ error: validationError });

  db.questions.push(question);
  await writeDb(db);
  res.status(201).json({ question });
});

app.post("/api/admin/questions/:questionId/generate-similar", async (req, res) => {
  const db = await readDb();
  const source = db.questions.find((entry) => entry.id === req.params.questionId);
  if (!source) return res.status(404).json({ error: "Question not found" });
  if (source.imageUrl) return res.status(400).json({ error: "AI similar generation is only enabled for text-only questions" });

  let generated = null;
  let usedAI = false;
  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
          input: `Create one similar Primary School question as JSON only with keys prompt, options, answer, explanation, hint. Keep same subject, grade, topic, type, difficulty and do not require a diagram.\n\nSource question:\n${JSON.stringify(source)}`
        })
      });
      if (response.ok) {
        const data = await response.json();
        const text = data.output_text || data.output?.flatMap((item) => item.content || []).map((part) => part.text || "").join("");
        generated = JSON.parse(String(text || "").replace(/^```json|```$/g, "").trim());
        usedAI = true;
      }
    } catch {
      generated = null;
    }
  }

  if (!generated) {
    generated = {
      prompt: `${source.prompt} (similar practice)`,
      options: source.type === "multiple" ? [...(source.options || [])] : [],
      answer: source.answer,
      explanation: `This similar item follows the same method: ${source.explanation || source.helpText}`,
      hint: source.hint || source.helpText || "Use the same strategy as the original question."
    };
  }

  const similarQuestion = normalizeQuestionPayload(
    {
      ...source,
      ...generated,
      id: undefined,
      source: `AI similar to ${source.id}`,
      imageUrl: ""
    },
    {
      id: `ai-similar-${Date.now()}-${source.id}`,
      subject: source.subject,
      grade: source.grade,
      ageLevel: source.ageLevel || source.grade,
      topic: source.topic,
      level: source.level,
      difficulty: source.difficulty || "Medium",
      track: source.track || "Core",
      type: source.type,
      options: [],
      acceptedAnswers: []
    }
  );
  similarQuestion.id = `ai-similar-${Date.now()}-${source.id}`;

  const validationError = validateQuestion(similarQuestion);
  if (validationError) return res.status(400).json({ error: validationError });

  db.questions.push(similarQuestion);
  await writeDb(db);
  res.status(201).json({ question: similarQuestion, usedAI });
});

app.post("/api/answer", async (req, res) => {
  const db = await readDb();
  const { studentId, questionId, answer } = req.body;
  const question = db.questions.find((entry) => entry.id === questionId);
  const progress = db.progress[studentId]?.Math;
  if (!question || !progress) return res.status(404).json({ error: "Question or progress not found" });

  const accepted = [question.answer, ...(question.acceptedAnswers || [])].map(normalizeAnswer);
  const isCorrect = accepted.includes(normalizeAnswer(answer));
  progress.answered += 1;
  progress.correct += isCorrect ? 1 : 0;
  progress.correctStreak = isCorrect ? progress.correctStreak + 1 : 0;
  progress.struggleStreak = isCorrect ? 0 : progress.struggleStreak + 1;
  progress.recentAnswers.unshift({ topic: question.topic, correct: isCorrect, level: progress.adaptiveLevel });
  progress.recentAnswers = progress.recentAnswers.slice(0, 8);

  if (isCorrect) {
    progress.topicMastery[question.topic] = Math.min(100, (progress.topicMastery[question.topic] || 40) + 5);
    if (progress.correctStreak >= 3 && progress.adaptiveLevel < 10) {
      progress.adaptiveLevel += 1;
      progress.correctStreak = 0;
      progress.levelHistory.push(progress.adaptiveLevel);
    }
  } else {
    progress.topicMastery[question.topic] = Math.max(10, (progress.topicMastery[question.topic] || 40) - 4);
    if (progress.struggleStreak >= 2 && progress.adaptiveLevel > 1) {
      progress.adaptiveLevel -= 1;
      progress.struggleStreak = 0;
      progress.levelHistory.push(progress.adaptiveLevel);
    }
  }

  progress.unlockedOlympiad = progress.adaptiveLevel >= 8;
  incrementStudyMinutes(db, studentId, "Math", 2);
  const student = db.users.find((u) => u.id === studentId);
  if (student) student.lastActiveAt = new Date().toISOString();
  checkAchievements(db, studentId, progress, "Math");

  db.answerEvents = db.answerEvents || [];
  db.answerEvents.push({
    id: `ans-${Date.now()}`,
    studentId,
    questionId,
    subject: question.subject,
    topic: question.topic,
    level: question.level,
    difficulty: question.difficulty || "Medium",
    correct: isCorrect,
    at: new Date().toISOString()
  });

  await writeDb(db);

  res.json({
    isCorrect,
    explanation: question.explanation,
    progress,
    nextQuestion: getNextQuestion(db, studentId)
  });
});

app.get("/api/english/question/:studentId", async (req, res) => {
  const db = await readDb();
  const studentId = req.params.studentId;
  if (!db.progress[studentId]) return res.status(404).json({ error: "Student progress not found" });
  const question = getNextEnglishQuestion(db, studentId, {
    mode: req.query.mode || "smart",
    grade: req.query.grade,
    topic: req.query.topic,
    game: req.query.game
  });
  const progress = ensureEnglishProgress(db, studentId);
  res.json({ question, progress });
});

app.post("/api/english/answer", async (req, res) => {
  const db = await readDb();
  const { studentId, questionId, answer, mode, grade, topic, game } = req.body;
  const question = db.questions.find((entry) => entry.id === questionId);
  const progress = ensureEnglishProgress(db, studentId);
  if (!question || question.subject !== "English") {
    return res.status(404).json({ error: "English question or progress not found" });
  }

  const accepted = [question.answer, ...(question.acceptedAnswers || [])].map(normalizeAnswer);
  const isCorrect = accepted.includes(normalizeAnswer(answer));
  applyEnglishAnswer(progress, question, isCorrect);
  incrementStudyMinutes(db, studentId, "English", 2);
  const student = db.users.find((u) => u.id === studentId);
  if (student) student.lastActiveAt = new Date().toISOString();
  checkAchievements(db, studentId, progress, "English");

  db.answerEvents = db.answerEvents || [];
  db.answerEvents.push({
    id: `ans-${Date.now()}`,
    studentId,
    questionId,
    subject: "English",
    topic: question.topic,
    level: question.level,
    difficulty: question.difficulty || "Medium",
    correct: isCorrect,
    at: new Date().toISOString()
  });

  await writeDb(db);

  res.json({
    isCorrect,
    explanation: question.explanation,
    hint: question.hint,
    progress,
    nextQuestion: getNextEnglishQuestion(db, studentId, { mode: mode || "smart", grade, topic, game })
  });
});

app.post("/api/english/lesson-complete", async (req, res) => {
  const db = await readDb();
  const { studentId, lessonKey } = req.body;
  if (!studentId || !lessonKey) return res.status(400).json({ error: "Missing studentId or lessonKey" });
  const progress = ensureEnglishProgress(db, studentId);
  const completed = new Set(progress.completedLessons || []);
  completed.add(lessonKey);
  progress.completedLessons = Array.from(completed);
  const [, topic] = String(lessonKey).split("|");
  if (topic) {
    progress.topicMastery[topic] = Math.min(100, (progress.topicMastery[topic] || 30) + 10);
  }
  await writeDb(db);
  res.json({ progress });
});

app.post("/api/chinese/remember", async (req, res) => {
  const db = await readDb();
  const { studentId, wordKey } = req.body;
  if (!studentId || !wordKey) {
    return res.status(400).json({ error: "Missing studentId or wordKey" });
  }

  const chineseProgress = ensureChineseProgress(db, studentId);
  const [grade] = String(wordKey).split("|");
  if (!grade) return res.status(400).json({ error: "Invalid wordKey" });

  const remembered = new Set(chineseProgress.rememberedWords[grade] || []);
  remembered.add(wordKey);
  chineseProgress.rememberedWords[grade] = Array.from(remembered);
  await writeDb(db);

  res.json({ chineseProgress });
});

app.post("/api/messages", async (req, res) => {
  const db = await readDb();
  const sender = db.users.find((entry) => entry.id === req.body.senderId);
  const studentId = req.body.studentId;
  const text = String(req.body.text || "").trim();
  if (!sender || !studentId || !text) return res.status(400).json({ error: "Missing sender, student, or message" });

  db.messages.push({
    id: `msg-${Date.now()}`,
    studentId,
    senderId: sender.id,
    senderName: sender.name,
    text,
    createdAt: new Date().toISOString()
  });

  const student = db.users.find((u) => u.id === studentId);
  if (student) {
    db.notifications = db.notifications || [];
    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: studentId,
      type: "parent",
      title: `Message from ${sender.name}`,
      body: text.slice(0, 100),
      read: false,
      createdAt: new Date().toISOString()
    });
  }

  await writeDb(db);
  res.json({ messages: db.messages.filter((message) => message.studentId === studentId).slice(-8).reverse() });
});

// --- Dashboard APIs ---

app.get("/api/dashboard/student", auth, requireRole("student"), async (req, res) => {
  const payload = buildStudentDashboardPayload(req.user, req.db);
  await writeDb(req.db);
  res.json(payload);
});

app.get("/api/dashboard/parent", auth, requireRole("parent"), async (req, res) => {
  res.json(buildParentDashboardPayload(req.user, req.db));
});

app.get("/api/dashboard/parent/:childId", auth, requireRole("parent", "admin"), async (req, res) => {
  if (req.user.role === "parent") {
    const ids = getLinkedStudentIds(req.user);
    if (!ids.includes(req.params.childId)) return res.status(403).json({ error: "Not linked to this student" });
  }
  const report = buildChildReportPayload(req.params.childId, req.db);
  if (!report) return res.status(404).json({ error: "Student not found" });
  res.json(report);
});

app.patch("/api/dashboard/parent/:childId/goals", auth, requireRole("parent"), async (req, res) => {
  const ids = getLinkedStudentIds(req.user);
  if (!ids.includes(req.params.childId)) return res.status(403).json({ error: "Not linked to this student" });
  req.db.goals = req.db.goals || [];
  const goal = {
    id: `goal-${Date.now()}`,
    studentId: req.params.childId,
    setBy: "parent",
    subject: String(req.body.subject || "All"),
    target: String(req.body.target || "Weekly practice"),
    targetCount: Number(req.body.targetCount) || 10,
    progress: 0,
    dueAt: req.body.dueAt || new Date(Date.now() + 7 * 86400000).toISOString(),
    createdAt: new Date().toISOString()
  };
  req.db.goals.push(goal);
  await writeDb(req.db);
  res.status(201).json({ goal });
});

app.get("/api/achievements/:studentId", auth, async (req, res) => {
  const { studentId } = req.params;
  if (req.user.role === "student" && req.user.id !== studentId) return res.status(403).json({ error: "Forbidden" });
  if (req.user.role === "parent" && !getLinkedStudentIds(req.user).includes(studentId)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const achievements = (req.db.achievements || []).filter((a) => a.studentId === studentId);
  res.json({ achievements });
});

app.get("/api/calendar/:studentId", auth, async (req, res) => {
  const { studentId } = req.params;
  if (req.user.role === "student" && req.user.id !== studentId) return res.status(403).json({ error: "Forbidden" });
  const sessions = (req.db.studySessions || []).filter((s) => s.studentId === studentId);
  const goals = (req.db.goals || []).filter((g) => g.studentId === studentId);
  res.json({ sessions, goals });
});

app.get("/api/rewards/catalog", auth, async (req, res) => {
  res.json({ catalog: req.db.rewardsCatalog || [], balance: req.user.stars || 0 });
});

app.post("/api/rewards/redeem", auth, requireRole("student"), async (req, res) => {
  const rewardId = String(req.body.rewardId || "");
  const reward = (req.db.rewardsCatalog || []).find((r) => r.id === rewardId);
  if (!reward) return res.status(404).json({ error: "Reward not found" });
  if ((req.user.stars || 0) < reward.cost) return res.status(400).json({ error: "Not enough stars" });
  req.user.stars -= reward.cost;
  req.db.rewardRedemptions = req.db.rewardRedemptions || [];
  req.db.rewardRedemptions.push({
    id: `redeem-${Date.now()}`,
    userId: req.user.id,
    rewardId,
    at: new Date().toISOString()
  });
  await writeDb(req.db);
  res.json({ stars: req.user.stars, reward });
});

app.get("/api/notifications", auth, async (req, res) => {
  const notifications = (req.db.notifications || []).filter((n) => n.userId === req.user.id);
  res.json({ notifications });
});

app.patch("/api/notifications/:id/read", auth, async (req, res) => {
  const notif = (req.db.notifications || []).find((n) => n.id === req.params.id && n.userId === req.user.id);
  if (!notif) return res.status(404).json({ error: "Notification not found" });
  notif.read = true;
  await writeDb(req.db);
  res.json({ notification: notif });
});

app.get("/api/admin/dashboard", auth, requireRole("admin"), async (req, res) => {
  res.json(buildAdminDashboardPayload(req.db));
});

app.get("/api/admin/activity", auth, requireRole("admin"), async (req, res) => {
  res.json({ activity: buildAdminDashboardPayload(req.db).activityFeed });
});

app.patch("/api/admin/platform", auth, requireRole("admin"), async (req, res) => {
  req.db.platformSettings = { ...req.db.platformSettings, ...req.body };
  recordAudit(req.db, req.user.id, "platform.update", req.body);
  await writeDb(req.db);
  res.json({ settings: req.db.platformSettings });
});

app.get("/api/admin/messages", auth, requireRole("admin"), async (req, res) => {
  res.json({ messages: (req.db.messages || []).slice().reverse() });
});

app.get("/api/admin/audit", auth, requireRole("admin"), async (req, res) => {
  res.json({ events: req.db.auditEvents || [] });
});

app.post("/api/science/answer", async (req, res) => {
  const db = await readDb();
  const { studentId, questionId, answer } = req.body;
  const question = db.questions.find((entry) => entry.id === questionId);
  const progress = ensureScienceProgress(db, studentId);
  if (!question || question.subject !== "Science") return res.status(404).json({ error: "Science question not found" });

  const accepted = [question.answer, ...(question.acceptedAnswers || [])].map(normalizeAnswer);
  const isCorrect = accepted.includes(normalizeAnswer(answer));
  progress.answered += 1;
  progress.correct += isCorrect ? 1 : 0;
  progress.correctStreak = isCorrect ? progress.correctStreak + 1 : 0;
  progress.struggleStreak = isCorrect ? 0 : progress.struggleStreak + 1;
  progress.recentAnswers.unshift({ topic: question.topic, correct: isCorrect, level: progress.adaptiveLevel });
  progress.recentAnswers = progress.recentAnswers.slice(0, 8);

  if (isCorrect) {
    progress.topicMastery[question.topic] = Math.min(100, (progress.topicMastery[question.topic] || 40) + 5);
    if (progress.correctStreak >= 3 && progress.adaptiveLevel < 10) {
      progress.adaptiveLevel += 1;
      progress.correctStreak = 0;
      progress.levelHistory.push(progress.adaptiveLevel);
    }
  } else {
    progress.topicMastery[question.topic] = Math.max(10, (progress.topicMastery[question.topic] || 40) - 4);
    if (progress.struggleStreak >= 2 && progress.adaptiveLevel > 1) {
      progress.adaptiveLevel -= 1;
      progress.struggleStreak = 0;
      progress.levelHistory.push(progress.adaptiveLevel);
    }
  }

  incrementStudyMinutes(db, studentId, "Science", 2);
  const student = db.users.find((u) => u.id === studentId);
  if (student) student.lastActiveAt = new Date().toISOString();
  checkAchievements(db, studentId, progress, "Science");

  db.answerEvents = db.answerEvents || [];
  db.answerEvents.push({
    id: `ans-${Date.now()}`,
    studentId,
    questionId,
    subject: "Science",
    topic: question.topic,
    level: question.level,
    difficulty: question.difficulty || "Medium",
    correct: isCorrect,
    at: new Date().toISOString()
  });

  await writeDb(db);
  res.json({ isCorrect, explanation: question.explanation, progress });
});

app.patch("/api/users/me", auth, async (req, res) => {
  const allowed = ["name", "avatar", "grade", "dailyMinutesTarget", "notificationPrefs", "currentSubject"];
  for (const field of allowed) {
    if (field in req.body) req.user[field] = req.body[field];
  }
  await writeDb(req.db);
  res.json({ user: req.user });
});

if (!process.env.VERCEL) {
  app.use(express.static(path.join(rootDir, "dist")));
}

export default app;
