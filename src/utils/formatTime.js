export function formatPracticeMs(ms) {
  const safe = Math.max(0, Math.round(Number(ms) || 0));
  const seconds = safe === 0 ? 0 : Math.ceil(safe / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder}s`;
}
