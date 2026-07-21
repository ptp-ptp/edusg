import React, { useCallback, useEffect, useRef, useState } from "react";
import { BookMarked, Check, Eraser, Undo2, Volume2, X } from "lucide-react";
import { ensureDictionaryReady, lookupSuggestions } from "../../lib/chineseDictionary.js";
import { ensureHandwritingReady, recognizeStrokes } from "../../utils/chineseHandwriting.js";
import { speakChineseWord } from "../../utils/chinesePronunciation.js";

const MAX_CHARS = 3;
const RECOGNIZE_LIMIT = 8;

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function ChineseDictionaryModal({ onClose }) {
  const canvasRef = useRef(null);
  const strokesRef = useRef([]);
  const currentStrokeRef = useRef(null);
  const drawingRef = useRef(false);
  const recognizeTimerRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [candidateHistory, setCandidateHistory] = useState([]);
  const [wordBuffer, setWordBuffer] = useState("");
  const [exact, setExact] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [recognizing, setRecognizing] = useState(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [hw, dict] = await Promise.all([ensureHandwritingReady(), ensureDictionaryReady()]);
      if (cancelled) return;
      if (!hw || !dict) {
        setLoadError("Could not load handwriting or dictionary data. Check your connection and try again.");
        return;
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
      if (recognizeTimerRef.current) clearTimeout(recognizeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!wordBuffer) {
      setExact([]);
      setSuggestions([]);
      setSelected(null);
      return;
    }
    const result = lookupSuggestions(wordBuffer, candidateHistory);
    setExact(result.exact);
    setSuggestions(result.suggestions);
    setSelected(result.exact[0] || result.suggestions[0] || null);
  }, [wordBuffer, candidateHistory]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#fffef8";
    ctx.fillRect(0, 0, width, height);

    // Light guide square
    ctx.strokeStyle = "#e6dcc8";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(12, 12, width - 24, height - 24);
    ctx.beginPath();
    ctx.moveTo(width / 2, 12);
    ctx.lineTo(width / 2, height - 12);
    ctx.moveTo(12, height / 2);
    ctx.lineTo(width - 12, height / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const stroke of strokesRef.current) {
      if (!stroke.length) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0][0], stroke[0][1]);
      for (let i = 1; i < stroke.length; i += 1) {
        ctx.lineTo(stroke[i][0], stroke[i][1]);
      }
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    redrawCanvas();
    const onResize = () => redrawCanvas();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [redrawCanvas]);

  const scheduleRecognize = useCallback(() => {
    if (recognizeTimerRef.current) clearTimeout(recognizeTimerRef.current);
    recognizeTimerRef.current = setTimeout(async () => {
      if (!strokesRef.current.length) {
        setCandidates([]);
        setRecognizing(false);
        return;
      }
      setRecognizing(true);
      try {
        const matches = await recognizeStrokes(strokesRef.current, RECOGNIZE_LIMIT);
        setCandidates(matches);
      } finally {
        setRecognizing(false);
      }
    }, 280);
  }, []);

  function pointerPos(event) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  }

  function handlePointerDown(event) {
    if (!ready || wordBuffer.length >= MAX_CHARS) return;
    event.preventDefault();
    canvasRef.current?.setPointerCapture?.(event.pointerId);
    drawingRef.current = true;
    const point = pointerPos(event);
    currentStrokeRef.current = [point];
    strokesRef.current = [...strokesRef.current, currentStrokeRef.current];
    setHasInk(true);
    redrawCanvas();
  }

  function handlePointerMove(event) {
    if (!drawingRef.current || !currentStrokeRef.current) return;
    event.preventDefault();
    const point = pointerPos(event);
    currentStrokeRef.current.push(point);
    redrawCanvas();
  }

  function handlePointerUp(event) {
    if (!drawingRef.current) return;
    event.preventDefault();
    drawingRef.current = false;
    currentStrokeRef.current = null;
    scheduleRecognize();
  }

  function clearPad() {
    strokesRef.current = [];
    currentStrokeRef.current = null;
    drawingRef.current = false;
    setCandidates([]);
    setHasInk(false);
    redrawCanvas();
  }

  function undoStroke() {
    strokesRef.current = strokesRef.current.slice(0, -1);
    setHasInk(strokesRef.current.length > 0);
    if (!strokesRef.current.length) {
      setCandidates([]);
    } else {
      scheduleRecognize();
    }
    redrawCanvas();
  }

  function appendCharacter(character) {
    if (!character || wordBuffer.length >= MAX_CHARS) return;
    const next = wordBuffer + character;
    const nextHistory = [
      ...candidateHistory,
      candidates.map((item) => item.character).filter(Boolean)
    ];
    // Keep history aligned with buffer length
    setCandidateHistory(nextHistory.slice(0, next.length));
    setWordBuffer(next);
    clearPad();
  }

  function backspaceChar() {
    if (!wordBuffer) return;
    const next = wordBuffer.slice(0, -1);
    setWordBuffer(next);
    setCandidateHistory((prev) => prev.slice(0, next.length));
    clearPad();
  }

  function clearWord() {
    setWordBuffer("");
    setCandidateHistory([]);
    clearPad();
  }

  const results = [...exact, ...suggestions.filter((s) => !exact.some((e) => e.id === s.id))];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dictionary-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-coral">
              <BookMarked className="h-4 w-4" />
              Dictionary
            </div>
            <h3 id="dictionary-title" className="mt-1 text-xl font-black text-slate-800 sm:text-2xl">
              Draw to look up
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Draw one character at a time (up to 3). Pick a match, then listen and read pinyin.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dictionary"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-600 hover:border-coral hover:text-coral"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loadError ? (
            <div className="p-6 text-center text-slate-600">{loadError}</div>
          ) : (
            <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-black text-slate-800">
                    Word{" "}
                    <span className="font-semibold text-slate-500">
                      ({wordBuffer.length}/{MAX_CHARS})
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={backspaceChar}
                      disabled={!wordBuffer}
                      className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-40"
                    >
                      Backspace
                    </button>
                    <button
                      type="button"
                      onClick={clearWord}
                      disabled={!wordBuffer && !hasInk}
                      className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-40"
                    >
                      Clear word
                    </button>
                  </div>
                </div>

                <div className="flex min-h-[3.5rem] flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  {wordBuffer ? (
                    [...wordBuffer].map((ch, index) => (
                      <span
                        key={`${ch}-${index}`}
                        className="chinese-character-display chinese-handwriting text-3xl sm:text-4xl"
                      >
                        {ch}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400">Drawn characters appear here…</span>
                  )}
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-[#fffef8]">
                  <canvas
                    ref={canvasRef}
                    className="h-56 w-full touch-none sm:h-64"
                    style={{ cursor: ready && wordBuffer.length < MAX_CHARS ? "crosshair" : "not-allowed" }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={undoStroke}
                    disabled={!hasInk}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-40"
                  >
                    <Undo2 className="h-4 w-4" />
                    Undo
                  </button>
                  <button
                    type="button"
                    onClick={clearPad}
                    disabled={!hasInk}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-40"
                  >
                    <Eraser className="h-4 w-4" />
                    Clear pad
                  </button>
                  {!ready && (
                    <span className="self-center text-xs font-semibold text-slate-400">Loading recognizer…</span>
                  )}
                  {recognizing && (
                    <span className="self-center text-xs font-semibold text-coral">Recognizing…</span>
                  )}
                  {wordBuffer.length >= MAX_CHARS && (
                    <span className="self-center text-xs font-semibold text-amber-600">
                      Max {MAX_CHARS} characters — backspace to change
                    </span>
                  )}
                </div>

                <div>
                  <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
                    Candidates — tap to add
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {candidates.length === 0 ? (
                      <span className="text-sm text-slate-400">
                        {hasInk ? "Keep drawing…" : "Draw a character above"}
                      </span>
                    ) : (
                      candidates.map((item) => (
                        <button
                          key={`${item.character}-${item.score}`}
                          type="button"
                          disabled={wordBuffer.length >= MAX_CHARS}
                          onClick={() => appendCharacter(item.character)}
                          className="chinese-character-display chinese-handwriting min-w-[3rem] text-3xl transition hover:border-coral hover:shadow disabled:opacity-40"
                          title={`Score ${Math.round((item.score || 0) * 100) / 100}`}
                        >
                          {item.character}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div>
                  <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
                    Matches
                  </div>
                  {!wordBuffer ? (
                    <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                      Add 1–3 characters to see dictionary results.
                    </div>
                  ) : results.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                      No dictionary entry for <span className="font-bold text-slate-700">{wordBuffer}</span> yet.
                      Try another candidate character.
                    </div>
                  ) : (
                    <ul className="max-h-48 space-y-2 overflow-y-auto sm:max-h-56">
                      {results.map((entry) => {
                        const active = selected?.id === entry.id;
                        return (
                          <li key={entry.id}>
                            <button
                              type="button"
                              onClick={() => setSelected(entry)}
                              className={cx(
                                "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition",
                                active
                                  ? "border-coral bg-coral/5 ring-1 ring-coral/30"
                                  : "border-slate-200 bg-white hover:border-coral/40"
                              )}
                            >
                              <span className="chinese-character-display chinese-handwriting shrink-0 text-2xl">
                                {entry.word}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block font-semibold text-teal-700">{entry.pinyin || "—"}</span>
                                <span className="mt-0.5 block text-sm leading-snug text-slate-700">
                                  {entry.english}
                                </span>
                                {entry.reason && entry.reason !== "exact" && (
                                  <span className="mt-1 inline-block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                    {entry.reason}
                                  </span>
                                )}
                                {entry.reason === "exact" && (
                                  <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-green-600">
                                    <Check className="h-3 w-3" /> Exact
                                  </span>
                                )}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {selected && <SelectedEntryDetail entry={selected} />}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SelectedEntryDetail({ entry }) {
  const examples = (entry.examples || []).slice(0, 5);
  const breakdown = entry.breakdown || [];

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div className="text-center">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="chinese-character-display chinese-handwriting text-5xl sm:text-6xl">
            {entry.word}
          </span>
          <button
            type="button"
            onClick={() => speakChineseWord(entry.word)}
            aria-label={`Listen to ${entry.word}`}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-coral/30 bg-coral/10 text-coral hover:bg-coral hover:text-white"
          >
            <Volume2 className="h-6 w-6" />
          </button>
        </div>
        <div className="mt-3 text-2xl font-semibold text-teal-700 sm:text-3xl">{entry.pinyin || "—"}</div>
        {entry.lesson && (
          <div className="mt-2 text-xs font-semibold text-slate-500">
            {entry.grade ? `${entry.grade} · ` : ""}
            {entry.lesson}
            {entry.type ? ` · ${entry.type}` : ""}
          </div>
        )}
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-xs font-black uppercase tracking-wide text-slate-500">Meaning</div>
        <div className="mt-2 text-lg font-semibold leading-snug text-slate-800 sm:text-xl">
          {entry.english}
        </div>
      </div>

      {breakdown.length > 0 && (
        <div className="mt-5">
          <div className="text-sm font-black text-slate-800">Character breakdown</div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {breakdown.map((item, index) => (
              <div
                key={`${item.char}-${index}`}
                className="flex flex-col items-center rounded-lg border border-slate-200 bg-white p-3 text-center"
              >
                <span className="chinese-character-display chinese-handwriting text-3xl">{item.char}</span>
                <div className="mt-2 text-sm font-semibold text-teal-700">{item.pinyin || "—"}</div>
                <div className="mt-1 text-xs leading-5 text-slate-600">{item.meaning || "—"}</div>
                <button
                  type="button"
                  onClick={() => speakChineseWord(item.char)}
                  className="mt-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-coral/30 bg-coral/10 text-coral"
                  aria-label={`Listen to ${item.char}`}
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {examples.length > 0 && (
        <div className="mt-5">
          <div className="text-sm font-black text-slate-800">Examples</div>
          <ul className="mt-3 space-y-3">
            {examples.map((example, index) => (
              <li key={index} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="chinese-handwriting text-xl leading-8 text-slate-800">{example.zh}</div>
                    {example.pinyin && (
                      <div className="mt-1 text-sm font-semibold text-teal-700">{example.pinyin}</div>
                    )}
                    {example.en && <div className="mt-1 text-sm text-slate-600">{example.en}</div>}
                  </div>
                  {example.zh && (
                    <button
                      type="button"
                      onClick={() => speakChineseWord(example.zh)}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-coral/30 bg-coral/10 text-coral"
                      aria-label="Listen to example"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
