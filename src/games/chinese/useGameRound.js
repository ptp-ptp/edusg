import { useCallback, useEffect, useRef, useState } from "react";
import { pickGameWords, shuffle, wordKey } from "../../data/chinese/index.js";
import { playCorrectSound, playWrongSound } from "../../utils/practiceSounds.js";
import { trackActivity } from "../../lib/activityApi.js";

export function starsForRound(wrongCount) {
  if (wrongCount === 0) return 3;
  if (wrongCount <= 3) return 2;
  return 1;
}

/**
 * Shared round state for Chinese word games.
 * Picks unremembered words first, tracks score/streak and
 * saves correct answers through onWordRemembered.
 */
export function useGameRound({ words, grade, rememberedSet, onWordRemembered, roundSize = 8, gameId = "game" }) {
  const [queue, setQueue] = useState([]);
  const [total, setTotal] = useState(0);
  const [started, setStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const startedAtRef = useRef(0);
  const reportedRef = useRef(false);

  const currentWord = queue[0] || null;
  const finished = started && queue.length === 0;

  const start = useCallback(() => {
    const picked = pickGameWords(words, rememberedSet, grade, roundSize);
    setQueue(picked);
    setTotal(picked.length);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setWrongCount(0);
    setStarted(true);
    startedAtRef.current = Date.now();
    reportedRef.current = false;
  }, [words, rememberedSet, grade, roundSize]);

  const registerCorrect = useCallback(
    (word) => {
      playCorrectSound();
      const key = wordKey(word.sourceGrade || grade, word);
      if (!rememberedSet.has(key)) void onWordRemembered?.(key);
      setScore((value) => value + 1);
      setStreak((value) => {
        const next = value + 1;
        setBestStreak((best) => Math.max(best, next));
        return next;
      });
    },
    [grade, rememberedSet, onWordRemembered]
  );

  const registerWrong = useCallback(() => {
    playWrongSound();
    setWrongCount((value) => value + 1);
    setStreak(0);
  }, []);

  /** Move to the next word. Wrong answers are re-queued so the child sees them again. */
  const advance = useCallback((correct, { requeue = true } = {}) => {
    setQueue((current) => {
      if (!current.length) return current;
      if (correct || !requeue) return current.slice(1);
      return [...current.slice(1), current[0]];
    });
  }, []);

  useEffect(() => {
    if (!finished || reportedRef.current) return;
    reportedRef.current = true;
    const durationMs = Math.max(1000, Date.now() - (startedAtRef.current || Date.now()));
    trackActivity({
      subject: "Chinese",
      kind: "game",
      mode: gameId,
      meta: { gameId, score, wrongCount, total },
      durationMs,
      starsEarned: starsForRound(wrongCount)
    });
  }, [finished, gameId, score, wrongCount, total]);

  return {
    currentWord,
    queueLength: queue.length,
    total,
    started,
    finished,
    score,
    streak,
    bestStreak,
    wrongCount,
    start,
    registerCorrect,
    registerWrong,
    advance
  };
}

/** 4 character choices (the target plus 3 distractors with different characters). */
export function buildCharacterOptions(words, target, count = 4) {
  const seen = new Set([target.word]);
  const distractors = [];
  for (const entry of shuffle(words)) {
    if (seen.has(entry.word)) continue;
    seen.add(entry.word);
    distractors.push(entry);
    if (distractors.length >= count - 1) break;
  }
  return shuffle([target, ...distractors]);
}
