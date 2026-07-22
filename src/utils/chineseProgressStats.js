import {
  entryGrade,
  entryLocalKey,
  formatChineseGrade,
  getActiveProgressGrades,
  getCombinedWordsForGrades,
  getP1TopicClusters,
  getPracticeGroupsForGradeAndPathway,
  getPracticeableWords,
  getRoadmapGradeFromChinese,
  getWordsForP1Topic,
  isP1Grade,
  wordKey
} from "../data/chinese/index.js";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function buildRememberedSet(chineseProgress) {
  const set = new Set();
  for (const keys of Object.values(chineseProgress?.rememberedWords || {})) {
    for (const key of keys) set.add(key);
  }
  return set;
}

function masteryPercent(words, rememberedSet) {
  const practiceable = getPracticeableWords(words);
  if (!practiceable.length) return null;
  const remembered = practiceable.filter((entry) =>
    rememberedSet.has(wordKey(entryGrade(entry, entry.sourceGrade), entry))
  ).length;
  return Math.round((remembered / practiceable.length) * 100);
}

export function computeChineseTopicMastery(chineseProgress, { grade, pathway = "chinese", p1Tiers = ["P1A"] } = {}) {
  const rememberedSet = buildRememberedSet(chineseProgress);
  const mastery = {};
  const roadmapGrade = getRoadmapGradeFromChinese(grade);

  if (roadmapGrade === "P1" || isP1Grade(grade)) {
    const tiers = grade === "P1" ? (p1Tiers.length ? p1Tiers : ["P1A"]) : isP1Grade(grade) ? [grade] : p1Tiers.length ? p1Tiers : ["P1A"];
    for (const topic of getP1TopicClusters()) {
      const words = getWordsForP1Topic(topic.id, tiers);
      const pct = masteryPercent(words, rememberedSet);
      if (pct !== null) mastery[topic.label] = pct;
    }
    return mastery;
  }

  const progressGrades = getActiveProgressGrades(grade, pathway, p1Tiers);
  for (const progressGrade of progressGrades) {
    const [baseGrade, ...pathParts] = progressGrade.split("-");
    const resolvedPathway = pathParts.length ? pathParts.join("-") : pathway;
    const config = getPracticeGroupsForGradeAndPathway(baseGrade, resolvedPathway);
    const words = getCombinedWordsForGrades([progressGrade], pathway);
    const wordsByKey = new Map(words.map((entry) => [entryLocalKey(entry), entry]));

    if (config?.themeGroups?.length) {
      for (const group of config.themeGroups) {
        const groupWords = (group.wordKeys || []).map((key) => wordsByKey.get(key)).filter(Boolean);
        const pct = masteryPercent(groupWords, rememberedSet);
        if (pct !== null) mastery[group.label] = pct;
      }
      continue;
    }

    const pct = masteryPercent(words, rememberedSet);
    if (pct !== null) mastery[formatChineseGrade(progressGrade)] = pct;
  }

  return mastery;
}

function getWeekAttempts(chineseProgress) {
  const weekAgo = Date.now() - WEEK_MS;
  return (chineseProgress?.recentAttempts || []).filter((attempt) => new Date(attempt.at).getTime() >= weekAgo);
}

export function buildChineseProgressView(chineseProgress, { grade, pathway = "chinese", p1Tiers = ["P1A"] } = {}) {
  const weekAttempts = getWeekAttempts(chineseProgress);
  const answered = weekAttempts.length;
  const correct = weekAttempts.filter((attempt) => attempt.correct).length;
  const studyMinutesFromAttempts = Math.round(weekAttempts.reduce((sum, attempt) => sum + (attempt.timeMs || 0), 0) / 60000);
  const studyMinutes = studyMinutesFromAttempts || chineseProgress?.studyMinutes || 0;
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;

  return {
    topicMastery: computeChineseTopicMastery(chineseProgress, { grade, pathway, p1Tiers }),
    studyMinutes,
    starsEarnedWeek: correct,
    accuracy,
    correct,
    answered,
    wordsRemembered: buildRememberedSet(chineseProgress).size
  };
}

export function pickChineseStrengthsAndFocus(topicMastery) {
  const strengths = Object.entries(topicMastery)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic]) => topic);

  const focus = Object.entries(topicMastery)
    .filter(([, score]) => score < 100)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2)
    .map(([topic]) => topic);

  if (!strengths.length && Object.keys(topicMastery).length) {
    focus.push(...Object.keys(topicMastery).slice(0, Math.max(0, 2 - focus.length)));
  }

  return { strengths, focus };
}
