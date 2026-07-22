import p1aWords from "./p1a-words.json";
import p1aPracticeGroups from "./p1a-practice-groups.json";
import p1bWords from "./p1b-words.json";
import p1bPracticeGroups from "./p1b-practice-groups.json";
import p1TopicClusters from "./p1-topic-clusters.json";
import p4ExtraWords from "./p4-extra-words.json";
import p4ExtraPracticeGroups from "./p4-extra-practice-groups.json";

export const chineseGradeMeta = {
  P1A: { label: "1A" },
  P1B: { label: "1B" },
  P2: { label: "P2" },
  P3: { label: "P3" },
  P4: { label: "P4" },
  "P4-extra": { label: "P4 Extra" },
  P5: { label: "P5" },
  P6: { label: "P6" }
};

export const chineseGrades = ["P1A", "P1B", "P2", "P3", "P4", "P5", "P6"];

export const chineseVocabByGrade = {
  P1A: p1aWords.words,
  P1B: p1bWords.words,
  P2: [],
  P3: [],
  P4: [],
  P5: [],
  P6: []
};

const chineseVocabByPathway = {
  "P4-chinese": [],
  "P4-higher": [],
  "P4-extra": p4ExtraWords.words
};

const practiceGroupsByGrade = {
  P1A: p1aPracticeGroups,
  P1B: p1bPracticeGroups
};

const practiceGroupsByPathway = {
  "P4-extra": p4ExtraPracticeGroups
};

export function formatChineseGrade(grade) {
  return getChineseGradeMeta(grade).label;
}

export function getChineseGradeMeta(grade) {
  return chineseGradeMeta[grade] || { label: grade };
}

export function wordKey(grade, entry) {
  return `${grade}|${entry.lesson}|${entry.word}|${entry.type}`;
}

export function entryLocalKey(entry) {
  return `${entry.lesson}|${entry.word}|${entry.type}`;
}

export const P1_GRADES = ["P1A", "P1B"];

export function isP1Grade(grade) {
  return P1_GRADES.includes(grade);
}

export function getChinesePathwayKey(grade, pathway = "chinese") {
  if (!grade || pathway === "chinese") return grade;
  return `${grade}-${pathway}`;
}

