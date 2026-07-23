import React, { useEffect, useMemo, useRef, useState } from "react";
import { BookOpenText, Maximize2, Minimize2, MonitorPlay, Play, X } from "lucide-react";
import { fetchChineseWatchSeries } from "../../lib/chineseContentApi.js";
import { speakChineseWord } from "../../utils/chinesePronunciation.js";
import { PlayPronunciationButton } from "./chineseDisplay.jsx";
import { createActivitySession } from "../../lib/activityApi.js";

/**
 * Turns any YouTube link (watch, youtu.be, playlist) into an embeddable URL.
 * Playlist links keep the playlist so the next parts play in order.
 */
export function toYouTubeEmbedUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    let videoId = "";
    if (host === "youtu.be") {
      videoId = parsed.pathname.slice(1).split("/")[0];
    } else if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      if (parsed.pathname.startsWith("/embed/")) {
        videoId = parsed.pathname.split("/")[2] || "";
      } else if (parsed.pathname.startsWith("/shorts/")) {
        videoId = parsed.pathname.split("/")[2] || "";
      } else {
        videoId = parsed.searchParams.get("v") || "";
      }
    }
    const listId = parsed.searchParams.get("list") || "";
    const params = new URLSearchParams({ autoplay: "1", rel: "0", enablejsapi: "1", playsinline: "1" });
    if (typeof window !== "undefined" && window.location?.origin) {
      params.set("origin", window.location.origin);
    }
    if (listId) params.set("list", listId);
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
    }
    if (listId) {
      return `https://www.youtube.com/embed/videoseries?${params.toString()}`;
    }
    return null;
  } catch {
    return null;
  }
}

/** Loads the YouTube IFrame API once, so we can read playback time for karaoke sync. */
let youTubeApiPromise = null;
function loadYouTubeApi() {
  if (youTubeApiPromise) return youTubeApiPromise;
  youTubeApiPromise = new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return youTubeApiPromise;
}

