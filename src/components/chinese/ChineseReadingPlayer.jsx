import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookOpen, Pause, Play, Square, Volume2 } from "lucide-react";
import { speakChineseWord } from "../../utils/chinesePronunciation.js";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Read-along player for a Chinese reading passage.
 *
 * reading.sentences is an array of sentences; each sentence is an array of
 * tokens: { t: "词", py: "cí", en: "word" } or { t: "，", p: true } for
 * punctuation. Readings may instead carry reading.levels — an array of
 * { key, description, sentences, vocabulary } difficulty versions of the same
 * story — in which case a level picker is shown. Two TTS modes mirror the
 * tuition HTML handouts:
 * - natural: one utterance per sentence, word highlight driven by onboundary
 * - exact: one utterance per word for perfect word-to-highlight sync
 */
export default function ChineseReadingPlayer({ reading, onBack }) {
  const [mode, setMode] = useState(null);
  const [paused, setPaused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [activeSentence, setActiveSentence] = useState(-1);
  const [finished, setFinished] = useState(false);
  const [speed, setSpeed] = useState(0.82);
  const [showVocab, setShowVocab] = useState(false);
  const [tooltipIndex, setTooltipIndex] = useState(null);
  const [levelIndex, setLevelIndex] = useState(0);

  const runIdRef = useRef(0);
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const containerRef = useRef(null);

  const levels = Array.isArray(reading.levels) && reading.levels.length > 0 ? reading.levels : null;
  const passage = levels ? levels[Math.min(levelIndex, levels.length - 1)] : reading;
  const sentences = passage.sentences || [];

  const { flattened, sentenceMeta } = useMemo(() => {
    const flat = [];
    const meta = [];
    sentences.forEach((sentenceTokens, sentenceIndex) => {
      let text = "";
      const ranges = [];
      sentenceTokens.forEach((token) => {
        const flatIndex = flat.length;
        const start = text.length;
        text += token.t;
        flat.push({ ...token, sentenceIndex });
        ranges.push({ flatIndex, start, end: text.length });
      });
      meta.push({ text, ranges });
    });
    return { flattened: flat, sentenceMeta: meta };
  }, [sentences]);

  const vocabulary = useMemo(() => {
    if (passage.vocabulary?.length) return passage.vocabulary;
    const seen = new Set();
    const derived = [];
    for (const token of flattened) {
      if (token.p || seen.has(token.t)) continue;
      seen.add(token.t);
      derived.push({ word: token.t, pinyin: token.py || "", english: token.en || "" });
    }
    return derived;
  }, [passage, flattened]);

  useEffect(() => {
    return () => {
      runIdRef.current += 1;
      window.speechSynthesis?.cancel();
    };
  }, []);

  function stopReading({ reset = true } = {}) {
    runIdRef.current += 1;
    window.speechSynthesis?.cancel();
    setMode(null);
    setPaused(false);
    if (reset) {
      setActiveIndex(-1);
      setActiveSentence(-1);
      setFinished(false);
    }
  }

  function finishReading() {
    setMode(null);
    setPaused(false);
    setActiveSentence(-1);
    setActiveIndex(flattened.length);
    setFinished(true);
  }

  function scrollWordIntoView(flatIndex) {
    const el = containerRef.current?.querySelector(`[data-flat-index="${flatIndex}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function flatIndexForBoundary(sentenceIndex, charIndex) {
    const meta = sentenceMeta[sentenceIndex];
    if (!meta) return -1;
    let result = -1;
    for (const range of meta.ranges) {
      if (charIndex >= range.start && charIndex < range.end) {
        result = range.flatIndex;
        break;
      }
      if (range.start <= charIndex) result = range.flatIndex;
    }
    while (result >= 0 && result < flattened.length && flattened[result].p) {
      result += 1;
    }
    return result;
  }

  function findNextSpeakable(index) {
    let i = index;
    while (i < flattened.length && flattened[i].p) i += 1;
    return i;
  }

  function followingPunctuation(index) {
    let text = "";
    let i = index + 1;
    while (i < flattened.length && flattened[i].p) {
      text += flattened[i].t;
      i += 1;
    }
    return text;
  }

  function makeUtterance(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = speedRef.current;
    utterance.pitch = 1;
    utterance.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const voice =
      voices.find((item) => item.lang === "zh-CN") || voices.find((item) => item.lang?.startsWith("zh"));
    if (voice) utterance.voice = voice;
    return utterance;
  }

  function startNaturalReading() {
    if (!window.speechSynthesis) return;
    stopReading();
    setTooltipIndex(null);
    setMode("natural");
    runIdRef.current += 1;
    speakNaturalSentence(0, runIdRef.current);
  }

  function speakNaturalSentence(sentenceIndex, activeRunId) {
    if (activeRunId !== runIdRef.current) return;
    if (sentenceIndex >= sentenceMeta.length) {
      finishReading();
      return;
    }

    setActiveSentence(sentenceIndex);
    const firstIndex = sentenceMeta[sentenceIndex].ranges[0]?.flatIndex ?? 0;
    setActiveIndex(findNextSpeakable(firstIndex));
    scrollWordIntoView(firstIndex);

    const utterance = makeUtterance(sentenceMeta[sentenceIndex].text);

    utterance.onboundary = (event) => {
      if (activeRunId !== runIdRef.current) return;
      const flatIndex = flatIndexForBoundary(sentenceIndex, event.charIndex);
      if (flatIndex >= 0 && flatIndex < flattened.length && !flattened[flatIndex].p) {
        setActiveIndex(flatIndex);
        scrollWordIntoView(flatIndex);
      }
    };

    utterance.onend = () => {
      if (activeRunId !== runIdRef.current) return;
      speakNaturalSentence(sentenceIndex + 1, activeRunId);
    };

    window.speechSynthesis.speak(utterance);
  }

  function startExactReading(startFlatIndex = 0) {
    if (!window.speechSynthesis) return;
    stopReading();
    setTooltipIndex(null);
    setMode("exact");
    runIdRef.current += 1;
    const first = findNextSpeakable(startFlatIndex);
    setActiveIndex(first);
    speakExactWord(first, runIdRef.current);
  }

  function speakExactWord(flatIndex, activeRunId) {
    if (activeRunId !== runIdRef.current) return;
    const current = findNextSpeakable(flatIndex);
    if (current >= flattened.length) {
      finishReading();
      return;
    }

    const utterance = makeUtterance(flattened[current].t + followingPunctuation(current));

    utterance.onstart = () => {
      if (activeRunId !== runIdRef.current) return;
      setActiveIndex(current);
      setActiveSentence(-1);
      scrollWordIntoView(current);
    };

    utterance.onend = () => {
      if (activeRunId !== runIdRef.current) return;
      speakExactWord(findNextSpeakable(current + 1), activeRunId);
    };

    window.speechSynthesis.speak(utterance);
  }

  function switchLevel(index) {
    if (index === levelIndex) return;
    stopReading();
    setTooltipIndex(null);
    setShowVocab(false);
    setLevelIndex(index);
  }

  function togglePause() {
    if (!mode) return;
    if (!paused) {
      window.speechSynthesis.pause();
      setPaused(true);
    } else {
      window.speechSynthesis.resume();
      setPaused(false);
    }
  }

  function handleWordClick(flatIndex, event) {
    event.stopPropagation();
    if (window.matchMedia("(hover: hover)").matches) {
      startExactReading(flatIndex);
      return;
    }
    if (tooltipIndex === flatIndex) {
      setTooltipIndex(null);
      startExactReading(flatIndex);
    } else {
      setTooltipIndex(flatIndex);
    }
  }

  const isReading = mode !== null;

  return (
    <div ref={containerRef} onClick={() => setTooltipIndex(null)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            stopReading();
            onBack();
          }}
          className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 hover:border-coral hover:text-coral"
        >
          <ArrowLeft className="h-4 w-4" />
          All readings
        </button>
        <div className="text-right">
          <div className="chinese-handwriting text-3xl sm:text-4xl">{reading.title}</div>
          {(reading.titleEn || reading.subtitle) && (
            <div className="text-sm font-semibold text-slate-500">{reading.titleEn || reading.subtitle}</div>
          )}
        </div>
      </div>

      {levels && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wide text-slate-400">Reading level</span>
            {levels.map((level, index) => (
              <button
                key={level.key || index}
                type="button"
                onClick={() => switchLevel(index)}
                className={cx(
                  "rounded-full px-3.5 py-1.5 text-sm font-black transition",
                  index === levelIndex
                    ? "bg-teal text-white shadow-lg shadow-teal/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {level.key || `Level ${index + 1}`}
              </button>
            ))}
          </div>
          {passage.description && (
            <div className="mt-2 text-xs font-semibold text-slate-500">{passage.description}</div>
          )}
        </div>
      )}

      <div className="sticky top-0 z-20 mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
        <button
          type="button"
          onClick={startNaturalReading}
          className="inline-flex items-center gap-2 rounded-md bg-teal px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-teal/20"
        >
          <Play className="h-4 w-4" />
          Read to Me
        </button>
        <button
          type="button"
          onClick={() => startExactReading(0)}
          className="inline-flex items-center gap-2 rounded-md bg-coral px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-coral/20"
        >
          <Volume2 className="h-4 w-4" />
          Word by Word
        </button>
        <button
          type="button"
          onClick={togglePause}
          disabled={!isReading}
          className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 disabled:opacity-40"
        >
          {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          {paused ? "Resume" : "Pause"}
        </button>
        <button
          type="button"
          onClick={() => stopReading()}
          disabled={!isReading && activeIndex < 0}
          className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 disabled:opacity-40"
        >
          <Square className="h-4 w-4" />
          Stop
        </button>
        <button
          type="button"
          onClick={() => setShowVocab((value) => !value)}
          className={cx(
            "inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-black",
            showVocab ? "bg-ink text-white" : "border border-slate-200 text-slate-700"
          )}
        >
          <BookOpen className="h-4 w-4" />
          Vocab List
        </button>
        <label className="ml-auto flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-black text-slate-500">
          Speed
          <input
            type="range"
            min="0.55"
            max="2"
            step="0.05"
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
            className="w-24 sm:w-28"
          />
          <span className="w-12 text-right text-sm text-slate-700">{speed.toFixed(2)}×</span>
        </label>
      </div>

      <div className="mt-2 text-xs font-bold text-slate-400">
        {mode === "natural" && "Reading naturally, sentence by sentence."}
        {mode === "exact" && "Reading word by word — each word lights up as it is spoken."}
        {!mode && finished && "Reading completed. Tap any word to read again from there."}
        {!mode && !finished && "Hover or tap a Chinese word to see its pinyin and English meaning. Tap a word to start reading from it."}
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="reading-passage chinese-handwriting text-3xl sm:text-4xl">
          {sentences.map((sentenceTokens, sentenceIndex) => {
            const firstFlat = sentenceMeta[sentenceIndex].ranges[0]?.flatIndex ?? 0;
            return (
              <React.Fragment key={sentenceIndex}>
                <span
                  className={cx(
                    "reading-sentence",
                    mode === "natural" && activeSentence === sentenceIndex && "reading-sentence-active"
                  )}
                >
                  {sentenceTokens.map((token, tokenIndex) => {
                    const flatIndex = firstFlat + tokenIndex;
                    if (token.p) {
                      return (
                        <span key={flatIndex} className="reading-word reading-punctuation" data-flat-index={flatIndex}>
                          {token.t}
                        </span>
                      );
                    }
                    return (
                      <span
                        key={flatIndex}
                        data-flat-index={flatIndex}
                        data-pinyin={token.py}
                        data-meaning={token.en}
                        tabIndex={0}
                        role="button"
                        aria-label={`${token.t}, ${token.py}, ${token.en}`}
                        onClick={(event) => handleWordClick(flatIndex, event)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            startExactReading(flatIndex);
                          }
                        }}
                        className={cx(
                          "reading-word",
                          flatIndex === activeIndex && "reading-word-active",
                          flatIndex < activeIndex && "reading-word-done",
                          tooltipIndex === flatIndex && "tooltip-open"
                        )}
                      >
                        {token.t}
                      </span>
                    );
                  })}
                </span>
                {sentenceIndex < sentences.length - 1 && (
                  <>
                    <br />
                    <br />
                  </>
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="mt-6 rounded-md border border-teal/20 bg-teal/5 p-4 text-sm leading-6 text-slate-600">
          <span className="font-black text-teal">How to use:</span> hover (or tap) a word to see pinyin and meaning.
          <span className="font-black"> Read to Me</span> reads whole sentences naturally.
          <span className="font-black"> Word by Word</span> matches the voice to each highlighted word.
        </div>
      </div>

      {showVocab && (
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 text-lg font-black">
            Vocabulary List · 生词表
          </div>
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 bg-white text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3">Chinese</th>
                  <th className="border-b border-slate-200 px-4 py-3">Pinyin</th>
                  <th className="border-b border-slate-200 px-4 py-3">English meaning</th>
                  <th className="border-b border-slate-200 px-4 py-3">Listen</th>
                </tr>
              </thead>
              <tbody>
                {vocabulary.map((item) => (
                  <tr key={item.word}>
                    <td className="chinese-handwriting border-b border-slate-100 px-4 py-3 text-3xl">{item.word}</td>
                    <td className="border-b border-slate-100 px-4 py-3 text-xl font-semibold text-teal-700">
                      {item.pinyin}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-xl text-slate-700">{item.english}</td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => speakChineseWord(item.word)}
                        aria-label={`Listen to ${item.word}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-coral/30 bg-coral/10 text-coral hover:bg-coral hover:text-white"
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
