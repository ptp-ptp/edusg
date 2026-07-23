import { fetchJson, getUserId } from "./api";

/**
 * Track learning activity for insights (practice/watch/read/game/dictionary).
 * Safe to call fire-and-forget; failures are swallowed so UX never blocks.
 */
export async function trackActivity({
  studentId,
  subject,
  kind = "practice",
  mode = "",
  meta = {},
  durationMs = 0,
  starsEarned = 0,
  reason
} = {}) {
  const id = studentId || getUserId();
  if (!id || !subject) return null;
  try {
    return await fetchJson("/activity", {
      method: "POST",
      body: JSON.stringify({
        studentId: id,
        subject,
        kind,
        mode,
        meta,
        durationMs: Math.max(0, Math.round(durationMs || 0)),
        starsEarned: Math.max(0, Number(starsEarned) || 0),
        reason
      })
    });
  } catch {
    return null;
  }
}

/** Measure elapsed wall time for a feature session (watch/read/game/practice). */
export function createActivitySession({ studentId, subject, kind, mode = "", meta = {} }) {
  const startedAt = Date.now();
  let closed = false;

  return {
    async end({ starsEarned = 0, extraMeta = {}, minMs = 1000 } = {}) {
      if (closed) return null;
      closed = true;
      const durationMs = Date.now() - startedAt;
      if (durationMs < minMs && !starsEarned) return null;
      return trackActivity({
        studentId,
        subject,
        kind,
        mode,
        meta: { ...meta, ...extraMeta },
        durationMs,
        starsEarned
      });
    }
  };
}

export async function fetchStudentInsights(studentId, subject) {
  const query = subject ? `?subject=${encodeURIComponent(subject)}` : "";
  return fetchJson(`/insights/${encodeURIComponent(studentId)}${query}`);
}
