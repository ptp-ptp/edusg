const MAX_RECENT_ATTEMPTS = 50;
const MIN_SAMPLES_FOR_SLOW_RULE = 5;

export function defaultChineseProgress() {
  return {
    rememberedWords: {},
    wordTimes: {},
    recentAttempts: [],
    timingSummary: {
      avgTimeMs: 0,
      stdDevMs: 0,
      attemptCount: 0,
      slowThresholdMs: null
    },
    lastQuestionTimeMs: null
  };
}

export function normalizeChineseProgress(chinese) {
  const base = defaultChineseProgress();
  const merged = {
    ...base,
    ...chinese,
    rememberedWords: chinese?.rememberedWords || {},
    wordTimes: chinese?.wordTimes || {},
    recentAttempts: chinese?.recentAttempts || [],
    timingSummary: { ...base.timingSummary, ...(chinese?.timingSummary || {}) }
  };
  return migrateLegacyChineseProgress(merged);
}

function remapWordKey(key, fromGrade, toGrade) {
  if (!key.startsWith(`${fromGrade}|`)) return key;
  return `${toGrade}|${key.slice(fromGrade.length + 1)}`;
}

function migrateLegacyChineseProgress(progress) {
  const legacyP1Words = progress.rememberedWords?.P1;
  if (legacyP1Words?.length) {
    const migrated = legacyP1Words.map((key) => remapWordKey(key, "P1", "P1A"));
    progress.rememberedWords.P1A = Array.from(new Set([...(progress.rememberedWords.P1A || []), ...migrated]));
    delete progress.rememberedWords.P1;
  }

  if (progress.wordTimes) {
    for (const [key, timeMs] of Object.entries(progress.wordTimes)) {
      if (!key.startsWith("P1|")) continue;
      const migratedKey = remapWordKey(key, "P1", "P1A");
      if (!progress.wordTimes[migratedKey]) {
        progress.wordTimes[migratedKey] = timeMs;
      }
      delete progress.wordTimes[key];
    }
  }

  if (progress.recentAttempts?.length) {
    progress.recentAttempts = progress.recentAttempts.map((attempt) => {
      if (!attempt.wordKey?.startsWith("P1|")) return attempt;
      return { ...attempt, wordKey: remapWordKey(attempt.wordKey, "P1", "P1A") };
    });
  }

  return progress;
}

export function computeTimingSummary(attempts) {
  const times = attempts.map((entry) => entry.timeMs).filter((time) => time > 0);
  if (!times.length) {
    return { avgTimeMs: 0, stdDevMs: 0, attemptCount: 0, slowThresholdMs: null };
  }

  const avgTimeMs = times.reduce((sum, time) => sum + time, 0) / times.length;
  const variance = times.reduce((sum, time) => sum + (time - avgTimeMs) ** 2, 0) / times.length;
  const stdDevMs = Math.sqrt(variance);

  return {
    avgTimeMs: Math.round(avgTimeMs),
    stdDevMs: Math.round(stdDevMs),
    attemptCount: times.length,
    slowThresholdMs: Math.round(avgTimeMs + 1.5 * stdDevMs)
  };
}

export function isSlowResponse(timeMs, summary) {
  if (!summary || summary.attemptCount < MIN_SAMPLES_FOR_SLOW_RULE) return false;
  if (!summary.slowThresholdMs) return false;
  return timeMs > summary.slowThresholdMs;
}

export function recordChinesePracticeAnswer(chineseProgress, wordKey, { correct, timeMs }) {
  const progress = normalizeChineseProgress(chineseProgress);
  const safeTimeMs = Math.max(0, Math.round(Number(timeMs) || 0));

  progress.recentAttempts.push({
    wordKey,
    timeMs: safeTimeMs,
    correct: Boolean(correct),
    at: new Date().toISOString()
  });
  progress.recentAttempts = progress.recentAttempts.slice(-MAX_RECENT_ATTEMPTS);
  progress.timingSummary = computeTimingSummary(progress.recentAttempts);
  progress.lastQuestionTimeMs = safeTimeMs;

  const [grade] = String(wordKey).split("|");
  const rememberedSet = new Set(progress.rememberedWords[grade] || []);
  let remembered = false;
  let slowResponse = false;

  if (!progress.wordTimes) progress.wordTimes = {};

  if (correct) {
    slowResponse = isSlowResponse(safeTimeMs, progress.timingSummary);
    if (slowResponse) {
      rememberedSet.delete(wordKey);
    } else {
      rememberedSet.add(wordKey);
      progress.wordTimes[wordKey] = safeTimeMs;
      remembered = true;
    }
    progress.rememberedWords[grade] = Array.from(rememberedSet);
  }

  Object.assign(chineseProgress, progress);

  return {
    remembered,
    slowResponse,
    timeMs: safeTimeMs,
    timingSummary: progress.timingSummary
  };
}
