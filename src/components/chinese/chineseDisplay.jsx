import React from "react";
import { Check, Volume2 } from "lucide-react";
import { getWordPinyin } from "../../data/chinese/index.js";
import { speakChineseWord } from "../../utils/chinesePronunciation.js";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function ChineseCharacterDisplay({ children, size = "card" }) {
  const isParagraph = size === "paragraph";
  const sizeClass =
    size === "hero"
      ? "text-7xl sm:text-8xl"
      : size === "table"
        ? "text-5xl"
        : size === "row"
          ? "text-4xl"
          : isParagraph
            ? "text-2xl leading-relaxed"
            : size === "tile"
              ? "text-6xl"
              : "text-6xl sm:text-7xl";
  return (
    <span className={cx("chinese-character-display chinese-handwriting", !isParagraph && "leading-none", sizeClass)}>
      {children}
    </span>
  );
}

export function PinyinText({ entry, className = "" }) {
  return <span className={className}>{getWordPinyin(entry)}</span>;
}

export function PlayPronunciationButton({ word, compact = false, large = false, className = "", onClick }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        speakChineseWord(word);
        onClick?.(event);
      }}
      aria-label={`Listen to ${word}`}
      className={cx(
        "inline-flex items-center justify-center rounded-full border border-coral/30 bg-coral/10 text-coral hover:bg-coral hover:text-white",
        large ? "h-12 w-12" : compact ? "h-8 w-8" : "h-10 w-10",
        className
      )}
    >
      <Volume2 className={large ? "h-6 w-6" : compact ? "h-4 w-4" : "h-5 w-5"} />
    </button>
  );
}

export function RememberedBadge({ remembered, compact = false }) {
  if (!remembered) {
    return (
      <span
        className={cx(
          "rounded-full bg-slate-100 font-bold text-slate-500",
          compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
        )}
      >
        To learn
      </span>
    );
  }
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full bg-green-100 font-black text-green-700",
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      )}
    >
      <Check className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
      Saved
    </span>
  );
}
