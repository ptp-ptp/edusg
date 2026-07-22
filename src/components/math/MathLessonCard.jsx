import React, { useState } from "react";
import { Star, Target } from "lucide-react";
import { getMathLesson } from "../../data/math/index.js";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function MathLessonCard({ grade, topic, progress, onComplete, onStartQuiz }) {
  const lesson = getMathLesson(grade, topic);
  const [slideIndex, setSlideIndex] = useState(0);
  const [tryIndex, setTryIndex] = useState(0);
  const [tryAnswer, setTryAnswer] = useState("");
  const [tryFeedback, setTryFeedback] = useState(null);
  const [missionDone, setMissionDone] = useState(false);
  const lessonKey = `${grade}|${topic}`;
  const completed = (progress.completedLessons || []).includes(lessonKey);
  const currentTry = lesson.tryIt[tryIndex];
  const currentTeach = lesson.teach[slideIndex];
  const tryItComplete = tryFeedback?.correct && tryIndex >= lesson.tryIt.length - 1;

  function checkTry() {
    if (!currentTry || !tryAnswer) return;
    const correct = tryAnswer === currentTry.answer;
    setTryFeedback({ correct, answer: currentTry.answer, hint: currentTry.hint });
  }

  function nextTry() {
    if (tryIndex < lesson.tryIt.length - 1) {
      setTryIndex((value) => value + 1);
      setTryAnswer("");
      setTryFeedback(null);
    }
  }

  async function finishLesson() {
    setMissionDone(true);
    await onComplete?.(lessonKey);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black uppercase tracking-wide text-teal">Advance Lesson</div>
          <h3 className="mt-1 text-2xl font-black">{topic}</h3>
          <p className="mt-1 text-sm text-slate-500">{grade} · Olympiad track</p>
        </div>
        {completed && (
          <span className="rounded-md bg-green-50 px-3 py-2 text-sm font-black text-leaf">Lesson complete</span>
        )}
      </div>

      <div className="mt-5 rounded-lg bg-gradient-to-r from-ink via-teal to-leaf p-5 text-white">
        <div className="text-3xl">{lesson.hook.emoji}</div>
        <h4 className="mt-2 text-xl font-black">{lesson.hook.title}</h4>
        <p className="mt-2 text-sm font-semibold text-white/90">{lesson.hook.body}</p>
      </div>

      <div className="mt-5">
        <div className="text-xs font-black uppercase tracking-wide text-slate-400">
          Teach · {slideIndex + 1} / {lesson.teach.length}
        </div>
        {currentTeach?.diagram && (
          <img
            src={currentTeach.diagram}
            alt={currentTeach.title}
            className="mt-3 max-h-52 w-full rounded-lg border border-slate-200 bg-slate-50 object-contain p-2"
          />
        )}
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h4 className="font-black">{currentTeach?.title}</h4>
          <p className="mt-2 text-sm leading-6 text-slate-600">{currentTeach?.body}</p>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={slideIndex === 0}
            onClick={() => setSlideIndex((value) => value - 1)}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-black disabled:opacity-40"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => setSlideIndex((value) => Math.min(value + 1, lesson.teach.length - 1))}
            className="rounded-md bg-teal px-4 py-2 text-sm font-black text-white"
          >
            {slideIndex < lesson.teach.length - 1 ? "Next slide" : "Start Try it"}
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 p-4">
        <div className="font-black">Try it · {tryIndex + 1} / {lesson.tryIt.length}</div>
        {currentTry?.diagram && (
          <img
            src={currentTry.diagram}
            alt="Try it figure"
            className="mt-3 max-h-44 w-full rounded-lg border border-slate-200 bg-slate-50 object-contain p-2"
          />
        )}
        <p className="mt-3 font-bold">{currentTry?.prompt}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {currentTry?.options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTryAnswer(option)}
              className={cx(
                "rounded-lg border px-4 py-3 text-left font-bold",
                tryAnswer === option ? "border-teal bg-teal/10 text-teal" : "border-slate-200 hover:border-teal/50"
              )}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={checkTry}
            disabled={!tryAnswer}
            className="rounded-md bg-teal px-4 py-2 text-sm font-black text-white disabled:opacity-40"
          >
            Check
          </button>
          {tryFeedback?.correct && tryIndex < lesson.tryIt.length - 1 && (
            <button type="button" onClick={nextTry} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-black">
              Next try
            </button>
          )}
        </div>
        {tryFeedback && (
          <div
            className={cx(
              "mt-3 rounded-lg border p-3 text-sm",
              tryFeedback.correct ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"
            )}
          >
            {tryFeedback.correct ? "Great job!" : `Try again. Hint: ${tryFeedback.hint}`}
          </div>
        )}
      </div>

      <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-2 font-black text-amber-800">
          <Star className="h-4 w-4" /> Kid mission
        </div>
        <p className="mt-2 text-sm text-slate-700">{lesson.mission}</p>
        <button
          type="button"
          onClick={finishLesson}
          disabled={missionDone || completed || !tryItComplete}
          className="mt-3 rounded-md bg-amber-500 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
        >
          {completed ? "Mission completed" : missionDone ? "Saving..." : "I did my mission!"}
        </button>
        {!tryItComplete && (
          <p className="mt-2 text-xs font-semibold text-slate-500">Complete all Try it questions first.</p>
        )}
      </div>

      {(completed || tryItComplete) && (
        <button
          type="button"
          onClick={() => onStartQuiz?.(topic)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-teal px-4 py-4 font-black text-white shadow-lg shadow-teal/20"
        >
          <Target className="h-5 w-5" />
          {completed ? "Practise Quiz" : "Start Quiz"}
        </button>
      )}
    </div>
  );
}
