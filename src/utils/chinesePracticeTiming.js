const MIN_SAMPLES_FOR_SLOW_RULE = 5;

export function isSlowPracticeResponse(timeMs, summary) {
  if (!summary || summary.attemptCount < MIN_SAMPLES_FOR_SLOW_RULE) return false;
  if (!summary.slowThresholdMs) return false;
  return timeMs > summary.slowThresholdMs;
}

export function getPracticeAnswerResult(correct, timeMs, timingSummary) {
  const slowResponse = correct && isSlowPracticeResponse(timeMs, timingSummary);
  return {
    remembered: correct && !slowResponse,
    slowResponse
  };
}
