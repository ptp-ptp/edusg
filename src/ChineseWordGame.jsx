import React, { useEffect, useMemo, useState } from "react";
import { Clock, RotateCcw, Sparkles, Star, Trophy, Zap } from "lucide-react";
import { buildMemoryMatchDeck, pickGameWords, wordKey } from "./data/chinese/index.js";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

const PAIR_COUNT = 6;

export default function ChineseWordGame({ grade, words, rememberedSet, onWordRemembered }) {
  const [phase, setPhase] = useState("plan");
  const [cards, setCards] = useState([]);
  const [flippedIds, setFlippedIds] = useState([]);
  const [matchedPairIds, setMatchedPairIds] = useState(new Set());
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [lockBoard, setLockBoard] = useState(false);

  const gameWords = useMemo(
    () => pickGameWords(words, rememberedSet, grade, PAIR_COUNT),
    [words, rememberedSet, grade]
  );

  useEffect(() => {
    if (phase !== "playing") return undefined;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  function startGame() {
    setCards(buildMemoryMatchDeck(gameWords, grade));
    setFlippedIds([]);
    setMatchedPairIds(new Set());
    setMoves(0);
    setSeconds(0);
    setLockBoard(false);
    setPhase("playing");
  }

  function resetToPlan() {
    setPhase("plan");
    setCards([]);
    setFlippedIds([]);
    setMatchedPairIds(new Set());
    setMoves(0);
    setSeconds(0);
    setLockBoard(false);
  }

  async function handleCardClick(cardId) {
    if (lockBoard || phase !== "playing") return;
    const card = cards.find((entry) => entry.id === cardId);
    if (!card || matchedPairIds.has(card.pairId) || flippedIds.includes(cardId)) return;

    const nextFlipped = [...flippedIds, cardId];
    setFlippedIds(nextFlipped);
    if (nextFlipped.length < 2) return;

    setMoves((value) => value + 1);
    setLockBoard(true);

    const first = cards.find((entry) => entry.id === nextFlipped[0]);
    const second = cards.find((entry) => entry.id === nextFlipped[1]);
    const isMatch = first.pairId === second.pairId;

    window.setTimeout(async () => {
      if (isMatch) {
        const nextMatched = new Set(matchedPairIds);
        nextMatched.add(first.pairId);
        setMatchedPairIds(nextMatched);
        setFlippedIds([]);
        setLockBoard(false);

        if (!rememberedSet.has(first.pairId)) {
          await onWordRemembered(first.pairId);
        }

        if (nextMatched.size >= gameWords.length) {
          setPhase("complete");
        }
      } else {
        setFlippedIds([]);
        setLockBoard(false);
      }
    }, 700);
  }

  const pairsFound = matchedPairIds.size;
  const starRating = useMemo(() => {
    if (phase !== "complete") return 0;
    const perfectMoves = gameWords.length;
    if (moves <= perfectMoves + 2) return 3;
    if (moves <= perfectMoves + 6) return 2;
    return 1;
  }, [phase, moves, gameWords.length]);

  const formatTime = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  if (words.length < 2) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p className="font-black">Not enough words for a game yet.</p>
        <p className="mt-2 text-sm">Add vocabulary for {grade} first.</p>
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
              A memory game to help you remember Chinese words. Flip cards and find pairs — each Chinese character
              matches its English meaning.
            </p>

            <div className="mt-6 space-y-3">
              {[
                "Tap a card to flip it over.",
                "Tap a second card — if they are a pair (字 ↔ meaning), both stay open.",
                "Match all pairs. Fewer moves means more stars.",
                "Every matched pair is saved to your remembered words."
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
              <span className="font-black text-teal">Tip:</span> Unremembered words are picked first, so you practise
              what you still need to learn.
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm font-black uppercase tracking-wide text-slate-400">This round</div>
            <div className="mt-4 space-y-3">
              <PlanStat icon={Zap} title="Pairs" value={`${Math.min(PAIR_COUNT, words.length)} pairs`} />
              <PlanStat icon={Star} title="Cards" value={`${Math.min(PAIR_COUNT, words.length) * 2} cards`} />
              <PlanStat icon={Trophy} title="Remembered" value={`${words.filter((entry) => rememberedSet.has(wordKey(grade, entry))).length} / ${words.length}`} />
            </div>
            <button
              onClick={startGame}
              className="mt-6 w-full rounded-md bg-coral px-5 py-4 text-sm font-black text-white shadow-lg shadow-coral/20"
            >
              Start Game
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-sm font-black text-slate-700">Coming next</div>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Meaning Sprint (timed quiz) and Listen &amp; Pick (audio character match) will join this tab later.
          </p>
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
        <p className="mt-2 text-slate-500">Great job — those words are now in your remembered list.</p>

        <div className="mt-6 flex justify-center gap-1">
          {[1, 2, 3].map((star) => (
            <Star
              key={star}
              className={cx("h-8 w-8", star <= starRating ? "fill-sun text-sun" : "text-slate-200")}
            />
          ))}
        </div>

        <div className="mx-auto mt-6 grid max-w-sm grid-cols-3 gap-3">
          <MiniStat title="Moves" value={String(moves)} />
          <MiniStat title="Time" value={formatTime} />
          <MiniStat title="Pairs" value={String(pairsFound)} />
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
          <h3 className="mt-1 text-xl font-black">Find all matching pairs</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-cloud px-3 py-2 text-sm font-black text-teal">
            <Zap className="h-4 w-4" />
            {pairsFound}/{gameWords.length}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-cloud px-3 py-2 text-sm font-black text-slate-600">
            Moves {moves}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-cloud px-3 py-2 text-sm font-black text-slate-600">
            <Clock className="h-4 w-4" />
            {formatTime}
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {cards.map((card) => {
          const isFlipped = flippedIds.includes(card.id) || matchedPairIds.has(card.pairId);
          const isMatched = matchedPairIds.has(card.pairId);
          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              disabled={lockBoard && !flippedIds.includes(card.id)}
              className={cx(
                "relative min-h-24 rounded-lg border-2 p-3 text-center font-black transition duration-300",
                isMatched && "border-green-300 bg-green-50",
                isFlipped && !isMatched && "border-coral bg-orange-50",
                !isFlipped && "border-slate-200 bg-gradient-to-br from-teal to-coral text-white hover:scale-[1.02]",
                card.kind === "chinese" && isFlipped && "text-3xl md:text-4xl",
                card.kind === "english" && isFlipped && "text-xs leading-5 md:text-sm"
              )}
            >
              {isFlipped ? (
                <span className={cx(card.kind === "english" && "line-clamp-4")}>{card.label}</span>
              ) : (
                <span className="text-lg text-white/90">?</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
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