export default function ChineseWatchSection() {
  const [seriesList, setSeriesList] = useState(null);
  const [playing, setPlaying] = useState(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    setSeriesList(null);
    setLoadError("");
    (async () => {
      try {
        // Always re-fetch so admin-saved parts show up without a hard browser refresh.
        const result = await fetchChineseWatchSeries({ force: true });
        if (active) setSeriesList(result);
      } catch (error) {
        if (active) {
          setSeriesList([]);
          setLoadError(error.message || "Could not load stories");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (seriesList === null) {
    return (
      <div className="p-8 text-center text-slate-500">
        <MonitorPlay className="mx-auto h-10 w-10 animate-pulse text-slate-300" />
        <p className="mt-4 font-black">Loading stories…</p>
      </div>
    );
  }

  if (seriesList.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        <MonitorPlay className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-4 font-black">No story videos yet.</p>
        <p className="mt-2 text-sm">
          {loadError || "Your teacher can add YouTube stories in the admin panel."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-md border border-coral/30 bg-coral/5 px-4 py-3 text-sm leading-6 text-coral">
        <span className="font-black">观看 · Story time</span>
        {" — Pick a story below and press Watch. Each story has many parts, so come back for the next one!"}
      </div>

      <div className="mt-4 space-y-4">
        {seriesList.map((series) => (
          <div key={series.id} className="rounded-lg border-2 border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {series.titleZh && <span className="chinese-handwriting text-4xl">{series.titleZh}</span>}
              <span className="text-xl font-black text-slate-800">{series.title}</span>
              <span className="rounded-full bg-teal/10 px-2.5 py-1 text-xs font-black text-teal">
                {series.parts.length} {series.parts.length === 1 ? "part" : "parts"}
              </span>
            </div>
            {series.description && (
              <p className="mt-2 text-sm font-semibold text-slate-500">{series.description}</p>
            )}
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {series.parts.map((part, index) => (
                <button
                  key={part.id || index}
                  type="button"
                  onClick={() => setPlaying({ series, part })}
                  className="group flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-left transition hover:border-coral/50 hover:bg-coral/5"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-coral/10 text-coral transition group-hover:bg-coral group-hover:text-white">
                    <Play className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-slate-700">{part.title}</span>
                    <span className="text-xs font-bold text-slate-400">Watch</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {playing && (
        <WatchPlayerModal
          series={playing.series}
          part={playing.part}
          onClose={() => setPlaying(null)}
        />
      )}
    </div>
  );
}

const LEARN_FONT_SIZES = [16, 18, 21, 24, 28, 32, 40, 48];
const LEARN_FONT_STORAGE_KEY = "chinese-watch-font-level";

function readStoredFontLevel() {
  try {
    const stored = Number(window.localStorage.getItem(LEARN_FONT_STORAGE_KEY));
    if (Number.isInteger(stored) && stored >= 0 && stored < LEARN_FONT_SIZES.length) return stored;
  } catch {
    // localStorage unavailable
  }
  return 0;
}

const LEARN_WIDTH_STORAGE_KEY = "chinese-watch-learn-width";
const LEARN_PANE_MIN_WIDTH = 280;
const LEARN_PANE_DEFAULT_WIDTH = 400;

function readStoredLearnWidth() {
  try {
    const stored = Number(window.localStorage.getItem(LEARN_WIDTH_STORAGE_KEY));
    if (Number.isFinite(stored) && stored >= LEARN_PANE_MIN_WIDTH) return stored;
  } catch {
    // localStorage unavailable
  }
  return LEARN_PANE_DEFAULT_WIDTH;
}

const CJK_RE = /[\u3400-\u9FFF\uF900-\uFAFF]/;

/**
 * Parses the Vocabs tab text into a dictionary used for click-to-learn words.
 * Lines look like "石猴 (Shíhóu): Stone Monkey"; variants separated by "/" all
 * map to the same meaning (e.g. "王 (Wáng) / 大王 (Dàwáng): King / Great King").
 */
function parseVocabDictionary(text) {
  const dict = new Map();
  let maxTermLength = 1;
  for (const rawLine of String(text || "").split(/\n+/)) {
    const line = rawLine.trim();
    const entry = line.match(/^(.*[)）])\s*[:：]\s*(.+)$/);
    if (!entry) continue;
    const [, termPart, meaning] = entry;
    for (const variant of termPart.split("/")) {
      const match = variant.trim().match(/^(.+?)\s*[(（]([^)）]+)[)）]$/);
      if (!match) continue;
      const term = match[1].trim();
      if (!term || !CJK_RE.test(term)) continue;
      dict.set(term, { pinyin: match[2].trim(), meaning: meaning.trim() });
      maxTermLength = Math.max(maxTermLength, term.length);
    }
  }
  return { dict, maxTermLength };
}

/**
 * Splits a subtitle block into tokens: dictionary words (longest match first),
 * single Chinese characters, and runs of punctuation/other text.
 */
function tokenizeSubtitleBlock(text, dict, maxTermLength) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    if (CJK_RE.test(text[i])) {
      let matched = null;
      const maxLen = Math.min(maxTermLength, text.length - i);
      for (let len = maxLen; len >= 2; len -= 1) {
        const candidate = text.slice(i, i + len);
        if (dict.has(candidate)) {
          matched = candidate;
          break;
        }
      }
      if (matched) {
        tokens.push({ text: matched, chinese: true, inDict: true });
        i += matched.length;
      } else {
        tokens.push({ text: text[i], chinese: true, inDict: dict.has(text[i]) });
        i += 1;
      }
    } else {
      let j = i;
      while (j < text.length && !CJK_RE.test(text[j])) j += 1;
      tokens.push({ text: text.slice(i, j), chinese: false, inDict: false });
      i = j;
    }
  }
  return tokens;
}

// Supports both [0:16] / [00:16] and (0:16) / (00:16), with optional hours.
const ANCHOR_RE = /[\[(](?:(\d+):)?(\d{1,2}):(\d{2})[\])]\s*/g;

/**
 * Parses the subtitle into display blocks. Time cues like (00:16) or [0:16]
 * are stripped from the Learn UI and stored as each line's startTime so the
 * sentence only highlights when the YouTube clock reaches that cue.
 */
function buildKaraokeBlocks(transcript, vocabsText) {
  const { dict, maxTermLength } = parseVocabDictionary(vocabsText);
  const blocks = [];
  for (const rawBlock of String(transcript || "").split(/\n+/)) {
    const rawText = rawBlock.trim();
    if (!rawText) continue;

    const blockAnchors = [];
    let text = "";
    let lastIndex = 0;
    ANCHOR_RE.lastIndex = 0;
    let match;
    while ((match = ANCHOR_RE.exec(rawText)) !== null) {
      text += rawText.slice(lastIndex, match.index);
      const hours = Number(match[1] || 0);
      blockAnchors.push(hours * 3600 + Number(match[2]) * 60 + Number(match[3]));
      lastIndex = match.index + match[0].length;
    }
    text += rawText.slice(lastIndex);
    text = text.trim();
    if (!text) continue;

    const index = blocks.length;
    const isHeading = /^第.{1,4}部分/.test(text) || /^Part\s*\d+/i.test(text);
    const tokens = tokenizeSubtitleBlock(text, dict, maxTermLength);
    const startTime = isHeading ? null : blockAnchors.length ? blockAnchors[0] : null;
    blocks.push({ text, isHeading, tokens, startTime, index });
  }
  return { blocks, dict };
}

/**
 * Returns the subtitle line that should be active for the current YouTube time.
 * A line starts highlighting only once playback reaches its cue, and stays
 * active until the next timed line begins.
 */
function findActiveSubtitleIndex(time, blocks) {
  if (!Number.isFinite(time) || time < 0) return -1;
  let activeIndex = -1;
  for (let i = 0; i < blocks.length; i += 1) {
    const startTime = blocks[i].startTime;
    if (startTime == null || blocks[i].isHeading) continue;
    if (time + 0.05 >= startTime) activeIndex = i;
    else break;
  }
  return activeIndex;
}

function WatchPlayerModal({ series, part, onClose }) {
  const embedUrl = toYouTubeEmbedUrl(part.url);
  const learnTabs = [
    ["subtitle", "Subtitle", part.transcript],
    ["vocabs", "Vocabs", part.vocabs],
    ["english", "Full English", part.fullEnglish]
  ].filter(([, , content]) => Boolean(content?.trim()));
  const hasLearn = learnTabs.length > 0;
  const [showLearn, setShowLearn] = useState(false);
  const [isMax, setIsMax] = useState(false);
  const [learnTab, setLearnTab] = useState(learnTabs[0]?.[0] || "subtitle");
  const [fontLevel, setFontLevel] = useState(readStoredFontLevel);
  const [learnWidth, setLearnWidth] = useState(readStoredLearnWidth);
  const [isResizing, setIsResizing] = useState(false);
  const layoutRef = useRef(null);
  const iframeIdRef = useRef(`watch-player-${Math.random().toString(36).slice(2, 10)}`);
  const playerRef = useRef(null);
  const [playback, setPlayback] = useState({ time: 0, duration: 0 });
  const [selectedWord, setSelectedWord] = useState(null);

  const karaoke = useMemo(
    () => buildKaraokeBlocks(part.transcript, part.vocabs),
    [part.transcript, part.vocabs]
  );
  const activeSubtitleIndex = findActiveSubtitleIndex(playback.time, karaoke.blocks);
  const watchSessionRef = useRef(null);

  useEffect(() => {
    watchSessionRef.current = createActivitySession({
      subject: "Chinese",
      kind: "watch",
      mode: "youtube",
      meta: { episodeId: part?.id || part?.youtubeId || "", title: part?.title || "" }
    });
    return () => {
      void watchSessionRef.current?.end({ minMs: 5000 });
      watchSessionRef.current = null;
    };
  }, [part?.id, part?.youtubeId, part?.title]);

  useEffect(() => {
    if (!embedUrl) return undefined;
    let cancelled = false;
    let interval = null;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !YT?.Player) return;
      try {
        playerRef.current = new YT.Player(iframeIdRef.current);
      } catch {
        return;
      }
      interval = window.setInterval(() => {
        const player = playerRef.current;
        if (!player || typeof player.getCurrentTime !== "function") return;
        try {
          const time = player.getCurrentTime() || 0;
          const duration = player.getDuration() || 0;
          setPlayback((current) =>
            Math.abs(current.time - time) < 0.15 && current.duration === duration
              ? current
              : { time, duration }
          );
        } catch {
          // player not ready yet
        }
      }, 300);
    });
    return () => {
      cancelled = true;
      if (interval) window.clearInterval(interval);
      try {
        playerRef.current?.destroy?.();
      } catch {
        // iframe already gone
      }
      playerRef.current = null;
    };
  }, [embedUrl]);

  function handleWordClick(token) {
    const info = karaoke.dict.get(token.text) || null;
    setSelectedWord({ text: token.text, pinyin: info?.pinyin || "", meaning: info?.meaning || "" });
    speakChineseWord(token.text);
  }

  function handleResizeStart(event) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsResizing(true);
  }

  function handleResizeMove(event) {
    if (!event.currentTarget.hasPointerCapture?.(event.pointerId)) return;
    const rect = layoutRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Keep at least ~360px for the video so it never collapses entirely.
    const maxWidth = Math.max(LEARN_PANE_MIN_WIDTH, rect.width - 360);
    const next = Math.min(maxWidth, Math.max(LEARN_PANE_MIN_WIDTH, rect.right - event.clientX));
    setLearnWidth(next);
  }

  function handleResizeEnd(event) {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsResizing(false);
    setLearnWidth((current) => {
      try {
        window.localStorage.setItem(LEARN_WIDTH_STORAGE_KEY, String(Math.round(current)));
      } catch {
        // localStorage unavailable
      }
      return current;
    });
  }

  function changeFontLevel(delta) {
    setFontLevel((current) => {
      const next = Math.min(LEARN_FONT_SIZES.length - 1, Math.max(0, current + delta));
      try {
        window.localStorage.setItem(LEARN_FONT_STORAGE_KEY, String(next));
      } catch {
        // localStorage unavailable
      }
      return next;
    });
  }

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function toggleMax() {
    setIsMax((current) => {
      const next = !current;
      // Maximizing is meant to show video + learn panel together.
      if (next && hasLearn) setShowLearn(true);
      return next;
    });
  }

  const learnOpen = showLearn && hasLearn;
  const activeLearnTab = learnTabs.find(([id]) => id === learnTab) || learnTabs[0];

  return (
    <div
      className={
        "fixed inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-sm " +
        (isMax ? "p-0" : "p-3 sm:p-6")
      }
      onClick={onClose}
    >
      <div
        className={
          "flex w-full flex-col overflow-hidden bg-white shadow-2xl transition-all " +
          (isMax
            ? "h-full max-h-none max-w-none rounded-none"
            : "max-h-[92vh] rounded-2xl " + (learnOpen ? "max-w-6xl" : "max-w-4xl"))
        }
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="watch-player-title"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <div className="text-xs font-black uppercase tracking-wide text-coral">
              {series.titleZh ? `${series.titleZh} · ${series.title}` : series.title}
            </div>
            <h3 id="watch-player-title" className="mt-0.5 truncate text-lg font-black text-slate-800">
              {part.title}
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {hasLearn && (
              <button
                type="button"
                onClick={() => setShowLearn((current) => !current)}
                className={
                  "inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-black transition " +
                  (learnOpen
                    ? "border-coral bg-coral text-white"
                    : "border-slate-200 text-slate-600 hover:border-coral hover:text-coral")
                }
              >
                <BookOpenText className="h-4 w-4" />
                Learn
              </button>
            )}
            <button
              type="button"
              onClick={toggleMax}
              aria-label={isMax ? "Restore window size" : "Maximize window"}
              title={isMax ? "Restore" : "Maximize"}
              className={
                "grid h-10 w-10 place-items-center rounded-md border transition " +
                (isMax
                  ? "border-coral bg-coral text-white"
                  : "border-slate-200 text-slate-600 hover:border-coral hover:text-coral")
              }
            >
              {isMax ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close video"
              className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 text-slate-600 hover:border-coral hover:text-coral"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div ref={layoutRef} className={"flex min-h-0 flex-1 flex-col lg:flex-row " + (isResizing ? "select-none" : "")}>
          <div
            className={
              "w-full bg-black " +
              (learnOpen
                ? "aspect-video shrink-0 lg:aspect-auto lg:min-h-0 lg:min-w-0 lg:flex-1 lg:self-stretch"
                : isMax
                  ? "min-h-0 flex-1"
                  : "aspect-video")
            }
          >
            {embedUrl ? (
              <iframe
                id={iframeIdRef.current}
                src={embedUrl}
                title={`${series.title} — ${part.title}`}
                className={"h-full w-full" + (isResizing ? " pointer-events-none" : "")}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="grid h-full w-full place-items-center px-6 text-center text-sm font-bold text-white/80">
                This video link cannot be played here.{" "}
                <a href={part.url} target="_blank" rel="noreferrer" className="ml-1 underline">
                  Open on YouTube
                </a>
              </div>
            )}
          </div>

          {learnOpen && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Drag to resize the Learn pane"
              title="Drag to resize"
              onPointerDown={handleResizeStart}
              onPointerMove={handleResizeMove}
              onPointerUp={handleResizeEnd}
              onPointerCancel={handleResizeEnd}
              style={{ touchAction: "none" }}
              className={
                "hidden shrink-0 cursor-col-resize items-center justify-center transition lg:flex lg:w-2.5 " +
                (isResizing ? "bg-coral/30" : "bg-slate-100 hover:bg-coral/20")
              }
            >
              <div className="h-12 w-1 rounded-full bg-slate-300" />
            </div>
          )}

          {learnOpen && (
            <div
              style={{ "--learn-w": `${learnWidth}px` }}
              className={
                "flex min-h-0 flex-1 flex-col border-t border-slate-200 bg-slate-50/60 lg:w-[var(--learn-w)] lg:max-w-[75%] lg:flex-none lg:border-t-0 " +
                (isMax ? "lg:max-h-none" : "lg:max-h-[70vh]")
              }
            >
              <div className="shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur">
                <div className="px-4 pt-2.5 text-xs font-black uppercase tracking-wide text-coral">
                  学习 · Learn — {series.titleZh || series.title} · {part.title}
                </div>
                <div className="mt-2 flex items-end gap-1 px-3">
                  {learnTabs.map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setLearnTab(id)}
                      className={
                        "rounded-t-md border border-b-0 px-3 py-1.5 text-xs font-black transition " +
                        (activeLearnTab?.[0] === id
                          ? "border-slate-200 bg-slate-50 text-coral"
                          : "border-transparent bg-transparent text-slate-500 hover:text-coral")
                      }
                    >
                      {label}
                    </button>
                  ))}
                  <div className="ml-auto flex items-center gap-1 pb-1">
                    <button
                      type="button"
                      onClick={() => changeFontLevel(-1)}
                      disabled={fontLevel === 0}
                      aria-label="Decrease text size"
                      title="Smaller text"
                      className="grid h-7 w-8 place-items-center rounded-md border border-slate-200 text-xs font-black text-slate-600 transition hover:border-coral hover:text-coral disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-600"
                    >
                      A−
                    </button>
                    <button
                      type="button"
                      onClick={() => changeFontLevel(1)}
                      disabled={fontLevel === LEARN_FONT_SIZES.length - 1}
                      aria-label="Increase text size"
                      title="Bigger text"
                      className="grid h-7 w-8 place-items-center rounded-md border border-slate-200 text-sm font-black text-slate-600 transition hover:border-coral hover:text-coral disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-600"
                    >
                      A+
                    </button>
                  </div>
                </div>
              </div>
              <div
                className="min-h-0 flex-1 overflow-y-auto"
                style={{ fontSize: `${LEARN_FONT_SIZES[fontLevel]}px` }}
              >
                {activeLearnTab?.[0] === "subtitle" ? (
                  <KaraokeSubtitle
                    blocks={karaoke.blocks}
                    activeIndex={activeSubtitleIndex}
                    onWordClick={handleWordClick}
                  />
                ) : activeLearnTab?.[0] === "vocabs" ? (
                  <VocabList text={activeLearnTab[2]} />
                ) : (
                  <TranscriptText text={activeLearnTab?.[2]} />
                )}
              </div>

              {activeLearnTab?.[0] === "subtitle" && selectedWord && (
                <div className="shrink-0 border-t-2 border-coral/30 bg-white px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="chinese-learn-text text-3xl font-bold text-slate-800">{selectedWord.text}</span>
                    <div className="min-w-0 flex-1">
                      {selectedWord.pinyin && (
                        <div className="truncate text-base font-bold text-teal-700">{selectedWord.pinyin}</div>
                      )}
                      <div className="text-sm font-semibold leading-5 text-slate-600">
                        {selectedWord.meaning || "Tap the speaker to hear this word again."}
                      </div>
                    </div>
                    <PlayPronunciationButton word={selectedWord.text} />
                    <button
                      type="button"
                      onClick={() => setSelectedWord(null)}
                      aria-label="Close word details"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-500 hover:border-coral hover:text-coral"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KaraokeSubtitle({ blocks, activeIndex, onWordClick }) {
  const activeBlockRef = useRef(null);
  const lastScrolledRef = useRef(-1);

  useEffect(() => {
    if (activeIndex < 0 || activeIndex === lastScrolledRef.current) return;
    lastScrolledRef.current = activeIndex;
    activeBlockRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeIndex]);

  return (
    <div className="space-y-2.5 px-4 py-4">
      {blocks.map((block, index) => {
        if (block.isHeading) {
          return (
            <h4
              key={index}
              className="chinese-learn-text pt-3 text-[1.12em] font-black leading-snug text-coral first:pt-0"
            >
              {block.text}
            </h4>
          );
        }
        const isActiveBlock = index === activeIndex;
        const isPastBlock = activeIndex >= 0 && index < activeIndex;
        return (
          <p
            key={index}
            ref={isActiveBlock ? activeBlockRef : undefined}
            className={
              "chinese-learn-text rounded-md px-2 py-1 text-[1.05em] leading-[2.05] transition-colors " +
              (isActiveBlock
                ? "bg-sun/20 text-slate-900 ring-1 ring-coral/25"
                : isPastBlock
                  ? "text-slate-500"
                  : "text-slate-800")
            }
          >
            {block.tokens.map((token, tokenIndex) => {
              if (!token.chinese) {
                return <span key={tokenIndex}>{token.text}</span>;
              }
              return (
                <span
                  key={tokenIndex}
                  role="button"
                  tabIndex={0}
                  onClick={() => onWordClick(token)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onWordClick(token);
                    }
                  }}
                  className={
                    "cursor-pointer rounded-sm transition-colors hover:bg-coral/15 " +
                    (isActiveBlock ? "text-slate-900" : isPastBlock ? "text-slate-500" : "text-slate-800") +
                    (token.inDict
                      ? " underline decoration-coral/40 decoration-dotted underline-offset-[0.35em]"
                      : "")
                  }
                >
                  {token.text}
                </span>
              );
            })}
          </p>
        );
      })}
    </div>
  );
}

function TranscriptText({ text, chinese = false }) {
  const blocks = String(text || "")
    .split(/\n+/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className={"px-4 py-4 " + (chinese ? "space-y-4" : "space-y-3.5")}>
      {blocks.map((block, index) => {
        const isHeading =
          /^第.{1,4}部分/.test(block) || /^Part\s*\d+/i.test(block) || (index === 0 && block.length <= 20);
        return isHeading ? (
          <h4
            key={index}
            className={
              "pt-1 font-black leading-snug text-coral " +
              (chinese ? "chinese-learn-text text-[1.12em]" : "text-[1.06em]")
            }
          >
            {block}
          </h4>
        ) : (
          <p
            key={index}
            className={
              chinese
                ? "chinese-learn-text text-[1.05em] leading-[2.05] text-slate-800"
                : "text-[1em] font-semibold leading-[1.95] text-slate-700"
            }
          >
            {block}
          </p>
        );
      })}
    </div>
  );
}

function VocabList({ text }) {
  const lines = String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="px-4 py-4">
      {lines.map((line, index) => {
        // Vocab entries look like "詞語 (pinyin): meaning"; anything else is a category heading.
        const entry = line.match(/^(.*[)）])\s*[:：]\s*(.+)$/);
        if (!entry) {
          return (
            <h4 key={index} className={"text-[1.06em] font-black leading-snug text-coral " + (index === 0 ? "" : "mt-4")}>
              {line}
            </h4>
          );
        }
        const [, term, meaning] = entry;
        const termChunks = term.split(/([(（][^)）]*[)）])/).filter(Boolean);
        return (
          <div key={index} className="mt-2 rounded-md border border-slate-200 bg-white px-3.5 py-2.5">
            <div className="leading-[1.7]">
              {termChunks.map((chunk, chunkIndex) =>
                /^[(（]/.test(chunk) ? (
                  <span key={chunkIndex} className="mx-1 text-[0.88em] font-semibold text-teal-700">
                    {chunk}
                  </span>
                ) : (
                  <span key={chunkIndex} className="chinese-learn-text text-[1.25em] font-bold text-slate-800">
                    {chunk}
                  </span>
                )
              )}
            </div>
            <div className="mt-0.5 text-[0.92em] font-semibold leading-[1.7] text-slate-600">{meaning}</div>
          </div>
        );
      })}
    </div>
  );
}
