import p1aWords from "../src/data/chinese/p1a-words.json" with { type: "json" };
import p1aPracticeGroups from "../src/data/chinese/p1a-practice-groups.json" with { type: "json" };
import p1bWords from "../src/data/chinese/p1b-words.json" with { type: "json" };
import p1bPracticeGroups from "../src/data/chinese/p1b-practice-groups.json" with { type: "json" };
import p1TopicClusters from "../src/data/chinese/p1-topic-clusters.json" with { type: "json" };
import p4ExtraWords from "../src/data/chinese/p4-extra-words.json" with { type: "json" };
import p4ExtraPracticeGroups from "../src/data/chinese/p4-extra-practice-groups.json" with { type: "json" };
import seedReadings from "../src/data/chinese/readings.json" with { type: "json" };
import seedWatchSeries from "../src/data/chinese/watch-series.json" with { type: "json" };

export const CHINESE_GRADE_KEYS = ["P1A", "P1B", "P2", "P3", "P4", "P5", "P6", "P4-extra"];

export const READING_GRADE_KEYS = ["P1", "P2", "P3", "P4", "P5", "P6"];

export const CHINESE_GRADE_META = {
  P1A: { label: "1A", semester: "Sem 1–2", phase: "Foundation" },
  P1B: { label: "1B", semester: "Sem 3–4", phase: "Foundation" },
  P2: { label: "P2", semester: "", phase: "Foundation" },
  P3: { label: "P3", semester: "", phase: "Foundation" },
  P4: { label: "P4", semester: "", phase: "Foundation" },
  P5: { label: "P5", semester: "", phase: "Orientation" },
  P6: { label: "P6", semester: "", phase: "Orientation" },
  "P4-extra": { label: "P4 Extra (HCL)", semester: "Tuition", phase: "Higher Chinese" }
};

const SEED_PACKS = {
  P1A: {
    grade: "P1A",
    name: p1aWords.name,
    semester: p1aWords.semester,
    words: structuredClone(p1aWords.words),
    practiceGroups: structuredClone(p1aPracticeGroups)
  },
  P1B: {
    grade: "P1B",
    name: p1bWords.name,
    semester: p1bWords.semester,
    words: structuredClone(p1bWords.words),
    practiceGroups: structuredClone(p1bPracticeGroups)
  },
  "P4-extra": {
    grade: "P4-extra",
    name: p4ExtraWords.name || "P4 Extra Words",
    semester: p4ExtraWords.semester || "",
    pathway: p4ExtraWords.pathway || "extra",
    words: structuredClone(p4ExtraWords.words),
    practiceGroups: structuredClone(p4ExtraPracticeGroups)
  }
};

for (const grade of ["P2", "P3", "P4", "P5", "P6"]) {
  SEED_PACKS[grade] = {
    grade,
    name: `${grade} Words`,
    semester: "",
    words: [],
    practiceGroups: { grade, semester: "", themeGroups: [], lessonGroups: [] }
  };
}

export function entryLocalKey(entry) {
  return `${entry.lesson}|${entry.word}|${entry.type}`;
}

export function wordKey(gradeKey, entry) {
  return `${gradeKey}|${entryLocalKey(entry)}`;
}

function emptyPracticeGroups(gradeKey) {
  const meta = CHINESE_GRADE_META[gradeKey] || {};
  return {
    grade: gradeKey,
    semester: meta.semester || "",
    themeGroups: [],
    lessonGroups: []
  };
}

function ensureChineseContent(db) {
  if (!db.chineseContent) {
    db.chineseContent = { packs: {}, p1TopicClusters: structuredClone(p1TopicClusters) };
  }
  if (!db.chineseContent.packs) db.chineseContent.packs = {};
  if (!db.chineseContent.p1TopicClusters) {
    db.chineseContent.p1TopicClusters = structuredClone(p1TopicClusters);
  }
  if (!db.chineseContent.readings) db.chineseContent.readings = {};
  return db.chineseContent;
}