export function normalizeChineseText(value) {
  if (!value) return "";
  return String(value)
    .split(/[：:／/|｜]/)[0]
    .replace(/\s+/g, "")
    .replace(/[，。！？、；;,.!?"""''（）()\[\]《》…·\-—]/g, "")
    .trim();
}

function getPathwayWordPool(grade, pathway) {
  return chineseVocabByPathway[getChinesePathwayKey(grade, pathway)] || [];
}

export function getKnownTextsForPathways(grade) {
  const known = new Set();
  for (const pathway of ["chinese", "higher"]) {
    for (const entry of getPathwayWordPool(grade, pathway)) {
      const normalized = normalizeChineseText(entry.word);
      if (normalized) known.add(normalized);
    }
  }
  return known;
}

export function getExtraWordsDeduped(grade) {
  if (grade !== "P4") return [];
  const exclude = getKnownTextsForPathways(grade);
  return getPathwayWordPool("P4", "extra").filter((entry) => {
    const normalized = normalizeChineseText(entry.word);
    return normalized && !exclude.has(normalized);
  });
}

export function getWordsForGrade(grade) {
  return chineseVocabByGrade[grade] || [];
}

export function getWordsForGradeAndPathway(grade, pathway = "chinese") {
  if (pathway === "extra" && grade === "P4") {
    return getExtraWordsDeduped(grade);
  }
  if (pathway !== "chinese") {
    return getPathwayWordPool(grade, pathway);
  }
  return getWordsForGrade(grade);
}

function splitProgressGrade(progressGrade, fallbackPathway = "chinese") {
  if (!progressGrade?.includes("-")) {
    return { baseGrade: progressGrade, pathway: fallbackPathway, progressGrade };
  }
  const [baseGrade, ...pathParts] = progressGrade.split("-");
  return {
    baseGrade,
    pathway: pathParts.join("-") || fallbackPathway,
    progressGrade
  };
}

export function getCombinedWordsForGrades(grades, pathway = "chinese") {
  return grades.flatMap((progressGrade) => {
    const resolved = splitProgressGrade(progressGrade, pathway);
    return getWordsForGradeAndPathway(resolved.baseGrade, resolved.pathway).map((entry) => ({
      ...entry,
      sourceGrade: resolved.progressGrade
    }));
  });
}

export function getActiveProgressGrades(grade, pathway = "chinese", p1Tiers = []) {
  if (grade === "P1") {
    return getActiveChineseGrades(grade, p1Tiers);
  }
  if (pathway && pathway !== "chinese") {
    return [getChinesePathwayKey(grade, pathway)];
  }
  return [grade];
}

export function isPracticeableEntry(entry) {
  return entry?.category !== "paragraph";
}

export function getPracticeableWords(words) {
  return words.filter(isPracticeableEntry);
}

export function entryGrade(entry, fallbackGrade) {
  return entry.sourceGrade || fallbackGrade;
}

export function formatChineseGradeLabel(grades) {
  if (!grades?.length) return "";
  if (grades.length === 1) return formatChineseGrade(grades[0]);
  return grades.map((g) => formatChineseGrade(g)).join(" + ");
}

export function getActiveChineseGrades(grade, p1Tiers = []) {
  if (grade === "P1") {
    return p1Tiers.length ? p1Tiers : ["P1A"];
  }
  if (isP1Grade(grade) && p1Tiers.length) return p1Tiers;
  if (isP1Grade(grade)) return [grade];
  return [grade];
}

export function getRoadmapGradeFromChinese(grade) {
  if (isP1Grade(grade)) return "P1";
  return grade;
}

export function getPracticeGroupsForGrade(grade) {
  const config = practiceGroupsByGrade[grade];
  if (!config) return null;
  if (!config.themeGroups?.length && !config.lessonGroups?.length) return null;
  return config;
}

export function getP1TopicClusters() {
  return p1TopicClusters.topics;
}

export function getP1TopicByLabel(label) {
  return getP1TopicClusters().find((topic) => topic.label === label) || null;
}

function collectGroupWordKeys(config, { themeIds = [], lessonIds = [] } = {}) {
  const keys = new Set();
  for (const themeId of themeIds) {
    const group = config.themeGroups?.find((item) => item.id === themeId);
    if (group?.wordKeys) {
      for (const key of group.wordKeys) keys.add(key);
    }
  }
  for (const lessonId of lessonIds) {
    const group = config.lessonGroups?.find((item) => item.id === lessonId);
    if (group?.wordKeys) {
      for (const key of group.wordKeys) keys.add(key);
    }
  }
  return keys;
}

export function getWordsForP1Topic(topicId, p1Tiers = ["P1A"]) {
  const topic = getP1TopicClusters().find((item) => item.id === topicId);
  if (!topic) return [];

  const tiers = p1Tiers.length ? p1Tiers : ["P1A"];
  const allowedKeys = new Set();

  for (const tier of tiers) {
    const tierGroups = topic.tiers?.[tier];
    if (!tierGroups) continue;
    const config = getPracticeGroupsForGrade(tier);
    if (!config) continue;
    const keys = collectGroupWordKeys(config, {
      themeIds: tierGroups.theme || [],
      lessonIds: tierGroups.lesson || []
    });
    for (const key of keys) allowedKeys.add(key);
  }

  if (!allowedKeys.size) return [];

  return getCombinedWordsForGrades(tiers).filter((entry) => allowedKeys.has(entryLocalKey(entry)));
}

export function getPracticeGroupsForGradeAndPathway(grade, pathway = "chinese") {
  if (pathway === "chinese" && !String(grade).includes("-")) {
    return getPracticeGroupsForGrade(grade);
  }
  const resolved = splitProgressGrade(grade.includes("-") ? grade : getChinesePathwayKey(grade, pathway), pathway);
  const config = practiceGroupsByPathway[getChinesePathwayKey(resolved.baseGrade, resolved.pathway)];
  if (!config) return null;
  if (!config.themeGroups?.length && !config.lessonGroups?.length) return null;
  return config;
}

export function getWordPinyin(entry) {
  return entry.pinyin || "";
}

export function getUnrememberedWords(words, grade, rememberedSet) {
  return words.filter((entry) => !rememberedSet.has(wordKey(entryGrade(entry, grade), entry)));
}

export function getPracticePool(words, grade, rememberedSet, { groupId = "", groupKind = "all", practiceGroups = null } = {}) {
  let pool = getPracticeableWords(getUnrememberedWords(words, grade, rememberedSet));
  if (!pool.length) return [];

  if (groupKind === "all") return pool;

  if ((groupKind === "theme" || groupKind === "lesson") && groupId) {
    const config = practiceGroups || getPracticeGroupsForGrade(grade);
    if (!config) return pool;

    const groups = groupKind === "lesson" ? config.lessonGroups : config.themeGroups;
    const selected = groups.find((group) => group.id === groupId);
    if (!selected) return pool;

    const allowed = new Set(selected.wordKeys);
    pool = pool.filter((entry) => allowed.has(entryLocalKey(entry)));
  }

  return pool;
}

export function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function buildMeaningOptions(words, target) {
  const distractors = shuffle(words.filter((entry) => entry.english !== target.english))
    .slice(0, 3)
    .map((entry) => entry.english);
  while (distractors.length < 3) {
    distractors.push(`option ${distractors.length + 1}`);
  }
  return shuffle([target.english, ...distractors]);
}

export function pickGameWords(words, rememberedSet, grade, pairCount = 6) {
  const practiceWords = getPracticeableWords(words);
  const unremembered = practiceWords.filter(
    (entry) => !rememberedSet.has(wordKey(entryGrade(entry, grade), entry))
  );
  const pool = unremembered.length >= 2 ? unremembered : practiceWords;
  return shuffle(pool).slice(0, Math.min(pairCount, pool.length));
}

export function buildMemoryMatchDeck(gameWords, grade) {
  const cards = gameWords.flatMap((entry) => {
    const pairId = wordKey(entryGrade(entry, grade), entry);
    return [
      {
        id: `${pairId}-zh`,
        pairId,
        kind: "chinese",
        label: entry.word,
        entry
      },
      {
        id: `${pairId}-en`,
        pairId,
        kind: "english",
        label: entry.english,
        entry
      }
    ];
  });
  return shuffle(cards);
}
