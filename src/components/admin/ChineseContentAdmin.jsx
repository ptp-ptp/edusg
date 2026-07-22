import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, BookOpenText, Layers, ListTree, MonitorPlay, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { fetchJson, cx } from "../../lib/api";
import { getSeedPack, getSeedTopicClusters, getSeedGrades, getSeedWatchSeries } from "./chineseAdminSeed";
import { getSeedChineseReadings, clearChineseContentCache } from "../../lib/chineseContentApi";

// Server responses cached per grade for the session, so revisiting is instant.
const serverPackCache = new Map();
const serverReadingsCache = new Map();
let serverWatchSeriesCache = null;
let serverGradesCache = null;

const WORD_TYPES = ["我会认", "我会写", "词语", "短语", "段落"];
const TABS = [
  { id: "reading", label: "Reading", icon: BookOpenText },
  { id: "watch", label: "Watch videos", icon: MonitorPlay },
  { id: "words", label: "Vocabulary", icon: BookOpen },
  { id: "themes", label: "Theme groups", icon: Layers },
  { id: "lessons", label: "Lesson phases", icon: ListTree },
  { id: "topics", label: "Roadmap topics", icon: ListTree }
];

/** Readings are stored per base grade; P1A/P1B share P1, the HCL pack shares P4. */
function toReadingGradeKey(gradeKey) {
  if (gradeKey.startsWith("P1")) return "P1";
  if (gradeKey === "P4-extra") return "P4";
  return gradeKey;
}

function entryLocalKey(entry) {
  return `${entry.lesson}|${entry.word}|${entry.type}`;
}

const emptyWord = {
  lesson: "第一课",
  word: "",
  type: "我会认",
  english: "",
  pinyin: "",
  group: "objects"
};

