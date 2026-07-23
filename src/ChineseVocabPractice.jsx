import React, { useEffect, useMemo, useRef, useState } from "react";
import { BookMarked, BookOpenText, Languages, MonitorPlay, Target, Trophy, X } from "lucide-react";
import ChinesePracticeModal from "./ChinesePracticeModal";
import GameHub from "./games/chinese/GameHub.jsx";
import ChineseDictionaryModal from "./components/chinese/ChineseDictionaryModal.jsx";
import ChineseReadingSection from "./components/chinese/ChineseReadingSection.jsx";
import ChineseWatchSection from "./components/chinese/ChineseWatchSection.jsx";
import { P1TierToggle } from "./components/chinese/ChineseGradePicker.jsx";
import PhraseDetailModal from "./components/chinese/PhraseDetailModal.jsx";
import {
  ChineseCharacterDisplay,
  PlayPronunciationButton,
  PinyinText,
  RememberedBadge
} from "./components/chinese/chineseDisplay.jsx";
import {
  entryGrade,
  formatChineseGrade,
  formatChineseGradeLabel,
  getActiveProgressGrades,
  getCombinedWordsForGrades,
  getPracticeableWords,
  getWordPinyin,
  wordKey
} from "./data/chinese/index.js";
import { fetchChinesePack, resolveChineseContentKey } from "./lib/chineseContentApi.js";
import { formatPracticeMs } from "./utils/formatTime.js";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

/** Permanent Chinese student tabs — Dictionary is required and always first. */
const CHINESE_MAIN_TABS = [
  ["dictionary", BookMarked, "Dictionary"],
  ["reading", BookOpenText, "Reading"],
  ["vocab", Languages, "Vocab"],
  ["watch", MonitorPlay, "Watch"],
  ["game", Trophy, "Game"]
];

