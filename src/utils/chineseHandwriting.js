import { AnalyzedCharacter, Matcher, init } from "hanzilookup-js";

const DATA_NAME = "mmah";
const DATA_URL = "/chinese/handwriting/mmah.json";

let initPromise = null;
let matcher = null;

export function ensureHandwritingReady() {
  if (matcher) return Promise.resolve(true);
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve) => {
    init(DATA_NAME, DATA_URL, (success) => {
      if (!success) {
        initPromise = null;
        resolve(false);
        return;
      }
      matcher = new Matcher(DATA_NAME);
      resolve(true);
    });
  });

  return initPromise;
}

/**
 * Recognize a drawn character from stroke point arrays.
 * @param {number[][][]} strokes - [stroke][point][x,y]
 * @param {number} [limit=8]
 * @returns {Promise<{ character: string, score: number }[]>}
 */
export async function recognizeStrokes(strokes, limit = 8) {
  if (!strokes?.length) return [];
  const ready = await ensureHandwritingReady();
  if (!ready || !matcher) return [];

  const analyzed = new AnalyzedCharacter(strokes);
  return new Promise((resolve) => {
    matcher.match(analyzed, limit, (matches) => {
      resolve(
        (matches || []).map((match) => ({
          character: match.character,
          score: match.score
        }))
      );
    });
  });
}