/**
 * Watch series (YouTube story videos) are shared across all Chinese grades.
 * Persisted on platformSettings.chineseWatchSeries so saves work even when the
 * optional chinese_content Supabase column has not been migrated yet. A copy is
 * also kept on chineseContent.watchSeries when that store is available.
 */
export function getWatchSeries(db) {
  const fromSettings = db.platformSettings?.chineseWatchSeries;
  if (Array.isArray(fromSettings)) return fromSettings;
  const content = ensureChineseContent(db);
  if (Array.isArray(content.watchSeries)) return content.watchSeries;
  return structuredClone(seedWatchSeries.series || []);
}

function persistWatchSeriesList(db, list) {
  if (!db.platformSettings) db.platformSettings = {};
  db.platformSettings.chineseWatchSeries = list;
  const content = ensureChineseContent(db);
  content.watchSeries = list;
  return list;
}

function normalizeWatchSeriesInput(input, existingId) {
  const title = String(input.title || "").trim();
  if (!title) throw new Error("Series title is required");
  const parts = Array.isArray(input.parts) ? input.parts : [];
  if (parts.length === 0) throw new Error("A series needs at least one part with a YouTube link");
  const normalizedParts = parts.map((part, index) => {
    const url = String(part?.url || "").trim();
    if (!url) throw new Error(`Part ${index + 1} needs a YouTube link`);
    if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url)) {
      throw new Error(`Part ${index + 1} link must be a YouTube URL`);
    }
    return {
      id: part.id || `part-${index + 1}`,
      title: String(part.title || "").trim() || `Part ${index + 1}`,
      url,
      transcript: String(part.transcript || ""),
      vocabs: String(part.vocabs || ""),
      fullEnglish: String(part.fullEnglish || "")
    };
  });
  return {
    id: existingId || input.id || `series-${Date.now()}`,
    title,
    titleZh: String(input.titleZh || "").trim(),
    description: String(input.description || "").trim(),
    parts: normalizedParts
  };
}

export function addWatchSeries(db, input) {
  const series = normalizeWatchSeriesInput(input);
  const list = getWatchSeries(db);
  if (list.some((item) => item.id === series.id)) {
    series.id = `${series.id}-${Date.now()}`;
  }
  return persistWatchSeriesList(db, [...list, series]);
}

export function updateWatchSeries(db, seriesId, changes) {
  const list = getWatchSeries(db);
  const index = list.findIndex((item) => item.id === seriesId);
  if (index === -1) throw new Error("Series not found");
  const next = [...list];
  next[index] = normalizeWatchSeriesInput({ ...list[index], ...changes }, seriesId);
  return persistWatchSeriesList(db, next);
}

export function deleteWatchSeries(db, seriesId) {
  const list = getWatchSeries(db);
  return persistWatchSeriesList(
    db,
    list.filter((item) => item.id !== seriesId)
  );
}

function cloneSeedPack(gradeKey) {
  const seed = SEED_PACKS[gradeKey];
  if (!seed) return null;
  return structuredClone(seed);
}

export function getPack(db, gradeKey) {
  if (!CHINESE_GRADE_KEYS.includes(gradeKey)) return null;
  const content = ensureChineseContent(db);
  const stored = content.packs[gradeKey];
  if (stored?.words?.length) {
    if (!stored.practiceGroups) stored.practiceGroups = emptyPracticeGroups(gradeKey);
    return stored;
  }
  return cloneSeedPack(gradeKey);
}

export function persistPack(db, gradeKey, pack) {
  const content = ensureChineseContent(db);
  content.packs[gradeKey] = {
    ...pack,
    grade: gradeKey,
    words: pack.words || [],
    practiceGroups: pack.practiceGroups || emptyPracticeGroups(gradeKey)
  };
  return content.packs[gradeKey];
}

