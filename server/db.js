import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { seedDatabase } from "./seed.js";
import { ensureUserAuthFields } from "./auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const dataPath = path.join(rootDir, "data", "database.json");

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const useSupabase = Boolean(supabaseUrl && supabaseServiceKey);
const isServerless = process.env.VERCEL === "1";
let memoryDb = null;

let supabase = null;
if (useSupabase) {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function emptyDb() {
  return {
    users: [],
    progress: {},
    messages: [],
    questions: [],
    loginEvents: [],
    answerEvents: [],
    achievements: [],
    goals: [],
    studySessions: [],
    notifications: [],
    rewardsCatalog: [],
    rewardRedemptions: [],
    platformSettings: {
      subjects: ["Math", "Chinese", "English", "Science"],
      adaptiveLevels: 10,
      featureFlags: { rewards: true, achievements: true }
    },
    auditEvents: []
  };
}

function ensureDbShape(db) {
  db.loginEvents = db.loginEvents || [];
  db.answerEvents = db.answerEvents || [];
  db.achievements = db.achievements || [];
  db.goals = db.goals || [];
  db.studySessions = db.studySessions || [];
  db.notifications = db.notifications || [];
  db.rewardsCatalog = db.rewardsCatalog || [];
  db.rewardRedemptions = db.rewardRedemptions || [];
  db.auditEvents = db.auditEvents || [];
  db.platformSettings = db.platformSettings || {
    subjects: ["Math", "Chinese", "English", "Science"],
    adaptiveLevels: 10,
    featureFlags: { rewards: true, achievements: true }
  };
  let changed = false;
  for (const user of db.users || []) {
    const before = JSON.stringify(user);
    ensureUserAuthFields(user);
    if (JSON.stringify(user) !== before) changed = true;
  }
  return changed;
}

function seedDemoEvents(db) {
  if (db.answerEvents.length || !db.progress?.["stu-jayden"]) return false;

  const now = Date.now();
  const studentId = "stu-jayden";
  const math = db.progress[studentId].Math;
  const samples = [
    { topic: "Fractions", level: 4, difficulty: "Medium", correct: true, daysAgo: 1 },
    { topic: "Fractions", level: 4, difficulty: "Medium", correct: false, daysAgo: 2 },
    { topic: "Geometry", level: 6, difficulty: "Medium", correct: true, daysAgo: 3 },
    { topic: "Whole Numbers", level: 3, difficulty: "Easy", correct: true, daysAgo: 4 },
    { topic: "Decimals", level: 4, difficulty: "Medium", correct: false, daysAgo: 5 },
    { topic: "Olympiad Patterns", level: 8, difficulty: "Hard", correct: true, daysAgo: 6 },
    { topic: "Fractions", level: 5, difficulty: "Medium", correct: true, daysAgo: 0 }
  ];

  db.answerEvents = samples.map((sample, index) => ({
    id: `ans-seed-${index}`,
    studentId,
    questionId: `seed-q-${index}`,
    subject: "Math",
    topic: sample.topic,
    level: sample.level,
    difficulty: sample.difficulty,
    correct: sample.correct,
    at: new Date(now - sample.daysAgo * 24 * 60 * 60 * 1000).toISOString()
  }));

  db.loginEvents = [0, 1, 2, 4, 6].map((daysAgo, index) => ({
    id: `login-seed-${index}`,
    userId: studentId,
    method: "password",
    at: new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString()
  }));

  const student = db.users.find((user) => user.id === studentId);
  if (student) {
    student.loginCount = db.loginEvents.length;
    student.lastLoginAt = db.loginEvents[0].at;
    student.streak = 12;
  }

  if (math) {
    math.studyMinutes = math.studyMinutes || 260;
    math.answered = Math.max(math.answered || 0, db.answerEvents.length);
    math.correct = db.answerEvents.filter((event) => event.correct).length;
  }

  return true;
}

function mergeArrayById(target = [], seed = [], idKey = "id") {
  const existingIds = new Set(target.map((item) => item[idKey]));
  const missing = seed.filter((item) => !existingIds.has(item[idKey]));
  if (!missing.length) return { items: target, changed: false };
  return { items: [...target, ...missing], changed: true };
}

function mergeSeed(db) {
  const existingIds = new Set((db.questions || []).map((question) => question.id));
  const missingQuestions = seedDatabase.questions.filter((question) => !existingIds.has(question.id));
  const existingUserIds = new Set((db.users || []).map((user) => user.id));
  const missingUsers = seedDatabase.users.filter((user) => !existingUserIds.has(user.id));
  let changed = false;
  if (missingQuestions.length || missingUsers.length) {
    db.questions = [...(db.questions || []), ...missingQuestions];
    db.users = [...(db.users || []), ...missingUsers];
    changed = true;
  }
  for (const [studentId, seedProgress] of Object.entries(seedDatabase.progress || {})) {
    if (!db.progress[studentId]) {
      db.progress[studentId] = structuredClone(seedProgress);
      changed = true;
      continue;
    }
    for (const [subject, subjectProgress] of Object.entries(seedProgress)) {
      if (!db.progress[studentId][subject]) {
        db.progress[studentId][subject] = structuredClone(subjectProgress);
        changed = true;
      }
    }
  }
  for (const key of [
    "achievements",
    "goals",
    "studySessions",
    "notifications",
    "rewardsCatalog",
    "rewardRedemptions",
    "auditEvents"
  ]) {
    const merged = mergeArrayById(db[key] || [], seedDatabase[key] || []);
    if (merged.changed) {
      db[key] = merged.items;
      changed = true;
    }
  }
  if (!db.messages?.length && seedDatabase.messages?.length) {
    db.messages = structuredClone(seedDatabase.messages);
    changed = true;
  }
  if (!db.platformSettings || !Object.keys(db.platformSettings).length) {
    db.platformSettings = structuredClone(seedDatabase.platformSettings);
    changed = true;
  } else {
    const mergedSettings = {
      ...structuredClone(seedDatabase.platformSettings),
      ...db.platformSettings,
      featureFlags: {
        ...seedDatabase.platformSettings?.featureFlags,
        ...db.platformSettings?.featureFlags
      }
    };
    if (JSON.stringify(mergedSettings) !== JSON.stringify(db.platformSettings)) {
      db.platformSettings = mergedSettings;
      changed = true;
    }
  }
  if (ensureDbShape(db)) changed = true;
  if (seedDemoEvents(db)) changed = true;
  return changed;
}

function supabaseRowToDb(data) {
  return {
    users: data.users || [],
    progress: data.progress || {},
    messages: data.messages || [],
    questions: data.questions || [],
    loginEvents: data.login_events || data.loginEvents || [],
    answerEvents: data.answer_events || data.answerEvents || [],
    achievements: data.achievements || [],
    goals: data.goals || [],
    studySessions: data.study_sessions || data.studySessions || [],
    notifications: data.notifications || [],
    rewardsCatalog: data.rewards_catalog || data.rewardsCatalog || [],
    rewardRedemptions: data.reward_redemptions || data.rewardRedemptions || [],
    platformSettings: data.platform_settings || data.platformSettings || emptyDb().platformSettings,
    auditEvents: data.audit_events || data.auditEvents || []
  };
}

function dbToSupabaseRow(db) {
  return {
    id: "main",
    users: db.users,
    progress: db.progress,
    messages: db.messages,
    questions: db.questions,
    login_events: db.loginEvents,
    answer_events: db.answerEvents,
    achievements: db.achievements || [],
    goals: db.goals || [],
    study_sessions: db.studySessions || [],
    notifications: db.notifications || [],
    rewards_catalog: db.rewardsCatalog || [],
    reward_redemptions: db.rewardRedemptions || [],
    platform_settings: db.platformSettings || emptyDb().platformSettings,
    audit_events: db.auditEvents || [],
    updated_at: new Date().toISOString()
  };
}

async function readServerlessDb() {
  if (!memoryDb) {
    memoryDb = structuredClone(seedDatabase);
    mergeSeed(memoryDb);
  }
  return memoryDb;
}

async function writeServerlessDb(db) {
  memoryDb = db;
}

async function readLocalDb() {
  if (isServerless) return readServerlessDb();

  try {
    await fs.access(dataPath);
    const db = JSON.parse(await fs.readFile(dataPath, "utf8"));
    if (mergeSeed(db)) {
      await writeLocalDb(db);
    }
    return db;
  } catch {
    await fs.mkdir(path.dirname(dataPath), { recursive: true });
    const db = structuredClone(seedDatabase);
    mergeSeed(db);
    await writeLocalDb(db);
    return db;
  }
}

async function writeLocalDb(db) {
  if (isServerless) return writeServerlessDb(db);
  await fs.writeFile(dataPath, JSON.stringify(db, null, 2));
}

async function readSupabaseDb() {
  const { data, error } = await supabase.from("app_state").select("*").eq("id", "main").maybeSingle();
  if (error) throw error;

  if (!data) {
    const db = structuredClone(seedDatabase);
    mergeSeed(db);
    const { error: insertError } = await supabase.from("app_state").insert(dbToSupabaseRow(db));
    if (insertError) throw insertError;
    return db;
  }

  const db = supabaseRowToDb(data);

  if (mergeSeed(db)) {
    await writeSupabaseDb(db);
  }

  return db;
}

async function writeSupabaseDb(db) {
  const { error } = await supabase.from("app_state").upsert(dbToSupabaseRow(db));
  if (error) throw error;
}

export async function readDb() {
  if (useSupabase) return readSupabaseDb();
  return readLocalDb();
}

export async function writeDb(db) {
  if (useSupabase) return writeSupabaseDb(db);
  return writeLocalDb(db);
}

export function isSupabaseEnabled() {
  return useSupabase;
}

export function getSupabaseAdmin() {
  return supabase;
}

export async function uploadQuestionImage(buffer, fileName, contentType) {
  if (!useSupabase) {
    if (isServerless) {
      throw new Error("Image uploads require Supabase storage in production. Set SUPABASE_SERVICE_ROLE_KEY on Vercel.");
    }
    const uploadDir = path.join(rootDir, "public", "question-assets", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, fileName), buffer);
    return `/question-assets/uploads/${fileName}`;
  }

  const storagePath = `uploads/${fileName}`;
  const { error } = await supabase.storage.from("question-assets").upload(storagePath, buffer, {
    contentType,
    upsert: false
  });
  if (error) throw error;

  const { data } = supabase.storage.from("question-assets").getPublicUrl(storagePath);
  return data.publicUrl;
}

export { emptyDb, rootDir };
