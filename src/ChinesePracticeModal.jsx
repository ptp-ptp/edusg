import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpenText, ChevronDown, ChevronUp, Eye, EyeOff, Headphones, Settings2, Volume2, X } from "lucide-react";
import {
  buildMeaningOptions,
  entryGrade,
  formatChineseGrade,
  getCombinedWordsForGrades,
  getPracticeGroupsForGrade,
  getPracticeGroupsForGradeAndPathway,
  getPracticePool,
  getPracticeableWords,
  getWordPinyin,
  isP1Grade,
  wordKey
} from "./data/chinese/index.js";
import { ChineseGradeSelect } from "./components/chinese/ChineseGradePicker.jsx";
import { speakChineseWord } from "./utils/chinesePronunciation.js";
import { playCorrectSound, playWrongSound } from "./utils/practiceSounds.js";
import { formatPracticeMs } from "./utils/formatTime.js";
import { getPracticeAnswerResult } from "./utils/chinesePracticeTiming.js";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function countToLearnInGroup(group, progressGrade, rememberedSet) {
  return group.wordKeys.filter((key) => {
    const [lesson, word, type] = key.split("|");
    if (type === "段落") return false;
    return !rememberedSet.has(wordKey(progressGrade, { lesson, word, type }));
  }).length;
}

function PracticeSelect({ label, value, onChange, children, disabled = false }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-800 outline-none focus:border-coral disabled:opacity-40"
      >
        {children}
      </select>
    </label>
  );
}