export function listChineseGrades(db) {
  return CHINESE_GRADE_KEYS.map((gradeKey) => {
    const pack = getPack(db, gradeKey);
    const lessons = [...new Set((pack.words || []).map((entry) => entry.lesson))].filter(Boolean);
    return {
      gradeKey,
      ...CHINESE_GRADE_META[gradeKey],
      wordCount: pack.words?.length || 0,
      themeGroupCount: pack.practiceGroups?.themeGroups?.length || 0,
      lessonGroupCount: pack.practiceGroups?.lessonGroups?.length || 0,
      lessonCount: lessons.length
    };
  });
}

export function savePack(db, gradeKey, pack) {
  syncLessonGroups(pack);
  return persistPack(db, gradeKey, pack);
}

export function moveWord(db, gradeKey, localKey, targetLesson) {
  return updateWord(db, gradeKey, localKey, { lesson: targetLesson });
}

export function addWord(db, gradeKey, entry) {
  const pack = getPack(db, gradeKey);
  const localKey = entryLocalKey(entry);
  if (pack.words.some((item) => entryLocalKey(item) === localKey)) {
    throw new Error("Word already exists in this level");
  }
  const stored = { ...pack, words: [...pack.words, { ...entry }] };
  syncLessonGroups(stored);
  return persistPack(db, gradeKey, stored);
}

export function updateWord(db, gradeKey, localKey, changes) {
  const pack = getPack(db, gradeKey);
  const words = [...pack.words];
  const index = words.findIndex((item) => entryLocalKey(item) === localKey);
  if (index === -1) throw new Error("Word not found");
  const previousKey = entryLocalKey(words[index]);
  words[index] = { ...words[index], ...changes };
  const nextKey = entryLocalKey(words[index]);
  const stored = { ...pack, words };
  if (previousKey !== nextKey) remapWordKeysInGroups(stored, previousKey, nextKey);
  syncLessonGroups(stored);
  return persistPack(db, gradeKey, stored);
}

export function deleteWord(db, gradeKey, localKey) {
  const pack = getPack(db, gradeKey);
  const stored = {
    ...pack,
    words: pack.words.filter((item) => entryLocalKey(item) !== localKey)
  };
  removeWordKeyFromGroups(stored, localKey);
  syncLessonGroups(stored);
  return persistPack(db, gradeKey, stored);
}

function removeWordKeyFromGroups(pack, localKey) {
  for (const group of pack.practiceGroups?.themeGroups || []) {
    group.wordKeys = (group.wordKeys || []).filter((key) => key !== localKey);
  }
  for (const group of pack.practiceGroups?.lessonGroups || []) {
    group.wordKeys = (group.wordKeys || []).filter((key) => key !== localKey);
  }
}

function remapWordKeysInGroups(pack, fromKey, toKey) {
  for (const group of pack.practiceGroups?.themeGroups || []) {
    group.wordKeys = (group.wordKeys || []).map((key) => (key === fromKey ? toKey : key));
  }
  for (const group of pack.practiceGroups?.lessonGroups || []) {
    group.wordKeys = (group.wordKeys || []).map((key) => (key === fromKey ? toKey : key));
  }
}

function syncLessonGroups(pack) {
  const groups = pack.practiceGroups || emptyPracticeGroups(pack.grade);
  const lessonLabels = [...new Set((pack.words || []).map((entry) => entry.lesson).filter(Boolean))];
  const existing = new Map((groups.lessonGroups || []).map((group) => [group.lesson || group.label, group]));
  groups.lessonGroups = lessonLabels.map((lesson, index) => {
    const current = existing.get(lesson);
    const wordKeys = (pack.words || [])
      .filter((entry) => entry.lesson === lesson)
      .map((entry) => entryLocalKey(entry));
    if (current) {
      return { ...current, lesson, label: current.label || lesson, wordKeys };
    }
    return {
      id: `lesson-${index + 1}`,
      lesson,
      label: lesson,
      labelZh: lesson,
      emoji: "📘",
      wordKeys
    };
  });
  pack.practiceGroups = groups;
}

