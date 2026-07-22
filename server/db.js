import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { seedDatabase } from "./seed.js";
import { ensureUserAuthFields, applyManagedUserCredentials, managedUserIds } from "./auth.js";
import { ensureChineseContentShape, compactChineseStorage } from "./chineseContent.js";

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
    auditEvents: [],
    chineseContent: { packs: {}, p1TopicClusters: null }
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
  db.chineseContent = db.chineseContent || { packs: {}, p1TopicClusters: null };
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

function syncManagedUsers(db) {
  let changed = false;
  for (const seedUser of seedDatabase.users) {
    if (!managedUserIds.includes(seedUser.id)) continue;
    const user = (db.users || []).find((entry) => entry.id === seedUser.id);
    if (!user) continue;
    if (applyManagedUserCredentials(user, seedUser)) changed = true;
  }
  return changed;
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
  if (syncManagedUsers(db)) changed = true;
  ensureChineseContentShape(db);
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
    auditEvents: data.audit_events || data.auditEvents || [],
    chineseContent: data.chinese_content || data.chineseContent || { packs: {}, p1TopicClusters: null }
  };
}

function dbToSupabaseRow(db, { includeChinese = false } = {}) {
  const row = {
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
  if (includeChinese) {
    row.chinese_content = db.chineseContent || { packs: {}, p1TopicClusters: null };
  }
  return row;
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

const DB_CACHE_MS = 20_000;
let supabaseDbCache = null;
let supabaseDbCacheAt = 0;
let supabaseChineseCache = null;
let supabaseChineseCacheAt = 0;

const SUPABASE_CORE_COLUMNS =
  "id,users,progress,messages,questions,login_events,answer_events,achievements,goals,study_sessions,notifications,rewards_catalog,reward_redemptions,platform_settings,audit_events,updated_at";

function invalidateSupabaseCache() {
  supabaseDbCache = null;
  supabaseDbCacheAt = 0;
  supabaseChineseCache = null;
  supabaseChineseCacheAt = 0;
}

async function readSupabaseDb({ includeChinese = false } = {}) {
  const cached = includeChinese ? supabaseChineseCache : supabaseDbCache;
  const cachedAt = includeChinese ? supabaseChineseCacheAt : supabaseDbCacheAt;
  if (cached && Date.now() - cachedAt < DB_CACHE_MS) {
    return cached;
  }

  let chineseSelected = includeChinese;
  let select = chineseSelected ? `${SUPABASE_CORE_COLUMNS},chinese_content` : SUPABASE_CORE_COLUMNS;
  let { data, error } = await supabase.from("app_state").select(select).eq("id", "main").maybeSingle();
  if (error?.code === "42703" && chineseSelected) {
    chineseSelected = false;
    ({ data, error } = await supabase.from("app_state").select(SUPABASE_CORE_COLUMNS).eq("id", "main").maybeSingle());
  }
  if (error) throw error;

  if (!data) {
    const db = structuredClone(seedDatabase);
    mergeSeed(db);
    db._chineseLoaded = includeChinese;
    const { error: insertError } = await supabase.from("app_state").insert(dbToSupabaseRow(db, { includeChinese }));
    if (insertError) throw insertError;
    if (includeChinese) {
      supabaseChineseCache = db;
      supabaseChineseCacheAt = Date.now();
    } else {
      supabaseDbCache = db;
      supabaseDbCacheAt = Date.now();
    }
    return db;
  }

  const db = supabaseRowToDb(data);
  if (!chineseSelected) {
    db.chineseContent = { packs: {}, p1TopicClusters: null };
    db._chineseLoaded = false;
  } else {
    db._chineseLoaded = true;
    if (compactChineseStorage(db.chineseContent)) {
      await writeChineseDb(db);
    }
  }

  if (mergeSeed(db)) {
    await writeSupabaseDb(db, { includeChinese: false });
  }

  if (includeChinese) {
    supabaseChineseCache = db;
    supabaseChineseCacheAt = Date.now();
  } else {
    supabaseDbCache = db;
    supabaseDbCacheAt = Date.now();
  }
  return db;
}

async function writeSupabaseDb(db, { includeChinese = false } = {}) {
  const row = dbToSupabaseRow(db, { includeChinese: includeChinese || db._chineseLoaded });
  const { error } = await supabase.from("app_state").upsert(row);
  if (error) throw error;
  invalidateSupabaseCache();
  if (includeChinese || db._chineseLoaded) {
    supabaseChineseCache = db;
    supabaseChineseCacheAt = Date.now();
  }
}

export async function readDb() {
  if (useSupabase) return readSupabaseDb({ includeChinese: false });
  return readLocalDb();
}

export async function readDbWithChinese() {
  if (useSupabase) return readSupabaseDb({ includeChinese: true });
  return readLocalDb();
}

export async function writeDb(db) {
  if (useSupabase) return writeSupabaseDb(db, { includeChinese: Boolean(db._chineseLoaded) });
  return writeLocalDb(db);
}

export async function writeChineseDb(db, { includeAudit = false } = {}) {
  db._chineseLoaded = true;
  if (useSupabase) {
    const update = {
      chinese_content: db.chineseContent || { packs: {}, p1TopicClusters: null },
      updated_at: new Date().toISOString()
    };
    if (includeAudit) update.audit_events = db.auditEvents || [];
    const { error } = await supabase.from("app_state").update(update).eq("id", "main");
    if (error) {
      // Surface missing-column and other write failures so admin "Save" does not
      // look successful when the new YouTube part never reached the database.
      throw new Error(error.message || `Failed to save Chinese content (${error.code || "unknown"})`);
    }
    invalidateSupabaseCache();
    return;
  }
  return writeLocalDb(db);
}

/** Persist platform_settings only (safe when chinese_content column is missing). */
export async function writePlatformSettings(db, { includeAudit = false } = {}) {
  if (useSupabase) {
    const update = {
      platform_settings: db.platformSettings || emptyDb().platformSettings,
      updated_at: new Date().toISOString()
    };
    if (includeAudit) update.audit_events = db.auditEvents || [];
    const { error } = await supabase.from("app_state").update(update).eq("id", "main");
    if (error) throw new Error(error.message || `Failed to save settings (${error.code || "unknown"})`);
    invalidateSupabaseCache();
    // Keep in-memory chinese cache in sync when present.
    if (supabaseChineseCache) {
      supabaseChineseCache.platformSettings = db.platformSettings;
      supabaseChineseCacheAt = Date.now();
    }
    return;
  }
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
