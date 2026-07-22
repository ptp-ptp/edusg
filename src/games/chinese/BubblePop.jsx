import React, { useEffect, useMemo, useState } from "react";
import { Heart, RotateCcw, Star, Trophy, Volume2 } from "lucide-react";
import { getWordPinyin } from "../../data/chinese/index.js";
import { speakChineseWord } from "../../utils/chinesePronunciation.js";
import { useCelebration } from "../../components/shared/Celebration.jsx";
import { buildCharacterOptions, starsForRound, useGameRound } from "./useGameRound.js";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

const ROUND_SIZE = 8;
const MAX_HEARTS = 3;
const BUBBLE_LEFTS = ["6%", "30%", "54%", "76%"];
const BUBBLE_DURATIONS = ["11s", "13s", "12s", "14s"];
const BUBBLE_DELAYS = ["0s", "1s", "0.5s", "1.6s"];

export default function BubblePop({ grade, words, rememberedSet, onWordRemembered, onExit }) {
  const round = useGameRound({ words, grade, rememberedSet, onWordRemembered, roundSize: ROUND_SIZE });
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [attempt, setAttempt] = useState(0);
  const [wrongPops, setWrongPops] = useState([]);
  const [burstIndex, setBurstIndex] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const { confettiCelebration } = useCelebration();

  const ttsAvailable = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    round.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { currentWord, finished, score, streak, total, wrongCount } = round;
  const gameOver = hearts <= 0 && !finished;

  const options = useMemo(
    () => (currentWord ? buildCharacterOptions(words, currentWord, 4) : []),
    // attempt re-shuffles the bubbles when the same word comes back
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentWord, words, attempt]
  );

  useEffect(() => {
    if (currentWord && ttsAvailable && hearts > 0) speakChineseWord(currentWord.word);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWord, attempt]);

  useEffect(() => {
    if (finished) confettiCelebration();
  }, [finished, confettiCelebration]);

  function goToNextWord(correct) {
    setWrongPops([]);
    setBurstIndex(null);
    setAttempt((value) => value + 1);
    setTransitioning(false);
    round.advance(correct);
  }

  function pop(entry, index) {
    if (transitioning || gameOver || !currentWord || wrongPops.includes(index)) return;
    const correct = entry.word === currentWord.word;

    if (correct) {
      setBurstIndex(index);
      setTransitioning(true);
      round.registerCorrect(currentWord);
      window.setTimeout(() => goToNextWord(true), 550);
    } else {
      setWrongPops((current) => [...current, index]);
      round.registerWrong();
      setHearts((value) => value - 1);
    }
  }

  function handleMiss(event) {
    if (event.animationName !== "bubble-rise") return;
    if (transitioning || gameOver || !currentWord) return;
    round.registerWrong();
    setHearts((value) => value - 1);
    goToNextWord(false);
  }

  function playAgain() {
    setHearts(MAX_HEARTS);
    setWrongPops([]);
    setBurstIndex(null);
    setAttempt(0);
    setTransitioning(false);
    round.start();
  }

  if (finished || gameOver) {
    const stars = finished ? starsForRound(wrongCount) : 0;
    return (
      <div className="p-6 text-center sm:p-8">
        {finished ? (
          <>
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-sun/20 text-sun">
              <Trophy className="h-10 w-10" />
            </div>
            <h3 className="mt-4 text-2xl font-black sm:text-3xl">All bubbles popped! 🫧</h3>
            <p className="mt-2 text-slate-500">You matched {total} words by sound.</p>
            <div className="mt-4 flex justify-center gap-1">
              {[1, 2, 3].map((star) => (
                <Star key={star} className={cx("h-8 w-8", star <= stars ? "fill-sun text-sun" : "text-slate-200")} />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="text-6xl">💦</div>
            <h3 className="mt-4 text-2xl font-black sm:text-3xl">Out of hearts!</h3>
            <p className="mt-2 text-slate-500">
              You popped {score} {score === 1 ? "word" : "words"} — try again to beat it!
            </p>
          </>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={playAgain} className="rounded-md bg-coral px-6 py-3 font-black text-white">
            Play Again
          </button>
          <button
            type="button"
            onClick={onExit}
            className="rounded-md border border-slate-200 px-6 py-3 font-black text-slate-700"
          >
            All Games
          </button>
        </div>
      </div>
    );
  }

  if (!currentWord) return null;

  const showPinyinHint = !ttsAvailable || wrongPops.length > 0;

  return (
    <div className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {Array.from({ length: MAX_HEARTS }).map((_, index) => (
            <Heart
              key={index}
              className={cx("h-5 w-5", index < hearts ? "fill-red-400 text-red-400" : "text-slate-200")}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <span className="rounded-md bg-cloud px-3 py-1.5 text-xs font-black text-teal sm:text-sm">
            🫧 {score}/{total}
          </span>
          {streak > 1 && (
            <span className="rounded-md bg-sun/15 px-3 py-1.5 text-xs font-black text-amber-600 sm:text-sm">
              🔥 {streak} in a row
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
        {ttsAvailable ? (
          <>
            <span className="text-sm font-black text-slate-700">Listen and pop the right bubble!</span>
            <button
              type="button"
              onClick={() => speakChineseWord(currentWord.word)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-coral/30 bg-coral/10 px-3 text-xs font-black text-coral hover:bg-coral hover:text-white"
            >
              <Volume2 className="h-4 w-4" />
              Play sound
            </button>
          </>
        ) : (
          <span className="text-sm font-black text-slate-700">
            Pop the bubble that says: <span className="text-2xl text-coral">{getWordPinyin(currentWord)}</span>
          </span>
        )}
        {showPinyinHint && ttsAvailable && (
          <span className="text-xs font-bold text-slate-500">
            Hint: {getWordPinyin(currentWord)} · "{currentWord.english}"
          </span>
        )}
      </div>

      <div className="relative mt-3 h-[420px] overflow-hidden rounded-xl bg-gradient-to-b from-sky-100 via-sky-200 to-blue-200">
        {options.map((entry, index) => {
          const isCorrect = entry.word === currentWord.word;
          const wasWrongPopped = wrongPops.includes(index);
          const isBurst = burstIndex === index;
          return (
            <button
              key={`${attempt}-${index}`}
              type="button"
              onClick={() => pop(entry, index)}
              onAnimationEnd={isCorrect ? handleMiss : undefined}
              disabled={wasWrongPopped || transitioning}
              className="bubble-rise absolute -bottom-32 h-24 w-24 sm:h-32 sm:w-32"
              style={{
                left: BUBBLE_LEFTS[index],
                "--bubble-duration": BUBBLE_DURATIONS[index],
                "--bubble-delay": BUBBLE_DELAYS[index]
              }}
            >
              <span
                className={cx(
                  "grid h-full w-full place-items-center rounded-full border-2 border-white/80 bg-white/50 shadow-lg backdrop-blur-sm",
                  isBurst && "bubble-burst",
                  wasWrongPopped && "bubble-burst opacity-0"
                )}
              >
                <span className="chinese-handwriting text-4xl leading-none text-slate-800 sm:text-5xl">
                  {entry.word}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onExit}
        className="mt-4 inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-600 sm:text-sm"
      >
        <RotateCcw className="h-4 w-4" />
        Quit to games
      </button>
    </div>
  );
}
