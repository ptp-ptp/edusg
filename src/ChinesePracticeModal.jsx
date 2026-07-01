import React, { useEffect, useMemo, useRef, useState } from "react";
import { BookOpenText, ChevronDown, ChevronUp, Settings2, Volume2, X } from "lucide-react";
import {
  buildMeaningOptions,
  chineseGrades,
  getPracticeGroupsForGrade,
  getPracticePool,
  getWordPinyin,
  getWordsForGrade,
  wordKey
} from "./data/chinese/index.js";
import { speakChineseWord } from "./utils/chinesePronunciation.js";
import { playCorrectSound, playWrongSound } from "./utils/practiceSounds.js";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function countToLearnInGroup(group, practiceGrade, rememberedSet) {
  return group.wordKeys.filter((key) => {
    const [lesson, word, type] = key.split("|");
    return !rememberedSet.has(wordKey(practiceGrade, { lesson, word, type }));
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
  rememberedSet,
  onWordRemembered,
  onClose
}) {
  const [practiceGrade, setPracticeGrade] = useState(grade);
  const [practiceMode, setPracticeMode] = useState(() => (getPracticeGroupsForGrade(grade) ? "group" : "all"));
  const [groupKind, setGroupKind] = useState("theme");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [options, setOptions] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const advanceTimeoutRef = useRef(null);

  const words = getWordsForGrade(practiceGrade);
  const groupConfig = getPracticeGroupsForGrade(practiceGrade);
  const rememberedCount = words.filter((entry) => rememberedSet.has(wordKey(practiceGrade, entry))).length;

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
        mode: practiceMode,
        groupId: selectedGroupId,
        groupKind
      }),
    [words, practiceGrade, rememberedSet, practiceMode, selectedGroupId, groupKind]
  );

  const currentWord = practicePool[practiceIndex % Math.max(practicePool.length, 1)];
  const activeGroup = activeGroups.find((group) => group.id === selectedGroupId);
  const practiceModes = groupConfig?.practiceModes || [
    { id: "all", label: "All To Learn", hint: "Every word not yet remembered" }
  ];
  const toLearnCount = words.length - rememberedCount;

  useEffect(() => {
    setPracticeGrade(grade);
  }, [grade]);

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
    if (practiceMode !== "group" || !activeGroups.length || practicePool.length > 0) return;
    const nextGroup = activeGroups.find((group) => countToLearnInGroup(group, practiceGrade, rememberedSet) > 0);
    if (nextGroup && nextGroup.id !== selectedGroupId) {
      setSelectedGroupId(nextGroup.id);
    }
  }, [practiceMode, activeGroups, practicePool.length, rememberedSet, practiceGrade, selectedGroupId]);

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
  }, [practiceGrade, practiceMode, selectedGroupId, groupKind]);

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
    setPracticeGrade(level);
    setGrade(level);
    if (!getPracticeGroupsForGrade(level)) {
      setPracticeMode("all");
      setSelectedGroupId("");
    }
    setSettingsOpen(false);
  }

  function findFirstGroupWithWords(groups) {
    return groups.find((group) => countToLearnInGroup(group, practiceGrade, rememberedSet) > 0);
  }

  function changePracticeMode(mode) {
    setPracticeMode(mode);
    if (mode !== "group") {
      setSelectedGroupId("");
    } else {
      const nextGroup = findFirstGroupWithWords(activeGroups);
      if (nextGroup) setSelectedGroupId(nextGroup.id);
    }
    setSettingsOpen(false);
  }

  function changeGroupKind(kind) {
    setGroupKind(kind);
    setSettingsOpen(false);
  }

  function changeSelectedGroup(groupId) {
    setSelectedGroupId(groupId);
    setSettingsOpen(false);
  }

  async function submitAnswer() {
    if (!currentWord || !selectedAnswer || feedback) return;
    const correct = selectedAnswer === currentWord.english;

    if (correct) {
      playCorrectSound();
      await onWordRemembered?.(wordKey(practiceGrade, currentWord));
    } else {
      playWrongSound();
    }

    setFeedback({ correct, answer: currentWord.english });

    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    advanceTimeoutRef.current = setTimeout(() => {
      setPracticeIndex((current) => (current + 1) % Math.max(practicePool.length, 1));
      setSelectedAnswer("");
      setFeedback(null);
    }, correct ? 1400 : 2200);
  }

  const modeLabel = practiceModes.find((item) => item.id === practiceMode)?.label || "Practice";
  const groupLabel = activeGroup
    ? `${activeGroup.emoji || ""} ${activeGroup.label}`.trim()
    : modeLabel;
  const selectionSummary =
    practiceMode === "group" ? `${practiceGrade} · ${groupLabel}` : `${practiceGrade} · ${modeLabel}`;

  const settingsFields = (
    <>
      <PracticeSelect
        label="Grade"
        value={practiceGrade}
        onChange={(event) => changeGrade(event.target.value)}
      >
        {chineseGrades.map((level) => (
          <option key={level} value={level}>
            {level}
          </option>
        ))}
      </PracticeSelect>

      <PracticeSelect
        label="Practice set"
        value={practiceMode}
        onChange={(event) => changePracticeMode(event.target.value)}
      >
        {practiceModes.map((item) => (
          <option key={item.id} value={item.id} disabled={item.id === "group" && !groupConfig}>
            {item.label}
          </option>
        ))}
      </PracticeSelect>

      {practiceMode === "group" && groupConfig && (
        <>
          <PracticeSelect
            label="Group type"
            value={groupKind}
            onChange={(event) => changeGroupKind(event.target.value)}
          >
            <option value="theme">Themes</option>
            <option value="lesson">Lessons</option>
          </PracticeSelect>

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
        </>
      )}

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
        <span className="font-black text-slate-700">{practicePool.length}</span> words in this set ·{" "}
        <span className="font-black text-slate-700">{toLearnCount}</span> left to learn in {practiceGrade}
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex bg-ink/60 backdrop-blur-sm lg:items-center lg:justify-center lg:p-6">
      <div className="flex h-[100dvh] w-full max-w-7xl flex-col overflow-hidden bg-white shadow-2xl lg:h-auto lg:max-h-[92vh] lg:rounded-lg">
        <div className="safe-top shrink-0 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black uppercase tracking-wide text-coral">Chinese Practice</div>
              <h2 className="mt-0.5 truncate text-lg font-black sm:text-xl lg:text-2xl">{selectionSummary}</h2>
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

          <div className="mt-3 lg:hidden">
            <button
              type="button"
              onClick={() => setSettingsOpen((open) => !open)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-left"
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
              <p className="mt-2 truncate text-xs text-slate-500">
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
            </div>
          </aside>

          <div className="safe-bottom min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
            {!words.length ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-slate-500">
                <p className="font-bold">{practiceGrade} vocabulary coming soon.</p>
              </div>
            ) : !practicePool.length ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center sm:p-8">
                <p className="font-black text-green-700">All done in this set!</p>
                <p className="mt-2 text-sm text-slate-600">
                  {toLearnCount > 0
                    ? "Open practice options and pick another group, or switch to All To Learn."
                    : `You have remembered all ${words.length} words in ${practiceGrade}.`}
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
              <div className="mx-auto flex min-h-full max-w-2xl flex-col">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-black text-coral sm:text-sm">
                      {currentWord.lesson} · {currentWord.type}
                    </div>
                    <h3 className="mt-1 text-lg font-black sm:text-xl lg:text-2xl">What is the meaning?</h3>
                  </div>
                  <span className="shrink-0 rounded-md bg-cloud px-2.5 py-1.5 text-xs font-black text-teal sm:px-3 sm:py-2 sm:text-sm">
                    {(practiceIndex % practicePool.length) + 1} / {practicePool.length}
                  </span>
                </div>

                <div className="mt-4 grid flex-1 place-items-center gap-2 rounded-xl bg-slate-50 px-3 py-6 sm:mt-6 sm:gap-3 sm:py-8">
                  <span className="chinese-character-display chinese-handwriting text-5xl min-h-[4.5rem] min-w-[4.5rem] px-4 py-3 sm:text-6xl sm:min-h-[5.5rem] sm:min-w-[5.5rem] md:text-7xl">
                    {currentWord.word}
                  </span>
                  <PinyinText entry={currentWord} size="lg" className="text-center" />
                  <PlayPronunciationButton word={currentWord.word} label="Listen" />
                </div>

                <p className="mt-3 text-center text-xs text-slate-500 sm:mt-4 sm:text-sm">
                  Pick the correct English meaning.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-2.5 sm:mt-5 sm:gap-3 md:grid-cols-2">
                  {options.map((option, optionIndex) => (
                    <button
                      key={`${currentWord.word}-${option}`}
                      type="button"
                      onClick={() => !feedback && setSelectedAnswer(option)}
                      disabled={Boolean(feedback)}
                      className={cx(
                        "flex min-h-[3.25rem] items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm font-bold transition sm:min-h-16 sm:gap-4 sm:px-4 sm:py-3 sm:text-base",
                        feedback && option === currentWord.english && "border-green-400 bg-green-50 text-green-700",
                        feedback && selectedAnswer === option && option !== currentWord.english && "border-orange-300 bg-orange-50 text-orange-700",
                        !feedback && selectedAnswer === option && "border-coral bg-orange-50 text-coral",
                        !feedback && selectedAnswer !== option && "border-slate-200 bg-white active:border-teal"
                      )}
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cloud text-xs text-slate-500 sm:h-8 sm:w-8 sm:text-sm">
                        {String.fromCharCode(65 + optionIndex)}
                      </span>
                      <span className="min-w-0 leading-snug">{option}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-4 pb-2 sm:mt-5">
                  <button
                    type="button"
                    onClick={submitAnswer}
                    disabled={!selectedAnswer || Boolean(feedback)}
                    className="w-full rounded-md bg-coral px-6 py-3.5 text-sm font-black text-white disabled:opacity-40 sm:w-auto sm:py-3"
                  >
                    Check Answer
                  </button>
                </div>

                {feedback && (
                  <div
                    className={cx(
                      "mt-3 rounded-lg border p-3 sm:mt-4 sm:p-4",
                      feedback.correct ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"
                    )}
                  >
                    <div className="text-sm font-black sm:text-base">
                      {feedback.correct
                        ? "Correct! Word saved to your profile."
                        : `Not quite. The answer is: ${feedback.answer}`}
                    </div>
                    <p className="mt-1 text-xs text-slate-600 sm:text-sm">Next word coming up…</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PinyinText({ entry, size = "md", className = "" }) {
  const pinyin = getWordPinyin(entry);
  if (!pinyin) return null;
  const sizeClass = size === "lg" ? "text-base sm:text-lg" : "text-sm sm:text-base";
  return (
    <span className={cx("font-semibold tracking-wide text-teal-700", sizeClass, className)}>
      {pinyin}
    </span>
  );
}

function PlayPronunciationButton({ word, label }) {
  return (
    <button
      type="button"
      onClick={() => speakChineseWord(word)}
      aria-label={`Listen to ${word}`}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-coral/30 bg-coral/10 px-4 py-2.5 text-sm font-black text-coral transition hover:bg-coral hover:text-white active:scale-95"
    >
      <Volume2 className="h-4 w-4" />
      {label || "Listen"}
    </button>
  );
}