export default function ChineseVocabPractice({
  grade,
  setGrade,
  pathway = "chinese",
  p1Tiers = ["P1A"],
  onP1TiersChange,
  rememberedWords,
  wordTimes = {},
  timingSummary,
  onWordRemembered,
  onStartPractice
}) {
  const [mode, setMode] = useState("reading");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [wordListModal, setWordListModal] = useState(null);
  const [phraseDetailEntry, setPhraseDetailEntry] = useState(null);
  const [remoteWords, setRemoteWords] = useState(null);
  const [dictionaryOpen, setDictionaryOpen] = useState(false);
  const returnModeRef = useRef("reading");
  const isExtraPathway = grade === "P4" && pathway === "extra";

  const progressGrades = useMemo(
    () => getActiveProgressGrades(grade, pathway, p1Tiers),
    [grade, pathway, p1Tiers]
  );
  const vocabGrade = progressGrades[0] || grade;
  const gradeLabel = useMemo(() => formatChineseGradeLabel(progressGrades), [progressGrades]);

  useEffect(() => {
    let active = true;
    (async () => {
      const contentKeys = [...new Set(progressGrades.map((g) => resolveChineseContentKey(g, pathway)))];
      const packs = await Promise.all(contentKeys.map((key) => fetchChinesePack(key)));
      if (!active) return;
      const merged = [];
      packs.forEach((pack, index) => {
        if (!pack?.words?.length) return;
        const sourceGrade = contentKeys[index];
        merged.push(...pack.words.map((entry) => ({ ...entry, sourceGrade })));
      });
      setRemoteWords(merged.length ? merged : null);
    })();
    return () => {
      active = false;
    };
  }, [progressGrades, pathway]);

  const words = useMemo(() => {
    if (remoteWords) return remoteWords;
    return getCombinedWordsForGrades(progressGrades, pathway);
  }, [remoteWords, progressGrades, pathway]);
  const practiceWords = useMemo(() => getPracticeableWords(words), [words]);
  const rememberedSet = useMemo(() => {
    const set = new Set();
    for (const progressGrade of progressGrades) {
      for (const key of rememberedWords[progressGrade] || []) set.add(key);
    }
    return set;
  }, [rememberedWords, progressGrades]);

  const categoryFilteredWords = useMemo(() => {
    if (!isExtraPathway || categoryFilter === "all") return words;
    return words.filter((entry) => entry.category === categoryFilter);
  }, [words, categoryFilter, isExtraPathway]);

  const filteredWords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return categoryFilteredWords;
    return categoryFilteredWords.filter(
      (entry) =>
        entry.word.includes(query) ||
        getWordPinyin(entry).toLowerCase().includes(query) ||
        entry.lesson.toLowerCase().includes(query) ||
        entry.english.toLowerCase().includes(query) ||
        entry.type.includes(query) ||
        (entry.chinese_explanation || "").includes(query)
    );
  }, [categoryFilteredWords, search]);

  useEffect(() => {
    setSearch("");
    setCategoryFilter("all");
    setWordListModal(null);
    setPhraseDetailEntry(null);
    setMode("reading");
  }, [grade, pathway]);

  useEffect(() => {
    if (grade !== "P1" || !onP1TiersChange) return;
    if (!p1Tiers.length) onP1TiersChange(["P1A"]);
  }, [grade, p1Tiers, onP1TiersChange]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const loadVoices = () => window.speechSynthesis.getVoices();
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  function openPractice(fromMode = mode) {
    if (practiceWords.length === 0) return;
    if (fromMode !== "practice" && fromMode !== "dictionary") {
      returnModeRef.current = fromMode;
    }
    setDictionaryOpen(false);
    setMode("practice");
    onStartPractice?.();
  }

  function closePractice() {
    setMode(returnModeRef.current || "reading");
  }

  function openDictionary() {
    if (mode !== "dictionary" && mode !== "practice") {
      returnModeRef.current = mode;
    }
    setMode("dictionary");
    setDictionaryOpen(true);
  }

  function closeDictionary() {
    setDictionaryOpen(false);
    setMode(returnModeRef.current || "reading");
  }

  const isPracticeOpen = mode === "practice";

  const rememberedCount = words.filter((entry) =>
    rememberedSet.has(wordKey(entryGrade(entry, vocabGrade), entry))
  ).length;
  const toLearnCount = words.length - rememberedCount;

  const rememberedWordList = useMemo(
    () => words.filter((entry) => rememberedSet.has(wordKey(entryGrade(entry, vocabGrade), entry))),
    [words, rememberedSet, vocabGrade]
  );

  const toLearnWordList = useMemo(
    () => words.filter((entry) => !rememberedSet.has(wordKey(entryGrade(entry, vocabGrade), entry))),
    [words, rememberedSet, vocabGrade]
  );

  const wordListModalConfig = {
    all: { title: "All Words", subtitle: `${words.length} words in ${gradeLabel}`, entries: words },
    remembered: { title: "Remembered", subtitle: `${rememberedCount} words saved`, entries: rememberedWordList },
    toLearn: { title: "To Learn", subtitle: `${toLearnCount} words left`, entries: toLearnWordList }
  };

  function openPhraseDetail(entry) {
    if (!isExtraPathway || entry.category !== "phrase") return;
    setPhraseDetailEntry(entry);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-coral via-red-400 to-sun px-5 py-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-black uppercase tracking-wide opacity-90">Primary Chinese · 华文</div>
            <h2 className="mt-1 text-2xl font-black md:text-3xl">
              {isExtraPathway ? `${formatChineseGrade(vocabGrade)} · Vocabulary, Watch & Game` : `${grade} · Vocabulary, Watch & Game`}
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-white/90">
              {isExtraPathway
                ? "Browse tuition vocab, phrases and passages on Vocab, watch story videos, or try a Game."
                : "Start on Reading, open Vocab to browse and practise words, watch story videos, or play games."}
            </p>
          </div>
          <div className="grid w-full grid-cols-3 gap-2 text-center sm:w-auto">
            <StatBox
              count={words.length}
              label="Words"
              active={wordListModal === "all"}
              onClick={() => {
                setMode("vocab");
                setWordListModal("all");
              }}
            />
            <StatBox
              count={rememberedCount}
              label="Remembered"
              active={wordListModal === "remembered"}
              onClick={() => {
                setMode("vocab");
                setWordListModal("remembered");
              }}
            />
            <StatBox
              count={toLearnCount}
              label="To Learn"
              active={wordListModal === "toLearn"}
              onClick={() => {
                setMode("vocab");
                setWordListModal("toLearn");
              }}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-5 gap-1 rounded-lg bg-white/20 p-1 md:gap-2">
          {CHINESE_MAIN_TABS.map(([option, Icon, label]) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                if (option === "dictionary") {
                  openDictionary();
                  return;
                }
                setDictionaryOpen(false);
                setMode(option);
              }}
              className={cx(
                "flex items-center justify-center gap-1 rounded-md px-1.5 py-3 text-[11px] font-black sm:gap-1.5 sm:px-3 sm:text-sm",
                mode === option || (option === "dictionary" && dictionaryOpen)
                  ? "bg-white text-coral"
                  : "text-white"
              )}
              aria-pressed={mode === option || (option === "dictionary" && dictionaryOpen)}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === "reading" && (
        <div className="p-4 md:p-5">
          <ChineseReadingSection grade={grade} />
        </div>
      )}

      {mode === "watch" && (
        <div className="p-4 md:p-5">
          <ChineseWatchSection key="chinese-watch" />
        </div>
      )}

      {mode === "game" &&
        (practiceWords.length < 4 ? (
            <div className="p-8 text-center text-slate-500">
              <Languages className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-4 font-black">Not enough words for games yet.</p>
              <p className="mt-2 text-sm">{gradeLabel} needs more vocabulary first.</p>
            </div>
          ) : (
          <GameHub
            key={`${grade}-${pathway}-${p1Tiers.join("-")}`}
            grade={vocabGrade}
            words={practiceWords}
            rememberedSet={rememberedSet}
            onWordRemembered={onWordRemembered}
          />
        ))}

      {mode === "vocab" &&
        (words.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Languages className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-4 font-black">{gradeLabel} vocabulary coming soon</p>
            <p className="mt-2 text-sm">Word lists for this level will be added next.</p>
          </div>
        ) : (
          <div className="p-3 sm:p-5">
            {grade === "P1" && (
              <P1TierToggle
                p1Tiers={p1Tiers}
                onP1TiersChange={onP1TiersChange}
                className="mb-4"
              />
            )}
            {isExtraPathway && (
              <CategoryFilter value={categoryFilter} onChange={setCategoryFilter} words={words} className="mb-4" />
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={isExtraPathway ? "Search phrase / meaning / section" : "Search 水 / shuǐ / water / 第三课"}
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-base outline-none focus:border-coral sm:max-w-xl sm:text-sm"
              />
              <button
                type="button"
                onClick={() => openPractice("vocab")}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-coral px-5 py-3 text-sm font-black text-white sm:w-auto"
              >
                <Target className="h-4 w-4" />
                Practice
              </button>
            </div>

            <div className="mt-4 space-y-3 md:hidden">
              {filteredWords.map((entry) => {
                const key = wordKey(entryGrade(entry, vocabGrade), entry);
                return (
                  <VocabWordCard
                    key={key}
                    entry={entry}
                    remembered={rememberedSet.has(key)}
                    timeMs={wordTimes[key]}
                    onPhraseOpen={isExtraPathway ? openPhraseDetail : undefined}
                  />
                );
              })}
            </div>

            <div className="mt-4 hidden overflow-hidden rounded-lg border border-slate-200 md:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                    <th className="border-b border-slate-200 px-4 py-3">Lesson</th>
                    <th className="border-b border-slate-200 px-4 py-3">Chinese</th>
                    <th className="border-b border-slate-200 px-4 py-3">Pinyin</th>
                    <th className="border-b border-slate-200 px-4 py-3">English Meaning</th>
                    <th className="border-b border-slate-200 px-4 py-3">Listen</th>
                    <th className="border-b border-slate-200 px-4 py-3">Type</th>
                    <th className="border-b border-slate-200 px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWords.map((entry) => {
                    const key = wordKey(entryGrade(entry, vocabGrade), entry);
                    const remembered = rememberedSet.has(key);
                    const isPhrase = isExtraPathway && entry.category === "phrase";
                    return (
                      <tr
                        key={key}
                        className={cx(
                          remembered && "bg-green-50/60",
                          isPhrase && "cursor-pointer hover:bg-coral/5"
                        )}
                        onClick={isPhrase ? () => openPhraseDetail(entry) : undefined}
                      >
                        <td className="border-b border-slate-100 px-4 py-3 text-slate-600">{entry.lesson}</td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          <ChineseCharacterDisplay size="table">{entry.word}</ChineseCharacterDisplay>
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3 text-2xl font-semibold text-teal-700">
                          <PinyinText entry={entry} />
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3 text-2xl leading-snug text-slate-700">{entry.english}</td>
                        <td className="border-b border-slate-100 px-4 py-3">
                          <PlayPronunciationButton word={entry.word} compact />
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3 text-slate-600">{entry.type}</td>
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
              {rememberedCount > 0
                ? ` You have remembered ${rememberedCount} words in ${gradeLabel}.`
                : " Start Practice to mark words as remembered."}
            </div>
          </div>
        ))}

      {isPracticeOpen && (
        <ChinesePracticeModal
          grade={grade}
          setGrade={setGrade}
          pathway={pathway}
          activeGrades={progressGrades}
          p1Tiers={p1Tiers}
          onP1TiersChange={onP1TiersChange}
          rememberedSet={rememberedSet}
          timingSummary={timingSummary}
          onWordRemembered={onWordRemembered}
          onClose={closePractice}
        />
      )}
      {dictionaryOpen && <ChineseDictionaryModal onClose={closeDictionary} />}
      {wordListModal && (
        <WordListModal
          config={wordListModalConfig[wordListModal]}
          grade={vocabGrade}
          gradeLabel={gradeLabel}
          rememberedSet={rememberedSet}
          wordTimes={wordTimes}
          onClose={() => setWordListModal(null)}
          onPhraseOpen={isExtraPathway ? openPhraseDetail : undefined}
        />
      )}
      {phraseDetailEntry && (
        <PhraseDetailModal
          entry={phraseDetailEntry}
          gradeLabel={gradeLabel}
          remembered={rememberedSet.has(wordKey(entryGrade(phraseDetailEntry, vocabGrade), phraseDetailEntry))}
          onClose={() => setPhraseDetailEntry(null)}
        />
      )}
    </div>
  );
}

function CategoryFilter({ value, onChange, words, className = "" }) {
  const counts = {
    all: words.length,
    vocab: words.filter((entry) => entry.category === "vocab").length,
    phrase: words.filter((entry) => entry.category === "phrase").length,
    paragraph: words.filter((entry) => entry.category === "paragraph").length
  };

  return (
    <div className={cx("flex flex-wrap gap-2", className)}>
      {[
        ["all", "All"],
        ["vocab", "Vocab"],
        ["phrase", "Phrases"],
        ["paragraph", "Paragraphs"]
      ].map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cx(
            "rounded-md border px-3 py-1.5 text-xs font-black transition sm:text-sm",
            value === id
              ? "border-coral bg-coral text-white"
              : "border-slate-200 bg-white text-slate-600 hover:border-coral/40"
          )}
        >
          {label} ({counts[id]})
        </button>
      ))}
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

