import React, { useEffect, useMemo, useRef, useState } from "react";
import { BookMarked, Check, Languages, Target, Volume2, X } from "lucide-react";
import ChinesePracticeModal from "./ChinesePracticeModal";
import ChineseWordGame from "./ChineseWordGame";
import ChineseDictionaryModal from "./components/chinese/ChineseDictionaryModal.jsx";
import {
  chineseGrades,
  getWordPinyin,
  getWordsForGrade,
  wordKey
} from "./data/chinese/index.js";
import { speakChineseWord } from "./utils/chinesePronunciation.js";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function ChineseVocabPractice({
  grade,
  setGrade,
  rememberedWords,
  onWordRemembered,
  onStartPractice
}) {
  const [mode, setMode] = useState("vocab");
  const [search, setSearch] = useState("");
  const [wordListModal, setWordListModal] = useState(null);
  const [dictionaryOpen, setDictionaryOpen] = useState(false);
  const returnModeRef = useRef("vocab");

  const words = getWordsForGrade(grade);
  const rememberedSet = useMemo(
    () => new Set(rememberedWords[grade] || []),
    [rememberedWords, grade]
  );

  const filteredWords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return words;
    return words.filter(
      (entry) =>
        entry.word.includes(query) ||
        getWordPinyin(entry).toLowerCase().includes(query) ||
        entry.lesson.toLowerCase().includes(query) ||
        entry.english.toLowerCase().includes(query) ||
        entry.type.includes(query)
    );
  }, [words, search]);

  useEffect(() => {
    setSearch("");
    setWordListModal(null);
  }, [grade]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const loadVoices = () => window.speechSynthesis.getVoices();
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  function openPractice() {
    if (mode !== "practice" && mode !== "dictionary") {
      returnModeRef.current = mode;
    }
    setDictionaryOpen(false);
    setMode("practice");
    onStartPractice?.();
  }

  function closePractice() {
    setMode(returnModeRef.current || "vocab");
  }

  function openDictionary() {
    if (mode !== "dictionary" && mode !== "practice") {
      returnModeRef.current = mode;
    } else if (mode === "practice") {
      returnModeRef.current = returnModeRef.current || "vocab";
    }
    setMode("dictionary");
    setDictionaryOpen(true);
  }

  function closeDictionary() {
    setDictionaryOpen(false);
    setMode(returnModeRef.current || "vocab");
  }

  const isPracticeOpen = mode === "practice";

  const rememberedCount = words.filter((entry) => rememberedSet.has(wordKey(grade, entry))).length;
  const toLearnCount = words.length - rememberedCount;

  const rememberedWordList = useMemo(
    () => words.filter((entry) => rememberedSet.has(wordKey(grade, entry))),
    [words, rememberedSet, grade]
  );

  const toLearnWordList = useMemo(
    () => words.filter((entry) => !rememberedSet.has(wordKey(grade, entry))),
    [words, rememberedSet, grade]
  );

  const wordListModalConfig = {
    all: { title: "All Words", subtitle: `${words.length} words in ${grade}`, entries: words },
    remembered: { title: "Remembered", subtitle: `${rememberedCount} words saved`, entries: rememberedWordList },
    toLearn: { title: "To Learn", subtitle: `${toLearnCount} words left`, entries: toLearnWordList }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-coral via-red-400 to-sun px-5 py-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-black uppercase tracking-wide opacity-90">Primary Chinese · 华文</div>
            <h2 className="mt-1 text-2xl font-black md:text-3xl">Vocabulary, Practice & Game</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-white/90">
              Browse words, practise meanings, or play 生字配对 to remember Chinese characters.
            </p>
          </div>
          <div className="grid w-full grid-cols-3 gap-2 text-center sm:w-auto">
            <StatBox
              count={words.length}
              label="Words"
              active={wordListModal === "all"}
              onClick={() => setWordListModal("all")}
            />
            <StatBox
              count={rememberedCount}
              label="Remembered"
              active={wordListModal === "remembered"}
              onClick={() => setWordListModal("remembered")}
            />
            <StatBox
              count={toLearnCount}
              label="To Learn"
              active={wordListModal === "toLearn"}
              onClick={() => setWordListModal("toLearn")}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {chineseGrades.map((level) => (
            <button
              key={level}
              onClick={() => setGrade(level)}
              className={cx(
                "rounded-md px-3 py-2 text-sm font-black transition",
                grade === level ? "bg-white text-coral" : "bg-white/20 text-white hover:bg-white/30"
              )}
            >
              {level}
            </button>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-4 gap-1 rounded-lg bg-white/20 p-1">
          {[
            { id: "dictionary", label: "Dictionary", Icon: BookMarked },
            { id: "vocab", label: "Vocab" },
            { id: "practice", label: "Practice" },
            { id: "game", label: "Game" }
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                if (option.id === "dictionary") openDictionary();
                else if (option.id === "practice") openPractice();
                else {
                  setDictionaryOpen(false);
                  setMode(option.id);
                }
              }}
              className={cx(
                "flex items-center justify-center gap-1 rounded-md px-2 py-3 text-xs font-black sm:gap-1.5 sm:px-4 sm:text-sm",
                mode === option.id || (option.id === "dictionary" && dictionaryOpen)
                  ? "bg-white text-coral"
                  : "text-white"
              )}
            >
              {option.Icon ? <option.Icon className="h-4 w-4 shrink-0" /> : null}
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {words.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          <Languages className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 font-black">{grade} vocabulary coming soon</p>
          <p className="mt-2 text-sm">P1 words are ready. Other levels will be added next.</p>
          <p className="mt-3 text-sm">
            You can still open{" "}
            <button type="button" onClick={openDictionary} className="font-black text-coral underline">
              Dictionary
            </button>{" "}
            to draw and look up words.
          </p>
        </div>
      ) : mode === "game" ? (
        <ChineseWordGame
          key={grade}
          grade={grade}
          words={words}
          rememberedSet={rememberedSet}
          onWordRemembered={onWordRemembered}
        />
      ) : (
        <div className="p-3 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search 水 / shuǐ / water / 第三课"
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-base outline-none focus:border-coral sm:max-w-xl sm:text-sm"
            />
            <button
              onClick={openPractice}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-coral px-5 py-3 text-sm font-black text-white sm:w-auto"
            >
              <Target className="h-4 w-4" />
              Practice
            </button>
          </div>

          <div className="mt-4 space-y-3 md:hidden">
            {filteredWords.map((entry) => (
              <VocabWordCard
                key={wordKey(grade, entry)}
                entry={entry}
                remembered={rememberedSet.has(wordKey(grade, entry))}
              />
            ))}
          </div>

          <div className="mt-4 hidden overflow-hidden rounded-lg border border-slate-200 md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                  <th className="border-b border-slate-200 px-4 py-3">Lesson</th>
                  <th className="border-b border-slate-200 px-4 py-3">Chinese</th>
                  <th className="border-b border-slate-200 px-4 py-3">Pinyin</th>
                  <th className="border-b border-slate-200 px-4 py-3">Listen</th>
                  <th className="border-b border-slate-200 px-4 py-3">Type</th>
                  <th className="border-b border-slate-200 px-4 py-3">English Meaning</th>
                  <th className="border-b border-slate-200 px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredWords.map((entry) => {
                  const key = wordKey(grade, entry);
                  const remembered = rememberedSet.has(key);
                  return (
                    <tr key={key} className={cx(remembered && "bg-green-50/60")}>
                      <td className="border-b border-slate-100 px-4 py-3 text-slate-600">{entry.lesson}</td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <ChineseCharacterDisplay size="table">{entry.word}</ChineseCharacterDisplay>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 font-semibold text-teal-700">
                        <PinyinText entry={entry} />
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <PlayPronunciationButton word={entry.word} compact />
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-slate-600">{entry.type}</td>
                      <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{entry.english}</td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <RememberedBadge remembered={remembered} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-lg border border-coral/20 bg-coral/5 p-4 text-sm leading-6 text-slate-600">
            <span className="font-black text-coral">生字表</span> — {filteredWords.length} of {words.length} words shown.
            {rememberedCount > 0 ? ` You have remembered ${rememberedCount} words in ${grade}.` : " Start Practice to mark words as remembered."}
          </div>
        </div>
      )}
      {isPracticeOpen && (
        <ChinesePracticeModal
          grade={grade}
          setGrade={setGrade}
          rememberedSet={rememberedSet}
          onWordRemembered={onWordRemembered}
          onClose={closePractice}
        />
      )}
      {dictionaryOpen && <ChineseDictionaryModal onClose={closeDictionary} />}
      {wordListModal && (
        <WordListModal
          config={wordListModalConfig[wordListModal]}
          grade={grade}
          rememberedSet={rememberedSet}
          onClose={() => setWordListModal(null)}
        />
      )}
    </div>
  );
}

function StatBox({ count, label, onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-lg px-2 py-3 backdrop-blur transition sm:px-4",
        active ? "bg-white text-coral ring-2 ring-white/80" : "bg-white/20 text-white hover:bg-white/30"
      )}
    >
      <div className="text-xl font-black sm:text-2xl">{count}</div>
      <div className="text-[10px] font-bold leading-tight sm:text-xs">{label}</div>
    </button>
  );
}

function WordListModal({ config, grade, rememberedSet, onClose }) {
  const { title, subtitle, entries } = config;

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[85vh] sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="word-list-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <div className="text-xs font-black uppercase tracking-wide text-coral">{grade}</div>
            <h3 id="word-list-title" className="mt-1 text-xl font-black text-slate-800 sm:text-2xl">
              {title}
            </h3>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close word list"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-600 hover:border-coral hover:text-coral"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
          {entries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-slate-500">
              <p className="font-bold">No words in this list yet.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry) => {
                const key = wordKey(grade, entry);
                const remembered = rememberedSet.has(key);
                return (
                  <li key={key}>
                    <WordListRow entry={entry} remembered={remembered} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function WordListRow({ entry, remembered }) {
  return (
    <div
      className={cx(
        "flex items-center gap-3 rounded-xl border px-3 py-3 sm:px-4",
        remembered ? "border-green-200 bg-green-50/60" : "border-slate-200 bg-white"
      )}
    >
      <div className="shrink-0 text-center">
        <div className="chinese-character-display chinese-handwriting text-3xl sm:text-4xl">{entry.word}</div>
        <PinyinText entry={entry} className="mt-1 block text-center text-xs" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold leading-snug text-slate-800 sm:text-base">{entry.english}</div>
        <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-slate-500 sm:text-xs">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold">{entry.lesson}</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold">{entry.type}</span>
        </div>
      </div>
      <PlayPronunciationButton word={entry.word} compact />
    </div>
  );
}

function ChineseCharacterDisplay({ children, size = "card" }) {
  const sizeClass =
    size === "hero"
      ? "text-6xl sm:text-7xl md:text-8xl"
      : size === "table"
        ? "text-4xl"
        : "text-5xl sm:text-6xl";

  const padClass = size === "hero" ? "min-w-[5.5rem] min-h-[5.5rem] px-5 py-4 sm:min-w-[6.5rem] sm:min-h-[6.5rem]" : "";

  return (
    <span className={cx("chinese-character-display chinese-handwriting", sizeClass, padClass)}>
      {children}
    </span>
  );
}

function RememberedBadge({ remembered }) {
  if (remembered) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-1 text-xs font-black text-green-700">
        <Check className="h-3.5 w-3.5" />
        Remembered
      </span>
    );
  }
  return <span className="text-xs font-semibold text-slate-400">Learning</span>;
}

function PinyinText({ entry, size = "md", className = "" }) {
  const pinyin = getWordPinyin(entry);
  if (!pinyin) return null;

  const sizeClass = size === "lg" ? "text-lg sm:text-xl" : "text-sm sm:text-base";

  return (
    <span className={cx("font-semibold tracking-wide text-teal-700", sizeClass, className)}>
      {pinyin}
    </span>
  );
}

function PlayPronunciationButton({ word, label, compact = false }) {
  function handlePlay(event) {
    event.preventDefault();
    event.stopPropagation();
    speakChineseWord(word);
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={handlePlay}
        aria-label={`Listen to ${word}`}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-coral/30 bg-coral/10 text-coral transition hover:bg-coral hover:text-white active:scale-95"
      >
        <Volume2 className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handlePlay}
      aria-label={`Listen to ${word}`}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-coral/30 bg-coral/10 px-4 py-2.5 text-sm font-black text-coral transition hover:bg-coral hover:text-white active:scale-95"
    >
      <Volume2 className="h-4 w-4" />
      {label || "Listen"}
    </button>
  );
}

function VocabWordCard({ entry, remembered }) {
  return (
    <article
      className={cx(
        "rounded-xl border p-4 shadow-sm",
        remembered ? "border-green-200 bg-green-50/50" : "border-slate-200 bg-white"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex shrink-0 flex-col items-center gap-2">
          <ChineseCharacterDisplay size="card">{entry.word}</ChineseCharacterDisplay>
          <PinyinText entry={entry} className="text-center" />
          <PlayPronunciationButton word={entry.word} compact />
        </div>
        <div className="min-w-0 flex-1 pt-1">
          <div className="text-base font-bold leading-snug text-slate-800">{entry.english}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold">{entry.lesson}</span>
            <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold">{entry.type}</span>
          </div>
          <div className="mt-3">
            <RememberedBadge remembered={remembered} />
          </div>
        </div>
      </div>
    </article>
  );
}
