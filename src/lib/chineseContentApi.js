import { fetchJson } from "./api";
import seedWatchSeries from "../data/chinese/watch-series.json";

const packCache = new Map();
const readingsCache = new Map();
let watchSeriesCache = null;
let seedReadingsPromise = null;

/** readings.json is ~1MB, so it is code-split out of the main bundle. */
function loadSeedReadings() {
  if (!seedReadingsPromise) {
    seedReadingsPromise = import("../data/chinese/readings.json").then((module) => module.default);
  }
  return seedReadingsPromise;
}

export function clearChineseContentCache() {
  packCache.clear();
  readingsCache.clear();
  watchSeriesCache = null;
}

export async function fetchChinesePack(gradeKey) {
  if (packCache.has(gradeKey)) return packCache.get(gradeKey);
  try {
    const result = await fetchJson(`/chinese/content/${encodeURIComponent(gradeKey)}`);
    packCache.set(gradeKey, result.pack);
    return result.pack;
  } catch {
    return null;
  }
}

export function resolveChineseContentKey(grade, pathway = "chinese") {
  if (grade === "P4" && pathway === "extra") return "P4-extra";
  return grade;
}

/** Readings live under base grades P1..P6 (P1A/P1B and P4-extra map to their base grade). */
export function resolveReadingGradeKey(grade) {
  const base = String(grade || "");
  if (base.startsWith("P1")) return "P1";
  if (base === "P4-extra") return "P4";
  return base;
}

/** Watch series (YouTube stories) are shared across all Chinese grades. */
export async function fetchChineseWatchSeries({ force = false } = {}) {
  if (!force && watchSeriesCache) return watchSeriesCache;
  try {
    // Bust any intermediate HTTP caches so admin-saved parts appear immediately.
    const result = await fetchJson(`/chinese/watch-series?t=${Date.now()}`);
    watchSeriesCache = result.series || [];
    return watchSeriesCache;
  } catch {
    if (watchSeriesCache) return watchSeriesCache;
    return seedWatchSeries.series || [];
  }
}

/** Bundled seed readings — resolves fast (local chunk), no server round-trip. */
export async function getSeedChineseReadings(grade) {
  const gradeKey = resolveReadingGradeKey(grade);
  const seeds = await loadSeedReadings();
  return seeds[gradeKey] || [];
}

/** Server readings cache, if already fetched this session (null otherwise). */
export function getCachedChineseReadings(grade) {
  return readingsCache.get(resolveReadingGradeKey(grade)) || null;
}

export async function fetchChineseReadings(grade) {
  const gradeKey = resolveReadingGradeKey(grade);
  if (readingsCache.has(gradeKey)) return readingsCache.get(gradeKey);
  try {
    const result = await fetchJson(`/chinese/readings/${encodeURIComponent(gradeKey)}`);
    const readings = result.readings || [];
    readingsCache.set(gradeKey, readings);
    return readings;
  } catch {
    return getSeedChineseReadings(gradeKey);
  }
}
