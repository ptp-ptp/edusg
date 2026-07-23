import React, { useEffect, useMemo, useState } from "react";
import { RotateCcw, Star, Trophy, Volume2 } from "lucide-react";
import { getWordPinyin } from "../../data/chinese/index.js";
import { speakChineseWord } from "../../utils/chinesePronunciation.js";
import { useCelebration } from "../../components/shared/Celebration.jsx";
import { buildCharacterOptions, starsForRound, useGameRound } from "./useGameRound.js";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

const ROUND_SIZE = 10;

export default function FeedPanda({ grade, words, rememberedSet, onWordRemembered, onExit }) {
  const round = useGameRound({ words, grade, rememberedSet, onWordRemembered, roundSize: ROUND_SIZE, gameId: "panda" });
  const [busy, setBusy] = useState(false);
  const [flyIndex, setFlyIndex] = useState(null);
  const [chomping, setChomping] = useState(false);
  const [shakingNo, setShakingNo] = useState(false);
  const [glowIndex, setGlowIndex] = useState(null);
  const { confettiCelebration } = useCelebration();

  useEffect(() => {
    round.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { currentWord, finished, score, streak, total, wrongCount } = round;

  const options = useMemo(
    () => (currentWord ? buildCharacterOptions(words, currentWord, 4) : []),
    [currentWord, words]
  );

  useEffect(() => {
    if (currentWord) speakChineseWord(currentWord.word);
  }, [currentWord]);

  useEffect(() => {
    if (finished) confettiCelebration();
  }, [finished, confettiCelebration]);

  function choose(entry, index) {
    if (busy || !currentWord) return;
    const correct = entry.word === currentWord.word;
    setBusy(true);

    if (correct) {
      setFlyIndex(index);
      setChomping(true);
      round.registerCorrect(currentWord);
      window.setTimeout(() => {
        setFlyIndex(null);
        setChomping(false);
        setBusy(false);
        round.advance(true);
      }, 950);
    } else {
      const correctIndex = options.findIndex((option) => option.word === currentWord.word);
      setShakingNo(true);
      setGlowIndex(correctIndex);
      round.registerWrong();
      window.setTimeout(() => {
        setShakingNo(false);
        setGlowIndex(null);
        setBusy(false);
        round.advance(false);
      }, 1700);
    }
  }

  if (finished) {
    const stars = starsForRound(wrongCount);
    return (
      <div className="p-6 text-center sm:p-8">
        <div className="text-6xl">🐼✨</div>
        <h3 className="mt-4 text-2xl font-black sm:text-3xl">The panda is full!</h3>
        <p className="mt-2 text-slate-500">You fed the panda {total} tasty buns and saved those words.</p>

        <div className="mt-4 flex justify-center gap-1">
          {[1, 2, 3].map((star) => (
            <Star key={star} className={cx("h-8 w-8", star <= stars ? "fill-sun text-sun" : "text-slate-200")} />
          ))}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={round.start} className="rounded-md bg-coral px-6 py-3 font-black text-white">
            Feed Again
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

  return (
    <div className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-600">Tap the bun with the right character! 🥟</p>
        <div className="flex gap-2">
          <span className="rounded-md bg-cloud px-3 py-1.5 text-xs font-black text-teal sm:text-sm">
            🎋 {score}/{total}
          </span>
          {streak > 1 && (
            <span className="rounded-md bg-sun/15 px-3 py-1.5 text-xs font-black text-amber-600 sm:text-sm">
              🔥 {streak} in a row
            </span>
          )}
        </div>
      </div>

      <div className="relative mt-4 rounded-xl bg-gradient-to-b from-green-50 to-emerald-100 px-3 pb-5 pt-4 sm:px-5">
        <div className="flex flex-col items-center">
          <div className="relative max-w-xs rounded-2xl border-2 border-white bg-white/90 px-4 py-2.5 text-center shadow-sm">
            <span className="text-sm font-black text-slate-800 sm:text-base">
              I want... <span className="text-coral">"{currentWord.english}"</span>
            </span>
            <button
              type="button"
              onClick={() => speakChineseWord(currentWord.word)}
              aria-label="Listen again"
              className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-coral/10 align-middle text-coral hover:bg-coral hover:text-white"
            >
              <Volume2 className="h-3.5 w-3.5" />
            </button>
            <span className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-white bg-white/90" />
          </div>

          <div className={cx("mt-3 text-7xl sm:text-8xl", chomping && "panda-chomp", shakingNo && "panda-no")}>
            {chomping ? "😋" : shakingNo ? "🙈" : "🐼"}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {options.map((entry, index) => (
            <button
              key={`${currentWord.word}-${entry.word}-${index}`}
              type="button"
              onClick={() => choose(entry, index)}
              disabled={busy}
              className={cx(
                "relative mx-auto grid h-32 w-32 place-items-center rounded-full border-2 bg-gradient-to-b from-white to-amber-50 shadow-md transition sm:h-36 sm:w-36",
                glowIndex === index ? "bun-glow border-green-400" : "border-amber-200",
                flyIndex === index && "bun-fly",
                !busy && "hover:-translate-y-1 hover:shadow-lg active:scale-95"
              )}
            >
              <span className="absolute top-1.5 text-[10px] tracking-widest text-amber-300">〰〰</span>
              <span className="chinese-handwriting text-5xl leading-none text-slate-800 sm:text-6xl">{entry.word}</span>
            </button>
          ))}
        </div>

        {shakingNo && (
          <p className="mt-3 text-center text-sm font-black text-orange-600">
            The panda wants {currentWord.word} ({getWordPinyin(currentWord)}) — see it glowing? 🌟
          </p>
        )}
        {chomping && <p className="mt-3 text-center text-sm font-black text-green-600">Yum yum! 好吃! 🎋</p>}
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
