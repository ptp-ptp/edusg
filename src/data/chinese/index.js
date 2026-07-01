import p1Words from "./p1-words.json";
import p1PracticeGroups from "./p1-practice-groups.json";

export const chineseGrades = ["P1", "P2", "P3", "P4", "P5", "P6"];

export const chineseVocabByGrade = {
  P1: p1Words.words,
  P2: [],
  P3: [],
  P4: [],
  P5: [],
  P6: []
};

const practiceGroupsByGrade = {
  P1: p1PracticeGroups
};

export function wordKey(grade, entry) {
  return `${grade}|${entry.lesson}|${entry.word}|${entry.type}`;
}

export function entryLocalKey(entry) {
  return `${entry.lesson}|${entry.word}|${entry.type}`;
}

export function getWordsForGrade(grade) {
  return chineseVocabByGrade[grade] || [];
}

export function getPracticeGroupsForGrade(grade) {
  return practiceGroupsByGrade[grade] || null;
}

export function getWordPinyin(entry) {
  return entry.pinyin || "";
}

export function getUnrememberedWords(words, grade, rememberedSet) {
  return words.filter((entry) => !rememberedSet.has(wordKey(grade, entry)));
}

export function getPracticePool(words, grade, rememberedSet, { mode = "all", groupId = "", groupKind = "theme" }) {
  let pool = getUnrememberedWords(words, grade, rememberedSet);
  if (!pool.length) return [];

  if (mode === "group" && groupId) {
    const config = getPracticeGroupsForGrade(grade);
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
  const unremembered = words.filter((entry) => !rememberedSet.has(wordKey(grade, entry)));
  const pool = unremembered.length >= 2 ? unremembered : words;
  return shuffle(pool).slice(0, Math.min(pairCount, pool.length));
}

export function buildMemoryMatchDeck(gameWords, grade) {
  const cards = gameWords.flatMap((entry) => {
    const pairId = wordKey(grade, entry);
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
