import { cx } from "../../lib/api.js";

export default function GradePicker({ grades, value, onChange, activeClassName = "bg-teal text-white" }) {
  return (
    <div className="grade-picker-scroll rounded-lg border border-slate-200 bg-slate-50 p-1">
      {grades.map((level) => (
        <button
          key={level}
          type="button"
          onClick={() => onChange(level)}
          className={cx(
            "shrink-0 rounded-md px-3 py-2 text-sm font-black transition",
            value === level ? activeClassName : "bg-white text-slate-600 hover:bg-slate-100"
          )}
        >
          {level}
        </button>
      ))}
    </div>
  );
}
