import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cx } from "../../lib/api";

export default function StudentSearchSelect({ students = [], value, onChange, className = "" }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = students.find((item) => item.user.id === value) || null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((item) => {
      const hay = `${item.user.name || ""} ${item.user.email || ""} ${item.user.grade || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [students, query]);

  return (
    <div className={cx("relative", className)}>
      <label className="mb-1 block text-xs font-black uppercase text-slate-500">Find student</label>
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          value={open ? query : selected ? `${selected.user.name} · ${selected.user.grade || ""}` : query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          placeholder="Search name, email or grade…"
          className="w-full bg-transparent text-sm font-semibold outline-none"
        />
      </div>
      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {filtered.length === 0 && <div className="px-3 py-4 text-sm text-slate-500">No matching students</div>}
          {filtered.map((item) => (
            <button
              key={item.user.id}
              type="button"
              onClick={() => {
                onChange(item.user.id);
                setOpen(false);
                setQuery("");
              }}
              className={cx(
                "flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-teal/5",
                value === item.user.id && "bg-teal/10"
              )}
            >
              <span>
                <span className="block font-black text-ink">{item.user.name}</span>
                <span className="block text-xs text-slate-500">{item.user.email}</span>
              </span>
              <span className="shrink-0 text-xs font-bold text-teal">{item.user.grade || "—"}</span>
            </button>
          ))}
        </div>
      )}
      {open && <button type="button" className="fixed inset-0 z-10 cursor-default" aria-label="Close" onClick={() => setOpen(false)} />}
    </div>
  );
}
