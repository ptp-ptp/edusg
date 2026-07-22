// Client-side mirror of server/chineseContent.js seed packs, so the admin
// panel can render instantly from the bundled JSON while the server copy
// (with any admin overrides) syncs in the background.
import p1aWords from "../../data/chinese/p1a-words.json";
import p1aPracticeGroups from "../../data/chinese/p1a-practice-groups.json";
import p1bWords from "../../data/chinese/p1b-words.json";
import p1bPracticeGroups from "../../data/chinese/p1b-practice-groups.json";
import p1TopicClusters from "../../data/chinese/p1-topic-clusters.json";
import p4ExtraWords from "../../data/chinese/p4-extra-words.json";
import p4ExtraPracticeGroups from "../../data/chinese/p4-extra-practice-groups.json";
import seedWatchSeries from "../../data/chinese/watch-series.json";

export const CHINESE_GRADE_KEYS = ["P1A", "P1B", "P2", "P3", "P4", "P5", "P6", "P4-extra"];

const GRADE_META = {
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
    words: p1aWords.words,
    practiceGroups: p1aPracticeGroups
  },
  P1B: {
    grade: "P1B",
    name: p1bWords.name,
    semester: p1bWords.semester,
    words: p1bWords.words,
    practiceGroups: p1bPracticeGroups
  },
  "P4-extra": {
    grade: "P4-extra",
    name: p4ExtraWords.name || "P4 Extra Words",
    semester: p4ExtraWords.semester || "",
    pathway: p4ExtraWords.pathway || "extra",
    words: p4ExtraWords.words,
    practiceGroups: p4ExtraPracticeGroups
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

export function getSeedPack(gradeKey) {
  const seed = SEED_PACKS[gradeKey];
  return seed ? structuredClone(seed) : null;
}

export function getSeedTopicClusters() {
  return structuredClone(p1TopicClusters);
}

export function getSeedWatchSeries() {
  return structuredClone(seedWatchSeries.series || []);
}

export function summarizeGrade(gradeKey, pack) {
  const lessons = [...new Set((pack?.words || []).map((entry) => entry.lesson))].filter(Boolean);
  return {
    gradeKey,
    ...GRADE_META[gradeKey],
    wordCount: pack?.words?.length || 0,
    themeGroupCount: pack?.practiceGroups?.themeGroups?.length || 0,
    lessonGroupCount: pack?.practiceGroups?.lessonGroups?.length || 0,
    lessonCount: lessons.length
  };
}

export function getSeedGrades() {
  return CHINESE_GRADE_KEYS.map((gradeKey) => summarizeGrade(gradeKey, SEED_PACKS[gradeKey]));
}
