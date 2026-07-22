import React, { useEffect } from "react";
import { X } from "lucide-react";
import {
  ChineseCharacterDisplay,
  PlayPronunciationButton,
  PinyinText,
  RememberedBadge
} from "./chineseDisplay.jsx";
import { getEntryBreakdown, getExamplePinyin } from "../../utils/chineseBreakdown.js";

export default function PhraseDetailModal({ entry, gradeLabel, remembered = false, onClose }) {
  const breakdown = getEntryBreakdown(entry);
  const examples = (entry.examples || []).slice(0, 5);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="phrase-detail-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <div className="text-xs font-black uppercase tracking-wide text-coral">{gradeLabel}</div>
            <div className="mt-1 text-sm text-slate-500">{entry.lesson}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close phrase detail"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-600 hover:border-coral hover:text-coral"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="text-center">
            <div id="phrase-detail-title" className="flex flex-wrap items-center justify-center gap-3">
              <ChineseCharacterDisplay size="hero">{entry.word}</ChineseCharacterDisplay>
              <PlayPronunciationButton word={entry.word} large />
            </div>
            <PinyinText entry={entry} className="mt-3 text-3xl font-semibold text-teal-700 sm:text-4xl" />
          </div>

          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-black uppercase tracking-wide text-slate-500">Meaning</div>
            <div className="mt-2 text-2xl font-semibold leading-snug text-slate-800">{entry.english}</div>
            {entry.chinese_explanation && (
              <div className="mt-2 text-xl leading-8 text-slate-600">{entry.chinese_explanation}</div>
            )}
          </div>

          {breakdown.length > 0 && (
            <div className="mt-6">
              <div className="text-sm font-black text-slate-800">Character breakdown</div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {breakdown.map((item, index) => (
                  <div
                    key={`${item.char}-${index}`}
                    className="flex flex-col items-center rounded-lg border border-slate-200 bg-white p-3 text-center"
                  >
                    <ChineseCharacterDisplay size="tile">{item.char}</ChineseCharacterDisplay>
                    <div className="mt-2 text-xl font-semibold text-teal-700">{item.pinyin || "—"}</div>
                    <div className="mt-1 min-h-[2.5rem] text-base leading-6 text-slate-600">
                      {item.meaning || "—"}
                    </div>
                    <PlayPronunciationButton word={item.char} compact className="mt-2" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <div className="text-sm font-black text-slate-800">Examples</div>
            {examples.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                No example sentences for this phrase yet.
              </p>
            ) : (
              <ol className="mt-3 space-y-3">
                {examples.map((example, index) => (
                  <li
                    key={index}
                    className="rounded-lg border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-coral/10 text-xs font-black text-coral">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="chinese-handwriting text-2xl leading-relaxed text-slate-800 sm:text-3xl">{example.zh}</div>
                        {getExamplePinyin(example) && (
                          <div className="mt-1 text-xl font-semibold leading-8 text-teal-700">{getExamplePinyin(example)}</div>
                        )}
                        {example.en && (
                          <div className="mt-2 text-lg leading-7 text-slate-500">{example.en}</div>
                        )}
                      </div>
                      <PlayPronunciationButton word={example.zh} compact />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 sm:px-6">
          <RememberedBadge remembered={remembered} />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-black text-slate-600 hover:border-coral hover:text-coral"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
