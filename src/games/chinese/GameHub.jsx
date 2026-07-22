import React, { useState } from "react";
import { ArrowLeft, Gamepad2 } from "lucide-react";
import ChineseWordGame from "../../ChineseWordGame.jsx";
import BrickBuilder from "./BrickBuilder.jsx";
import FeedPanda from "./FeedPanda.jsx";
import BubblePop from "./BubblePop.jsx";
import { entryGrade, wordKey } from "../../data/chinese/index.js";

const GAMES = [
  {
    id: "match",
    nameZh: "生字配对",
    name: "Word Match",
    emoji: "🃏",
    color: "from-teal/15 to-teal/5 border-teal/30",
    description: "Match 5 words to their meanings — beat 3 seconds for double points!"
  },
  {
    id: "bricks",
    nameZh: "汉字积木",
    name: "Brick Builder",
    emoji: "🧱",
    color: "from-coral/15 to-coral/5 border-coral/30",
    description: "Answer right to stack bricks and build a big tower."
  },
  {
    id: "panda",
    nameZh: "喂熊猫",
    name: "Feed the Panda",
    emoji: "🐼",
    color: "from-green-400/15 to-green-400/5 border-green-400/30",
    description: "Pick the right bun to feed the hungry panda."
  },
  {
    id: "bubbles",
    nameZh: "听音泡泡",
    name: "Bubble Pop",
    emoji: "🫧",
    color: "from-sky-400/15 to-sky-400/5 border-sky-400/30",
    description: "Listen, then pop the right bubble before it floats away!"
  }
];

const GAME_COMPONENTS = {
  match: ChineseWordGame,
  bricks: BrickBuilder,
  panda: FeedPanda,
  bubbles: BubblePop
};

export default function GameHub({ grade, words, rememberedSet, onWordRemembered }) {
  const [activeGame, setActiveGame] = useState(null);

  const toLearnCount = words.filter(
    (entry) => !rememberedSet.has(wordKey(entryGrade(entry, grade), entry))
  ).length;

  if (words.length < 4) {
    return (
      <div className="p-8 text-center text-slate-500">
        <Gamepad2 className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-4 font-black">Games are coming soon for this level.</p>
        <p className="mt-2 text-sm">Games unlock once this level has vocabulary words.</p>
      </div>
    );
  }

  if (activeGame) {
    const game = GAMES.find((entry) => entry.id === activeGame);
    const GameComponent = GAME_COMPONENTS[activeGame];
    return (
      <div>
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={() => setActiveGame(null)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:border-coral hover:text-coral sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            All games
          </button>
          <div className="min-w-0">
            <div className="truncate text-sm font-black text-slate-800">
              {game.emoji} {game.nameZh} · {game.name}
            </div>
          </div>
        </div>
        <GameComponent
          key={`${grade}-${activeGame}`}
          grade={grade}
          words={words}
          rememberedSet={rememberedSet}
          onWordRemembered={onWordRemembered}
          onExit={() => setActiveGame(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="inline-flex items-center gap-2 rounded-md bg-coral/10 px-3 py-2 text-sm font-black text-coral">
            <Gamepad2 className="h-4 w-4" />
            游戏乐园 · Game Zone
          </div>
          <h3 className="mt-3 text-xl font-black sm:text-2xl">Pick a game to play!</h3>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 sm:text-sm">
          {toLearnCount > 0
            ? `${toLearnCount} words to learn — games pick them first`
            : "All words remembered — play to review!"}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {GAMES.map((game) => (
          <button
            key={game.id}
            type="button"
            onClick={() => setActiveGame(game.id)}
            className={`group flex items-center gap-4 rounded-xl border bg-gradient-to-br p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] ${game.color}`}
          >
            <span className="game-bob grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white text-4xl shadow-inner">
              {game.emoji}
            </span>
            <span className="min-w-0">
              <span className="block text-base font-black text-slate-800 sm:text-lg">
                {game.nameZh} <span className="text-slate-400">·</span> {game.name}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-600 sm:text-sm">{game.description}</span>
              <span className="mt-2 inline-block rounded-full bg-white px-3 py-1 text-xs font-black text-coral shadow-sm group-hover:bg-coral group-hover:text-white">
                Play ▸
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
