import React, { useEffect } from "react";
import { chineseCurriculum } from "../../curriculum.js";
import {
  P1_GRADES,
  formatChineseGrade,
  getChineseGradeMeta,
  isP1Grade
} from "../../data/chinese/index.js";
import GradePicker from "../shared/GradePicker.jsx";

export { P1_GRADES, isP1Grade };

const CHINESE_LEVELS = Object.keys(chineseCurriculum);

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

/** P1–P6 page-level picker (above the Chinese panel). */
export function ChineseHeaderGrades({ grade, setGrade, className = "" }) {
  return (
    <div className={className}>
      <GradePicker
        grades={CHINESE_LEVELS}
        value={grade}
        onChange={setGrade}
        activeClassName="bg-coral text-white"
      />
    </div>
  );
}

/** Chinese / Higher Chinese (and Foundation when available) — row below grade picker. */
export function ChinesePathwayPicker({ grade, pathway, onPathwayChange, className = "" }) {
  const pathwayOptions = chineseCurriculum[grade]?.pathways || {};
  const currentPathway = pathwayOptions[pathway] ? pathway : "chinese";

  useEffect(() => {
    onPathwayChange?.("chinese");
  }, [grade, onPathwayChange]);

  return (
    <div className={cx("flex flex-wrap gap-2", className)}>
      {Object.entries(pathwayOptions).map(([id, option]) => (
        <button
          key={id}
          type="button"
          onClick={() => onPathwayChange?.(id)}
          className={cx(
            "rounded-md border px-4 py-2 text-sm font-black transition",
            currentPathway === id
              ? "border-coral bg-coral text-white"
              : "border-slate-200 bg-white text-slate-600 hover:border-coral/40"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** 1A / 1B toggles — shown on the Vocab tab when P1 is selected. */
export function P1TierToggle({ p1Tiers = [], onP1TiersChange, className = "" }) {
  const activeTiers = p1Tiers.length ? p1Tiers : ["P1A"];

  function toggleP1Tier(tier) {
    let next;
    if (activeTiers.includes(tier)) {
      if (activeTiers.length === 1) return;
      next = activeTiers.filter((value) => value !== tier);
    } else {
      next = P1_GRADES.filter((value) => activeTiers.includes(value) || value === tier);
    }
    onP1TiersChange?.(next);
  }

  return (
    <div className={cx("flex flex-wrap items-center gap-2", className)}>
      <span className="text-xs font-black uppercase tracking-wide text-slate-500">Word lists</span>
      {P1_GRADES.map((tier) => {
        const meta = getChineseGradeMeta(tier);
        const selected = activeTiers.includes(tier);
        return (
          <button
            key={tier}
            type="button"
            onClick={() => toggleP1Tier(tier)}
            aria-pressed={selected}
            className={cx(
              "rounded-md border px-3 py-1.5 text-xs font-black transition sm:text-sm",
              selected
                ? "border-coral bg-coral/10 text-coral ring-2 ring-coral/20"
                : "border-slate-200 bg-white text-slate-600 hover:border-coral/40"
            )}
          >
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

export function ChineseGradeSelect({ grade, onChange, label = "Grade", className = "" }) {
  const otherGrades = CHINESE_LEVELS.filter((level) => level !== "P1");

  return (
    <label className={className}>
      <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
      <select
        value={grade}
        onChange={onChange}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-800 outline-none focus:border-coral"
      >
        <optgroup label="P1">
          {P1_GRADES.map((tier) => (
            <option key={tier} value={tier}>
              {formatChineseGrade(tier)}
            </option>
          ))}
        </optgroup>
        {otherGrades.map((level) => (
          <option key={level} value={level}>
            {level}
          </option>
        ))}
      </select>
    </label>
  );
}
