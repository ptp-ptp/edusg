import React, { useMemo, useState } from "react";
import {
  BookOpenText,
  Brain,
  Check,
  ChevronRight,
  Lock,
  Sparkles,
  Star,
  Target,
  Trophy,
  X
} from "lucide-react";
import { englishCurriculum } from "./curriculum";
import { getEnglishLesson } from "./data/english";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function normalizeAnswer(value) {
  return String(value || "").trim().toLowerCase().replace(/,/g, "").replace(/\s+/g, "");
}

const practiceModes = [
  { id: "smart", label: "Smart Practice", hint: "Adaptive daily drill" },
  { id: "topic", label: "Topic Focus", hint: "One topic at a time" },
  { id: "mixed", label: "Mixed Review", hint: "Completed lessons" },
  { id: "weak", label: "Weak Spot", hint: "Below 60% mastery" },
  { id: "psle", label: "PSLE Simulator", hint: "P5–P6 exam prep" }
];

const gameCatalog = [
  { id: "word-quest", name: "Word Quest", emoji: "⚔️", skill: "Spelling & phonics", unlockLevel: 1, island: "Reading" },
  { id: "grammar-ninja", name: "Grammar Ninja", emoji: "🥷", skill: "Grammar dodge", unlockLevel: 2, island: "Language Use" },
  { id: "sentence-scramble", name: "Sentence Scramble", emoji: "🧩", skill: "Word order", unlockLevel: 2, island: "Writing" },
  { id: "vocab-match", name: "Vocab Match", emoji: "🃏", skill: "Word meanings", unlockLevel: 3, island: "Reading" },
  { id: "spelling-bee", name: "Spelling Bee", emoji: "🐝", skill: "Fast spelling", unlockLevel: 3, island: "Listening" },
  { id: "story-builder", name: "Story Builder", emoji: "📖", skill: "Creative writing", unlockLevel: 4, island: "Writing" },
  { id: "comprehension-castle", name: "Comprehension Castle", emoji: "🏰", skill: "Reading MCQ", unlockLevel: 5, island: "Reading" },
  { id: "edit-escape", name: "Edit the Escape", emoji: "🔓", skill: "Editing", unlockLevel: 6, island: "Language Use" },
  { id: "psle-boss", name: "PSLE Boss Battle", emoji: "👹", skill: "Mixed revision", unlockLevel: 8, island: "Champion" }
];