export function savePracticeGroups(db, gradeKey, practiceGroups) {
  const pack = getPack(db, gradeKey);
  return persistPack(db, gradeKey, { ...pack, practiceGroups: { ...practiceGroups, grade: gradeKey } });
}

export function addThemeGroup(db, gradeKey, group) {
  const pack = getPack(db, gradeKey);
  const groups = [...(pack.practiceGroups?.themeGroups || [])];
  const id = group.id || `theme-${Date.now()}`;
  if (groups.some((item) => item.id === id)) throw new Error("Theme group id already exists");
  groups.push({
    id,
    label: group.label || "New theme",
    labelZh: group.labelZh || "",
    emoji: group.emoji || "📚",
    hint: group.hint || "",
    wordKeys: group.wordKeys || []
  });
  return persistPack(db, gradeKey, {
    ...pack,
    practiceGroups: { ...pack.practiceGroups, themeGroups: groups }
  });
}

export function updateThemeGroup(db, gradeKey, groupId, changes) {
  const pack = getPack(db, gradeKey);
  const groups = [...(pack.practiceGroups?.themeGroups || [])];
  const index = groups.findIndex((item) => item.id === groupId);
  if (index === -1) throw new Error("Theme group not found");
  groups[index] = { ...groups[index], ...changes };
  return persistPack(db, gradeKey, {
    ...pack,
    practiceGroups: { ...pack.practiceGroups, themeGroups: groups }
  });
}

export function deleteThemeGroup(db, gradeKey, groupId) {
  const pack = getPack(db, gradeKey);
  return persistPack(db, gradeKey, {
    ...pack,
    practiceGroups: {
      ...pack.practiceGroups,
      themeGroups: (pack.practiceGroups?.themeGroups || []).filter((item) => item.id !== groupId)
    }
  });
}

export function getP1TopicClusters(db) {
  const content = ensureChineseContent(db);
  return content.p1TopicClusters;
}

export function saveP1TopicClusters(db, clusters) {
  const content = ensureChineseContent(db);
  content.p1TopicClusters = clusters;
  return content.p1TopicClusters;
}

/**
 * Readings are stored per base grade ("P1".."P6"). A grade key present in
 * content.readings overrides the bundled seed wholesale (an empty array means
 * the admin deleted every seeded reading for that grade).
 */
export function getReadings(db, gradeKey) {
  if (!READING_GRADE_KEYS.includes(gradeKey)) return null;
  const content = ensureChineseContent(db);
  const stored = content.readings[gradeKey];
  if (Array.isArray(stored)) return stored;
  return structuredClone(seedReadings[gradeKey] || []);
}

function validateSentences(sentences, label = "") {
  const prefix = label ? `${label}: ` : "";
  if (!Array.isArray(sentences) || sentences.length === 0) {
    throw new Error(`${prefix}Sentences must be a non-empty array of token arrays`);
  }
  for (const sentence of sentences) {
    if (!Array.isArray(sentence) || sentence.length === 0) {
      throw new Error(`${prefix}Each sentence must be a non-empty array of tokens`);
    }
    for (const token of sentence) {
      if (!token || typeof token.t !== "string" || !token.t) {
        throw new Error(`${prefix}Every token needs a "t" text field`);
      }
    }
  }
}

function normalizeVocabulary(vocabulary) {
  return Array.isArray(vocabulary) ? vocabulary.filter((item) => item && item.word) : [];
}

