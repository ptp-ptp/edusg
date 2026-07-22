import React, { useEffect, useMemo, useRef, useState } from "react";
import { Clock, RefreshCw, RotateCcw, Sparkles, Star, Trophy, Zap } from "lucide-react";
import { entryGrade, formatChineseGrade, pickGameWords, wordKey } from "./data/chinese/index.js";
import { useCelebration } from "./components/shared/Celebration.jsx";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

const PAIR_COUNT = 5;
const FAST_MATCH_MS = 3000;
const SUPER_FAST_MS = 1500;

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function ChineseWordGame({ grade, words, rememberedSet, onWordRemembered }) {
  const { confettiCelebration, celebrateCorrect, celebrateWrong } = useCelebration();
  const [phase, setPhase] = useState("plan");
  const [roundWords, setRoundWords] = useState([]);
  const [zhItems, setZhItems] = useState([]);
  const [enItems, setEnItems] = useState([]);
  const [selectedZh, setSelectedZh] = useState(null);
  const [selectedEn, setSelectedEn] = useState(null);
  const [matchedIds, setMatchedIds] = useState(new Set());
  const [fastIds, setFastIds] = useState(new Set());
  const [wrongPair, setWrongPair] = useState(null);
  const [score, setScore] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const lastMatchAtRef = useRef(0);

  useEffect(() => {
    if (phase !== "playing") return undefined;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  function startGame() {
    const picked = pickGameWords(words, rememberedSet, grade, PAIR_COUNT);
    const items = picked.map((entry) => ({
      pairId: wordKey(entryGrade(entry, grade), entry),
      word: entry.word,
      english: entry.english
    }));
    setRoundWords(items);
    setZhItems(shuffle(items));
    setEnItems(shuffle(items));
    setSelectedZh(null);
    setSelectedEn(null);
    setMatchedIds(new Set());
    setFastIds(new Set());
    setWrongPair(null);
    setScore(0);
    setSeconds(0);
    lastMatchAtRef.current = Date.now();
    setPhase("playing");
  }

  function resetToPlan() {
    setPhase("plan");
    setRoundWords([]);
    setZhItems([]);
    setEnItems([]);
    setSelectedZh(null);
    setSelectedEn(null);
    setMatchedIds(new Set());
    setFastIds(new Set());
    setWrongPair(null);
    setScore(0);
    setSeconds(0);
  }

  async function evaluatePair(zhId, enId, origin) {
    if (zhId === enId) {
      const elapsed = Date.now() - lastMatchAtRef.current;
      const isFast = elapsed < FAST_MATCH_MS;
      const stars = elapsed < SUPER_FAST_MS ? 3 : isFast ? 2 : 1;
      lastMatchAtRef.current = Date.now();

      const nextMatched = new Set(matchedIds);
      nextMatched.add(zhId);
      setMatchedIds(nextMatched);
      setScore((value) => value + (isFast ? 2 : 1));
      setSelectedZh(null);
      setSelectedEn(null);
      celebrateCorrect({ stars, origin });

      if (isFast) {
        setFastIds((current) => {
          const next = new Set(current);
          next.add(zhId);
          return next;
        });
        if (!rememberedSet.has(zhId)) {
          await onWordRemembered(zhId);
        }
      }

      if (nextMatched.size >= roundWords.length) {
        setPhase("complete");
        confettiCelebration();
      }
    } else {
      celebrateWrong();
      setWrongPair({ zh: zhId, en: enId });
      window.setTimeout(() => {
        setWrongPair(null);
        setSelectedZh(null);
        setSelectedEn(null);
      }, 600);
    }
  }

  function clickOrigin(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  function handleZhClick(pairId, event) {
    if (phase !== "playing" || matchedIds.has(pairId) || wrongPair) return;
    setSelectedZh(pairId);
    if (selectedEn) evaluatePair(pairId, selectedEn, clickOrigin(event));
  }

  function handleEnClick(pairId, event) {
    if (phase !== "playing" || matchedIds.has(pairId) || wrongPair) return;
    setSelectedEn(pairId);
    if (selectedZh) evaluatePair(selectedZh, pairId, clickOrigin(event));
  }

  const pairsFound = matchedIds.size;
  const starRating = useMemo(() => {
    if (phase !== "complete") return 0;
    if (fastIds.size >= roundWords.length) return 3;
    if (fastIds.size >= Math.ceil(roundWords.length / 2)) return 2;
    return 1;
  }, [phase, fastIds, roundWords.length]);

  const formatTime = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const unrememberedCount = words.filter(
    (entry) => !rememberedSet.has(wordKey(entryGrade(entry, grade), entry))
  ).length;

  if (words.length < 2) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p className="font-black">Not enough words for a game yet.</p>
        <p className="mt-2 text-sm">Add vocabulary for {formatChineseGrade(grade)} first.</p>
      </div>
    );
  }

  if (phase === "plan") {
    return (
      <div className="p-5">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-lg border border-slate-200 p-5">
            <div className="inline-flex items-center gap-2 rounded-md bg-coral/10 px-3 py-2 text-sm font-black text-coral">
              <Sparkles className="h-4 w-4" />
              生字配对 · Word Match
            </div>
            <h3 className="mt-4 text-2xl font-black">Match characters to meanings</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {PAIR_COUNT} Chinese words you haven't remembered yet appear on the left, and their English meanings
              on the right. Tap a word, then tap its meaning to make a pair.
            </p>

            <div className="mt-6 space-y-3">
              {[
                "Tap a Chinese word, then tap the matching English meaning.",
                "Every correct pair earns 1 point.",
                "Match within 3 seconds to double it (2 points) — fast pairs are saved as remembered!",
                "Match all pairs to finish the round."
              ].map((step, index) => (
                <div key={step} className="flex gap-3 text-sm leading-6 text-slate-600">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-coral text-xs font-black text-white">
                    {index + 1}
                  </span>
                  {step}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-lg border border-teal/20 bg-teal/5 p-4 text-sm leading-6 text-slate-600">
              <span className="font-black text-teal">Tip:</span> Words are picked from your "To Learn" list, so you
              practise what you still need to remember.
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm font-black uppercase tracking-wide text-slate-400">This round</div>
            <div className="mt-4 space-y-3">
              <PlanStat icon={Zap} title="Pairs" value={`${Math.min(PAIR_COUNT, words.length)} pairs`} />
              <PlanStat icon={Star} title="Fast bonus" value="2 points under 3s" />
              <PlanStat icon={Trophy} title="To learn" value={`${unrememberedCount} / ${words.length}`} />
            </div>
            <button
              onClick={startGame}
              className="mt-6 w-full rounded-md bg-coral px-5 py-4 text-sm font-black text-white shadow-lg shadow-coral/20"
            >
              Start Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "complete") {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-sun/20 text-sun">
          <Trophy className="h-10 w-10" />
        </div>
        <h3 className="mt-5 text-3xl font-black">All pairs matched!</h3>
        <p className="mt-2 text-slate-500">
          {fastIds.size > 0
            ? `${fastIds.size} fast ${fastIds.size === 1 ? "pair" : "pairs"} saved to your remembered words.`
            : "Match faster than 3 seconds to save words as remembered."}
        </p>

        <div className="mt-6 flex justify-center gap-1">
          {[1, 2, 3].map((star) => (
            <Star
              key={star}
              className={cx("h-8 w-8", star <= starRating ? "fill-sun text-sun" : "text-slate-200")}
            />
          ))}
        </div>

        <div className="mx-auto mt-6 grid max-w-sm grid-cols-3 gap-3">
          <MiniStat title="Score" value={String(score)} />
          <MiniStat title="Fast pairs" value={`${fastIds.size}/${roundWords.length}`} />
          <MiniStat title="Time" value={formatTime} />
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button onClick={startGame} className="rounded-md bg-coral px-6 py-3 font-black text-white">
            Play Again
          </button>
          <button onClick={resetToPlan} className="rounded-md border border-slate-200 px-6 py-3 font-black text-slate-700">
            Game Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black text-coral">生字配对 · Word Match</div>
          <h3 className="mt-1 text-xl font-black">Tap a word, then its meaning</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-cloud px-3 py-2 text-sm font-black text-coral">
            <Star className="h-4 w-4" />
            {score} pts
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-cloud px-3 py-2 text-sm font-black text-teal">
            <Zap className="h-4 w-4" />
            {pairsFound}/{roundWords.length}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-cloud px-3 py-2 text-sm font-black text-slate-600">
            <Clock className="h-4 w-4" />
            {formatTime}
          </span>
        </div>
      </div>

      <div className="mt-2 text-xs font-bold text-slate-400">
        Match in under 3 seconds for double points + auto-save as remembered.
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-6">
        <div className="space-y-3">
          {zhItems.map((item) => {
            const isMatched = matchedIds.has(item.pairId);
            const isSelected = selectedZh === item.pairId;
            const isWrong = wrongPair?.zh === item.pairId;
            const isFast = fastIds.has(item.pairId);
            return (
              <button
                key={`zh-${item.pairId}`}
                type="button"
                onClick={(event) => handleZhClick(item.pairId, event)}
                disabled={isMatched}
                className={cx(
                  "chinese-handwriting w-full rounded-lg border-2 px-3 py-4 text-center text-4xl leading-none transition sm:text-5xl",
                  isMatched && "border-green-300 bg-green-50 text-green-600 opacity-70",
                  isWrong && "animate-pulse border-orange-400 bg-orange-50",
                  isSelected && !isWrong && "border-coral bg-orange-50 shadow-md",
                  !isMatched && !isSelected && !isWrong && "border-slate-200 bg-white hover:border-coral/40 hover:shadow"
                )}
              >
                {item.word}
                {isMatched && isFast && <span className="ml-1 align-top text-base">⚡</span>}
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          {enItems.map((item) => {
            const isMatched = matchedIds.has(item.pairId);
            const isSelected = selectedEn === item.pairId;
            const isWrong = wrongPair?.en === item.pairId;
            return (
              <button
                key={`en-${item.pairId}`}
                type="button"
                onClick={(event) => handleEnClick(item.pairId, event)}
                disabled={isMatched}
                className={cx(
                  "flex min-h-[4.5rem] w-full items-center justify-center rounded-lg border-2 px-3 py-3 text-center text-lg font-bold leading-snug transition sm:text-xl",
                  isMatched && "border-green-300 bg-green-50 text-green-600 opacity-70",
                  isWrong && "animate-pulse border-orange-400 bg-orange-50 text-orange-700",
                  isSelected && !isWrong && "border-coral bg-orange-50 text-coral shadow-md",
                  !isMatched && !isSelected && !isWrong && "border-slate-200 bg-white text-slate-700 hover:border-coral/40 hover:shadow"
                )}
              >
                {item.english}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          onClick={startGame}
          className="inline-flex items-center gap-2 rounded-md bg-teal px-5 py-3 text-sm font-black text-white shadow-lg shadow-teal/20"
        >
          <RefreshCw className="h-4 w-4" />
          New Words
        </button>
        <button
          onClick={resetToPlan}
          className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-5 py-3 text-sm font-black text-slate-700"
        >
          <RotateCcw className="h-4 w-4" />
          Quit to Menu
        </button>
      </div>
    </div>
  );
}

function PlanStat({ icon: Icon, title, value }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white p-3">
      <div className="grid h-10 w-10 place-items-center rounded-md bg-coral/10 text-coral">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs font-black uppercase tracking-wide text-slate-400">{title}</div>
        <div className="font-black text-slate-700">{value}</div>
      </div>
    </div>
  );
}

function MiniStat({ title, value }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="text-xs font-black uppercase tracking-wide text-slate-400">{title}</div>
      <div className="mt-1 text-lg font-black text-slate-700">{value}</div>
    </div>
  );
}