function EnglishRoadmap({ grade, setGrade, progress, onSelectTopic, embedded = false }) {
  const selected = englishCurriculum[grade];

  return (
    <div className={cx(embedded ? "" : "rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-5")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-black">MOE English Roadmap</h2>
          <p className="mt-1 text-sm font-bold text-blue-600">{selected.tagline}</p>
          <p className="mt-1 hidden max-w-3xl text-sm text-slate-500 md:block">{selected.focus}</p>
        </div>
        <div className="grade-picker-scroll w-full max-w-full rounded-lg border border-slate-200 bg-slate-50 p-1 sm:w-auto sm:max-w-none">
          {Object.keys(englishCurriculum).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setGrade(level)}
              className={cx(
                "shrink-0 rounded-md px-3 py-2 text-sm font-black",
                grade === level ? "bg-blue-500 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
              )}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-2">
        {selected.strands.map((strand) => (
          <div key={strand.name} className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-md bg-blue-50 text-blue-600">
                <BookOpenText className="h-5 w-5" />
              </div>
              <h3 className="font-black">{strand.name}</h3>
            </div>
            <div className="mt-4 space-y-2">
              {strand.topics.map((topic) => {
                const lessonKey = `${grade}|${topic.name}`;
                const completed = (progress.completedLessons || []).includes(lessonKey);
                const mastery = progress.topicMastery?.[topic.name] || 0;
                return (
                  <button
                    key={topic.name}
                    onClick={() => onSelectTopic(topic.name)}
                    className="flex w-full items-center justify-between rounded-md bg-slate-50 p-3 text-left transition hover:bg-blue-50"
                  >
                    <div>
                      <div className="font-bold text-slate-800">{topic.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{topic.skills.slice(0, 2).join(" · ")}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {completed && <Check className="h-4 w-4 text-leaf" />}
                      <span className="text-xs font-black text-blue-600">{mastery}%</span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 hidden rounded-lg border border-blue-100 bg-blue-50 p-4 md:block">
        <div className="font-black text-blue-700">Kid mission</div>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Pick one topic, complete the fun lesson, then jump to Practice. Ollie the Owl says: small steps every day make you an English champion!
        </p>
      </div>
    </div>
  );
}

function CollapsibleSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-black text-blue-600"
      >
        {title}
        <ChevronRight className={cx("h-4 w-4 transition", open && "rotate-90")} />
      </button>
      {open && <div className="border-t border-slate-200">{children}</div>}
    </div>
  );
}

function EnglishLessonCard({ grade, topic, progress, onComplete }) {
  const lesson = getEnglishLesson(grade, topic);
  const [slideIndex, setSlideIndex] = useState(0);
  const [tryIndex, setTryIndex] = useState(0);
  const [tryAnswer, setTryAnswer] = useState("");
  const [tryFeedback, setTryFeedback] = useState(null);
  const [missionDone, setMissionDone] = useState(false);
  const lessonKey = `${grade}|${topic}`;
  const completed = (progress.completedLessons || []).includes(lessonKey);
  const currentTry = lesson.tryIt[tryIndex];

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
    await onComplete(lessonKey);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black uppercase tracking-wide text-blue-500">Fun Lesson</div>
          <h3 className="mt-1 text-2xl font-black">{topic}</h3>
          <p className="mt-1 text-sm text-slate-500">{grade} · {progress.titleRank || "Word Explorer"}</p>
        </div>
        {completed && (
          <span className="rounded-md bg-green-50 px-3 py-2 text-sm font-black text-leaf">Lesson complete</span>
        )}
      </div>

      <div className="mt-5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 p-5 text-white">
        <div className="text-3xl">{lesson.hook.emoji}</div>
        <h4 className="mt-2 text-xl font-black">{lesson.hook.title}</h4>
        <p className="mt-2 text-sm font-semibold text-white/90">{lesson.hook.body}</p>
      </div>

      <div className="mt-5">
        <div className="text-xs font-black uppercase tracking-wide text-slate-400">Teach · {slideIndex + 1} / {lesson.teach.length}</div>
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h4 className="font-black">{lesson.teach[slideIndex].title}</h4>
          <p className="mt-2 text-sm leading-6 text-slate-600">{lesson.teach[slideIndex].body}</p>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            disabled={slideIndex === 0}
            onClick={() => setSlideIndex((value) => value - 1)}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-black disabled:opacity-40"
          >
            Back
          </button>
          <button
            onClick={() => setSlideIndex((value) => Math.min(value + 1, lesson.teach.length - 1))}
            className="rounded-md bg-blue-500 px-4 py-2 text-sm font-black text-white"
          >
            {slideIndex < lesson.teach.length - 1 ? "Next slide" : "Start Try it"}
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 p-4">
        <div className="font-black">Try it · {tryIndex + 1} / {lesson.tryIt.length}</div>
        <p className="mt-3 font-bold">{currentTry?.prompt}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {currentTry?.options.map((option) => (
            <button
              key={option}
              onClick={() => setTryAnswer(option)}
              className={cx(
                "rounded-lg border px-4 py-3 text-left font-bold",
                tryAnswer === option ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 hover:border-blue-300"
              )}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={checkTry} disabled={!tryAnswer} className="rounded-md bg-blue-500 px-4 py-2 text-sm font-black text-white disabled:opacity-40">
            Check
          </button>
          {tryFeedback && tryIndex < lesson.tryIt.length - 1 && (
            <button onClick={nextTry} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-black">
              Next try
            </button>
          )}
        </div>
        {tryFeedback && (
          <div className={cx("mt-3 rounded-lg border p-3 text-sm", tryFeedback.correct ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50")}>
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
          onClick={finishLesson}
          disabled={missionDone || completed}
          className="mt-3 rounded-md bg-amber-500 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
        >
          {completed ? "Mission completed" : missionDone ? "Saving..." : "I did my mission!"}
        </button>
      </div>
    </div>
  );
}

function EnglishLevelProgress({ progress }) {
  const level = progress.adaptiveLevel || 1;
  const toNext = 3 - (progress.correctStreak || 0);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-black uppercase tracking-wide text-slate-400">Adaptive level</div>
          <div className="mt-1 text-3xl font-black text-blue-600">Level {level}</div>
          <div className="mt-1 text-sm font-bold text-slate-600">{progress.titleRank || "Word Explorer"}</div>
        </div>
        <div className="grid h-16 w-16 place-items-center rounded-full bg-blue-50 text-2xl font-black text-blue-600">
          {level}
        </div>
      </div>
      <div className="mt-4 h-2 rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${level * 10}%` }} />
      </div>
      <p className="mt-3 text-sm text-slate-500">
        {level < 10 ? `${Math.max(toNext, 0)} more correct in a row to level up!` : "English Champion — max level reached!"}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm">
        <div className="rounded-md bg-slate-50 p-2">
          <div className="font-black">{progress.correct || 0}/{progress.answered || 0}</div>
          <div className="text-xs text-slate-500">Correct</div>
        </div>
        <div className="rounded-md bg-slate-50 p-2">
          <div className="font-black">{progress.starsEarnedWeek || 0}</div>
          <div className="text-xs text-slate-500">Stars this week</div>
        </div>
      </div>
    </div>
  );
}

function EnglishQuestionPanel({ question, answer, setAnswer, feedback, onSubmit, onNext, label }) {
  if (!question) {
    return <div className="rounded-lg border border-slate-200 p-5 text-sm font-semibold text-slate-500">No questions in this set yet. Try another topic or grade.</div>;
  }

  return (
    <div className="rounded-lg border border-slate-200 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black text-blue-600">{question.topic}</div>
          <h3 className="mt-2 text-xl font-black">{label || "Practice question"}</h3>
        </div>
        <span className="rounded-md bg-cloud px-3 py-2 text-sm font-black text-blue-600">Level {question.level}</span>
      </div>
      <div className="mt-6 text-xl font-black leading-8">{question.prompt}</div>
      <p className="mt-3 text-sm text-slate-500">{question.helpText}</p>

      {question.type === "multiple" && question.options?.length ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {question.options.map((option, optionIndex) => (
            <button
              key={`${question.id}-${option}`}
              onClick={() => setAnswer(option)}
              className={cx(
                "flex min-h-14 items-center gap-3 rounded-lg border px-4 py-3 text-left font-bold",
                answer === option ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 hover:border-blue-300"
              )}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cloud text-sm text-slate-500">
                {String.fromCharCode(65 + optionIndex)}
              </span>
              <span>{option}</span>
            </button>
          ))}
        </div>
      ) : (
        <input
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          className="mt-6 w-full rounded-lg border border-slate-200 px-4 py-4 text-lg font-bold outline-none focus:border-blue-500"
          placeholder="Type your answer"
        />
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button onClick={onSubmit} disabled={!answer} className="rounded-md bg-blue-500 px-6 py-3 font-black text-white disabled:opacity-40">
          Check Answer
        </button>
        <button onClick={onNext} className="rounded-md border border-slate-200 px-6 py-3 font-black text-slate-700">
          Next
        </button>
      </div>

      {feedback && (
        <div className={cx("mt-5 rounded-lg border p-4", feedback.correct ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50")}>
          <div className="flex items-center gap-2 font-black">
            {feedback.correct ? <><Sparkles className="h-4 w-4 text-leaf" /> Ollie says: Brilliant!</> : "Not yet — try the hint!"}
          </div>
          <p className="mt-2 text-sm text-slate-600">{feedback.correct ? feedback.explanation : feedback.hint || feedback.explanation}</p>
          {feedback.levelUp && <p className="mt-2 text-sm font-black text-blue-600">Level up! You are now Level {feedback.newLevel}.</p>}
        </div>
      )}
    </div>
  );
}

function EnglishGameHub({ progress, questions, onPlayGame, activeGame }) {
  const unlocked = new Set(progress.unlockedGames || ["word-quest"]);
  const islands = ["Listening", "Reading", "Writing", "Language Use", "Champion"];

  if (activeGame) {
    return (
      <EnglishMiniGame
        gameId={activeGame}
        progress={progress}
        questions={questions}
        onExit={() => onPlayGame(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-indigo-700">Daily challenge</div>
            <p className="mt-1 text-sm text-slate-600">Play Word Quest today for 2× stars!</p>
          </div>
          <button onClick={() => onPlayGame("word-quest")} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-black text-white">
            Play now
          </button>
        </div>
      </div>

      {islands.map((island) => (
        <div key={island}>
          <h3 className="mb-3 font-black text-slate-700">{island} Island</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {gameCatalog
              .filter((game) => game.island === island)
              .map((game) => {
                const isUnlocked = unlocked.has(game.id) && progress.adaptiveLevel >= game.unlockLevel;
                return (
                  <button
                    key={game.id}
                    disabled={!isUnlocked}
                    onClick={() => onPlayGame(game.id)}
                    className={cx(
                      "rounded-lg border p-4 text-left transition",
                      isUnlocked ? "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm" : "border-slate-100 bg-slate-50 opacity-70"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{game.emoji}</span>
                      {!isUnlocked && <Lock className="h-4 w-4 text-slate-400" />}
                    </div>
                    <h4 className="mt-3 font-black">{game.name}</h4>
                    <p className="mt-1 text-xs text-slate-500">{game.skill}</p>
                    <p className="mt-2 text-xs font-bold text-indigo-600">
                      {isUnlocked ? "Ready to play" : `Reach Level ${game.unlockLevel} to unlock`}
                    </p>
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

function EnglishMiniGame({ gameId, progress, questions, onExit }) {
  const gameMeta = gameCatalog.find((game) => game.id === gameId) || gameCatalog[0];
  const gameQuestions = useMemo(() => {
    const topics = {
      "word-quest": ["Inference & Vocabulary", "Prepositions & Conjunctions"],
      "grammar-ninja": ["Editing", "Subject-Verb Agreement"],
      "sentence-scramble": ["Subject-Verb Agreement", "Synthesis Basics"]
    };
  const pool = questions.filter(
      (question) => question.track === "Game" || (topics[gameId] || []).includes(question.topic)
    );
    return pool.length ? pool.slice(0, 10) : questions.slice(0, 10);
  }, [questions, gameId]);

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const current = gameQuestions[index % Math.max(gameQuestions.length, 1)];

  function submit() {
    if (!current || !answer || feedback) return;
    const accepted = [current.answer, ...(current.acceptedAnswers || [])].map(normalizeAnswer);
    const correct = accepted.includes(normalizeAnswer(answer));
    const points = correct ? 10 + streak * 2 : 0;
    setScore((value) => value + points);
    setStreak((value) => (correct ? value + 1 : 0));
    setFeedback({ correct, answer: current.answer, points });
  }

  function next() {
    setIndex((value) => (value + 1) % Math.max(gameQuestions.length, 1));
    setAnswer("");
    setFeedback(null);
  }

  const gameTitles = {
    "word-quest": "Word Quest",
    "grammar-ninja": "Grammar Ninja",
    "sentence-scramble": "Sentence Scramble Race"
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
      <div className="rounded-lg border border-slate-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-black text-indigo-600">{gameTitles[gameId] || gameMeta.name}</div>
            <h3 className="mt-1 text-2xl font-black">{current?.topic || "English"}</h3>
          </div>
          <button onClick={onExit} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-black">Exit</button>
        </div>
        {current ? (
          <>
            <div className="mt-5 rounded-lg bg-indigo-50 p-5 text-lg font-black leading-8">{current.prompt}</div>
            {current.type === "multiple" ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {current.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => setAnswer(option)}
                    className={cx("rounded-lg border px-4 py-3 text-left font-bold", answer === option ? "border-indigo-500 bg-indigo-50" : "border-slate-200")}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <input
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                className="mt-4 w-full rounded-lg border border-slate-200 px-4 py-3 text-lg font-bold"
                placeholder="Your answer"
              />
            )}
            <div className="mt-4 flex gap-2">
              <button onClick={submit} disabled={!answer || feedback} className="rounded-md bg-indigo-600 px-5 py-2 font-black text-white disabled:opacity-40">
                Lock in
              </button>
              <button onClick={next} className="rounded-md border border-slate-200 px-5 py-2 font-black">Next</button>
            </div>
            {feedback && (
              <div className={cx("mt-4 rounded-lg border p-3", feedback.correct ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50")}>
                <div className="font-black">{feedback.correct ? `+${feedback.points} points!` : `Answer: ${feedback.answer}`}</div>
              </div>
            )}
          </>
        ) : (
          <p className="mt-4 text-slate-500">Add more English questions to play this game.</p>
        )}
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
        <div className="text-3xl">{gameMeta.emoji}</div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-md bg-white p-3">
            <div className="text-xl font-black">{score}</div>
            <div className="text-xs text-slate-500">Score</div>
          </div>
          <div className="rounded-md bg-white p-3">
            <div className="text-xl font-black">{streak}</div>
            <div className="text-xs text-slate-500">Streak</div>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-500">Round {(index % Math.max(gameQuestions.length, 1)) + 1} of {Math.max(gameQuestions.length, 1)}</p>
        <p className="mt-2 text-xs text-slate-400">Level {progress.adaptiveLevel} · {progress.titleRank}</p>
      </div>
    </div>
  );
}

export default function EnglishLearningPractice({
  questions,
  progress,
  studentId,
  onProgressUpdate,
  mode,
  setMode,
  grade,
  setGrade,
  practiceGrade,
  setPracticeGrade,
  practiceMode,
  setPracticeMode,
  selectedTopic,
  setSelectedTopic,
  selectedLessonTopic,
  setSelectedLessonTopic,
  onSubmitAnswer,
  mobileView = "full"
}) {
  const [practiceAnswer, setPracticeAnswer] = useState("");
  const [practiceFeedback, setPracticeFeedback] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [activeGame, setActiveGame] = useState(null);
  const [loadingQuestion, setLoadingQuestion] = useState(false);

  const topicGroups = useMemo(() => {
    const grouped = questions
      .filter((question) => question.grade === practiceGrade)
      .reduce((items, question) => {
        const topic = question.topic || "General";
        if (!items[topic]) items[topic] = { topic, count: 0, levels: [] };
        items[topic].count += 1;
        items[topic].levels.push(Number(question.level || 1));
        return items;
      }, {});
    return Object.values(grouped).map((group) => ({
      ...group,
      minLevel: Math.min(...group.levels),
      maxLevel: Math.max(...group.levels)
    }));
  }, [questions, practiceGrade]);

  const activeTopic = selectedTopic || topicGroups[0]?.topic || "";
  const questionCount = questions.filter((question) => question.grade === practiceGrade).length;
  const isPracticeOpen = mode === "practice";

  async function loadPracticeQuestion(topicOverride) {
    if (!studentId) return;
    setLoadingQuestion(true);
    try {
      const params = new URLSearchParams({
        mode: practiceMode,
        grade: practiceGrade
      });
      const topic = topicOverride || (practiceMode === "topic" ? activeTopic : "");
      if (topic) params.set("topic", topic);
      const result = await fetch(`${import.meta.env.VITE_API_BASE || "/api"}/english/question/${studentId}?${params}`);
      const data = await result.json();
      setCurrentQuestion(data.question);
      if (data.progress) onProgressUpdate(data.progress);
    } catch {
      const fallback = questions.find(
        (question) => question.grade === practiceGrade && (!activeTopic || question.topic === activeTopic)
      );
      setCurrentQuestion(fallback || questions[0] || null);
    } finally {
      setLoadingQuestion(false);
    }
  }

  async function submitPracticeAnswer() {
    if (!currentQuestion || !practiceAnswer) return;
    const prevLevel = progress.adaptiveLevel;
    const result = await onSubmitAnswer({
      questionId: currentQuestion.id,
      answer: practiceAnswer,
      mode: practiceMode,
      grade: practiceGrade,
      topic: practiceMode === "topic" ? activeTopic : undefined
    });
    setPracticeFeedback({
      correct: result.isCorrect,
      explanation: result.explanation,
      hint: result.hint,
      levelUp: result.progress.adaptiveLevel > prevLevel,
      newLevel: result.progress.adaptiveLevel
    });
    if (result.nextQuestion) setCurrentQuestion(result.nextQuestion);
  }

  function openPractice() {
    setMode("practice");
    setPracticeAnswer("");
    setPracticeFeedback(null);
    loadPracticeQuestion();
  }

  async function completeLesson(lessonKey) {
    const response = await fetch(`${import.meta.env.VITE_API_BASE || "/api"}/english/lesson-complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, lessonKey })
    });
    const data = await response.json();
    onProgressUpdate(data.progress);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500 px-4 py-4 text-white md:px-5 md:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-black uppercase tracking-wide text-white/80 md:text-sm">English Studio</div>
            <h2 className="mt-1 text-xl font-black md:text-2xl">Learn, practise, play</h2>
            <p className="mt-2 hidden max-w-2xl text-sm font-semibold text-white/90 md:block">
              Grade-by-grade topics, adaptive practice with Ollie the Owl, and unlockable word games.
            </p>
          </div>
          <div className="grade-picker-scroll w-full max-w-full md:w-auto md:max-w-none">
            <div className="flex gap-2">
              <div className="shrink-0 rounded-lg bg-white/20 px-3 py-2 text-center backdrop-blur">
                <div className="text-lg font-black md:text-2xl">{questionCount}</div>
                <div className="text-[10px] font-bold md:text-xs">Questions</div>
              </div>
              <div className="shrink-0 rounded-lg bg-white/20 px-3 py-2 text-center backdrop-blur">
                <div className="text-lg font-black md:text-2xl">{(progress.completedLessons || []).length}</div>
                <div className="text-[10px] font-bold md:text-xs">Lessons</div>
              </div>
              <div className="shrink-0 rounded-lg bg-white/20 px-3 py-2 text-center backdrop-blur">
                <div className="text-lg font-black md:text-2xl">{progress.adaptiveLevel || 1}</div>
                <div className="text-[10px] font-bold md:text-xs">Level</div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-1 rounded-lg bg-white/20 p-1 md:mt-5 md:gap-2">
          {[
            ["learn", BookOpenText],
            ["practice", Target],
            ["game", Trophy]
          ].map(([option, Icon]) => (
            <button
              key={option}
              onClick={() => {
                setMode(option);
                if (option === "practice") openPractice();
              }}
              className={cx("flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-black capitalize", mode === option ? "bg-white text-blue-600" : "text-white")}
            >
              <Icon className="h-4 w-4" />
              {option}
            </button>
          ))}
        </div>
      </div>

      {mode === "learn" && (
        <div className="space-y-4 p-4 md:p-5">
          {mobileView === "learn" ? (
            <>
              <div className="lg:hidden">
                <CollapsibleSection title="Show MOE English roadmap">
                  <EnglishRoadmap
                    grade={grade}
                    setGrade={setGrade}
                    progress={progress}
                    onSelectTopic={(topic) => setSelectedLessonTopic(topic)}
                    embedded
                  />
                </CollapsibleSection>
              </div>
              <div className="hidden lg:block">
                <EnglishRoadmap
                  grade={grade}
                  setGrade={setGrade}
                  progress={progress}
                  onSelectTopic={(topic) => setSelectedLessonTopic(topic)}
                />
              </div>
            </>
          ) : (
            <EnglishRoadmap
              grade={grade}
              setGrade={setGrade}
              progress={progress}
              onSelectTopic={(topic) => setSelectedLessonTopic(topic)}
            />
          )}
          <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
            {selectedLessonTopic ? (
              <EnglishLessonCard
                grade={grade}
                topic={selectedLessonTopic}
                progress={progress}
                onComplete={completeLesson}
              />
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-slate-500">
                <Brain className="mx-auto h-10 w-10 text-blue-300" />
                <p className="mt-3 font-bold">Pick a topic above to start a fun lesson!</p>
              </div>
            )}
            <div className="hidden lg:block">
              <EnglishLevelProgress progress={progress} />
            </div>
          </div>
        </div>
      )}

      {isPracticeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-3 backdrop-blur-sm md:p-6">
          <div className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-blue-600">English Practice</div>
                <h2 className="mt-1 text-2xl font-black">{practiceGrade} · {practiceModes.find((item) => item.id === practiceMode)?.label}</h2>
              </div>
              <button
                onClick={() => setMode("learn")}
                className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 text-slate-600 hover:border-blue-500 hover:text-blue-600"
                aria-label="Close practice"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 overflow-hidden xl:grid-cols-[320px_1fr]">
              <aside className="min-h-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-4">
                <label className="text-sm font-black text-slate-600">Grade</label>
                <div className="grade-picker-scroll mt-2 rounded-lg border border-slate-200 bg-white p-1">
                  {["P1", "P2", "P3", "P4", "P5", "P6"].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => {
                        setPracticeGrade(level);
                        setSelectedTopic("");
                        loadPracticeQuestion();
                      }}
                      className={cx(
                        "shrink-0 rounded-md px-3 py-2 text-xs font-black",
                        practiceGrade === level ? "bg-blue-500 text-white" : "bg-slate-50 text-slate-600"
                      )}
                    >
                      {level}
                    </button>
                  ))}
                </div>

                <label className="mt-5 block text-sm font-black text-slate-600">Practice mode</label>
                <div className="mt-2 space-y-1">
                  {practiceModes.map((item) => {
                    const disabled = item.id === "psle" && !["P5", "P6"].includes(practiceGrade);
                    return (
                      <button
                        key={item.id}
                        disabled={disabled}
                        onClick={() => {
                          setPracticeMode(item.id);
                          loadPracticeQuestion();
                        }}
                        className={cx(
                          "w-full rounded-md px-3 py-2 text-left text-sm font-bold",
                          practiceMode === item.id ? "bg-blue-500 text-white" : "bg-white text-slate-600",
                          disabled && "opacity-40"
                        )}
                      >
                        <div>{item.label}</div>
                        <div className="text-xs font-normal opacity-80">{item.hint}</div>
                      </button>
                    );
                  })}
                </div>

                {practiceMode === "topic" && (
                  <>
                    <label className="mt-5 block text-sm font-black text-slate-600">Topic</label>
                    <div className="mt-2 space-y-1">
                      {topicGroups.map((group) => (
                        <button
                          key={group.topic}
                          onClick={() => {
                            setSelectedTopic(group.topic);
                            loadPracticeQuestion(group.topic);
                          }}
                          className={cx(
                            "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-bold",
                            activeTopic === group.topic ? "bg-white text-blue-600 shadow-sm" : "text-slate-600"
                          )}
                        >
                          <span>{group.topic}</span>
                          <span className="text-xs">{group.count}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <div className="mt-5">
                  <EnglishLevelProgress progress={progress} />
                </div>
              </aside>

              <div className="min-h-0 overflow-y-auto p-5">
                {loadingQuestion ? (
                  <div className="grid h-40 place-items-center text-slate-500">Loading question...</div>
                ) : (
                  <EnglishQuestionPanel
                    question={currentQuestion}
                    answer={practiceAnswer}
                    setAnswer={setPracticeAnswer}
                    feedback={practiceFeedback}
                    onSubmit={submitPracticeAnswer}
                    onNext={() => {
                      setPracticeAnswer("");
                      setPracticeFeedback(null);
                      loadPracticeQuestion();
                    }}
                    label={practiceModes.find((item) => item.id === practiceMode)?.label}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === "game" && (
        <div className="p-5">
          <EnglishGameHub
            progress={progress}
            questions={questions}
            activeGame={activeGame}
            onPlayGame={setActiveGame}
          />
        </div>
      )}
    </div>
  );
}
