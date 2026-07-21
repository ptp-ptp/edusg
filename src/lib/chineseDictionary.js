import { chineseVocabByGrade, getWordPinyin } from "../data/chinese/index.js";

const DICT_URL = "/chinese/dictionary/cedict-lite.json";

let loadPromise = null;
/** @type {Record<string, { p: string, e: string }[]> | null} */
let cedictIndex = null;
/** @type {Map<string, object> | null} */
let curriculumIndex = null;
/** @type {Map<string, string[]> | null} */
let byFirstChar = null;

function buildCurriculumIndex() {
  const map = new Map();
  for (const [grade, words] of Object.entries(chineseVocabByGrade)) {
    for (const entry of words || []) {
      const word = entry.word;
      if (!word || word.length > 3) continue;
      const existing = map.get(word);
      // Prefer entries that already have examples/breakdown; otherwise first wins
      if (existing && (existing.examples?.length || existing.breakdown?.length)) continue;
      map.set(word, {
        word,
        pinyin: getWordPinyin(entry) || entry.pinyin || "",
        english: entry.english || "",
        examples: entry.examples || [],
        breakdown: entry.breakdown || [],
        lesson: entry.lesson || "",
        type: entry.type || "",
        source: "curriculum",
        grade
      });
    }
  }
  return map;
}

function buildFirstCharIndex(dict) {
  const map = new Map();
  for (const head of Object.keys(dict)) {
    const ch = head[0];
    if (!map.has(ch)) map.set(ch, []);
    map.get(ch).push(head);
  }
  return map;
}

export function ensureDictionaryReady() {
  if (cedictIndex && curriculumIndex && byFirstChar) return Promise.resolve(true);
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const response = await fetch(DICT_URL);
      if (!response.ok) throw new Error(`Dictionary HTTP ${response.status}`);
      cedictIndex = await response.json();
      curriculumIndex = buildCurriculumIndex();
      byFirstChar = buildFirstCharIndex(cedictIndex);
      return true;
    } catch (error) {
      console.error("Failed to load Chinese dictionary", error);
      loadPromise = null;
      cedictIndex = cedictIndex || Object.create(null);
      curriculumIndex = curriculumIndex || buildCurriculumIndex();
      byFirstChar = byFirstChar || buildFirstCharIndex(cedictIndex);
      return Boolean(curriculumIndex?.size);
    }
  })();

  return loadPromise;
}

function sensesToEntries(word, senses, source = "cedict") {
  return (senses || []).map((sense, index) => ({
    id: `${source}:${word}:${index}`,
    word,
    pinyin: sense.p || sense.pinyin || "",
    english: sense.e || sense.english || "",
    examples: sense.examples || [],
    breakdown: sense.breakdown || [],
    lesson: sense.lesson || "",
    type: sense.type || "",
    source,
    grade: sense.grade || ""
  }));
}

function curriculumEntry(word) {
  const entry = curriculumIndex?.get(word);
  if (!entry) return null;
  return {
    id: `curriculum:${word}`,
    ...entry
  };
}

/**
 * Exact lookup for a Chinese word (1–3 chars).
 * Curriculum entries are returned first when present.
 */
export function lookupExact(word) {
  if (!word) return [];
  const results = [];
  const fromCurriculum = curriculumEntry(word);
  if (fromCurriculum) results.push(fromCurriculum);

  const senses = cedictIndex?.[word];
  if (senses?.length) {
    for (const entry of sensesToEntries(word, senses)) {
      if (
        fromCurriculum &&
        entry.english === fromCurriculum.english &&
        entry.pinyin === fromCurriculum.pinyin
      ) {
        continue;
      }
      results.push(entry);
    }
  }
  return results;
}

function uniqueWords(words) {
  const seen = new Set();
  const out = [];
  for (const word of words) {
    if (!word || seen.has(word)) continue;
    seen.add(word);
    out.push(word);
  }
  return out;
}

/**
 * Build exact + near/close suggestions for a drawn word buffer.
 * @param {string} word - current buffer (1–3 chars)
 * @param {string[][]} candidateChars - per-position candidate lists from handwriting
 */
export function lookupSuggestions(word, candidateChars = []) {
  const exact = lookupExact(word);
  const suggestions = [];
  const seen = new Set(exact.map((entry) => entry.word));

  const pushWord = (candidate, reason) => {
    if (!candidate || seen.has(candidate) || candidate.length > 3) return;
    const hits = lookupExact(candidate);
    if (!hits.length) return;
    seen.add(candidate);
    for (const hit of hits) {
      suggestions.push({ ...hit, reason });
    }
  };

  // Alternate combinations from handwriting candidates (near matches)
  if (candidateChars.length === word.length && word.length > 0) {
    const pools = candidateChars.map((list, index) => {
      const chars = uniqueWords([word[index], ...(list || [])]).slice(0, 5);
      return chars.length ? chars : [word[index]];
    });

    const combos = [];
    function walk(depth, built) {
      if (combos.length >= 24) return;
      if (depth === pools.length) {
        combos.push(built);
        return;
      }
      for (const ch of pools[depth]) {
        walk(depth + 1, built + ch);
        if (combos.length >= 24) return;
      }
    }
    walk(0, "");
    for (const combo of combos) {
      if (combo === word) continue;
      pushWord(combo, "similar drawing");
    }
  }

  // Prefix / same-first-character neighbors from the dictionary
  if (word && byFirstChar) {
    const bucket = byFirstChar.get(word[0]) || [];
    const prefixHits = [];
    for (const head of bucket) {
      if (head === word) continue;
      if (head.startsWith(word) || head.length === word.length) {
        prefixHits.push(head);
        if (prefixHits.length >= 40) break;
      }
    }
    prefixHits.sort(
      (a, b) => Math.abs(a.length - word.length) - Math.abs(b.length - word.length) || a.length - b.length
    );
    for (const head of prefixHits.slice(0, 12)) {
      pushWord(head, head.startsWith(word) ? "starts with" : "same first character");
    }
  }

  // Curriculum neighbors sharing a character
  if (word && curriculumIndex) {
    for (const [head] of curriculumIndex) {
      if (head === word) continue;
      if ([...word].some((ch) => head.includes(ch))) {
        pushWord(head, "curriculum related");
        if (suggestions.length >= 40) break;
      }
    }
  }

  return {
    exact: exact.map((entry) => ({ ...entry, reason: "exact" })),
    suggestions: suggestions.slice(0, 24)
  };
}

export function getDictionaryStatus() {
  return {
    ready: Boolean(cedictIndex && curriculumIndex),
    headwordCount: byFirstChar ? [...byFirstChar.values()].reduce((n, list) => n + list.length, 0) : 0,
    curriculumCount: curriculumIndex?.size || 0
  };
}
