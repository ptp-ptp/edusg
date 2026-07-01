import { fetchJson } from "./api.js";

const cache = new Map();
const inflight = new Map();

function cacheKey(subject, grade) {
  return `${subject}:${grade || "all"}`;
}

export function getQuestions(subject, grade) {
  const key = cacheKey(subject, grade);
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  if (inflight.has(key)) return inflight.get(key);

  const params = new URLSearchParams({ subject });
  if (grade) params.set("grade", grade);

  const promise = fetchJson(`/admin/questions?${params}`)
    .then((result) => {
      const questions = result.questions || [];
      cache.set(key, questions);
      inflight.delete(key);
      return questions;
    })
    .catch((error) => {
      inflight.delete(key);
      throw error;
    });

  inflight.set(key, promise);
  return promise;
}

export function getCachedQuestions(subject, grade) {
  return cache.get(cacheKey(subject, grade)) || null;
}

export function getMathQuestions() {
  return getQuestions("Math");
}

export function getScienceQuestions(grade = "P4") {
  return getQuestions("Science", grade);
}

export function getEnglishQuestions() {
  return getQuestions("English");
}

export function prefetchPracticeQuestions() {
  getMathQuestions().catch(() => {});
  getScienceQuestions().catch(() => {});
}