function WordListModal({ config, grade, gradeLabel, rememberedSet, wordTimes, onClose, onPhraseOpen }) {
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
            <div className="text-xs font-black uppercase tracking-wide text-coral">{gradeLabel}</div>
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
                const key = wordKey(entryGrade(entry, grade), entry);
                const remembered = rememberedSet.has(key);
                return (
                  <li key={key}>
                    <WordListRow
                      entry={entry}
                      remembered={remembered}
                      timeMs={wordTimes[key]}
                      onPhraseOpen={onPhraseOpen}
                    />
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

function VocabWordCard({ entry, remembered, timeMs, onPhraseOpen }) {
  const isParagraph = entry.category === "paragraph";
  const isPhrase = entry.category === "phrase" && Boolean(onPhraseOpen);

  return (
    <div
      className={cx(
        "rounded-lg border border-slate-200 p-3",
        remembered && "border-green-200 bg-green-50/60",
        isPhrase && "cursor-pointer hover:border-coral/40 hover:bg-coral/5"
      )}
      onClick={isPhrase ? () => onPhraseOpen(entry) : undefined}
      onKeyDown={
        isPhrase
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onPhraseOpen(entry);
              }
            }
          : undefined
      }
      role={isPhrase ? "button" : undefined}
      tabIndex={isPhrase ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <ChineseCharacterDisplay size={isParagraph ? "paragraph" : "card"}>{entry.word}</ChineseCharacterDisplay>
            {!isParagraph && (
              <>
                <PinyinText entry={entry} className="text-2xl font-semibold text-teal-700" />
                <PlayPronunciationButton word={entry.word} compact />
              </>
            )}
          </div>
          <div className="mt-2 text-xl leading-snug text-slate-600">{entry.english}</div>
          {entry.chinese_explanation && (
            <div className="mt-1 text-lg text-slate-500">{entry.chinese_explanation}</div>
          )}
          <div className="mt-1 text-xs text-slate-400">
            {entry.lesson} · {entry.type}
            {isPhrase && <span className="ml-2 font-bold text-coral">Tap for details</span>}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <RememberedBadge remembered={remembered} />
          {remembered && timeMs != null && (
            <span className="text-[10px] font-bold text-slate-400">{formatPracticeMs(timeMs)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function WordListRow({ entry, remembered, timeMs, onPhraseOpen }) {
  const isPhrase = entry.category === "phrase" && Boolean(onPhraseOpen);

  return (
    <div
      className={cx(
        "flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5",
        remembered && "border-green-200 bg-green-50/60",
        isPhrase && "cursor-pointer hover:border-coral/40 hover:bg-coral/5"
      )}
      onClick={isPhrase ? () => onPhraseOpen(entry) : undefined}
      onKeyDown={
        isPhrase
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onPhraseOpen(entry);
              }
            }
          : undefined
      }
      role={isPhrase ? "button" : undefined}
      tabIndex={isPhrase ? 0 : undefined}
    >
      <ChineseCharacterDisplay size={entry.category === "paragraph" ? "paragraph" : "row"}>
        {entry.word}
      </ChineseCharacterDisplay>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <PinyinText entry={entry} className="text-xl font-semibold text-teal-700" />
          <PlayPronunciationButton word={entry.word} compact />
        </div>
        <div className="text-lg leading-snug text-slate-700">{entry.english}</div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <RememberedBadge remembered={remembered} compact />
        {remembered && timeMs != null && (
          <span className="text-[10px] font-bold text-slate-400">{formatPracticeMs(timeMs)}</span>
        )}
      </div>
    </div>
  );
}