function normalizeReadingInput(input, existingId) {
  const title = String(input.title || "").trim();
  if (!title) throw new Error("Reading title is required");
  const base = {
    id: existingId || input.id || `reading-${Date.now()}`,
    title,
    titleEn: String(input.titleEn || ""),
    subtitle: String(input.subtitle || ""),
    term: String(input.term || "")
  };

  // A reading is either a single passage (sentences/vocabulary) or a set of
  // difficulty levels, each with its own passage.
  if (Array.isArray(input.levels) && input.levels.length > 0) {
    const levels = input.levels.map((level, index) => {
      const key = String(level?.key || "").trim() || `Level ${index + 1}`;
      validateSentences(level?.sentences, key);
      return {
        key,
        description: String(level?.description || ""),
        sentences: level.sentences,
        vocabulary: normalizeVocabulary(level?.vocabulary)
      };
    });
    return { ...base, levels };
  }

  validateSentences(input.sentences);
  return { ...base, sentences: input.sentences, vocabulary: normalizeVocabulary(input.vocabulary) };
}

export function addReading(db, gradeKey, input) {
  if (!READING_GRADE_KEYS.includes(gradeKey)) throw new Error("Unknown reading level");
  const reading = normalizeReadingInput(input);
  const readings = getReadings(db, gradeKey);
  if (readings.some((item) => item.id === reading.id)) {
    reading.id = `${reading.id}-${Date.now()}`;
  }
  const content = ensureChineseContent(db);
  content.readings[gradeKey] = [...readings, reading];
  return content.readings[gradeKey];
}

export function updateReading(db, gradeKey, readingId, changes) {
  const readings = getReadings(db, gradeKey);
  if (!readings) throw new Error("Unknown reading level");
  const index = readings.findIndex((item) => item.id === readingId);
  if (index === -1) throw new Error("Reading not found");
  const next = [...readings];
  next[index] = normalizeReadingInput({ ...readings[index], ...changes }, readingId);
  const content = ensureChineseContent(db);
  content.readings[gradeKey] = next;
  return next;
}

export function deleteReading(db, gradeKey, readingId) {
  const readings = getReadings(db, gradeKey);
  if (!readings) throw new Error("Unknown reading level");
  const content = ensureChineseContent(db);
  content.readings[gradeKey] = readings.filter((item) => item.id !== readingId);
  return content.readings[gradeKey];
}

export function getPublicChineseContent(db, gradeKey) {
  const pack = getPack(db, gradeKey);
  const content = ensureChineseContent(db);
  return {
    gradeKey,
    pack,
    p1TopicClusters: isP1GradeKey(gradeKey) ? content.p1TopicClusters : null
  };
}

function isP1GradeKey(gradeKey) {
  return gradeKey === "P1A" || gradeKey === "P1B";
}

export function ensureChineseContentShape(db) {
  ensureChineseContent(db);
  return false;
}

function packMatchesSeed(gradeKey, pack) {
  const seed = SEED_PACKS[gradeKey];
  if (!seed || !pack?.words?.length) return false;
  if (pack.words.length !== seed.words.length) return false;
  return JSON.stringify(pack.words) === JSON.stringify(seed.words);
}

/** Drop seed-identical packs from persisted storage so Supabase stays small. */
export function compactChineseStorage(content) {
  if (!content) return false;
  let changed = false;
  for (const gradeKey of Object.keys(content.packs || {})) {
    const pack = content.packs[gradeKey];
    if (!pack?.words?.length || packMatchesSeed(gradeKey, pack)) {
      delete content.packs[gradeKey];
      changed = true;
    }
  }
  for (const gradeKey of Object.keys(content.readings || {})) {
    const stored = content.readings[gradeKey];
    if (JSON.stringify(stored) === JSON.stringify(seedReadings[gradeKey] || [])) {
      delete content.readings[gradeKey];
      changed = true;
    }
  }
  if (
    Array.isArray(content.watchSeries) &&
    JSON.stringify(content.watchSeries) === JSON.stringify(seedWatchSeries.series || [])
  ) {
    delete content.watchSeries;
    changed = true;
  }
  return changed;
}
