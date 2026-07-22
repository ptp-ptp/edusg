import React, { useEffect, useMemo, useState } from "react";
import { RotateCcw, Star, Trophy, Volume2 } from "lucide-react";
import { buildMeaningOptions, getWordPinyin } from "../../data/chinese/index.js";
import { speakChineseWord } from "../../utils/chinesePronunciation.js";
import { useCelebration } from "../../components/shared/Celebration.jsx";
import { starsForRound, useGameRound } from "./useGameRound.js";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

const BRICK_COLORS = ["#f87171", "#fb923c", "#facc15", "#4ade80", "#38bdf8", "#a78bfa", "#f472b6", "#2dd4bf"];
const TOWER_SIZE = 8;

export default function BrickBuilder({ grade, words, rememberedSet, onWordRemembered, onExit }) {
  const round = useGameRound({ words, grade, rememberedSet, onWordRemembered, roundSize: TOWER_SIZE });
  const [selected, setSelected] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [wobble, setWobble] = useState(false);
  const { confettiCelebration } = useCelebration();

  useEffect(() => {
    round.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { currentWord, finished, score, streak, total, wrongCount } = round;

  const options = useMemo(
    () => (currentWord ? buildMeaningOptions(words, currentWord) : []),
    [currentWord, words]
  );

  useEffect(() => {
    if (finished) confettiCelebration();
  }, [finished, confettiCelebration]);

  function choose(option) {
    if (feedback || !currentWord) return;
    const correct = option === currentWord.english;
    setSelected(option);
    setFeedback({ correct, answer: currentWord.english });
    if (correct) {
      round.registerCorrect(currentWord);
    } else {
      round.registerWrong();
      setWobble(true);
    }
    window.setTimeout(() => {
      setWobble(false);
      setSelected("");
      setFeedback(null);
      round.advance(correct);
    }, correct ? 900 : 1600);
  }

  if (finished) {
    const stars = starsForRound(wrongCount);
    return (
      <div className="p-6 text-center sm:p-8">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-sun/20 text-sun">
          <Trophy className="h-10 w-10" />
        </div>
        <h3 className="mt-4 text-2xl font-black sm:text-3xl">Tower complete! 🎉</h3>
        <p className="mt-2 text-slate-500">You stacked all {total} bricks and saved those words.</p>

        <div className="mt-4 flex justify-center gap-1">
          {[1, 2, 3].map((star) => (
            <Star key={star} className={cx("h-8 w-8", star <= stars ? "fill-sun text-sun" : "text-slate-200")} />
          ))}
        </div>

        <div className="mx-auto mt-6 flex max-w-[16rem] flex-col-reverse items-center">
          {Array.from({ length: total }).map((_, index) => (
            <Brick key={index} color={BRICK_COLORS[index % BRICK_COLORS.length]} />
          ))}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={round.start} className="rounded-md bg-coral px-6 py-3 font-black text-white">
            Build Again
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
        <p className="text-sm font-bold text-slate-600">Answer right to stack a brick! 🏗️</p>
        <div className="flex gap-2">
          <span className="rounded-md bg-cloud px-3 py-1.5 text-xs font-black text-teal sm:text-sm">
            🧱 {score}/{total}
          </span>
          {streak > 1 && (
            <span className="rounded-md bg-sun/15 px-3 py-1.5 text-xs font-black text-amber-600 sm:text-sm">
              🔥 {streak} in a row
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[6.5rem_1fr] gap-3 sm:grid-cols-[9rem_1fr] sm:gap-5">
        <div className="flex flex-col justify-end rounded-xl bg-gradient-to-b from-sky-50 to-sky-100 p-2">
          <div className={cx("flex flex-col-reverse items-center", wobble && "tower-wobble")}>
            {Array.from({ length: score }).map((_, index) => (
              <Brick
                key={index}
                color={BRICK_COLORS[index % BRICK_COLORS.length]}
                animate={index === score - 1}
                small
              />
            ))}
          </div>
          <div className="mt-1 h-2 rounded-full bg-green-300" />
        </div>

        <div>
          <div className="flex items-center justify-center gap-3 rounded-xl bg-slate-50 px-3 py-3 sm:py-5">
            <span className="chinese-character-display chinese-handwriting text-7xl leading-none sm:text-8xl">
              {currentWord.word}
            </span>
            <div className="flex flex-col items-start gap-1">
              <span className="text-2xl font-semibold text-teal-700 sm:text-3xl">{getWordPinyin(currentWord)}</span>
              <button
                type="button"
                onClick={() => speakChineseWord(currentWord.word)}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-coral/30 bg-coral/10 px-3 text-xs font-black text-coral hover:bg-coral hover:text-white"
              >
                <Volume2 className="h-4 w-4" />
                Listen
              </button>
            </div>
          </div>

          <div className="mt-3 grid gap-2">
            {options.map((option) => (
              <button
                key={`${currentWord.word}-${option}`}
                type="button"
                onClick={() => choose(option)}
                disabled={Boolean(feedback)}
                className={cx(
                  "rounded-lg border px-3 py-2.5 text-left text-sm font-bold leading-snug transition sm:text-base",
                  feedback && option === currentWord.english && "border-green-400 bg-green-50 text-green-700",
                  feedback && selected === option && option !== currentWord.english && "border-orange-300 bg-orange-50 text-orange-700",
                  !feedback && "border-slate-200 bg-white active:border-coral"
                )}
              >
                {option}
              </button>
            ))}
          </div>

          {feedback && (
            <p className={cx("mt-2 text-sm font-black", feedback.correct ? "text-green-600" : "text-orange-600")}>
              {feedback.correct ? "Brick added! 🧱" : `Oops — it means "${feedback.answer}". Try it again soon!`}
            </p>
          )}
        </div>
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

function Brick({ color, animate = false, small = false }) {
  return (
    <div
      className={cx("relative rounded-md shadow-md", small ? "h-7 w-20 sm:h-8 sm:w-28" : "h-8 w-28", animate && "brick-drop")}
      style={{ backgroundColor: color }}
    >
      <div className="absolute -top-1.5 left-0 flex w-full justify-evenly">
        {[0, 1, 2].map((stud) => (
          <span
            key={stud}
            className="h-1.5 w-3.5 rounded-t-sm sm:h-2 sm:w-4"
            style={{ backgroundColor: color, filter: "brightness(1.2)" }}
          />
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0.5 h-1 rounded-b-md bg-black/10" />
    </div>
  );
}