export default function ChinesePracticeModal({
  grade,
  setGrade,
  pathway = "chinese",
  activeGrades = [],
  p1Tiers = [],
  onP1TiersChange,
  rememberedSet,
  onWordRemembered,
  timingSummary,
  onClose
}) {
  const resolvedGrades = useMemo(() => {
    if (activeGrades.length) return activeGrades;
    if (grade === "P1") return p1Tiers.length ? p1Tiers : ["P1A"];
    return [grade];
  }, [activeGrades, grade, p1Tiers]);

  const [practiceGrade, setPracticeGrade] = useState(resolvedGrades[0]);
  const multiGrade = resolvedGrades.length > 1;
  const [groupKind, setGroupKind] = useState(() => {
    if (multiGrade || pathway === "extra") return "all";
    return getPracticeGroupsForGradeAndPathway(grade, pathway) ? "theme" : "all";
  });
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [options, setOptions] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [wordHidden, setWordHidden] = useState(false);
  const advanceTimeoutRef = useRef(null);
  const questionStartedAtRef = useRef(Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);

  const words = useMemo(
    () => getPracticeableWords(getCombinedWordsForGrades(resolvedGrades, pathway)),
    [resolvedGrades, pathway]
  );
  const groupConfig = multiGrade
    ? null
    : getPracticeGroupsForGradeAndPathway(grade, pathway) || getPracticeGroupsForGrade(practiceGrade);
  const rememberedCount = words.filter((entry) =>
    rememberedSet.has(wordKey(entryGrade(entry, practiceGrade), entry))
  ).length;

  const activeGroups = useMemo(() => {
    if (!groupConfig) return [];
    return groupKind === "lesson" ? groupConfig.lessonGroups : groupConfig.themeGroups;
  }, [groupConfig, groupKind]);

  useEffect(() => {
    if (!activeGroups.length) return;
    const current = activeGroups.find((group) => group.id === selectedGroupId);
    const currentHasWords = current ? countToLearnInGroup(current, practiceGrade, rememberedSet) > 0 : false;
    if (!currentHasWords) {
      const nextGroup = activeGroups.find((group) => countToLearnInGroup(group, practiceGrade, rememberedSet) > 0);
      if (nextGroup) setSelectedGroupId(nextGroup.id);
    }
  }, [activeGroups, selectedGroupId, rememberedSet, practiceGrade]);

  const practicePool = useMemo(
    () =>
      getPracticePool(words, practiceGrade, rememberedSet, {
        groupId: selectedGroupId,
        groupKind,
        practiceGroups: groupConfig
      }),
    [words, practiceGrade, rememberedSet, selectedGroupId, groupKind, groupConfig]
  );

  const currentWord = practicePool[practiceIndex % Math.max(practicePool.length, 1)];
  const activeGroup = activeGroups.find((group) => group.id === selectedGroupId);
  const toLearnCount = words.length - rememberedCount;

  useEffect(() => {
    setPracticeGrade(resolvedGrades[0]);
    if (pathway === "extra") {
      setGroupKind("all");
      setSelectedGroupId("");
    }
  }, [resolvedGrades, pathway]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (groupKind === "all" || !activeGroups.length || practicePool.length > 0) return;
    const nextGroup = activeGroups.find((group) => countToLearnInGroup(group, practiceGrade, rememberedSet) > 0);
    if (nextGroup && nextGroup.id !== selectedGroupId) {
      setSelectedGroupId(nextGroup.id);
    }
  }, [groupKind, activeGroups, practicePool.length, rememberedSet, practiceGrade, selectedGroupId]);

  useEffect(() => {
    if (practiceIndex >= practicePool.length && practicePool.length > 0) {
      setPracticeIndex(0);
    }
  }, [practiceIndex, practicePool.length]);

  useEffect(() => {
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    setPracticeIndex(0);
    setSelectedAnswer("");
    setFeedback(null);
  }, [practiceGrade, selectedGroupId, groupKind]);

  useEffect(() => {
    if (!currentWord) return;
    questionStartedAtRef.current = Date.now();
    setElapsedMs(0);
  }, [currentWord]);

  useEffect(() => {
    if (feedback || !currentWord) return undefined;
    const interval = window.setInterval(() => {
      setElapsedMs(Date.now() - questionStartedAtRef.current);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [currentWord, feedback]);

  useEffect(() => {
    if (!currentWord) {
      setOptions([]);
      return;
    }
    setOptions(buildMeaningOptions(words, currentWord));
    setSelectedAnswer("");
    setFeedback(null);
  }, [currentWord, words]);

  useEffect(() => {
    if (practicePool.length === 0) {
      setSettingsOpen(true);
    }
  }, [practicePool.length]);

  function changeGrade(level) {
    if (isP1Grade(level)) {
      onP1TiersChange?.([level]);
      setPracticeGrade(level);
      if (grade !== "P1") setGrade("P1");
      const hasGroups = Boolean(getPracticeGroupsForGrade(level));
      if (!hasGroups) {
        setGroupKind("all");
        setSelectedGroupId("");
      } else {
        setGroupKind("theme");
        const nextGroup = findFirstGroupWithWords(getPracticeGroupsForGrade(level).themeGroups);
        setSelectedGroupId(nextGroup?.id || "");
      }
      setSettingsOpen(false);
      return;
    }

    const hadGroups = Boolean(getPracticeGroupsForGrade(practiceGrade));
    const hasGroups = Boolean(getPracticeGroupsForGrade(level));
    setPracticeGrade(level);
    setGrade(level);
    if (!hasGroups) {
      setGroupKind("all");
      setSelectedGroupId("");
    } else if (!hadGroups) {
      setGroupKind("theme");
      const nextGroup = findFirstGroupWithWords(getPracticeGroupsForGrade(level).themeGroups);
      setSelectedGroupId(nextGroup?.id || "");
    }
    setSettingsOpen(false);
  }

  function findFirstGroupWithWords(groups) {
    return groups.find((group) => countToLearnInGroup(group, practiceGrade, rememberedSet) > 0);
  }

  function changeGroupKind(kind) {
    setGroupKind(kind);
    if (kind === "all") {
      setSelectedGroupId("");
    } else {
      const groups = kind === "lesson" ? groupConfig?.lessonGroups || [] : groupConfig?.themeGroups || [];
      const nextGroup = findFirstGroupWithWords(groups);
      if (nextGroup) setSelectedGroupId(nextGroup.id);
    }
    setSettingsOpen(false);
  }

  function changeSelectedGroup(groupId) {
    setSelectedGroupId(groupId);
    setSettingsOpen(false);
  }

  function submitAnswer() {
    if (!currentWord || !selectedAnswer || feedback) return;
    const correct = selectedAnswer === currentWord.english;
    const timeMs = Date.now() - questionStartedAtRef.current;
    const { remembered, slowResponse } = getPracticeAnswerResult(correct, timeMs, timingSummary);

    if (correct && remembered) {
      playCorrectSound();
    } else {
      playWrongSound();
    }

    setFeedback({ correct, answer: currentWord.english, timeMs, slowResponse, remembered });

    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    advanceTimeoutRef.current = setTimeout(() => {
      setPracticeIndex((current) => (current + 1) % Math.max(practicePool.length, 1));
      setSelectedAnswer("");
      setFeedback(null);
    }, correct && remembered ? 1400 : 2200);

    void onWordRemembered?.(wordKey(entryGrade(currentWord, practiceGrade), currentWord), { correct, timeMs }).then((result) => {
      if (!result) return;
      setFeedback((current) => {
        if (!current) return current;
        if (
          current.slowResponse === Boolean(result.slowResponse) &&
          current.remembered === Boolean(result.remembered)
        ) {
          return current;
        }
        return {
          ...current,
          slowResponse: Boolean(result.slowResponse),
          remembered: Boolean(result.remembered)
        };
      });
    });
  }

  const groupLabel = activeGroup
    ? `${activeGroup.emoji || ""} ${activeGroup.label}`.trim()
    : "Learn All";
  const selectionSummary =
    groupKind === "all"
      ? `${formatChineseGrade(practiceGrade)} · Learn All`
      : `${formatChineseGrade(practiceGrade)} · ${groupLabel}`;

  const settingsFields = (
    <>
      <ChineseGradeSelect
        grade={practiceGrade}
        onChange={(event) => changeGrade(event.target.value)}
      />

      {groupConfig && (
        <>
          <PracticeSelect
            label="Group type"
            value={groupKind}
            onChange={(event) => changeGroupKind(event.target.value)}
          >
            <option value="theme">Themes</option>
            <option value="lesson">Lessons</option>
            <option value="all">Learn All</option>
          </PracticeSelect>

          {(groupKind === "theme" || groupKind === "lesson") && (
            <PracticeSelect
              label={groupKind === "lesson" ? "Lesson" : "Theme"}
              value={selectedGroupId || activeGroups[0]?.id || ""}
              onChange={(event) => changeSelectedGroup(event.target.value)}
            >
              {activeGroups.map((group) => {
                const toLearnInGroup = countToLearnInGroup(group, practiceGrade, rememberedSet);
                return (
                  <option key={group.id} value={group.id} disabled={toLearnInGroup === 0}>
                    {group.emoji} {group.label} ({toLearnInGroup}/{group.wordKeys.length})
                  </option>
                );
              })}
            </PracticeSelect>
          )}
        </>
      )}

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
        <span className="font-black text-slate-700">{practicePool.length}</span> words in this set ·{" "}
        <span className="font-black text-slate-700">{toLearnCount}</span> left to learn in {formatChineseGrade(practiceGrade)}
      </div>
    </>
  );

  return createPortal(
    <div className="fixed inset-0 z-50 flex bg-ink/60 backdrop-blur-sm lg:items-center lg:justify-center lg:p-6">
      <div className="flex h-[100dvh] w-full max-w-7xl flex-col overflow-hidden bg-white shadow-2xl lg:h-auto lg:max-h-[92vh] lg:rounded-lg">
        <div className="safe-top shrink-0 border-b border-slate-200 px-3 py-2 sm:px-5 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-black uppercase tracking-wide text-coral sm:text-xs">Chinese Practice</div>
              <h2 className="truncate text-base font-black sm:text-xl lg:text-2xl">{selectionSummary}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-600 hover:border-coral hover:text-coral"
              aria-label="Close practice"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-2 lg:hidden">
            <button
              type="button"
              onClick={() => setSettingsOpen((open) => !open)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-left sm:px-3 sm:py-2.5"
              aria-expanded={settingsOpen}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Settings2 className="h-4 w-4 shrink-0 text-coral" />
                <span className="truncate text-sm font-bold text-slate-700">
                  {settingsOpen ? "Hide practice options" : "Change grade or group"}
                </span>
              </span>
              {settingsOpen ? (
                <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
              )}
            </button>

            {settingsOpen && (
              <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                {settingsFields}
              </div>
            )}

            {!settingsOpen && (
              <p className="mt-1 truncate text-[11px] text-slate-500 sm:mt-2 sm:text-xs">
                {practicePool.length > 0
                  ? `${practicePool.length} words ready · tap above to change set`
                  : "Choose a practice set above to start"}
              </p>
            )}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[300px_1fr] xl:grid-cols-[320px_1fr]">
          <aside className="hidden min-h-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-4 lg:block">
            <div className="space-y-4">{settingsFields}</div>

            <div className="mt-5 rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-2">
                <BookOpenText className="h-4 w-4 text-coral" />
                <div className="text-xs font-black uppercase tracking-wide text-slate-400">Progress</div>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Only words you have not remembered yet appear in practice.
              </p>
              {timingSummary?.attemptCount > 0 && (
                <p className="mt-2 text-xs font-bold text-teal-700">
                  Your avg: {formatPracticeMs(timingSummary.avgTimeMs)} per question
                </p>
              )}
            </div>
          </aside>

          <div className="safe-bottom flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-5 lg:overflow-y-auto">
            {!words.length ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-slate-500">
                <p className="font-bold">{formatChineseGrade(practiceGrade)} vocabulary coming soon.</p>
              </div>
            ) : !practicePool.length ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center sm:p-8">
                <p className="font-black text-green-700">All done in this set!</p>
                <p className="mt-2 text-sm text-slate-600">
                  {toLearnCount > 0
                    ? "Open practice options and pick another group, or switch to Learn All."
                    : `You have remembered all ${words.length} words in ${formatChineseGrade(practiceGrade)}.`}
                </p>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="mt-4 rounded-md bg-coral px-4 py-2.5 text-sm font-black text-white lg:hidden"
                >
                  Change practice set
                </button>
              </div>
            ) : !currentWord ? (
              <div className="rounded-lg border border-slate-200 p-8 text-center text-slate-500">
                No words in this practice set.
              </div>
            ) : (
              <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-1.5 sm:gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-black text-coral sm:text-sm">
                      {wordHidden && !feedback ? "Listen only" : `${currentWord.lesson} · ${currentWord.type}`}
                    </div>
                    <h3 className="text-sm font-black sm:mt-1 sm:text-xl lg:text-2xl">
                      {wordHidden && !feedback ? "What did you hear?" : "What is the meaning?"}
                    </h3>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => setWordHidden((hidden) => !hidden)}
                      className={cx(
                        "inline-flex h-9 items-center gap-1 rounded-md border px-2 py-1.5 text-[11px] font-black sm:min-h-10 sm:gap-1.5 sm:px-3 sm:py-2 sm:text-sm",
                        wordHidden
                          ? "border-coral bg-coral/10 text-coral"
                          : "border-slate-200 bg-white text-slate-600 hover:border-coral hover:text-coral"
                      )}
                      aria-pressed={wordHidden}
                    >
                      {wordHidden ? <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                      <span className="hidden sm:inline">{wordHidden ? "Hidden" : "Hide"}</span>
                    </button>
                    <span className="rounded-md bg-cloud px-2 py-1 text-[11px] font-black text-teal sm:px-3 sm:py-2 sm:text-sm">
                      {(practiceIndex % practicePool.length) + 1}/{practicePool.length}
                    </span>
                    <span
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-black tabular-nums text-slate-600 sm:px-3 sm:py-2 sm:text-sm"
                      aria-live="polite"
                    >
                      {formatPracticeMs(feedback?.timeMs ?? elapsedMs)}
                    </span>
                  </div>
                </div>

                <div className="mt-2 shrink-0 rounded-xl bg-slate-50 px-3 py-3 sm:mt-6 sm:grid sm:flex-1 sm:place-items-center sm:gap-3 sm:py-8">
                  {wordHidden && !feedback ? (
                    <div className="flex items-center justify-between gap-3 sm:flex-col sm:justify-center">
                      <div className="flex min-w-0 flex-1 items-center gap-3 sm:flex-col sm:gap-3">
                        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-coral/10 text-coral sm:h-24 sm:w-24">
                          <Headphones className="h-7 w-7 sm:h-10 sm:w-10" />
                        </div>
                        <p className="text-sm font-semibold text-slate-600 sm:text-center sm:text-base">Tap Listen to hear the word</p>
                      </div>
                      <PlayPronunciationButton word={currentWord.word} label="Listen" large compactOnMobile />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3 sm:flex-col sm:justify-center sm:gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-3 sm:flex-col sm:gap-2">
                        <span className="chinese-character-display chinese-handwriting shrink-0 text-7xl leading-none sm:min-h-[8rem] sm:min-w-[8rem] sm:px-4 sm:py-3 sm:text-8xl md:text-9xl">
                          {currentWord.word}
                        </span>
                        <PinyinText entry={currentWord} size="practice" className="min-w-0 sm:text-center" />
                      </div>
                      <PlayPronunciationButton word={currentWord.word} compactOnMobile />
                    </div>
                  )}
                </div>

                <p className="mt-1.5 hidden shrink-0 text-center text-xs text-slate-500 sm:mt-4 sm:block sm:text-sm">
                  {wordHidden && !feedback
                    ? "Listen, then pick the correct English meaning."
                    : "Pick the correct English meaning."}
                </p>

                <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2 sm:mt-5 sm:gap-3 md:grid md:flex-none md:grid-cols-2 md:content-start">
                  {options.map((option, optionIndex) => (
                    <button
                      key={`${currentWord.word}-${option}`}
                      type="button"
                      onClick={() => !feedback && setSelectedAnswer(option)}
                      disabled={Boolean(feedback)}
                      className={cx(
                        "flex flex-1 items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-[1.05rem] font-bold leading-snug transition sm:min-h-16 sm:flex-none sm:gap-4 sm:px-4 sm:py-3 sm:text-[1.2rem]",
                        feedback && option === currentWord.english && "border-green-400 bg-green-50 text-green-700",
                        feedback && selectedAnswer === option && option !== currentWord.english && "border-orange-300 bg-orange-50 text-orange-700",
                        !feedback && selectedAnswer === option && "border-coral bg-orange-50 text-coral",
                        !feedback && selectedAnswer !== option && "border-slate-200 bg-white active:border-teal"
                      )}
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cloud text-xs font-black text-slate-500 sm:h-8 sm:w-8 sm:text-sm">
                        {String.fromCharCode(65 + optionIndex)}
                      </span>
                      <span className="min-w-0 flex-1">{option}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-2 shrink-0 pb-1 sm:mt-5 sm:pb-2">
                  <button
                    type="button"
                    onClick={submitAnswer}
                    disabled={!selectedAnswer || Boolean(feedback)}
                    className="w-full rounded-md bg-coral px-4 py-3 text-base font-black text-white disabled:opacity-40 sm:w-auto sm:px-6 sm:py-3 sm:text-sm"
                  >
                    Check Answer
                  </button>
                </div>

                {feedback && (
                  <div
                    className={cx(
                      "mt-2 shrink-0 rounded-lg border p-2.5 sm:mt-4 sm:p-4",
                      feedback.correct && feedback.remembered
                        ? "border-green-200 bg-green-50"
                        : feedback.correct && feedback.slowResponse
                          ? "border-amber-200 bg-amber-50"
                          : feedback.correct
                            ? "border-green-200 bg-green-50"
                            : "border-orange-200 bg-orange-50"
                    )}
                  >
                    <div className="text-xs font-black sm:text-base">
                      {feedback.correct && feedback.remembered
                        ? "Correct! Word saved to your profile."
                        : feedback.correct && feedback.slowResponse
                          ? "Correct, but too slow — this word stays in To Learn."
                          : feedback.correct
                            ? "Correct!"
                            : `Not quite. The answer is: ${feedback.answer}`}
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-600 sm:mt-1 sm:text-sm">
                      Time: {formatPracticeMs(feedback.timeMs)}
                      {timingSummary?.slowThresholdMs && timingSummary.attemptCount >= 5
                        ? ` · aim under ${formatPracticeMs(timingSummary.slowThresholdMs)}`
                        : ""}
                      {" · "}Next word coming up…
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PinyinText({ entry, size = "md", className = "" }) {
  const pinyin = getWordPinyin(entry);
  if (!pinyin) return null;
  const sizeClass =
    size === "practice"
      ? "text-3xl sm:text-4xl"
      : size === "lg"
        ? "text-2xl sm:text-3xl"
        : "text-xl sm:text-2xl";
  return (
    <span className={cx("font-semibold tracking-wide text-teal-700", sizeClass, className)}>
      {pinyin}
    </span>
  );
}

function PlayPronunciationButton({ word, label, large = false, compactOnMobile = false }) {
  if (compactOnMobile) {
    return (
      <>
        <button
          type="button"
          onClick={() => speakChineseWord(word)}
          aria-label={`Listen to ${word}`}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-coral/30 bg-coral/10 text-coral transition hover:bg-coral hover:text-white active:scale-95 sm:hidden"
        >
          <Volume2 className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => speakChineseWord(word)}
          aria-label={`Listen to ${word}`}
          className={cx(
            "hidden min-h-11 items-center justify-center gap-2 rounded-full border border-coral/30 bg-coral/10 font-black text-coral transition hover:bg-coral hover:text-white active:scale-95 sm:inline-flex",
            large ? "px-6 py-3.5 text-base" : "px-4 py-2.5 text-sm"
          )}
        >
          <Volume2 className={large ? "h-5 w-5" : "h-4 w-4"} />
          {label || "Listen"}
        </button>
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={() => speakChineseWord(word)}
      aria-label={`Listen to ${word}`}
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-coral/30 bg-coral/10 font-black text-coral transition hover:bg-coral hover:text-white active:scale-95",
        large ? "px-6 py-3.5 text-base" : "px-4 py-2.5 text-sm"
      )}
    >
      <Volume2 className={large ? "h-5 w-5" : "h-4 w-4"} />
      {label || "Listen"}
    </button>
  );
}