export default function ChineseContentAdmin({ status, onStatus }) {
  const [grades, setGrades] = useState(() => serverGradesCache || getSeedGrades());
  const [gradeKey, setGradeKey] = useState("P1A");
  const [pack, setPack] = useState(() => serverPackCache.get("P1A")?.pack || getSeedPack("P1A"));
  const [p1TopicClusters, setP1TopicClusters] = useState(
    () => serverPackCache.get("P1A")?.p1TopicClusters || getSeedTopicClusters()
  );
  const [tab, setTab] = useState("words");
  const [search, setSearch] = useState("");
  const [lessonFilter, setLessonFilter] = useState("all");
  const [draft, setDraft] = useState({ ...emptyWord });
  const [editingKey, setEditingKey] = useState(null);
  const [readings, setReadings] = useState([]);
  const [readingEditor, setReadingEditor] = useState(null);
  const [watchSeries, setWatchSeries] = useState(() => serverWatchSeriesCache || getSeedWatchSeries());
  const [watchEditor, setWatchEditor] = useState(null);
  const gradeKeyRef = useRef(gradeKey);
  gradeKeyRef.current = gradeKey;
  const readingGradeKey = toReadingGradeKey(gradeKey);

  const loadGrades = useCallback(async () => {
    try {
      const result = await fetchJson("/admin/chinese");
      serverGradesCache = result.grades || [];
      setGrades(serverGradesCache);
    } catch {
      // keep seed summaries
    }
  }, []);

  const loadPack = useCallback(async (key) => {
    // Show bundled seed content immediately, then refresh with any
    // admin-saved overrides from the server in the background.
    const cached = serverPackCache.get(key);
    if (cached) {
      setPack(cached.pack);
      if (cached.p1TopicClusters) setP1TopicClusters(cached.p1TopicClusters);
      return;
    }
    setPack(getSeedPack(key));
    onStatus?.("Syncing...");
    try {
      const result = await fetchJson(`/admin/chinese/${encodeURIComponent(key)}`);
      serverPackCache.set(key, result);
      if (gradeKeyRef.current === key) {
        setPack(result.pack);
        if (result.p1TopicClusters) setP1TopicClusters(result.p1TopicClusters);
      }
    } catch {
      // seed content already shown
    }
    onStatus?.("");
  }, [onStatus]);

  useEffect(() => {
    loadGrades();
  }, [loadGrades]);

  useEffect(() => {
    loadPack(gradeKey);
  }, [gradeKey, loadPack]);

  const loadReadings = useCallback(async (key) => {
    const cached = serverReadingsCache.get(key);
    if (cached) {
      setReadings(cached);
      return;
    }
    let serverDone = false;
    setReadings([]);
    // Bundled seed shows instantly while the server copy syncs in the background.
    getSeedChineseReadings(key).then((seed) => {
      if (!serverDone && toReadingGradeKey(gradeKeyRef.current) === key) setReadings(seed);
    });
    try {
      const result = await fetchJson(`/admin/chinese/readings/${encodeURIComponent(key)}`);
      serverDone = true;
      serverReadingsCache.set(key, result.readings || []);
      if (toReadingGradeKey(gradeKeyRef.current) === key) setReadings(result.readings || []);
    } catch {
      // seed content shows (or will show) instead
    }
  }, []);

  useEffect(() => {
    setReadingEditor(null);
    loadReadings(readingGradeKey);
  }, [readingGradeKey, loadReadings]);

  function applyServerReadings(next) {
    setReadings(next);
    serverReadingsCache.set(readingGradeKey, next);
  }

  const loadWatchSeries = useCallback(async (force = false) => {
    if (!force && serverWatchSeriesCache) {
      setWatchSeries(serverWatchSeriesCache);
      return;
    }
    try {
      const result = await fetchJson("/admin/chinese/watch-series");
      serverWatchSeriesCache = result.series || [];
      setWatchSeries(serverWatchSeriesCache);
    } catch {
      // seed content already shown
    }
  }, []);

  useEffect(() => {
    if (tab === "watch") loadWatchSeries(true);
  }, [tab, loadWatchSeries]);

  function applyServerWatchSeries(next) {
    setWatchSeries(next);
    serverWatchSeriesCache = next;
  }

  async function saveWatchSeries(payload) {
    onStatus?.("Saving series...");
    try {
      const isNew = !payload.id;
      const result = isNew
        ? await fetchJson("/admin/chinese/watch-series", {
            method: "POST",
            body: JSON.stringify(payload)
          })
        : await fetchJson(`/admin/chinese/watch-series/${encodeURIComponent(payload.id)}`, {
            method: "PATCH",
            body: JSON.stringify(payload)
          });
      applyServerWatchSeries(result.series || []);
      clearChineseContentCache();
      setWatchEditor(null);
      const partCount = (result.series || []).reduce((sum, item) => sum + (item.parts?.length || 0), 0);
      onStatus?.(`Saved — ${partCount} YouTube part(s) now live on Chinese → Watch`);
      await loadWatchSeries(true);
    } catch (error) {
      onStatus?.(error.message || "Save failed");
      throw error;
    } finally {
      window.setTimeout(() => onStatus?.(""), 4000);
    }
  }

  async function removeWatchSeries(seriesId) {
    if (!window.confirm("Delete this video series?")) return;
    onStatus?.("Deleting...");
    try {
      const result = await fetchJson(`/admin/chinese/watch-series/${encodeURIComponent(seriesId)}`, {
        method: "DELETE"
      });
      applyServerWatchSeries(result.series || []);
      clearChineseContentCache();
      onStatus?.("Series deleted");
    } catch (error) {
      onStatus?.(error.message);
    }
    window.setTimeout(() => onStatus?.(""), 1600);
  }

  function openAddPart(series) {
    const nextPart = {
      id: "",
      title: `Part ${(series.parts || []).length + 1}`,
      url: "",
      transcript: "",
      vocabs: "",
      fullEnglish: ""
    };
    setWatchEditor({
      isNew: false,
      series: { ...series, parts: [...(series.parts || []), nextPart] },
      focusLastPart: true
    });
  }

  async function saveReading(payload) {
    onStatus?.("Saving reading...");
    try {
      const isNew = !payload.id;
      const result = isNew
        ? await fetchJson(`/admin/chinese/readings/${encodeURIComponent(readingGradeKey)}`, {
            method: "POST",
            body: JSON.stringify(payload)
          })
        : await fetchJson(
            `/admin/chinese/readings/${encodeURIComponent(readingGradeKey)}/${encodeURIComponent(payload.id)}`,
            { method: "PATCH", body: JSON.stringify(payload) }
          );
      applyServerReadings(result.readings || []);
      setReadingEditor(null);
      onStatus?.("Reading saved");
    } catch (error) {
      onStatus?.(error.message);
    }
    window.setTimeout(() => onStatus?.(""), 2000);
  }

  async function removeReading(readingId) {
    if (!window.confirm("Delete this reading topic?")) return;
    onStatus?.("Deleting...");
    try {
      const result = await fetchJson(
        `/admin/chinese/readings/${encodeURIComponent(readingGradeKey)}/${encodeURIComponent(readingId)}`,
        { method: "DELETE" }
      );
      applyServerReadings(result.readings || []);
      onStatus?.("Reading deleted");
    } catch (error) {
      onStatus?.(error.message);
    }
    window.setTimeout(() => onStatus?.(""), 1600);
  }

  const lessons = useMemo(() => {
    return [...new Set((pack?.words || []).map((entry) => entry.lesson).filter(Boolean))].sort();
  }, [pack]);

  const filteredWords = useMemo(() => {
    let rows = pack?.words || [];
    if (lessonFilter !== "all") rows = rows.filter((entry) => entry.lesson === lessonFilter);
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(
      (entry) =>
        entry.word.includes(query) ||
        entry.english?.toLowerCase().includes(query) ||
        entry.pinyin?.toLowerCase().includes(query) ||
        entry.lesson?.includes(query)
    );
  }, [pack, search, lessonFilter]);

  const activeGrade = grades.find((item) => item.gradeKey === gradeKey);

  function applyServerPack(nextPack) {
    setPack(nextPack);
    const cached = serverPackCache.get(gradeKey) || {};
    serverPackCache.set(gradeKey, { ...cached, pack: nextPack });
    serverGradesCache = null;
  }

  async function saveWord(event) {
    event.preventDefault();
    onStatus?.("Saving word...");
    try {
      const result = await fetchJson(`/admin/chinese/${encodeURIComponent(gradeKey)}/words`, {
        method: "POST",
        body: JSON.stringify(draft)
      });
      applyServerPack(result.pack);
      setDraft({ ...emptyWord, lesson: draft.lesson });
      onStatus?.("Word added");
    } catch (error) {
      onStatus?.(error.message);
    }
    window.setTimeout(() => onStatus?.(""), 1600);
  }

  async function patchWord(localKey, changes) {
    onStatus?.("Saving...");
    const result = await fetchJson(
      `/admin/chinese/${encodeURIComponent(gradeKey)}/words/${encodeURIComponent(localKey)}`,
      { method: "PATCH", body: JSON.stringify(changes) }
    );
    applyServerPack(result.pack);
    onStatus?.("Saved");
    window.setTimeout(() => onStatus?.(""), 1200);
  }

  async function removeWord(localKey) {
    if (!window.confirm("Delete this word from the level?")) return;
    onStatus?.("Deleting...");
    const result = await fetchJson(
      `/admin/chinese/${encodeURIComponent(gradeKey)}/words/${encodeURIComponent(localKey)}`,
      { method: "DELETE" }
    );
    applyServerPack(result.pack);
    onStatus?.("Deleted");
    window.setTimeout(() => onStatus?.(""), 1200);
  }

  async function saveThemeGroup(group) {
    onStatus?.("Saving group...");
    const result = await fetchJson(
      `/admin/chinese/${encodeURIComponent(gradeKey)}/theme-groups/${encodeURIComponent(group.id)}`,
      { method: "PATCH", body: JSON.stringify(group) }
    );
    applyServerPack(result.pack);
    onStatus?.("Group saved");
    window.setTimeout(() => onStatus?.(""), 1200);
  }

  async function addThemeGroup() {
    const label = window.prompt("Theme name (English):", "New theme");
    if (!label) return;
    const result = await fetchJson(`/admin/chinese/${encodeURIComponent(gradeKey)}/theme-groups`, {
      method: "POST",
      body: JSON.stringify({ label, labelZh: label, emoji: "📚", hint: "", wordKeys: [] })
    });
    applyServerPack(result.pack);
  }

  async function removeThemeGroup(groupId) {
    if (!window.confirm("Delete this theme group?")) return;
    const result = await fetchJson(
      `/admin/chinese/${encodeURIComponent(gradeKey)}/theme-groups/${encodeURIComponent(groupId)}`,
      { method: "DELETE" }
    );
    applyServerPack(result.pack);
  }

  async function saveLessonGroups() {
    onStatus?.("Saving lessons...");
    const result = await fetchJson(`/admin/chinese/${encodeURIComponent(gradeKey)}/groups`, {
      method: "PATCH",
      body: JSON.stringify(pack.practiceGroups)
    });
    applyServerPack(result.pack);
    onStatus?.("Lessons saved");
    window.setTimeout(() => onStatus?.(""), 1200);
  }

  async function saveTopics() {
    onStatus?.("Saving topics...");
    const result = await fetchJson("/admin/chinese/topic-clusters", {
      method: "PATCH",
      body: JSON.stringify(p1TopicClusters)
    });
    setP1TopicClusters(result.p1TopicClusters);
    for (const [key, cached] of serverPackCache) {
      if (cached.p1TopicClusters) serverPackCache.set(key, { ...cached, p1TopicClusters: result.p1TopicClusters });
    }
    onStatus?.("Topics saved");
    window.setTimeout(() => onStatus?.(""), 1200);
  }

  if (!pack) {
    return <div className="mt-5 rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">Loading Chinese content…</div>;
  }

  return (
    <div className="mt-5 space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">Chinese curriculum manager</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Manage reading passages, vocabulary, lesson phases, theme groups and P1 roadmap topics. Changes save to the database and appear on the student Chinese landing page.
            </p>
          </div>
          <div className="text-sm font-black text-leaf">{status}</div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {grades.map((item) => (
            <button
              key={item.gradeKey}
              type="button"
              onClick={() => setGradeKey(item.gradeKey)}
              className={cx(
                "rounded-lg border px-3 py-2 text-left transition",
                gradeKey === item.gradeKey ? "border-teal bg-teal/10" : "border-slate-200 bg-white hover:border-teal/40"
              )}
            >
              <div className="text-sm font-black">{item.label}</div>
              <div className="text-[11px] font-semibold text-slate-500">
                {item.wordCount} words · {item.phase}
              </div>
            </button>
          ))}
        </div>

        {activeGrade && (
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <Stat label="Words" value={activeGrade.wordCount} />
            <Stat label="Lessons" value={activeGrade.lessonCount} />
            <Stat label="Themes" value={activeGrade.themeGroupCount} />
            <Stat label="Semester" value={activeGrade.semester || "—"} />
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cx(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-black transition",
              tab === item.id ? "bg-ink text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </div>

      {tab === "reading" && (
        <section className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-black">Reading topics · {readingGradeKey}</h3>
                <p className="text-sm text-slate-500">
                  Passages shown on the student Chinese "Reading" tab, with read-aloud, word highlighting, pinyin
                  tooltips and a vocabulary list. Readings are shared per level ({readingGradeKey} covers{" "}
                  {readingGradeKey === "P1" ? "P1A and P1B" : readingGradeKey === "P4" ? "P4 and P4 Extra" : readingGradeKey}).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReadingEditor({ isNew: true })}
                className="inline-flex items-center gap-2 rounded-md bg-teal px-4 py-2 text-sm font-black text-white"
              >
                <Plus className="h-4 w-4" /> Add reading
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {readings.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                  No reading topics for {readingGradeKey} yet. Click "Add reading" to create the first one.
                </div>
              )}
              {readings.map((reading) => (
                <div key={reading.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-2xl font-black">{reading.title}</span>
                      {reading.term && (
                        <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[11px] font-black text-teal">{reading.term}</span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-slate-500">
                      {reading.titleEn || reading.subtitle || "—"} ·{" "}
                      {Array.isArray(reading.levels) && reading.levels.length > 0
                        ? `${reading.levels.length} difficulty levels (${reading.levels.map((level) => level.key).join(", ")})`
                        : `${(reading.sentences || []).length} sentences · ${(reading.vocabulary || []).length} vocab entries`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setReadingEditor({ isNew: false, reading })}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-3 py-2 text-xs font-black text-slate-700"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeReading(reading.id)}
                      className="inline-flex items-center gap-1 rounded-md bg-coral/10 px-3 py-2 text-xs font-black text-coral"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {readingEditor && (
            <ReadingEditor
              key={readingEditor.reading?.id || "new"}
              reading={readingEditor.reading}
              gradeKey={readingGradeKey}
              onSave={saveReading}
              onCancel={() => setReadingEditor(null)}
            />
          )}
        </section>
      )}

      {tab === "watch" && (
        <section className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-black">Watch videos · YouTube stories</h3>
                <p className="mt-1 max-w-3xl text-sm text-slate-500">
                  Add story series for the student Chinese <span className="font-bold">Watch</span> tab. Each series
                  can have many parts. For every part, provide a YouTube link (required), timed subtitle, word list
                  (Vocabs), and Full English. Students watch the video and use Learn for karaoke, meanings and pinyin.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWatchEditor({ isNew: true })}
                className="inline-flex items-center gap-2 rounded-md bg-teal px-4 py-2 text-sm font-black text-white"
              >
                <Plus className="h-4 w-4" /> Add series
              </button>
            </div>

            <div className="mt-4 grid gap-2 rounded-lg border border-teal/20 bg-teal/5 p-3 text-xs font-semibold text-slate-600 sm:grid-cols-4">
              <div><span className="font-black text-teal">1. Series</span> — English + 中文 title</div>
              <div><span className="font-black text-teal">2. YouTube link</span> — required per part</div>
              <div><span className="font-black text-teal">3. Subtitle</span> — timed lines for karaoke</div>
              <div><span className="font-black text-teal">4. Vocabs / English</span> — word list + retelling</div>
            </div>

            <div className="mt-4 space-y-3">
              {watchSeries.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                  No video series yet. Click "Add series" to create the first one (e.g. Journey to the West).
                </div>
              )}
              {watchSeries.map((series) => (
                <div key={series.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {series.titleZh && <span className="text-2xl font-black">{series.titleZh}</span>}
                        <span className="text-lg font-black">{series.title}</span>
                        <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[11px] font-black text-teal">
                          {(series.parts || []).length} {(series.parts || []).length === 1 ? "part" : "parts"}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs font-semibold text-slate-500">
                        {series.description || "—"}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(series.parts || []).map((part, index) => (
                          <span
                            key={part.id || index}
                            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600"
                            title={part.url || ""}
                          >
                            {part.title || `Part ${index + 1}`}
                            {part.transcript?.trim() ? " · 字幕" : ""}
                            {part.vocabs?.trim() ? " · 词" : ""}
                            {part.fullEnglish?.trim() ? " · EN" : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openAddPart(series)}
                        className="inline-flex items-center gap-1 rounded-md bg-teal px-3 py-2 text-xs font-black text-white"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add YouTube part
                      </button>
                      <button
                        type="button"
                        onClick={() => setWatchEditor({ isNew: false, series })}
                        className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-3 py-2 text-xs font-black text-slate-700"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => removeWatchSeries(series.id)}
                        className="inline-flex items-center gap-1 rounded-md bg-coral/10 px-3 py-2 text-xs font-black text-coral"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {watchEditor && (
            <WatchSeriesEditor
              key={watchEditor.series?.id || "new"}
              series={watchEditor.series}
              focusLastPart={Boolean(watchEditor.focusLastPart)}
              onSave={saveWatchSeries}
              onCancel={() => setWatchEditor(null)}
            />
          )}
        </section>
      )}

      {tab === "words" && (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search word, pinyin, English…"
                className="min-w-[12rem] flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal"
              />
              <select
                value={lessonFilter}
                onChange={(event) => setLessonFilter(event.target.value)}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-teal"
              >
                <option value="all">All lessons</option>
                {lessons.map((lesson) => (
                  <option key={lesson} value={lesson}>{lesson}</option>
                ))}
              </select>
            </div>
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Lesson</th>
                    <th className="px-3 py-2">Word</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">English</th>
                    <th className="px-3 py-2">Pinyin</th>
                    <th className="px-3 py-2">Group</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {filteredWords.map((entry) => {
                    const key = entryLocalKey(entry);
                    const editing = editingKey === key;
                    return (
                      <tr key={key} className="border-t border-slate-100 align-top">
                        <td className="px-3 py-2">
                          {editing ? (
                            <select
                              value={entry.lesson}
                              onChange={(event) => patchWord(key, { lesson: event.target.value })}
                              className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                            >
                              {lessons.map((lesson) => (
                                <option key={lesson} value={lesson}>{lesson}</option>
                              ))}
                            </select>
                          ) : (
                            entry.lesson
                          )}
                        </td>
                        <td className="px-3 py-2 text-lg font-black">{entry.word}</td>
                        <td className="px-3 py-2">{entry.type}</td>
                        <td className="px-3 py-2">
                          {editing ? (
                            <input
                              defaultValue={entry.english}
                              onBlur={(event) => patchWord(key, { english: event.target.value })}
                              className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                            />
                          ) : (
                            entry.english
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {editing ? (
                            <input
                              defaultValue={entry.pinyin || ""}
                              onBlur={(event) => patchWord(key, { pinyin: event.target.value })}
                              className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                            />
                          ) : (
                            entry.pinyin
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {editing ? (
                            <input
                              defaultValue={entry.group || ""}
                              onBlur={(event) => patchWord(key, { group: event.target.value })}
                              className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                            />
                          ) : (
                            entry.group
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <button type="button" onClick={() => setEditingKey(editing ? null : key)} className="rounded bg-slate-100 px-2 py-1 text-xs font-bold">
                              {editing ? "Done" : "Edit"}
                            </button>
                            <button type="button" onClick={() => removeWord(key)} className="rounded bg-coral/10 px-2 py-1 text-xs font-bold text-coral">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <form onSubmit={saveWord} className="h-fit rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-black">Add vocabulary</h3>
            <div className="mt-3 space-y-2">
              <Field label="Lesson" value={draft.lesson} onChange={(value) => setDraft((c) => ({ ...c, lesson: value }))} list="chinese-lessons" />
              <datalist id="chinese-lessons">
                {lessons.map((lesson) => <option key={lesson} value={lesson} />)}
              </datalist>
              <Field label="Chinese word" value={draft.word} onChange={(value) => setDraft((c) => ({ ...c, word: value }))} required />
              <label className="block text-xs font-bold text-slate-500">
                Type
                <select value={draft.type} onChange={(event) => setDraft((c) => ({ ...c, type: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm">
                  {WORD_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <Field label="English" value={draft.english} onChange={(value) => setDraft((c) => ({ ...c, english: value }))} />
              <Field label="Pinyin" value={draft.pinyin} onChange={(value) => setDraft((c) => ({ ...c, pinyin: value }))} />
              <Field label="Theme group" value={draft.group} onChange={(value) => setDraft((c) => ({ ...c, group: value }))} />
            </div>
            <button type="submit" className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-teal px-4 py-2.5 text-sm font-black text-white">
              <Plus className="h-4 w-4" /> Add word
            </button>
          </form>
        </section>
      )}

      {tab === "themes" && (
        <section className="space-y-4">
          <div className="flex justify-end">
            <button type="button" onClick={addThemeGroup} className="inline-flex items-center gap-2 rounded-md bg-teal px-4 py-2 text-sm font-black text-white">
              <Plus className="h-4 w-4" /> Add theme group
            </button>
          </div>
          {(pack.practiceGroups?.themeGroups || []).map((group) => (
            <ThemeGroupEditor
              key={group.id}
              group={group}
              words={pack.words}
              onSave={saveThemeGroup}
              onDelete={() => removeThemeGroup(group.id)}
            />
          ))}
        </section>
      )}

      {tab === "lessons" && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-black">Lesson phases</h3>
              <p className="text-sm text-slate-500">Each lesson groups vocabulary by phase. Reorder labels or emoji here.</p>
            </div>
            <button type="button" onClick={saveLessonGroups} className="inline-flex items-center gap-2 rounded-md bg-teal px-4 py-2 text-sm font-black text-white">
              <Save className="h-4 w-4" /> Save lessons
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {(pack.practiceGroups?.lessonGroups || []).map((group, index) => (
              <div key={group.id || group.lesson} className="rounded-lg border border-slate-200 p-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <Field
                    label="Lesson"
                    value={group.lesson || group.label}
                    onChange={(value) => {
                      const lessonGroups = [...pack.practiceGroups.lessonGroups];
                      lessonGroups[index] = { ...group, lesson: value, label: value };
                      setPack({ ...pack, practiceGroups: { ...pack.practiceGroups, lessonGroups } });
                    }}
                  />
                  <Field
                    label="Label (EN)"
                    value={group.label || ""}
                    onChange={(value) => {
                      const lessonGroups = [...pack.practiceGroups.lessonGroups];
                      lessonGroups[index] = { ...group, label: value };
                      setPack({ ...pack, practiceGroups: { ...pack.practiceGroups, lessonGroups } });
                    }}
                  />
                  <Field
                    label="Label (中文)"
                    value={group.labelZh || ""}
                    onChange={(value) => {
                      const lessonGroups = [...pack.practiceGroups.lessonGroups];
                      lessonGroups[index] = { ...group, labelZh: value };
                      setPack({ ...pack, practiceGroups: { ...pack.practiceGroups, lessonGroups } });
                    }}
                  />
                  <Field
                    label="Emoji"
                    value={group.emoji || ""}
                    onChange={(value) => {
                      const lessonGroups = [...pack.practiceGroups.lessonGroups];
                      lessonGroups[index] = { ...group, emoji: value };
                      setPack({ ...pack, practiceGroups: { ...pack.practiceGroups, lessonGroups } });
                    }}
                  />
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-500">{group.wordKeys?.length || 0} words in this phase</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "topics" && p1TopicClusters && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-black">P1 roadmap topics</h3>
              <p className="text-sm text-slate-500">Topics shown on the Chinese landing roadmap for P1A and P1B.</p>
            </div>
            <button type="button" onClick={saveTopics} className="inline-flex items-center gap-2 rounded-md bg-teal px-4 py-2 text-sm font-black text-white">
              <Save className="h-4 w-4" /> Save topics
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {(p1TopicClusters.topics || []).map((topic, index) => (
              <div key={topic.id} className="rounded-lg border border-slate-200 p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <Field
                    label="Topic (EN)"
                    value={topic.label}
                    onChange={(value) => {
                      const topics = [...p1TopicClusters.topics];
                      topics[index] = { ...topic, label: value };
                      setP1TopicClusters({ ...p1TopicClusters, topics });
                    }}
                  />
                  <Field
                    label="Topic (中文)"
                    value={topic.labelZh}
                    onChange={(value) => {
                      const topics = [...p1TopicClusters.topics];
                      topics[index] = { ...topic, labelZh: value };
                      setP1TopicClusters({ ...p1TopicClusters, topics });
                    }}
                  />
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  P1A themes: {(topic.tiers?.P1A?.theme || []).join(", ") || "—"} · P1B themes: {(topic.tiers?.P1B?.theme || []).join(", ") || "—"}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const SENTENCES_EXAMPLE = `[
  [
    { "t": "我", "py": "wǒ", "en": "I; me" },
    { "t": "爱", "py": "ài", "en": "love" },
    { "t": "学校", "py": "xuéxiào", "en": "school" },
    { "t": "。", "p": true }
  ]
]`;

const VOCAB_EXAMPLE = `[
  { "word": "学校", "pinyin": "xuéxiào", "english": "school" }
]`;

/** Parses and validates passage JSON. Returns { sentences } or { error }. */
function parseSentencesText(text, label = "Passage") {
  let sentences;
  try {
    sentences = JSON.parse(text);
  } catch {
    return { error: `${label} JSON is not valid JSON. Check for missing commas or quotes.` };
  }
  if (!Array.isArray(sentences) || sentences.length === 0 || !sentences.every((s) => Array.isArray(s) && s.length)) {
    return { error: `${label} JSON must be an array of sentences, each a non-empty array of tokens.` };
  }
  for (const sentence of sentences) {
    for (const token of sentence) {
      if (!token || typeof token.t !== "string" || !token.t) {
        return { error: `${label}: every token needs a "t" field with the Chinese text.` };
      }
      if (!token.p && (!token.py || !token.en)) {
        return {
          error: `${label}: word token "${token.t}" needs "py" (pinyin) and "en" (English), or "p": true for punctuation.`
        };
      }
    }
  }
  return { sentences };
}

/** Parses and validates optional vocabulary JSON. Returns { vocabulary } or { error }. */
function parseVocabText(text, label = "Vocabulary") {
  if (!text.trim()) return { vocabulary: [] };
  let vocabulary;
  try {
    vocabulary = JSON.parse(text);
  } catch {
    return { error: `${label} JSON is not valid JSON.` };
  }
  if (!Array.isArray(vocabulary) || !vocabulary.every((item) => item && item.word)) {
    return { error: `${label} must be an array of { "word", "pinyin", "english" } objects.` };
  }
  return { vocabulary };
}

function levelToDraft(level, index) {
  return {
    key: level?.key || `Level ${index + 1}`,
    description: level?.description || "",
    sentencesText: level?.sentences ? JSON.stringify(level.sentences, null, 2) : "",
    vocabText: level?.vocabulary?.length ? JSON.stringify(level.vocabulary, null, 2) : ""
  };
}

const DEFAULT_LEVEL_KEYS = ["Simple", "Medium", "Hard", "Harder", "Advance"];

function ReadingEditor({ reading, gradeKey, onSave, onCancel }) {
  const hasLevels = Array.isArray(reading?.levels) && reading.levels.length > 0;
  const [title, setTitle] = useState(reading?.title || "");
  const [titleEn, setTitleEn] = useState(reading?.titleEn || "");
  const [subtitle, setSubtitle] = useState(reading?.subtitle || "");
  const [term, setTerm] = useState(reading?.term || "");
  const [useLevels, setUseLevels] = useState(hasLevels);
  const [sentencesText, setSentencesText] = useState(
    reading?.sentences ? JSON.stringify(reading.sentences, null, 2) : ""
  );
  const [vocabText, setVocabText] = useState(
    reading?.vocabulary?.length ? JSON.stringify(reading.vocabulary, null, 2) : ""
  );
  const [levels, setLevels] = useState(() =>
    hasLevels ? reading.levels.map(levelToDraft) : [levelToDraft(null, 0)]
  );
  const [activeLevel, setActiveLevel] = useState(0);
  const [error, setError] = useState("");

  function updateLevel(index, changes) {
    setLevels((current) => current.map((level, i) => (i === index ? { ...level, ...changes } : level)));
  }

  function addLevel() {
    setLevels((current) => {
      const nextKey = DEFAULT_LEVEL_KEYS[current.length] || `Level ${current.length + 1}`;
      return [...current, { ...levelToDraft(null, current.length), key: nextKey }];
    });
    setActiveLevel(levels.length);
  }

  function removeLevel(index) {
    if (levels.length === 1) return;
    if (!window.confirm(`Remove level "${levels[index].key}"?`)) return;
    setLevels((current) => current.filter((_, i) => i !== index));
    setActiveLevel((current) => Math.max(0, current > index ? current - 1 : Math.min(current, levels.length - 2)));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const base = {
      id: reading?.id || null,
      title: title.trim(),
      titleEn: titleEn.trim(),
      subtitle: subtitle.trim(),
      term: term.trim()
    };

    if (useLevels) {
      const parsedLevels = [];
      for (let i = 0; i < levels.length; i += 1) {
        const level = levels[i];
        const label = level.key || `Level ${i + 1}`;
        const sentencesResult = parseSentencesText(level.sentencesText, `${label} passage`);
        if (sentencesResult.error) {
          setActiveLevel(i);
          setError(sentencesResult.error);
          return;
        }
        const vocabResult = parseVocabText(level.vocabText, `${label} vocabulary`);
        if (vocabResult.error) {
          setActiveLevel(i);
          setError(vocabResult.error);
          return;
        }
        parsedLevels.push({
          key: label,
          description: level.description,
          sentences: sentencesResult.sentences,
          vocabulary: vocabResult.vocabulary
        });
      }
      onSave({ ...base, levels: parsedLevels, sentences: null, vocabulary: null });
      return;
    }

    const sentencesResult = parseSentencesText(sentencesText);
    if (sentencesResult.error) {
      setError(sentencesResult.error);
      return;
    }
    const vocabResult = parseVocabText(vocabText);
    if (vocabResult.error) {
      setError(vocabResult.error);
      return;
    }
    onSave({ ...base, levels: null, sentences: sentencesResult.sentences, vocabulary: vocabResult.vocabulary });
  }

  const currentLevel = levels[Math.min(activeLevel, levels.length - 1)];

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-teal/40 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-black">{reading ? `Edit reading · ${reading.title}` : `New reading for ${gradeKey}`}</h3>
        <button type="button" onClick={onCancel} className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500 hover:border-coral hover:text-coral">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <Field label="Title (中文)" value={title} onChange={setTitle} required />
        <Field label="Title (EN)" value={titleEn} onChange={setTitleEn} />
        <Field label="Subtitle" value={subtitle} onChange={setSubtitle} />
        <Field label="Term" value={term} onChange={setTerm} />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span className="text-xs font-black uppercase tracking-wide text-slate-400">Passage type</span>
        <button
          type="button"
          onClick={() => setUseLevels(false)}
          className={cx(
            "rounded-full px-3 py-1.5 text-xs font-black transition",
            !useLevels ? "bg-ink text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          Single passage
        </button>
        <button
          type="button"
          onClick={() => setUseLevels(true)}
          className={cx(
            "rounded-full px-3 py-1.5 text-xs font-black transition",
            useLevels ? "bg-ink text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          Difficulty levels
        </button>
      </div>

      {!useLevels && (
        <>
          <label className="mt-4 block text-xs font-bold text-slate-500">
            Passage JSON — one array per sentence; word tokens use {"{"}"t","py","en"{"}"}, punctuation uses {"{"}"t","p":true{"}"}
            <textarea
              value={sentencesText}
              onChange={(event) => setSentencesText(event.target.value)}
              placeholder={SENTENCES_EXAMPLE}
              required
              rows={12}
              spellCheck={false}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-xs text-ink outline-none focus:border-teal"
            />
          </label>

          <label className="mt-3 block text-xs font-bold text-slate-500">
            Vocabulary JSON (optional — auto-generated from the passage words when left empty)
            <textarea
              value={vocabText}
              onChange={(event) => setVocabText(event.target.value)}
              placeholder={VOCAB_EXAMPLE}
              rows={6}
              spellCheck={false}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-xs text-ink outline-none focus:border-teal"
            />
          </label>
        </>
      )}

      {useLevels && (
        <div className="mt-4 rounded-lg border border-slate-200 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {levels.map((level, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setActiveLevel(index)}
                className={cx(
                  "rounded-full px-3.5 py-1.5 text-sm font-black transition",
                  index === activeLevel ? "bg-teal text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {level.key || `Level ${index + 1}`}
              </button>
            ))}
            <button
              type="button"
              onClick={addLevel}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-200"
            >
              <Plus className="h-3.5 w-3.5" /> Add level
            </button>
          </div>

          {currentLevel && (
            <div className="mt-3">
              <div className="grid gap-3 md:grid-cols-[200px_1fr_auto]">
                <Field
                  label="Level name"
                  value={currentLevel.key}
                  onChange={(value) => updateLevel(activeLevel, { key: value })}
                  required
                />
                <Field
                  label="Description (shown under the level picker)"
                  value={currentLevel.description}
                  onChange={(value) => updateLevel(activeLevel, { description: value })}
                />
                <button
                  type="button"
                  onClick={() => removeLevel(activeLevel)}
                  disabled={levels.length === 1}
                  className="mt-5 grid h-9 w-9 place-items-center self-start rounded-md bg-coral/10 text-coral disabled:opacity-40"
                  title="Remove this level"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <label className="mt-3 block text-xs font-bold text-slate-500">
                Passage JSON — one array per sentence; word tokens use {"{"}"t","py","en"{"}"}, punctuation uses {"{"}"t","p":true{"}"}
                <textarea
                  value={currentLevel.sentencesText}
                  onChange={(event) => updateLevel(activeLevel, { sentencesText: event.target.value })}
                  placeholder={SENTENCES_EXAMPLE}
                  required
                  rows={12}
                  spellCheck={false}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-xs text-ink outline-none focus:border-teal"
                />
              </label>

              <label className="mt-3 block text-xs font-bold text-slate-500">
                Vocabulary JSON (optional — auto-generated from the passage words when left empty)
                <textarea
                  value={currentLevel.vocabText}
                  onChange={(event) => updateLevel(activeLevel, { vocabText: event.target.value })}
                  placeholder={VOCAB_EXAMPLE}
                  rows={6}
                  spellCheck={false}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-xs text-ink outline-none focus:border-teal"
                />
              </label>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-md border border-coral/30 bg-coral/5 px-3 py-2 text-sm font-bold text-coral">
          {error}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-teal px-5 py-2.5 text-sm font-black text-white">
          <Save className="h-4 w-4" /> {reading ? "Save changes" : "Add reading"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-200 px-5 py-2.5 text-sm font-black text-slate-600">
          Cancel
        </button>
      </div>
    </form>
  );
}

function WatchSeriesEditor({ series, focusLastPart = false, onSave, onCancel }) {
  const [title, setTitle] = useState(series?.title || "");
  const [titleZh, setTitleZh] = useState(series?.titleZh || "");
  const [description, setDescription] = useState(series?.description || "");
  const [parts, setParts] = useState(() =>
    series?.parts?.length
      ? series.parts.map((part) => ({ ...part }))
      : [{ id: "", title: "Part 1", url: "", transcript: "", vocabs: "", fullEnglish: "" }]
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const lastPartRef = useRef(null);
  const errorRef = useRef(null);

  useEffect(() => {
    if (!focusLastPart) return;
    lastPartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focusLastPart]);

  function updatePart(index, changes) {
    setParts((current) => current.map((part, i) => (i === index ? { ...part, ...changes } : part)));
  }

  function addPart() {
    setParts((current) => [
      ...current,
      { id: "", title: `Part ${current.length + 1}`, url: "", transcript: "", vocabs: "", fullEnglish: "" }
    ]);
  }

  function removePart(index) {
    setParts((current) => current.filter((_, i) => i !== index));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Series title is required.");
      return;
    }
    if (parts.length === 0) {
      setError("Add at least one part with a YouTube link.");
      return;
    }
    for (let i = 0; i < parts.length; i += 1) {
      const url = String(parts[i].url || "").trim();
      if (!url) {
        setError(`Part ${i + 1} needs a YouTube link.`);
        return;
      }
      if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url)) {
        setError(`Part ${i + 1} link must be a YouTube URL (youtube.com or youtu.be).`);
        return;
      }
    }
    setSaving(true);
    try {
      await onSave({
        id: series?.id || null,
        title: title.trim(),
        titleZh: titleZh.trim(),
        description: description.trim(),
        parts: parts.map((part, index) => ({
          id: part.id || `part-${index + 1}`,
          title: String(part.title || "").trim() || `Part ${index + 1}`,
          url: String(part.url || "").trim(),
          transcript: String(part.transcript || ""),
          vocabs: String(part.vocabs || ""),
          fullEnglish: String(part.fullEnglish || "")
        }))
      });
    } catch (err) {
      setError(err.message || "Save failed. Please try again.");
      window.setTimeout(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-teal/40 bg-white p-5 shadow-sm" noValidate>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-black">{series?.id ? `Edit series · ${series.title}` : "New video series"}</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Fill series info, then for each YouTube part paste the link, timed subtitle, word list and English text.
          </p>
        </div>
        <button type="button" onClick={onCancel} className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500 hover:border-coral hover:text-coral">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Field label="Series title (EN) — required" value={title} onChange={setTitle} />
        <Field label="Series title (中文)" value={titleZh} onChange={setTitleZh} />
        <Field label="Short description" value={description} onChange={setDescription} />
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-black text-slate-700">YouTube parts ({parts.length})</h4>
          <button
            type="button"
            onClick={addPart}
            className="inline-flex items-center gap-1 rounded-md bg-teal/10 px-3 py-1.5 text-xs font-black text-teal"
          >
            <Plus className="h-3.5 w-3.5" /> Add another part
          </button>
        </div>
        <div className="mt-3 space-y-4">
          {parts.map((part, index) => (
            <div
              key={index}
              ref={index === parts.length - 1 ? lastPartRef : undefined}
              className="rounded-lg border border-slate-200 bg-slate-50/40 p-4"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-black text-slate-700">Part {index + 1}</div>
                <div className="flex flex-wrap gap-1.5 text-[10px] font-black uppercase tracking-wide">
                  <span className={cx("rounded-full px-2 py-0.5", part.url?.trim() ? "bg-leaf/15 text-leaf" : "bg-coral/10 text-coral")}>
                    {part.url?.trim() ? "Link ✓" : "Link needed"}
                  </span>
                  <span className={cx("rounded-full px-2 py-0.5", part.transcript?.trim() ? "bg-leaf/15 text-leaf" : "bg-slate-200 text-slate-500")}>
                    Subtitle {part.transcript?.trim() ? "✓" : "—"}
                  </span>
                  <span className={cx("rounded-full px-2 py-0.5", part.vocabs?.trim() ? "bg-leaf/15 text-leaf" : "bg-slate-200 text-slate-500")}>
                    Vocabs {part.vocabs?.trim() ? "✓" : "—"}
                  </span>
                  <span className={cx("rounded-full px-2 py-0.5", part.fullEnglish?.trim() ? "bg-leaf/15 text-leaf" : "bg-slate-200 text-slate-500")}>
                    English {part.fullEnglish?.trim() ? "✓" : "—"}
                  </span>
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-[180px_1fr_auto]">
                <Field
                  label="Part title"
                  value={part.title || ""}
                  onChange={(value) => updatePart(index, { title: value })}
                />
                <Field
                  label="YouTube link — required"
                  value={part.url || ""}
                  onChange={(value) => updatePart(index, { url: value })}
                />
                <button
                  type="button"
                  onClick={() => removePart(index)}
                  disabled={parts.length === 1}
                  className="mt-5 grid h-9 w-9 place-items-center self-start rounded-md bg-coral/10 text-coral disabled:opacity-40"
                  title="Remove part"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <label className="mt-3 block text-xs font-bold text-slate-500">
                Subtitle (timed Chinese lines for karaoke Learn tab — timings like [0:05] are hidden from students)
                <textarea
                  value={part.transcript || ""}
                  onChange={(event) => updatePart(index, { transcript: event.target.value })}
                  rows={part.transcript ? 10 : 5}
                  placeholder={
                    "第一部分：石猴誕生\n[0:05] 很久很久以前，有一座山。\n[0:09] 山頂上有塊石頭。"
                  }
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-ink outline-none focus:border-teal"
                />
              </label>

              <label className="mt-3 block text-xs font-bold text-slate-500">
                Word list / Vocabs (one entry per line — used for click-to-learn meanings and pinyin)
                <textarea
                  value={part.vocabs || ""}
                  onChange={(event) => updatePart(index, { vocabs: event.target.value })}
                  rows={part.vocabs ? 8 : 4}
                  placeholder={"Key Characters\n石猴 (Shíhóu): Stone Monkey\n玉帝 (Yùdì): Jade Emperor"}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-ink outline-none focus:border-teal"
                />
              </label>

              <label className="mt-3 block text-xs font-bold text-slate-500">
                Full English (English retelling for the Full English Learn tab)
                <textarea
                  value={part.fullEnglish || ""}
                  onChange={(event) => updatePart(index, { fullEnglish: event.target.value })}
                  rows={part.fullEnglish ? 8 : 4}
                  placeholder="Part 1: The Birth of the Stone Monkey\n\nLong, long ago…"
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-ink outline-none focus:border-teal"
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div
          ref={errorRef}
          className="mt-3 rounded-md border border-coral/30 bg-coral/5 px-3 py-2 text-sm font-bold text-coral"
        >
          {error}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-teal px-5 py-2.5 text-sm font-black text-white disabled:opacity-60"
        >
          <Save className="h-4 w-4" /> {saving ? "Saving…" : series?.id ? "Save changes" : "Add series"}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className="rounded-md border border-slate-200 px-5 py-2.5 text-sm font-black text-slate-600">
          Cancel
        </button>
      </div>
    </form>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-lg font-black">{value}</div>
      <div className="text-xs font-semibold text-slate-500">{label}</div>
    </div>
  );
}

function Field({ label, value, onChange, list, required = false }) {
  return (
    <label className="block text-xs font-bold text-slate-500">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        list={list}
        required={required}
        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-teal"
      />
    </label>
  );
}

function ThemeGroupEditor({ group, words, onSave, onDelete }) {
  const [local, setLocal] = useState(group);
  useEffect(() => setLocal(group), [group]);

  const availableKeys = words.map((entry) => entryLocalKey(entry));

  function toggleWord(key) {
    const wordKeys = new Set(local.wordKeys || []);
    if (wordKeys.has(key)) wordKeys.delete(key);
    else wordKeys.add(key);
    setLocal({ ...local, wordKeys: [...wordKeys] });
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid flex-1 gap-3 md:grid-cols-4">
          <Field label="ID" value={local.id} onChange={(value) => setLocal({ ...local, id: value })} />
          <Field label="Label (EN)" value={local.label} onChange={(value) => setLocal({ ...local, label: value })} />
          <Field label="Label (中文)" value={local.labelZh} onChange={(value) => setLocal({ ...local, labelZh: value })} />
          <Field label="Emoji" value={local.emoji} onChange={(value) => setLocal({ ...local, emoji: value })} />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => onSave(local)} className="rounded-md bg-teal px-3 py-2 text-xs font-black text-white">Save</button>
          <button type="button" onClick={onDelete} className="rounded-md bg-coral/10 px-3 py-2 text-xs font-black text-coral"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">{local.hint}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {availableKeys.slice(0, 80).map((key) => {
          const active = (local.wordKeys || []).includes(key);
          const [lesson, word] = key.split("|");
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleWord(key)}
              className={cx(
                "rounded-full px-2 py-1 text-[11px] font-bold transition",
                active ? "bg-teal text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
              title={key}
            >
              {word} <span className="opacity-70">({lesson})</span>
            </button>
          );
        })}
        {availableKeys.length > 80 && <span className="text-xs text-slate-400">+{availableKeys.length - 80} more — filter words tab to manage</span>}
      </div>
    </div>
  );
}
