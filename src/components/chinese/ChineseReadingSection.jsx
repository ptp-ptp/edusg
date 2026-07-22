import React, { useEffect, useMemo, useState } from "react";
import { BookOpenText, ChevronRight, Volume2 } from "lucide-react";
import ChineseReadingPlayer from "./ChineseReadingPlayer.jsx";
import {
  fetchChineseReadings,
  getCachedChineseReadings,
  getSeedChineseReadings,
  resolveReadingGradeKey
} from "../../lib/chineseContentApi.js";

/** Leveled readings show the stats of their first (simplest) level. */
function basePassage(reading) {
  if (Array.isArray(reading.levels) && reading.levels.length > 0) return reading.levels[0];
  return reading;
}

function countWords(reading) {
  let count = 0;
  for (const sentence of basePassage(reading).sentences || []) {
    for (const token of sentence) {
      if (!token.p) count += 1;
    }
  }
  return count;
}

export default function ChineseReadingSection({ grade }) {
  const gradeKey = resolveReadingGradeKey(grade);
  const [readings, setReadings] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    let active = true;
    let serverDone = false;
    setSelectedId(null);

    // Show something instantly: the server cache from earlier this session, or
    // the bundled seed content while the server (cold serverless + database)
    // responds in the background.
    const cached = getCachedChineseReadings(gradeKey);
    setReadings(cached);
    if (!cached) {
      (async () => {
        const seed = await getSeedChineseReadings(gradeKey);
        if (active && !serverDone) setReadings(seed);
      })();
    }

    (async () => {
      const result = await fetchChineseReadings(gradeKey);
      serverDone = true;
      if (active) setReadings(result);
    })();

    return () => {
      active = false;
    };
  }, [gradeKey]);

  const selectedReading = useMemo(
    () => (readings || []).find((item) => item.id === selectedId) || null,
    [readings, selectedId]
  );

  if (readings === null) {
    return (
      <div className="p-8 text-center text-slate-500">
        <BookOpenText className="mx-auto h-10 w-10 animate-pulse text-slate-300" />
        <p className="mt-4 font-black">Loading readings…</p>
      </div>
    );
  }

  if (selectedReading) {
    return <ChineseReadingPlayer reading={selectedReading} onBack={() => setSelectedId(null)} />;
  }

  if (readings.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        <BookOpenText className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-4 font-black">No reading topics for {gradeKey} yet.</p>
        <p className="mt-2 text-sm">Your teacher can add readings in the admin Question Bank.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-md border border-coral/30 bg-coral/5 px-4 py-3 text-sm leading-6 text-coral">
        <span className="font-black">阅读 · Reading practice</span>
        {" — Pick a passage below. The reader speaks every word out loud, highlights along, and shows pinyin and meanings when you hover or tap a word."}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {readings.map((reading, index) => (
          <button
            key={reading.id}
            type="button"
            onClick={() => setSelectedId(reading.id)}
            className="group rounded-lg border-2 border-slate-200 bg-white p-4 text-left transition hover:border-coral/50 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-coral/10 text-sm font-black text-coral">
                    {index + 1}
                  </span>
                  {reading.term && (
                    <span className="rounded-full bg-teal/10 px-2.5 py-1 text-xs font-black text-teal">
                      {reading.term}
                    </span>
                  )}
                </div>
                <div className="chinese-handwriting mt-3 truncate text-4xl">{reading.title}</div>
                {(reading.titleEn || reading.subtitle) && (
                  <div className="mt-1 truncate text-sm font-semibold text-slate-500">
                    {reading.titleEn || reading.subtitle}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-slate-400">
                  {Array.isArray(reading.levels) && reading.levels.length > 0 ? (
                    <span className="text-teal">{reading.levels.length} levels</span>
                  ) : (
                    <>
                      <span>{(basePassage(reading).sentences || []).length} sentences</span>
                      <span>{countWords(reading)} words</span>
                    </>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Volume2 className="h-3.5 w-3.5" /> Read aloud
                  </span>
                </div>
              </div>
              <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-coral" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
