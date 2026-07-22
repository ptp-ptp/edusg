import React, { useEffect, useState } from "react";
import { BookOpenText, Languages, MessageCircle, PenLine, Sparkles } from "lucide-react";
import { chineseCurriculum } from "../../curriculum.js";
import { getP1TopicByLabel, getP1TopicClusters } from "../../data/chinese/index.js";
import { cx } from "../../lib/api.js";

function MiniInfo({ title, value }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="text-xs font-black uppercase tracking-wide text-slate-400">{title}</div>
      <div className="mt-1 text-sm font-bold leading-5 text-slate-700">{value}</div>
    </div>
  );
}

function ChineseTrackCard({ icon: Icon, title, items, onItemClick, activeItem }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-md bg-cloud text-teal">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="font-black">{title}</h3>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {items.map((item) => {
          const label = typeof item === "string" ? item : item.label;
          const key = typeof item === "string" ? item : item.id || item.label;
          const clickable = Boolean(onItemClick);
          const active = activeItem && (activeItem === key || activeItem === label);
          const className = cx(
            "rounded-md border px-2 py-1 text-xs font-semibold leading-5 transition",
            clickable
              ? active
                ? "border-coral bg-coral text-white"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-coral hover:bg-coral/5 hover:text-coral"
              : "border-slate-200 bg-slate-50 text-slate-600"
          );

          if (!clickable) {
            return (
              <span key={key} className={className}>
                {label}
              </span>
            );
          }

          return (
            <button
              key={key}
              type="button"
              onClick={() => onItemClick(item)}
              className={className}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ChineseRoadmap({
  grade,
  embedded = false,
  pathway: controlledPathway,
  onPathwayChange,
  hidePathwayPicker = false,
  onTopicSelect,
  activeTopicId
}) {
  const [internalPathway, setInternalPathway] = useState("chinese");
  const pathway = controlledPathway ?? internalPathway;
  const setPathway = onPathwayChange ?? setInternalPathway;
  const selected = chineseCurriculum[grade];
  const pathwayOptions = selected.pathways;
  const currentPathway = pathwayOptions[pathway] ? pathway : "chinese";
  const detail = pathwayOptions[currentPathway];
  const isP1 = grade === "P1";
  const topicItems = isP1
    ? getP1TopicClusters().map((topic) => ({
        id: topic.id,
        label: topic.label,
        labelZh: topic.labelZh
      }))
    : selected.topicClusters;

  function handleTopicClick(item) {
    if (!onTopicSelect) return;
    const topic =
      typeof item === "string" ? getP1TopicByLabel(item) : getP1TopicClusters().find((entry) => entry.id === item.id);
    if (topic) onTopicSelect(topic);
  }

  useEffect(() => {
    if (!pathwayOptions[pathway]) {
      setPathway("chinese");
    }
  }, [grade, pathway, pathwayOptions, setPathway]);

  useEffect(() => {
    if (controlledPathway == null) {
      setPathway("chinese");
    }
  }, [grade, controlledPathway, setPathway]);

  return (
    <div className={cx(!embedded && "rounded-lg border border-slate-200 bg-white p-5 shadow-sm", embedded && "p-0")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm font-black text-coral">MOE Primary Chinese Roadmap</div>
          <h2 className="mt-1 text-xl font-black">{grade} Chinese Language · 华文课程地图</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{selected.focus}</p>
        </div>
      </div>

      {!hidePathwayPicker && (
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(pathwayOptions).map(([id, option]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPathway(id)}
              className={cx(
                "rounded-md border px-3 py-2 text-sm font-black transition",
                currentPathway === id
                  ? "border-coral bg-coral text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-coral"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-3 xl:grid-cols-[1fr_1.1fr]">
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-md bg-red-50 text-coral">
              <Languages className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-black">{detail.label}</h3>
              <p className="text-sm text-slate-500">{selected.stage}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MiniInfo title="Weekly time" value={detail.hours} />
            <MiniInfo title="Characters" value={detail.characters} />
          </div>
          <div className="mt-4 rounded-md bg-slate-50 p-4">
            <div className="font-black text-teal">Stage focus</div>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
              {detail.focus.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ChineseTrackCard
            icon={BookOpenText}
            title="Topic clusters"
            items={topicItems}
            onItemClick={isP1 && onTopicSelect ? handleTopicClick : undefined}
            activeItem={activeTopicId}
          />
          {isP1 && onTopicSelect && (
            <p className="col-span-full -mt-1 text-xs font-semibold text-slate-500 sm:col-span-2">
              Tap a topic to browse words from your selected 1A / 1B lists.
            </p>
          )}
          <ChineseTrackCard icon={MessageCircle} title="Classroom tasks" items={selected.tasks} />
          <ChineseTrackCard icon={PenLine} title="Assessment ideas" items={selected.assessment} />
          <ChineseTrackCard icon={Sparkles} title="Culture and ICT" items={selected.enrichment} />
        </div>
      </div>

      <div className="mt-4 rounded-md border border-teal/20 bg-teal/5 p-4 text-sm leading-6 text-slate-600">
        <span className="font-black text-teal">Source note:</span> Structured from MOE Singapore Primary Chinese
        Syllabus 2024. The syllabus is arranged by stages, pathways and skill outcomes, so EduSG turns those
        outcomes into level-ready planning tracks.
      </div>
    </div>
  );
}
