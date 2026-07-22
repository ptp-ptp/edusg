import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BarChart3,
  Bell,
  BookOpenText,
  Brain,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Database,
  Flame,
  FlaskConical,
  Gift,
  Home,
  Image,
  Languages,
  LayoutDashboard,
  LineChart,
  LogIn,
  Medal,
  Menu,
  MessageCircle,
  PenLine,
  Plus,
  Save,
  Send,
  Settings,
  ShieldCheck,
  Sigma,
  SlidersHorizontal,
  Sparkles,
  Star,
  Search,
  Target,
  Trophy,
  Upload,
  UserRoundCog,
  Users,
  WandSparkles,
  X,
  Zap
} from "lucide-react";
import ChineseVocabPractice from "./ChineseVocabPractice";
import { ChineseHeaderGrades, ChinesePathwayPicker } from "./components/chinese/ChineseGradePicker.jsx";
import { MathHeaderGrades } from "./components/math/MathGradePicker.jsx";
import MathLessonCard from "./components/math/MathLessonCard.jsx";
import { hasMathLesson, listMathLessonKeys } from "./data/math/index.js";
import { filterMathTopicGroups, isMoeMathTopic } from "./utils/mathTopics.js";
import EnglishLearningPractice from "./EnglishLearningPractice";
import ChineseRoadmap from "./components/chinese/ChineseRoadmap.jsx";
import GradePicker from "./components/shared/GradePicker.jsx";
import { mathCurriculum, scienceCurriculum } from "./curriculum";
import "./index.css";
import { useSession } from "./context/SessionContext.jsx";
import { useCelebration } from "./components/shared/Celebration.jsx";
import Ollie from "./components/shared/Ollie.jsx";
import StudentProfileModal from "./components/shared/StudentProfileModal.jsx";
import ChineseContentAdmin from "./components/admin/ChineseContentAdmin.jsx";
import { fetchJson, cx } from "./lib/api.js";
import { getCachedQuestions, getEnglishQuestions, getMathQuestions, getScienceQuestions, prefetchPracticeQuestions } from "./lib/questionStore.js";
import { buildChineseProgressView, pickChineseStrengthsAndFocus } from "./utils/chineseProgressStats.js";

const roleOptions = ["student", "parent", "admin"];

const guestStudent = { name: "Guest", grade: "P4", streak: 0, stars: 0, avatar: "G" };
const guestProgress = {
  adaptiveLevel: 1,
  topicMastery: {},
  completedLessons: [],
  correct: 0,
  answered: 0,
  correctStreak: 0,
  struggleStreak: 0,
  starsEarnedWeek: 0
};

const subjectMeta = {
  Math: { icon: Sigma, color: "bg-teal text-white" },
  Chinese: { icon: Languages, color: "bg-coral text-white" },
  English: { icon: BookOpenText, color: "bg-blue-500 text-white" },
  Science: { icon: FlaskConical, color: "bg-leaf text-white" }
};

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Math", icon: Sigma },
  { label: "Chinese", icon: Languages },
  { label: "English", icon: BookOpenText },
  { label: "Science", icon: FlaskConical },
  { label: "Achievements", icon: Trophy },
  { label: "Calendar", icon: CalendarDays },
  { label: "Rewards", icon: Gift },
  { label: "Settings", icon: Settings }
];

// cx and fetchJson from lib/api.js

function normalizeAnswer(value) {
  return String(value || "").trim().toLowerCase().replace(/,/g, "").replace(/\s+/g, "");
}

function subjectFromParam(param) {
  if (!param) return "Math";
  const label = param.charAt(0).toUpperCase() + param.slice(1);
  return subjectMeta[label] ? label : "Math";
}

export function StudentLearningApp() {
  const { session, setSession, role, login, loading: sessionLoading, openLogin } = useSession();
  const { celebrateAnswerResult } = useCelebration();
  const navigate = useNavigate();
  const { subject: subjectParam } = useParams();
  const [question, setQuestion] = useState(null);
  const initialMathQuestions = getCachedQuestions("Math") || [];
  const initialScienceQuestions = getCachedQuestions("Science", "P4") || [];
  const initialEnglishQuestions = getCachedQuestions("English") || [];
  const [mathQuestions, setMathQuestions] = useState(initialMathQuestions);
  const [scienceQuestions, setScienceQuestions] = useState(initialScienceQuestions);
  const [englishQuestions, setEnglishQuestions] = useState(initialEnglishQuestions);
  const [englishMode, setEnglishMode] = useState("learn");
  const [englishPracticeGrade, setEnglishPracticeGrade] = useState("P4");
  const [englishPracticeMode, setEnglishPracticeMode] = useState("smart");
  const [englishPracticeTopic, setEnglishPracticeTopic] = useState("");
  const [englishLessonTopic, setEnglishLessonTopic] = useState("");
  const [selectedMasteryTopic, setSelectedMasteryTopic] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [scienceAnswer, setScienceAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [scienceFeedback, setScienceFeedback] = useState(null);
  const [activeSubject, setActiveSubject] = useState(() => subjectFromParam(subjectParam));
  const [curriculumGrade, setCurriculumGrade] = useState("P4");
  const [mathMode, setMathMode] = useState("learn");
  const [mathPracticeGrade, setMathPracticeGrade] = useState("P4");
  const [mathPracticeTopic, setMathPracticeTopic] = useState("");
  const [mathPracticeLevels, setMathPracticeLevels] = useState(Array.from({ length: 10 }, (_, index) => index + 1));
  const [mathPracticeIndex, setMathPracticeIndex] = useState(0);
  const [mathPracticeAnswer, setMathPracticeAnswer] = useState("");
  const [mathPracticeFeedback, setMathPracticeFeedback] = useState(null);
  const [scienceMode, setScienceMode] = useState("learn");
  const [scienceIndex, setScienceIndex] = useState(0);
  const [chineseP1Tiers, setChineseP1Tiers] = useState(["P1A"]);
  const [chinesePathway, setChinesePathway] = useState("chinese");
  const [messageText, setMessageText] = useState("");
  const [guestMathProgress, setGuestMathProgress] = useState(guestProgress);
  const mathLoadedRef = useRef(initialMathQuestions.length > 0);
  const scienceLoadedRef = useRef(initialScienceQuestions.length > 0);
  const englishLoadedRef = useRef(initialEnglishQuestions.length > 0);

  const isGuest = !session;
  const student = session?.student || guestStudent;
  const progress = session?.progress || guestMathProgress;
  const user = session?.user;
  const messages = session?.messages || [];

  function goToLogin() {
    openLogin();
  }

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState("learn");
  const [mountedSubjects, setMountedSubjects] = useState(() => ({ [subjectFromParam(subjectParam)]: true }));

  function handleMathGradeChange(grade) {
    setCurriculumGrade(grade);
    setMathPracticeGrade(grade);
    setMathPracticeTopic("");
    setMathPracticeIndex(0);
    setMathPracticeAnswer("");
    setMathPracticeFeedback(null);
  }

  useEffect(() => {
    if (subjectParam) {
      const label = subjectFromParam(subjectParam);
      setActiveSubject(label);
      setMountedSubjects((current) => (current[label] ? current : { ...current, [label]: true }));
      setMobileTab("learn");
    }
  }, [subjectParam]);

  useEffect(() => {
    if (!session?.student?.id || question) return;
    fetchJson(`/question/${session.student.id}`)
      .then(setQuestion)
      .catch(() => {});
  }, [session?.student?.id, question]);

  useEffect(() => {
    prefetchPracticeQuestions();
    if (subjectFromParam(subjectParam) === "Math" || mountedSubjects.Math) {
      loadMathQuestions();
    }
  }, []);

  useEffect(() => {
    setMountedSubjects((current) => (current[activeSubject] ? current : { ...current, [activeSubject]: true }));
    if (activeSubject === "Math") loadMathQuestions();
    if (activeSubject === "Science") loadScienceQuestions();
    if (activeSubject === "English") loadEnglishQuestions();
  }, [activeSubject]);

  async function loadEnglishQuestions() {
    if (englishLoadedRef.current) return;
    try {
      const questions = await getEnglishQuestions();
      englishLoadedRef.current = true;
      setEnglishQuestions(questions);
    } catch {
      // keep UI usable with empty bank
    }
  }

  async function loadScienceQuestions() {
    if (scienceLoadedRef.current) return;
    try {
      const questions = await getScienceQuestions("P4");
      scienceLoadedRef.current = true;
      setScienceQuestions(questions);
    } catch {
      // keep UI usable with empty bank
    }
  }

  async function loadMathQuestions() {
    if (mathLoadedRef.current) return;
    try {
      const questions = await getMathQuestions();
      mathLoadedRef.current = true;
      setMathQuestions(questions);
    } catch {
      // keep UI usable with empty bank
    }
  }

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileNavOpen]);

  function submitScienceAnswer() {
    const current = scienceQuestions[scienceIndex];
    if (!current || !scienceAnswer) return;
    if (!session?.student?.id) {
      const accepted = [current.answer, ...(current.acceptedAnswers || [])].map(normalizeAnswer);
      const correct = accepted.includes(normalizeAnswer(scienceAnswer));
      setScienceFeedback({ correct, explanation: current.explanation, hint: current.hint });
      celebrateAnswerResult({ isCorrect: correct }, { subject: "Science" });
      return;
    }
    fetchJson("/science/answer", {
      method: "POST",
      body: JSON.stringify({
        studentId: session.student.id,
        questionId: current.id,
        answer: scienceAnswer
      })
    }).then((result) => {
      setScienceFeedback({ correct: result.isCorrect, explanation: result.explanation, hint: current.hint });
      celebrateAnswerResult(result, { subject: "Science" });
      setSession((currentSession) => ({
        ...currentSession,
        scienceProgress: result.progress || currentSession.scienceProgress,
        student: result.student
          ? { ...currentSession.student, stars: result.student.stars, streak: result.student.streak }
          : currentSession.student
      }));
    });
  }

  function nextScienceQuestion() {
    setScienceIndex((current) => (current + 1) % Math.max(scienceQuestions.length, 1));
    setScienceAnswer("");
    setScienceFeedback(null);
  }

  async function submitEnglishAnswer(payload) {
    if (!session?.student?.id) {
      goToLogin();
      return null;
    }
    const result = await fetchJson("/english/answer", {
      method: "POST",
      body: JSON.stringify({
        studentId: session.student.id,
        ...payload
      })
    });
    celebrateAnswerResult(result, { subject: "English" });
    setSession((current) => ({
      ...current,
      englishProgress: result.progress,
      student: result.student
        ? { ...current.student, stars: result.student.stars, streak: result.student.streak }
        : current.student
    }));
    return result;
  }

  async function submitAnswer() {
    if (!selectedAnswer || !question) return;
    if (!session?.student?.id) {
      goToLogin();
      return;
    }
    const result = await fetchJson("/answer", {
      method: "POST",
      body: JSON.stringify({
        studentId: session.student.id,
        questionId: question.id,
        answer: selectedAnswer
      })
    });
    celebrateAnswerResult(result, { subject: "Math" });
    setSession((current) => ({
      ...current,
      progress: result.progress,
      student: result.student
        ? { ...current.student, stars: result.student.stars, streak: result.student.streak }
        : current.student
    }));
    setFeedback(result);
    setQuestion(result.nextQuestion);
    setSelectedAnswer("");
  }

  async function rememberChineseWord(wordKey, practiceMeta) {
    if (!session?.student?.id) {
      goToLogin();
      return null;
    }
    const body = {
      studentId: session.student.id,
      wordKey
    };
    if (practiceMeta && typeof practiceMeta.timeMs === "number" && typeof practiceMeta.correct === "boolean") {
      body.timeMs = practiceMeta.timeMs;
      body.correct = practiceMeta.correct;
    }
    const result = await fetchJson("/chinese/remember", {
      method: "POST",
      body: JSON.stringify(body)
    });
    setSession((current) => ({ ...current, chineseProgress: result.chineseProgress }));
    return result;
  }

  async function sendMessage() {
    if (!messageText.trim()) return;
    if (!session?.student?.id) {
      goToLogin();
      return;
    }
    const result = await fetchJson("/messages", {
      method: "POST",
      body: JSON.stringify({
        studentId: session.student.id,
        senderId: session.user.id,
        text: messageText
      })
    });
    setSession((current) => ({ ...current, messages: result.messages }));
    setMessageText("");
  }

  const chineseProgressView = useMemo(
    () =>
      buildChineseProgressView(session?.chineseProgress, {
        grade: curriculumGrade,
        pathway: chinesePathway,
        p1Tiers: chineseP1Tiers
      }),
    [session?.chineseProgress, curriculumGrade, chinesePathway, chineseP1Tiers]
  );

  if (sessionLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-cloud text-ink">
        <div className="rounded-lg bg-white px-8 py-6 shadow-soft">Loading practice...</div>
      </main>
    );
  }

  const accuracy = Math.round((progress.correct / Math.max(progress.answered, 1)) * 100);
  const sidebarProgress = activeSubject === "Chinese" ? chineseProgressView : progress;
  const sidebarAccuracy = activeSubject === "Chinese" ? chineseProgressView.accuracy : accuracy;

  return (
    <div className="min-h-screen overflow-x-hidden bg-cloud text-ink">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-slate-200 bg-white/90 px-3 py-7 backdrop-blur lg:block">
        <Brand />
        <StudentNavPanel
          student={student}
          activeSubject={activeSubject}
          onSelectSubject={setActiveSubject}
          profileClassName="absolute bottom-7 left-4 right-4"
          isGuest={isGuest}
          onLogin={goToLogin}
          onViewProfile={() => setProfileOpen(true)}
        />
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40 backdrop-blur-[1px]"
            aria-label="Close menu"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative flex h-full w-[min(18rem,88vw)] flex-col border-r border-slate-200 bg-white px-3 py-6 shadow-2xl safe-top">
            <div className="flex items-center justify-between gap-3">
              <Brand />
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="touch-target rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <StudentNavPanel
              student={student}
              activeSubject={activeSubject}
              onSelectSubject={setActiveSubject}
              onClose={() => setMobileNavOpen(false)}
              profileClassName="mt-auto"
              role={isGuest ? null : role}
              onRoleChange={isGuest ? null : login}
              isGuest={isGuest}
              onLogin={goToLogin}
              onViewProfile={() => {
                setMobileNavOpen(false);
                setProfileOpen(true);
              }}
            />
          </aside>
        </div>
      )}

      <main className="mobile-main-pad lg:pl-64">
        <header className="safe-top sticky top-0 z-10 border-b border-slate-200/80 bg-cloud/95 px-4 py-3 backdrop-blur md:px-9 md:py-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="touch-target shrink-0 rounded-md border border-slate-200 bg-white p-2 text-slate-700 shadow-sm lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0 lg:hidden">
                <div className="truncate text-sm font-black text-teal">{activeSubject} · {student.grade || curriculumGrade}</div>
                <h1 className="truncate text-lg font-black">
                  {isGuest ? "Welcome, explorer!" : `Good morning, ${student.name.split(" ")[0]}!`}
                </h1>
              </div>
              <div className="hidden min-w-0 lg:block">
                <h1 className="text-4xl font-black tracking-normal">
                  {isGuest ? "Welcome, explorer!" : `Good morning, ${student.name.split(" ")[0]}!`}
                </h1>
                <p className="mt-1 text-slate-500">
                  {isGuest ? "Browse and practise for free — sign in to save your progress." : `Let's continue your ${activeSubject} adventure.`}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {isGuest ? (
                <button
                  type="button"
                  onClick={goToLogin}
                  className="flex items-center gap-1.5 rounded-full border border-teal bg-teal px-3 py-1.5 text-sm font-black text-white"
                >
                  <LogIn className="h-4 w-4" />
                  Login
                </button>
              ) : (
                <>
                  <span className={cx("flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-coral lg:hidden", (student.streak || 0) >= 3 && "flame-hot")}>
                    <Zap className="h-3.5 w-3.5 fill-current" />
                    {student.streak || 0}
                  </span>
                  <div className="hidden md:flex md:items-center md:gap-3">
                    {activeSubject !== "Math" && <RoleSwitch role={role} onChange={login} />}
                    <Stat icon={Zap} value={student.streak || 0} label="Day streak" color="text-coral" />
                    <Stat icon={Star} value={student.stars || 0} label="Stars" color="text-sun" />
                  </div>
                  <button type="button" className="touch-target relative rounded-full border border-slate-200 bg-white p-2.5 shadow-sm">
                    <Bell className="h-5 w-5" />
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-coral" />
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <div className={cx("grid gap-4 px-4 pb-4 md:px-9 md:pb-8", activeSubject !== "Chinese" && "xl:grid-cols-[1fr_320px]")}>
          <section className="min-w-0 space-y-4">
            <div className={cx(mobileTab === "learn" ? "block" : "hidden", "lg:block space-y-4")}>
              {mountedSubjects.Math && (
                <div className={activeSubject === "Math" ? "block space-y-4" : "hidden"}>
                  <MathHeaderGrades grade={curriculumGrade} setGrade={handleMathGradeChange} />
                  <MathLearningPractice
                    questions={mathQuestions}
                    progress={progress}
                    fallbackQuestion={question}
                    fallbackAnswer={selectedAnswer}
                    setFallbackAnswer={setSelectedAnswer}
                    submitFallbackAnswer={submitAnswer}
                    fallbackFeedback={feedback}
                    mode={mathMode}
                    setMode={setMathMode}
                    grade={curriculumGrade}
                    setGrade={handleMathGradeChange}
                    practiceGrade={mathPracticeGrade}
                    setPracticeGrade={setMathPracticeGrade}
                    selectedTopic={mathPracticeTopic}
                    setSelectedTopic={setMathPracticeTopic}
                    selectedLevels={mathPracticeLevels}
                    setSelectedLevels={setMathPracticeLevels}
                    index={mathPracticeIndex}
                    setIndex={setMathPracticeIndex}
                    answer={mathPracticeAnswer}
                    setAnswer={setMathPracticeAnswer}
                    feedback={mathPracticeFeedback}
                    setFeedback={setMathPracticeFeedback}
                    collapseRoadmapOnMobile
                    studentId={session?.student?.id}
                    onProgressUpdate={
                      session
                        ? (nextProgress, nextStudent) =>
                            setSession((current) => ({
                              ...current,
                              progress: nextProgress,
                              student: nextStudent
                                ? { ...current.student, stars: nextStudent.stars, streak: nextStudent.streak }
                                : current.student
                            }))
                        : (nextProgress) => setGuestMathProgress(nextProgress)
                    }
                    onLoginRequired={goToLogin}
                  />
                </div>
              )}
              {mountedSubjects.Science && (
                <div className={activeSubject === "Science" ? "block space-y-4" : "hidden"}>
                  <ScienceLearningPractice
                    questions={scienceQuestions}
                    mode={scienceMode}
                    setMode={setScienceMode}
                    index={scienceIndex}
                    setIndex={setScienceIndex}
                    answer={scienceAnswer}
                    setAnswer={setScienceAnswer}
                    feedback={scienceFeedback}
                    clearFeedback={() => setScienceFeedback(null)}
                    submitAnswer={submitScienceAnswer}
                    nextQuestion={nextScienceQuestion}
                    grade={curriculumGrade}
                    setGrade={setCurriculumGrade}
                    collapseRoadmapOnMobile
                  />
                </div>
              )}
              {mountedSubjects.Chinese && (
                <div className={activeSubject === "Chinese" ? "block space-y-4" : "hidden"}>
                  <ChineseHeaderGrades
                    grade={curriculumGrade}
                    setGrade={setCurriculumGrade}
                  />
                  <ChinesePathwayPicker
                    grade={curriculumGrade}
                    pathway={chinesePathway}
                    onPathwayChange={setChinesePathway}
                  />
                  <ChineseVocabPractice
                    grade={curriculumGrade}
                    setGrade={setCurriculumGrade}
                    pathway={chinesePathway}
                    p1Tiers={chineseP1Tiers}
                    onP1TiersChange={setChineseP1Tiers}
                    rememberedWords={session?.chineseProgress?.rememberedWords || {}}
                    wordTimes={session?.chineseProgress?.wordTimes || {}}
                    timingSummary={session?.chineseProgress?.timingSummary}
                    onWordRemembered={rememberChineseWord}
                  />
                </div>
              )}
              {mountedSubjects.English && (
                <div className={activeSubject === "English" ? "block space-y-4" : "hidden"}>
                  <EnglishLearningPractice
                    questions={englishQuestions}
                    progress={session?.englishProgress || { adaptiveLevel: 1, topicMastery: {}, completedLessons: [] }}
                    studentId={session?.student?.id}
                    onProgressUpdate={
                      session
                        ? (englishProgress) => setSession((current) => ({ ...current, englishProgress }))
                        : undefined
                    }
                    mode={englishMode}
                    setMode={setEnglishMode}
                    grade={curriculumGrade}
                    setGrade={setCurriculumGrade}
                    practiceGrade={englishPracticeGrade}
                    setPracticeGrade={setEnglishPracticeGrade}
                    practiceMode={englishPracticeMode}
                    setPracticeMode={setEnglishPracticeMode}
                    selectedTopic={englishPracticeTopic}
                    setSelectedTopic={setEnglishPracticeTopic}
                    selectedLessonTopic={englishLessonTopic}
                    setSelectedLessonTopic={setEnglishLessonTopic}
                    onSubmitAnswer={submitEnglishAnswer}
                    mobileView="learn"
                  />
                </div>
              )}
              {!mountedSubjects.Math && !mountedSubjects.Science && !mountedSubjects.Chinese && !mountedSubjects.English && (
                <ComingSoon subject={activeSubject} />
              )}
            </div>

            <div className={cx(mobileTab === "progress" ? "block" : "hidden", "lg:hidden space-y-4")} data-testid="mobile-progress-panel">
              <MobileProgressPanel
                activeSubject={activeSubject}
                progress={progress}
                chineseProgressView={chineseProgressView}
                mathQuestions={mathQuestions}
                selectedMasteryTopic={selectedMasteryTopic}
                setSelectedMasteryTopic={setSelectedMasteryTopic}
                curriculumGrade={curriculumGrade}
                setCurriculumGrade={setCurriculumGrade}
                englishProgress={session?.englishProgress}
                englishQuestions={englishQuestions}
              />
            </div>

            <div className={cx("hidden lg:block space-y-4", activeSubject === "Science" && "lg:block")}>
              {activeSubject === "Science" && (
                <SyllabusRoadmap subject="Science" grade={curriculumGrade} setGrade={setCurriculumGrade} />
              )}
            </div>
          </section>

          <aside
            className={cx(
              "min-w-0 space-y-4",
              mobileTab === "family" ? "block" : "hidden",
              activeSubject === "Chinese" ? "lg:hidden" : "lg:block"
            )}
            data-testid="mobile-family-panel"
          >
            {isGuest ? (
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black">Save your progress</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Sign in to track stars, streaks, parent messages and personalised recommendations.
                </p>
                <button
                  type="button"
                  onClick={goToLogin}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-teal px-4 py-3 text-sm font-black text-white"
                >
                  <LogIn className="h-4 w-4" />
                  Login or register
                </button>
              </div>
            ) : (
              <>
                <MyProgressPanel
                  activeSubject={activeSubject}
                  accuracy={sidebarAccuracy}
                  progress={sidebarProgress}
                  student={student}
                />
                <Messages
                  messages={messages}
                  user={user}
                  student={student}
                  value={messageText}
                  setValue={setMessageText}
                  onSend={sendMessage}
                />
              </>
            )}
          </aside>
        </div>

        <MobileBottomNav activeTab={mobileTab} onChange={setMobileTab} />
      </main>
      <StudentProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}

function MathStatBox({ count, label, onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-lg px-2 py-3 backdrop-blur transition sm:px-4",
        active ? "bg-white text-teal ring-2 ring-white/80" : "bg-white/20 text-white hover:bg-white/30"
      )}
    >
      <div className="text-xl font-black sm:text-2xl">{count}</div>
      <div className="text-[10px] font-bold leading-tight sm:text-xs">{label}</div>
    </button>
  );
}

function MathProgressModal({ config, topicMastery, practiceGrade, onClose, onSelectTopic }) {
  const { title, subtitle, topics } = config;

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[85vh] sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="math-progress-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <div className="text-xs font-black uppercase tracking-wide text-teal">{practiceGrade} Math</div>
            <h3 id="math-progress-title" className="mt-1 text-xl font-black text-slate-800 sm:text-2xl">
              {title}
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-600 hover:border-teal hover:text-teal"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {topics.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-500">
              No topics in this group yet.
            </div>
          ) : (
            <div className="space-y-2">
              {topics.map((topic) => {
                const score = topicMastery[topic] || 0;
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => onSelectTopic?.(topic)}
                    className="w-full rounded-lg border border-slate-200 p-3 text-left transition hover:border-teal"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 font-black text-slate-800">{topic}</div>
                      <div className="shrink-0 text-sm font-black text-teal">{score}%</div>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-teal" style={{ width: `${score}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MathLearningPractice({
  questions,
  progress,
  fallbackQuestion,
  fallbackAnswer,
  setFallbackAnswer,
  submitFallbackAnswer,
  fallbackFeedback,
  mode,
  setMode,
  grade,
  setGrade,
  practiceGrade,
  setPracticeGrade,
  selectedTopic,
  setSelectedTopic,
  selectedLevels,
  setSelectedLevels,
  index,
  setIndex,
  answer,
  setAnswer,
  feedback,
  setFeedback,
  collapseRoadmapOnMobile = false,
  studentId,
  onProgressUpdate,
  onLoginRequired
}) {
  const { celebrateAnswerResult: celebrate } = useCelebration();
  const [progressModal, setProgressModal] = useState(null);
  const [masteryTopic, setMasteryTopic] = useState("");
  const [mathLessonTopic, setMathLessonTopic] = useState("");
  const [topicSearch, setTopicSearch] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const topicMastery = progress.topicMastery || {};
  const masteryThreshold = 70;
  const topicGroups = useMemo(() => {
    const grouped = questions.filter((questionItem) => questionItem.grade === practiceGrade).reduce((items, questionItem) => {
      const topic = questionItem.topic || "General Practice";
      if (!items[topic]) {
        items[topic] = {
          topic,
          count: 0,
          levels: [],
          difficulties: new Set(),
          tracks: new Set(),
          hasImages: false
        };
      }
      items[topic].count += 1;
      items[topic].levels.push(Number(questionItem.level || 1));
      items[topic].difficulties.add(questionItem.difficulty || "Core");
      items[topic].tracks.add(questionItem.track || "Practice");
      items[topic].hasImages = items[topic].hasImages || Boolean(questionItem.imageUrl);
      return items;
    }, {});

    return Object.values(grouped)
      .map((group) => ({
        ...group,
        minLevel: group.levels.length ? Math.min(...group.levels) : 1,
        maxLevel: group.levels.length ? Math.max(...group.levels) : 1,
        difficulties: Array.from(group.difficulties),
        tracks: Array.from(group.tracks)
      }))
      .sort((a, b) => a.topic.localeCompare(b.topic));
  }, [questions, practiceGrade]);

  const visibleTopicGroups = useMemo(
    () => filterMathTopicGroups(topicGroups, { grade: practiceGrade, showAdvanced, search: topicSearch }),
    [topicGroups, practiceGrade, showAdvanced, topicSearch]
  );

  const progressStats = useMemo(() => {
    const topics = visibleTopicGroups.map((group) => group.topic);
    const masteredTopics = topics.filter((topic) => (topicMastery[topic] || 0) >= masteryThreshold);
    const toPracticeTopics = topics.filter((topic) => (topicMastery[topic] || 0) < masteryThreshold);
    return {
      topicCount: topics.length,
      masteredCount: masteredTopics.length,
      toPracticeCount: toPracticeTopics.length,
      masteredTopics,
      toPracticeTopics,
      accuracy: Math.round((progress.correct / Math.max(progress.answered, 1)) * 100)
    };
  }, [visibleTopicGroups, topicMastery, progress.correct, progress.answered]);

  const displayTopicMastery = useMemo(() => {
    const merged = { ...topicMastery };
    visibleTopicGroups.forEach((group) => {
      if (!(group.topic in merged)) merged[group.topic] = 0;
    });
    return merged;
  }, [topicMastery, visibleTopicGroups]);

  const progressModalConfig = {
    all: {
      title: "All topics",
      subtitle: `${progressStats.topicCount} topics in ${practiceGrade}`,
      topics: visibleTopicGroups.map((group) => group.topic)
    },
    mastered: {
      title: "Mastered",
      subtitle: `${progressStats.masteredCount} topics at ${masteryThreshold}%+`,
      topics: progressStats.masteredTopics
    },
    toPractice: {
      title: "To practice",
      subtitle: `${progressStats.toPracticeCount} topics still building`,
      topics: progressStats.toPracticeTopics
    }
  };

  const activeTopic = selectedTopic || visibleTopicGroups[0]?.topic || "";
  const topicQuestions = useMemo(() => {
    return questions.filter((questionItem) => {
      const topic = questionItem.topic || "General Practice";
      return questionItem.grade === practiceGrade && topic === activeTopic && selectedLevels.includes(Number(questionItem.level || 1));
    });
  }, [questions, practiceGrade, activeTopic, selectedLevels]);
  const current = topicQuestions[index % Math.max(topicQuestions.length, 1)];
  const textOnlyCount = useMemo(() => questions.filter((questionItem) => !questionItem.imageUrl).length, [questions]);
  const isPracticeOpen = mode === "practice";

  const advanceLessonTopics = useMemo(() => {
    return listMathLessonKeys()
      .map((key) => key.split("|"))
      .filter(([lessonGrade]) => lessonGrade === practiceGrade)
      .map(([, topic]) => topic)
      .filter((topic) => visibleTopicGroups.some((group) => group.topic === topic));
  }, [practiceGrade, visibleTopicGroups]);

  async function completeMathLesson(lessonKey) {
    if (!studentId) {
      onProgressUpdate?.({
        ...progress,
        completedLessons: [...new Set([...(progress.completedLessons || []), lessonKey])],
        topicMastery: {
          ...progress.topicMastery,
          [lessonKey.split("|")[1] || ""]: Math.min(100, (progress.topicMastery?.[lessonKey.split("|")[1]] || 30) + 10)
        }
      });
      return;
    }
    const result = await fetchJson("/math/lesson-complete", {
      method: "POST",
      body: JSON.stringify({ studentId, lessonKey })
    });
    if (result.progress) onProgressUpdate?.(result.progress);
  }

  function startTopicQuiz(topic) {
    setSelectedTopic(topic);
    setIndex(0);
    setAnswer("");
    setFeedback(null);
    setMode("practice");
  }

  function openMathLesson(topic) {
    setMathLessonTopic(topic);
    setMasteryTopic(topic);
  }

  useEffect(() => {
    if (!selectedTopic) return;
    if (!visibleTopicGroups.some((group) => group.topic === selectedTopic)) {
      setSelectedTopic(visibleTopicGroups[0]?.topic || "");
      setIndex(0);
      setAnswer("");
      setFeedback(null);
    }
  }, [visibleTopicGroups, selectedTopic, setSelectedTopic, setIndex, setAnswer, setFeedback]);

  useEffect(() => {
    setTopicSearch("");
  }, [practiceGrade]);

  function chooseTopic(topic) {
    setSelectedTopic(topic);
    setIndex(0);
    setAnswer("");
    setFeedback(null);
  }

  function toggleLevel(level) {
    setSelectedLevels((currentLevels) => {
      const nextLevels = currentLevels.includes(level)
        ? currentLevels.filter((item) => item !== level)
        : [...currentLevels, level].sort((a, b) => a - b);
      return nextLevels.length ? nextLevels : currentLevels;
    });
    setIndex(0);
    setAnswer("");
    setFeedback(null);
  }

  function selectAllLevels() {
    setSelectedLevels(Array.from({ length: 10 }, (_, levelIndex) => levelIndex + 1));
    setIndex(0);
    setAnswer("");
    setFeedback(null);
  }

  async function checkCurrentAnswer() {
    if (!current || !answer) return;
    if (!studentId) {
      const accepted = [current.answer, ...(current.acceptedAnswers || [])].map(normalizeAnswer);
      const correct = accepted.includes(normalizeAnswer(answer));
      setFeedback({ correct, answer: current.answer, explanation: current.explanation, hint: current.hint });
      celebrate({ isCorrect: correct }, { subject: "Math" });
      return;
    }
    const result = await fetchJson("/answer", {
      method: "POST",
      body: JSON.stringify({ studentId, questionId: current.id, answer })
    });
    setFeedback({ correct: result.isCorrect, answer: current.answer, explanation: result.explanation, hint: current.hint });
    celebrate(result, { subject: "Math" });
    if (result.progress) onProgressUpdate?.(result.progress, result.student);
  }

  function nextQuestion() {
    setIndex((currentIndex) => (currentIndex + 1) % Math.max(topicQuestions.length, 1));
    setAnswer("");
    setFeedback(null);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-ink via-teal to-leaf px-4 py-4 text-white md:px-5 md:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-black uppercase tracking-wide text-white/80 md:text-sm">{practiceGrade} Math Studio</div>
            <h2 className="mt-1 text-xl font-black md:text-3xl">Learn, practise, play</h2>
            <p className="mt-2 hidden max-w-2xl text-sm font-semibold text-white/90 md:block">
              Start with the roadmap, choose a question category, then sharpen speed in game mode.
            </p>
          </div>
          <div className="grade-picker-scroll w-full max-w-full md:w-auto md:max-w-none">
            <div className="grid w-full grid-cols-3 gap-2 text-center sm:w-auto">
              <MathStatBox
                count={progressStats.topicCount}
                label="Topics"
                active={progressModal === "all"}
                onClick={() => setProgressModal("all")}
              />
              <MathStatBox
                count={progressStats.masteredCount}
                label="Mastered"
                active={progressModal === "mastered"}
                onClick={() => setProgressModal("mastered")}
              />
              <MathStatBox
                count={progressStats.toPracticeCount}
                label="To Practice"
                active={progressModal === "toPractice"}
                onClick={() => setProgressModal("toPractice")}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-xs font-bold text-white/90 sm:justify-end">
              <span>Level {progress.adaptiveLevel}</span>
              <span>·</span>
              <span>{progress.answered || 0} answered</span>
              <span>·</span>
              <span>{progressStats.accuracy}% accuracy</span>
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
              onClick={() => setMode(option)}
              className={cx("flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-black capitalize", mode === option ? "bg-white text-teal" : "text-white")}
            >
              <Icon className="h-4 w-4" />
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="border-b border-slate-200 bg-white px-4 py-3 md:px-5">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search topics</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={topicSearch}
              onChange={(event) => setTopicSearch(event.target.value)}
              placeholder="Search topics…"
              className="w-full rounded-md border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm font-semibold outline-none focus:border-teal focus:bg-white"
            />
          </label>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-black text-slate-600">
            <input
              type="checkbox"
              checked={showAdvanced}
              onChange={(event) => setShowAdvanced(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal focus:ring-teal"
            />
            Advance
          </label>
        </div>
        {!showAdvanced && (
          <p className="mt-2 text-xs font-semibold text-slate-500">
            Showing MOE syllabus topics for {practiceGrade}. Tick Advance for Olympiad and extension topics.
          </p>
        )}
      </div>

      {mode === "learn" && (
        <div className="space-y-4 p-4 md:p-5">
          {advanceLessonTopics.length > 0 && (
            <div className="rounded-lg border border-teal/20 bg-teal/5 p-4">
              <div className="text-xs font-black uppercase tracking-wide text-teal">Advance lessons</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {advanceLessonTopics.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => openMathLesson(topic)}
                    className={cx(
                      "rounded-full border px-4 py-2 text-sm font-black transition",
                      mathLessonTopic === topic ? "border-teal bg-teal text-white" : "border-teal/30 bg-white text-teal hover:border-teal"
                    )}
                  >
                    {topic}
                    {(progress.completedLessons || []).includes(`${practiceGrade}|${topic}`) && (
                      <Check className="ml-1 inline h-4 w-4" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mathLessonTopic && hasMathLesson(practiceGrade, mathLessonTopic) && (
            <MathLessonCard
              grade={practiceGrade}
              topic={mathLessonTopic}
              progress={progress}
              onComplete={completeMathLesson}
              onStartQuiz={startTopicQuiz}
            />
          )}

          {collapseRoadmapOnMobile ? (
            <div className="lg:hidden">
              <CollapsibleSection title="Show MOE Math roadmap">
                <SyllabusRoadmap subject="Math" grade={grade} setGrade={setGrade} embedded hideGradePicker />
              </CollapsibleSection>
            </div>
          ) : null}
          <div className={cx(collapseRoadmapOnMobile && "hidden lg:block")}>
            <SyllabusRoadmap subject="Math" grade={grade} setGrade={setGrade} hideGradePicker />
          </div>
          <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
            <LessonCard progress={progress} question={fallbackQuestion} onStartLesson={() => setMode("practice")} onQuickChallenge={() => setMode("practice")} />
            <div className="hidden lg:block">
              <LevelProgress level={progress.adaptiveLevel} />
            </div>
          </div>
          <TopicMastery
            topics={displayTopicMastery}
            questions={questions.filter((questionItem) => questionItem.grade === practiceGrade)}
            selectedTopic={masteryTopic}
            setSelectedTopic={(topic) => {
              if (hasMathLesson(practiceGrade, topic)) {
                openMathLesson(topic);
              } else {
                setMasteryTopic(topic);
                setMathLessonTopic("");
              }
            }}
            collapseLinkedQuestions
          />
          <div className="rounded-lg border border-teal/20 bg-teal/5 p-4 text-sm leading-6 text-slate-600">
            <span className="font-black text-teal">Your Math progress</span>
            {" — "}
            {progress.answered > 0
              ? `You have answered ${progress.answered} questions with ${progressStats.accuracy}% accuracy. ${progressStats.masteredCount} of ${progressStats.topicCount} topics mastered at ${practiceGrade}.`
              : `Start practice to track topic mastery across ${progressStats.topicCount} ${practiceGrade} topics.`}
            {progress.unlockedOlympiad ? " Olympiad track unlocked!" : " Reach level 8 to unlock Olympiad."}
          </div>
        </div>
      )}

      {progressModal && (
        <MathProgressModal
          config={progressModalConfig[progressModal]}
          topicMastery={topicMastery}
          practiceGrade={practiceGrade}
          onClose={() => setProgressModal(null)}
          onSelectTopic={(topic) => {
            setSelectedTopic(topic);
            setProgressModal(null);
            setMode("practice");
          }}
        />
      )}

      {isPracticeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-3 backdrop-blur-sm md:p-6">
          <div className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-teal">Math Practice</div>
                <h2 className="mt-1 text-2xl font-black">{practiceGrade} Question Practice</h2>
              </div>
              <button
                onClick={() => setMode("learn")}
                className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 text-slate-600 hover:border-teal hover:text-teal"
                aria-label="Close practice"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {questions.length === 0 ? (
              <div className="grid gap-4 overflow-y-auto p-5 xl:grid-cols-[1.1fr_1fr]">
                <PracticeCard
                  question={fallbackQuestion}
                  selectedAnswer={fallbackAnswer}
                  setSelectedAnswer={setFallbackAnswer}
                  submitAnswer={submitFallbackAnswer}
                  feedback={fallbackFeedback}
                />
                <LevelProgress level={progress.adaptiveLevel} />
              </div>
            ) : (
              <div className="grid min-h-0 flex-1 overflow-hidden xl:grid-cols-[330px_1fr]">
                <aside className="min-h-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-4">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-black uppercase tracking-wide text-slate-400">Topics</div>
                        <h3 className="mt-1 font-black">Question Topics</h3>
                      </div>
                      <span className="rounded-md bg-white px-3 py-2 text-sm font-black text-teal">{visibleTopicGroups.length}</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {visibleTopicGroups.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm font-semibold text-slate-500">
                          {topicSearch.trim()
                            ? `No topics match "${topicSearch.trim()}".`
                            : showAdvanced
                              ? `No ${practiceGrade} Math topics yet.`
                              : `No MOE syllabus topics for ${practiceGrade} yet. Tick Advance for extension topics.`}
                        </div>
                      ) : (
                        visibleTopicGroups.map((group) => (
                          <button
                            key={group.topic}
                            onClick={() => chooseTopic(group.topic)}
                            className={cx("w-full rounded-lg border p-3 text-left transition", activeTopic === group.topic ? "border-teal bg-white shadow-sm" : "border-slate-200 bg-white/70 hover:border-teal")}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="line-clamp-2 text-sm font-black leading-5">{group.topic}</div>
                                <div className="mt-2 text-xs font-bold text-slate-500">
                                  {group.count} questions - L{group.minLevel}-{group.maxLevel}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {group.tracks.map((label) => (
                                    <span key={label} className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">{label}</span>
                                  ))}
                                  {!isMoeMathTopic(practiceGrade, group.topic) && (
                                    <span className="rounded bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-700">Advance</span>
                                  )}
                                </div>
                              </div>
                              <span className={cx("grid h-8 w-8 shrink-0 place-items-center rounded-md", group.hasImages ? "bg-sun/20 text-orange-600" : "bg-cloud text-teal")}>
                                {group.hasImages ? <Image className="h-4 w-4" /> : <Sigma className="h-4 w-4" />}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-black">Difficulty Levels</h3>
                      <button onClick={selectAllLevels} className="text-xs font-black text-teal">All</button>
                    </div>
                    <div className="mt-3 grid grid-cols-5 gap-2">
                      {Array.from({ length: 10 }, (_, levelIndex) => levelIndex + 1).map((level) => (
                        <button
                          key={level}
                          onClick={() => toggleLevel(level)}
                          className={cx(
                            "grid h-10 place-items-center rounded-md border text-sm font-black",
                            selectedLevels.includes(level) ? "border-teal bg-teal text-white" : "border-slate-200 bg-slate-50 text-slate-500 hover:border-teal"
                          )}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                </aside>

                <div className="min-h-0 overflow-y-auto p-5">
                  <div className="mb-4 grid gap-3 sm:grid-cols-3">
                    <MiniInfo title="Grade" value={practiceGrade} />
                    <MiniInfo title="Topic Questions" value={topicQuestions.length} />
                    <MiniInfo title="Level Filter" value={selectedLevels.length === 10 ? "All 1-10" : selectedLevels.join(", ")} />
                  </div>
                  <MathQuestionPanel
                    question={current}
                    topic={activeTopic || "Select a topic"}
                    questionNumber={topicQuestions.length ? (index % topicQuestions.length) + 1 : 0}
                    totalQuestions={topicQuestions.length}
                    answer={answer}
                    setAnswer={setAnswer}
                    feedback={feedback}
                    submitAnswer={checkCurrentAnswer}
                    nextQuestion={nextQuestion}
                  />
                  {visibleTopicGroups.length > 0 && topicQuestions.length === 0 && (
                    <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm font-semibold text-slate-600">
                      No questions match the selected level filter for this topic.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {false && mode === "practice" && (
        <div className="p-5">
          {questions.length === 0 ? (
            <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
              <PracticeCard
                question={fallbackQuestion}
                selectedAnswer={fallbackAnswer}
                setSelectedAnswer={setFallbackAnswer}
                submitAnswer={submitFallbackAnswer}
                feedback={fallbackFeedback}
              />
              <LevelProgress level={progress.adaptiveLevel} />
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[330px_1fr]">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black uppercase tracking-wide text-slate-400">Categories</div>
                    <h3 className="mt-1 font-black">Question Subcategories</h3>
                  </div>
                  <span className="rounded-md bg-white px-3 py-2 text-sm font-black text-teal">{topicGroups.length}</span>
                </div>
                <div className="mt-4 space-y-2">
                  {topicGroups.map((group) => (
                    <button
                      key={group.topic}
                      onClick={() => chooseTopic(group.topic)}
                      className={cx("w-full rounded-lg border p-3 text-left transition", activeTopic === group.topic ? "border-teal bg-white shadow-sm" : "border-slate-200 bg-white/70 hover:border-teal")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="line-clamp-2 text-sm font-black leading-5">{group.topic}</div>
                          <div className="mt-2 text-xs font-bold text-slate-500">
                            {group.count} questions · L{group.minLevel}-{group.maxLevel}
                          </div>
                        </div>
                        <span className={cx("grid h-8 w-8 shrink-0 place-items-center rounded-md", group.hasImages ? "bg-sun/20 text-orange-600" : "bg-cloud text-teal")}>
                          {group.hasImages ? <Image className="h-4 w-4" /> : <Sigma className="h-4 w-4" />}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {[...group.difficulties, ...group.tracks.slice(0, 2)].map((label) => (
                          <span key={label} className="rounded bg-slate-50 px-2 py-1 text-xs font-bold text-slate-500">{label}</span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <MathQuestionPanel
                question={current}
                topic={activeTopic}
                questionNumber={(index % Math.max(topicQuestions.length, 1)) + 1}
                totalQuestions={topicQuestions.length}
                answer={answer}
                setAnswer={setAnswer}
                feedback={feedback}
                submitAnswer={checkCurrentAnswer}
                nextQuestion={nextQuestion}
              />
            </div>
          )}
        </div>
      )}

      {mode === "game" && (
        <div className="p-5">
          <MathGameMode questions={questions} textOnlyCount={textOnlyCount} />
        </div>
      )}
    </div>
  );
}

function MathQuestionPanel({ question, topic, questionNumber, totalQuestions, answer, setAnswer, feedback, submitAnswer, nextQuestion }) {
  const [working, setWorking] = useState("");
  const [aiFeedback, setAiFeedback] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    setWorking("");
    setAiFeedback(null);
    setAiLoading(false);
  }, [question?.id]);

  async function evaluateWorking() {
    if (!question || aiLoading) return;
    setAiLoading(true);
    setAiFeedback(null);
    try {
      const result = await fetchJson("/math/evaluate-working", {
        method: "POST",
        body: JSON.stringify({ questionId: question.id, answer, working })
      });
      setAiFeedback(result);
    } catch (error) {
      setAiFeedback({ error: error.message || "The AI coach is unavailable right now. Please try again." });
    } finally {
      setAiLoading(false);
    }
  }

  if (!question) {
    return <div className="rounded-lg border border-slate-200 p-5 text-sm font-semibold text-slate-500">Pick a category to start practising.</div>;
  }

  const verdictStyles = {
    correct: "border-green-200 bg-green-50",
    "partly-correct": "border-amber-200 bg-amber-50",
    incorrect: "border-orange-200 bg-orange-50"
  };

  return (
    <div className="rounded-lg border border-slate-200 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black text-teal">{topic}</div>
          <h3 className="mt-2 text-2xl font-black">Question {questionNumber} of {totalQuestions}</h3>
        </div>
        <div className="flex flex-wrap gap-2 text-sm font-black">
          <span className="rounded-md bg-cloud px-3 py-2 text-teal">Level {question.level}</span>
          <span className="rounded-md bg-slate-50 px-3 py-2 text-slate-600">{question.difficulty}</span>
        </div>
      </div>

      {question.imageUrl && (
        <img src={question.imageUrl} alt={question.prompt} className="mt-5 max-h-[360px] w-full rounded-lg border border-slate-200 object-contain object-top" />
      )}
      <div className="mt-6 text-xl font-black leading-8 md:text-2xl">{question.prompt}</div>
      <p className="mt-3 text-sm leading-6 text-slate-500">{question.helpText}</p>

      {question.type === "multiple" && question.options?.length ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {question.options.map((option, optionIndex) => (
            <button
              key={`${question.id}-${option}`}
              onClick={() => setAnswer(option)}
              className={cx(
                "flex min-h-16 items-center gap-4 rounded-lg border px-4 py-3 text-left font-black transition",
                answer === option ? "border-leaf bg-green-50 text-leaf" : "border-slate-200 bg-white hover:border-teal"
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
          className="mt-6 w-full rounded-lg border border-slate-200 px-4 py-4 text-xl font-bold outline-none focus:border-teal"
          placeholder="Type your answer"
        />
      )}

      {question.requiresWorking && (
        <div className="mt-5 rounded-lg border border-teal/30 bg-teal/5 p-4">
          <div className="flex items-center gap-2 font-black text-teal">
            <PenLine className="h-4 w-4" />
            Show your working
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Write every step, one per line. The AI coach will check each step and show you where it goes wrong.
          </p>
          <textarea
            value={working}
            onChange={(event) => setWorking(event.target.value)}
            rows={6}
            className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base font-semibold leading-7 outline-none focus:border-teal"
            placeholder={"Step 1: ...\nStep 2: ...\nStep 3: ..."}
          />
          <button
            onClick={evaluateWorking}
            disabled={!working.trim() || !answer || aiLoading}
            className="mt-3 flex items-center gap-2 rounded-md bg-coral px-5 py-3 font-black text-white disabled:opacity-40"
          >
            <WandSparkles className="h-4 w-4" />
            {aiLoading ? "AI coach is checking..." : "Check my working with AI coach"}
          </button>
          {!answer && working.trim() && (
            <p className="mt-2 text-xs font-semibold text-slate-500">Type your final answer above before asking the AI coach.</p>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button onClick={submitAnswer} disabled={!answer} className="rounded-md bg-teal px-6 py-3 font-black text-white disabled:opacity-40">
          Check Answer
        </button>
        <button onClick={nextQuestion} className="rounded-md border border-slate-200 px-6 py-3 font-black text-slate-700">
          Next Question
        </button>
      </div>

      {aiFeedback?.error && (
        <div className="pop-in mt-5 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm font-semibold text-slate-600">
          {aiFeedback.error}
        </div>
      )}

      {aiFeedback?.evaluation && (
        <div className={cx("pop-in mt-5 rounded-lg border p-4", verdictStyles[aiFeedback.evaluation.verdict] || "border-slate-200 bg-slate-50")}>
          <div className="flex items-start gap-3">
            <Ollie mood={aiFeedback.evaluation.verdict === "correct" ? "cheer" : "sad"} size={52} />
            <div className="min-w-0 flex-1">
              <div className="font-black">
                {aiFeedback.evaluation.verdict === "correct"
                  ? "AI Coach: All your steps are correct!"
                  : aiFeedback.evaluation.verdict === "partly-correct"
                    ? "AI Coach: Almost there — one step needs fixing."
                    : `AI Coach: Let's find the mistake. Correct answer: ${aiFeedback.correctAnswer}`}
              </div>
              {aiFeedback.evaluation.firstErrorStep && (
                <div className="mt-2 rounded-md border border-orange-200 bg-white px-3 py-2 text-sm font-bold text-orange-700">
                  First wrong step: {aiFeedback.evaluation.firstErrorStep}
                </div>
              )}
              {aiFeedback.evaluation.whatWentWrong && (
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  <span className="font-black text-slate-700">What went wrong: </span>
                  {aiFeedback.evaluation.whatWentWrong}
                </p>
              )}
              <p className="mt-2 text-sm leading-6 text-slate-600">
                <span className="font-black text-slate-700">How to solve it: </span>
                {aiFeedback.evaluation.explanation}
              </p>
              {aiFeedback.evaluation.encouragement && (
                <p className="mt-2 text-sm font-bold text-teal">{aiFeedback.evaluation.encouragement}</p>
              )}
              {!aiFeedback.usedAI && (
                <p className="mt-2 text-xs font-semibold text-slate-400">AI coach offline — showing the model solution instead.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {feedback && (
        <div className={cx("pop-in mt-5 flex items-start gap-3 rounded-lg border p-4", feedback.correct ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50")}>
          <Ollie mood={feedback.correct ? "cheer" : "sad"} size={52} />
          <div className="min-w-0">
            <div className="font-black">{feedback.correct ? "Correct! Ollie is proud of you." : `Not yet. Answer: ${feedback.answer}`}</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{feedback.correct ? feedback.explanation : feedback.hint || feedback.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function MathGameMode({ questions, textOnlyCount }) {
  const { celebrateAnswerResult: celebrate } = useCelebration();
  const playableQuestions = useMemo(() => questions.filter((question) => !question.imageUrl).slice(0, 12), [questions]);
  const [gameIndex, setGameIndex] = useState(0);
  const [gameAnswer, setGameAnswer] = useState("");
  const [gameFeedback, setGameFeedback] = useState(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const current = playableQuestions[gameIndex % Math.max(playableQuestions.length, 1)];

  function submitGameAnswer() {
    if (!current || !gameAnswer || gameFeedback) return;
    const accepted = [current.answer, ...(current.acceptedAnswers || [])].map(normalizeAnswer);
    const correct = accepted.includes(normalizeAnswer(gameAnswer));
    setScore((value) => value + (correct ? 10 : 0));
    setStreak((value) => (correct ? value + 1 : 0));
    setGameFeedback({ correct, answer: current.answer });
    celebrate({ isCorrect: correct }, { subject: "Math" });
  }

  function nextGameQuestion() {
    setGameIndex((value) => (value + 1) % Math.max(playableQuestions.length, 1));
    setGameAnswer("");
    setGameFeedback(null);
  }

  function resetGame() {
    setGameIndex(0);
    setGameAnswer("");
    setGameFeedback(null);
    setScore(0);
    setStreak(0);
  }

  if (!playableQuestions.length) {
    return (
      <div className="rounded-lg border border-slate-200 p-5">
        <div className="font-black">Math Sprint</div>
        <p className="mt-2 text-sm text-slate-500">Game mode needs text-only Math questions. The bank currently has {textOnlyCount} text-only questions.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
      <div className="rounded-lg border border-slate-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-coral">Math Sprint</div>
            <h3 className="mt-2 text-2xl font-black">{current.topic}</h3>
          </div>
          <span className="rounded-md bg-cloud px-3 py-2 text-sm font-black text-teal">Round {(gameIndex % playableQuestions.length) + 1} of {playableQuestions.length}</span>
        </div>
        <div className="mt-6 rounded-lg bg-slate-50 p-5 text-xl font-black leading-8 md:text-2xl">{current.prompt}</div>
        {current.type === "multiple" && current.options?.length ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {current.options.map((option) => (
              <button
                key={`${current.id}-game-${option}`}
                onClick={() => setGameAnswer(option)}
                className={cx("rounded-lg border px-4 py-3 text-left font-black", gameAnswer === option ? "border-coral bg-orange-50 text-coral" : "border-slate-200 hover:border-teal")}
              >
                {option}
              </button>
            ))}
          </div>
        ) : (
          <input
            value={gameAnswer}
            onChange={(event) => setGameAnswer(event.target.value)}
            className="mt-5 w-full rounded-lg border border-slate-200 px-4 py-4 text-xl font-bold outline-none focus:border-teal"
            placeholder="Fast answer"
          />
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={submitGameAnswer} disabled={!gameAnswer || Boolean(gameFeedback)} className="rounded-md bg-coral px-6 py-3 font-black text-white disabled:opacity-40">
            Lock In
          </button>
          <button onClick={nextGameQuestion} className="rounded-md border border-slate-200 px-6 py-3 font-black text-slate-700">
            Next
          </button>
        </div>
        {gameFeedback && (
          <div className={cx("mt-5 rounded-lg border p-4", gameFeedback.correct ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50")}>
            <div className="font-black">{gameFeedback.correct ? "+10 points" : `Answer: ${gameFeedback.answer}`}</div>
          </div>
        )}
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
        <div className="grid grid-cols-2 gap-3 text-center">
          <MiniInfo title="Score" value={score} />
          <MiniInfo title="Streak" value={streak} />
        </div>
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
          <div className="font-black">Playable Set</div>
          <p className="mt-2 text-sm leading-6 text-slate-500">{playableQuestions.length} text-only questions from the P4 Math bank. Figure questions stay in Practice mode.</p>
        </div>
        <button onClick={resetGame} className="mt-4 w-full rounded-md border border-slate-200 bg-white px-4 py-3 font-black text-slate-700">
          Reset Sprint
        </button>
      </div>
    </div>
  );
}

function ScienceLearningPractice({ questions, mode, setMode, index, setIndex, answer, setAnswer, feedback, clearFeedback, submitAnswer, nextQuestion, grade, setGrade, collapseRoadmapOnMobile = false }) {
  const current = questions[index] || questions[0];
  const topicCount = new Set(questions.map((question) => question.topic)).size;
  const topicCards = [
    { title: "Plant Parts", emoji: "Leaf", body: "Roots absorb water, stems support, leaves help make food.", color: "bg-green-50 text-green-700" },
    { title: "Digestive System", emoji: "Body", body: "Food is broken into simpler substances the body can use.", color: "bg-orange-50 text-orange-700" },
    { title: "Matter", emoji: "Drops", body: "Matter has mass and takes up space: solids, liquids and gases.", color: "bg-blue-50 text-blue-700" },
    { title: "Light and Heat", emoji: "Energy", body: "Light helps us see. Heat can change temperature and state.", color: "bg-yellow-50 text-yellow-700" }
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-teal via-leaf to-sun px-4 py-4 text-white md:px-5 md:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-black uppercase tracking-wide opacity-90 md:text-sm">P4 Science Lab</div>
            <h2 className="mt-1 text-xl font-black md:text-3xl">Explore, test, level up</h2>
            <p className="mt-2 hidden max-w-2xl text-sm font-semibold text-white/90 md:block">
              Learn the idea first, then try questions from the P4 Science syllabus.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="rounded-lg bg-white/20 px-3 py-2 text-center backdrop-blur">
              <div className="text-lg font-black md:text-2xl">{questions.length}</div>
              <div className="text-[10px] font-bold md:text-xs">Questions</div>
            </div>
            <div className="rounded-lg bg-white/20 px-3 py-2 text-center backdrop-blur">
              <div className="text-lg font-black md:text-2xl">{topicCount}</div>
              <div className="text-[10px] font-bold md:text-xs">Topics</div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex rounded-lg bg-white/20 p-1 md:mt-5">
          {["learn", "practice"].map((option) => (
            <button
              key={option}
              onClick={() => setMode(option)}
              className={cx("flex-1 rounded-md px-4 py-3 text-sm font-black capitalize", mode === option ? "bg-white text-teal" : "text-white")}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {mode === "learn" ? (
        <div className="space-y-4 p-4 md:p-5">
          {collapseRoadmapOnMobile && grade && setGrade ? (
            <div className="lg:hidden">
              <CollapsibleSection title="Show MOE Science roadmap">
                <SyllabusRoadmap subject="Science" grade={grade} setGrade={setGrade} embedded />
              </CollapsibleSection>
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
          {topicCards.map((card) => (
            <div key={card.title} className="rounded-lg border border-slate-200 p-4">
              <div className={cx("inline-flex rounded-md px-3 py-2 text-sm font-black", card.color)}>{card.emoji}</div>
              <h3 className="mt-4 text-xl font-black">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.body}</p>
            </div>
          ))}
          <div className="rounded-lg border border-teal/20 bg-teal/5 p-4 md:col-span-2">
            <div className="font-black text-teal">Kid mission</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Pick one topic, say the big idea out loud, then switch to Practice. If you miss a question, read the hint and try the next one. Small steps count.
            </p>
          </div>
          </div>
        </div>
      ) : (
        <div className="p-5">
          {!current ? (
            <div className="rounded-lg border border-slate-200 p-5 text-slate-500">No Science questions found yet.</div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
              <div className="rounded-lg border border-slate-200 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-leaf">{current.topic}</div>
                    <h3 className="mt-2 text-2xl font-black">Question {index + 1} of {questions.length}</h3>
                  </div>
                  <span className="rounded-md bg-cloud px-3 py-2 text-sm font-black text-teal">Level {current.level}</span>
                </div>
                <div className="mt-6 text-xl font-black leading-8 md:text-2xl">{current.prompt}</div>
                <p className="mt-3 text-sm leading-6 text-slate-500">{current.helpText}</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {current.options.map((option, optionIndex) => (
                    <button
                      key={option}
                      onClick={() => setAnswer(option)}
                      className={cx(
                        "flex min-h-16 items-center gap-4 rounded-lg border px-4 py-3 text-left font-black transition",
                        answer === option ? "border-leaf bg-green-50 text-leaf" : "border-slate-200 bg-white hover:border-teal"
                      )}
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cloud text-sm text-slate-500">
                        {String.fromCharCode(65 + optionIndex)}
                      </span>
                      <span>{option}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button onClick={submitAnswer} disabled={!answer} className="rounded-md bg-teal px-6 py-3 font-black text-white disabled:opacity-40">
                    Check Answer
                  </button>
                  <button onClick={nextQuestion} className="rounded-md border border-slate-200 px-6 py-3 font-black text-slate-700">
                    Next Question
                  </button>
                </div>
                {feedback && (
                  <div className={cx("pop-in mt-5 flex items-start gap-3 rounded-lg border p-4", feedback.correct ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50")}>
                    <Ollie mood={feedback.correct ? "cheer" : "think"} size={52} />
                    <div className="min-w-0">
                      <div className="font-black">{feedback.correct ? "Correct. Science star earned!" : "Not yet. Try the next one with this clue."}</div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{feedback.correct ? feedback.explanation : feedback.hint}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <div className="text-sm font-black uppercase tracking-wide text-slate-400">Learning map</div>
                <div className="mt-4 space-y-2">
                  {questions.map((questionItem, questionIndex) => (
                    <button
                      key={questionItem.id}
                      onClick={() => {
                        setIndex(questionIndex);
                        setAnswer("");
                        clearFeedback();
                      }}
                      className={cx("flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-bold", questionIndex === index ? "bg-white text-teal shadow-sm" : "text-slate-500")}
                    >
                      <span className={cx("grid h-7 w-7 place-items-center rounded-full text-xs", questionIndex === index ? "bg-teal text-white" : "bg-white text-slate-500")}>{questionIndex + 1}</span>
                      <span className="line-clamp-1">{questionItem.topic}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MiniInfo({ title, value }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="text-xs font-black uppercase tracking-wide text-slate-400">{title}</div>
      <div className="mt-1 text-sm font-bold leading-5 text-slate-700">{value}</div>
    </div>
  );
}

function SyllabusRoadmap({ subject, grade, setGrade, embedded = false, hideGradePicker = false }) {
  const isScience = subject === "Science";
  const curriculum = isScience ? scienceCurriculum : mathCurriculum;
  const selected = curriculum[grade];
  const groups = isScience ? selected.themes : selected.strands;
  const groupLabel = isScience ? "theme" : "strand";

  return (
    <div className={cx(embedded ? "" : "rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-5")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black">MOE {subject} Roadmap</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">{selected.focus}</p>
        </div>
        {!hideGradePicker && (
          <GradePicker
            grades={Object.keys(curriculum)}
            value={grade}
            onChange={setGrade}
          />
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <div key={group.name} className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-md bg-cloud text-teal">
                {group.name.includes("Number") || group.name.includes("Diversity") ? <Sigma className="h-5 w-5" /> : group.name.includes("Measurement") || group.name.includes("Systems") ? <Target className="h-5 w-5" /> : <BarChart3 className="h-5 w-5" />}
              </div>
              <h3 className="font-black">{group.name}</h3>
            </div>
            <div className="mt-4 space-y-3">
              {group.topics.map((topic) => (
                <div key={topic.name} className="rounded-md bg-slate-50 p-3">
                  <div className="font-black text-teal">{topic.name}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {topic.skills.slice(0, 4).map((skill) => (
                      <span key={skill} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs font-semibold text-slate-400">
        Organised by MOE {subject.toLowerCase()} {groupLabel}s and adapted into app-ready learning tracks.
      </p>
    </div>
  );
}

function MobileBottomNav({ activeTab, onChange }) {
  const tabs = [
    { id: "learn", label: "Learn", icon: BookOpenText },
    { id: "progress", label: "Progress", icon: LineChart },
    { id: "family", label: "My stats", icon: Users }
  ];

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden" data-testid="mobile-bottom-nav">
      <div className="grid grid-cols-3 gap-1 px-2 py-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            data-testid={`mobile-tab-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={cx(
              "flex flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-2 text-xs font-black transition",
              activeTab === tab.id ? "bg-teal text-white" : "text-slate-500"
            )}
          >
            <tab.icon className="h-5 w-5" />
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

function MobileProgressPanel({
  activeSubject,
  progress,
  chineseProgressView,
  mathQuestions,
  selectedMasteryTopic,
  setSelectedMasteryTopic,
  curriculumGrade,
  setCurriculumGrade,
  englishProgress,
  englishQuestions
}) {
  const accuracy = Math.round((progress.correct / Math.max(progress.answered, 1)) * 100);
  const chineseView = chineseProgressView || buildChineseProgressView();
  const isChinese = activeSubject === "Chinese";

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-black">Your progress</h2>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {isChinese ? (
            <>
              <div className="rounded-md bg-slate-50 p-2">
                <div className="text-lg font-black text-teal">{chineseView.wordsRemembered || 0}</div>
                <div className="text-xs text-slate-500">Words</div>
              </div>
              <div className="rounded-md bg-slate-50 p-2">
                <div className="text-lg font-black">{chineseView.accuracy}%</div>
                <div className="text-xs text-slate-500">Accuracy</div>
              </div>
              <div className="rounded-md bg-slate-50 p-2">
                <div className="text-lg font-black">{chineseView.answered || 0}</div>
                <div className="text-xs text-slate-500">This week</div>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-md bg-slate-50 p-2">
                <div className="text-lg font-black text-teal">L{progress.adaptiveLevel || 1}</div>
                <div className="text-xs text-slate-500">Level</div>
              </div>
              <div className="rounded-md bg-slate-50 p-2">
                <div className="text-lg font-black">{accuracy}%</div>
                <div className="text-xs text-slate-500">Accuracy</div>
              </div>
              <div className="rounded-md bg-slate-50 p-2">
                <div className="text-lg font-black">{progress.answered || 0}</div>
                <div className="text-xs text-slate-500">Answered</div>
              </div>
            </>
          )}
        </div>
      </div>

      {activeSubject === "Math" && (
        <>
          <LevelProgress level={progress.adaptiveLevel} />
          <TopicMastery
            topics={progress.topicMastery}
            questions={mathQuestions}
            selectedTopic={selectedMasteryTopic}
            setSelectedTopic={setSelectedMasteryTopic}
            collapseLinkedQuestions
          />
        </>
      )}

      {activeSubject === "Science" && (
        <SyllabusRoadmap subject="Science" grade={curriculumGrade} setGrade={setCurriculumGrade} />
      )}

      {activeSubject === "Chinese" && (
        <ChineseRoadmap grade={curriculumGrade} />
      )}

      {activeSubject === "English" && englishProgress && (
        <>
          <EnglishLevelProgressMobile progress={englishProgress} />
          {englishProgress.topicMastery && Object.keys(englishProgress.topicMastery).length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="font-black">Topic mastery</h3>
              <div className="mt-3 space-y-2">
                {Object.entries(englishProgress.topicMastery).map(([topic, score]) => (
                  <div key={topic}>
                    <div className="flex justify-between text-xs font-bold">
                      <span>{topic}</span>
                      <span>{score}%</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EnglishLevelProgressMobile({ progress }) {
  const level = progress.adaptiveLevel || 1;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-black uppercase tracking-wide text-slate-400">English level</div>
      <div className="mt-1 text-3xl font-black text-blue-600">Level {level}</div>
      <div className="mt-1 text-sm font-bold text-slate-600">{progress.titleRank || "Word Explorer"}</div>
      <div className="mt-3 h-2 rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-blue-500" style={{ width: `${level * 10}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
        <div className="rounded-md bg-slate-50 p-2">
          <div className="font-black">{progress.correct || 0}/{progress.answered || 0}</div>
          <div className="text-xs text-slate-500">Correct</div>
        </div>
        <div className="rounded-md bg-slate-50 p-2">
          <div className="font-black">{(progress.completedLessons || []).length}</div>
          <div className="text-xs text-slate-500">Lessons</div>
        </div>
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
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-black text-teal"
      >
        {title}
        <ChevronRight className={cx("h-4 w-4 transition", open && "rotate-90")} />
      </button>
      {open && <div className="border-t border-slate-200 p-4">{children}</div>}
    </div>
  );
}

function ComingSoon({ subject }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <div className="grid h-14 w-14 place-items-center rounded-lg bg-cloud text-teal">
        <BookOpenText className="h-7 w-7" />
      </div>
      <h2 className="mt-5 text-2xl font-black">{subject} roadmap coming next</h2>
      <p className="mt-2 max-w-2xl text-slate-500">
        EduSG is starting with Math and Science syllabus maps first. Chinese and English can use the same structure when we add their MOE outcomes.
      </p>
    </div>
  );
}

function StudentNavPanel({ student, activeSubject, onSelectSubject, onClose, profileClassName = "", role, onRoleChange, isGuest = false, onLogin, onViewProfile }) {
  return (
    <>
      <nav className="mt-8 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              if (subjectMeta[item.label]) onSelectSubject(item.label);
              onClose?.();
            }}
            className={cx(
              "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold transition",
              item.label === activeSubject ? "bg-teal text-white shadow-lg shadow-teal/20" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </button>
        ))}
      </nav>
      <div className={cx("rounded-lg border border-slate-200 bg-white p-4", profileClassName)}>
        <div className="flex items-center gap-3">
          <Avatar label={student.avatar} />
          <div>
            <div className="font-bold">{student.name}</div>
            <div className="text-sm text-slate-500">{isGuest ? "Browse as guest" : `Primary ${student.grade?.slice(1) || ""}`}</div>
          </div>
        </div>
        {isGuest ? (
          <button
            type="button"
            onClick={onLogin}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-teal py-2 text-sm font-semibold text-white"
          >
            <LogIn className="h-4 w-4" />
            Login
          </button>
        ) : (
          <button
            type="button"
            onClick={onViewProfile}
            className="mt-4 w-full rounded-md border border-slate-200 py-2 text-sm font-semibold text-teal transition hover:border-teal hover:bg-teal/5"
          >
            View Profile
          </button>
        )}
        {role && onRoleChange && (
          <div className="mt-4 lg:hidden">
            <div className="mb-2 text-xs font-black uppercase text-slate-400">Demo role</div>
            <RoleSwitch role={role} onChange={onRoleChange} />
          </div>
        )}
      </div>
    </>
  );
}

function Brand({ compact = false }) {
  return (
    <div>
      <div className={cx("font-black tracking-normal", compact ? "text-2xl" : "text-4xl")}>
        <span className="text-teal">Edu</span>SG
      </div>
      <div className="mt-1 text-sm font-semibold text-teal">Learn smart. Play bright.</div>
    </div>
  );
}

function Avatar({ label, size = "h-12 w-12", framed = false }) {
  return (
    <div
      className={cx(
        "grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-sun to-coral font-black text-white",
        framed && "ring-[3px] ring-sun ring-offset-2 shadow-lg shadow-sun/40",
        size
      )}
    >
      {label}
    </div>
  );
}

function RoleSwitch({ role, onChange, options = roleOptions }) {
  return (
    <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={cx("rounded-md px-3 py-2 text-sm font-bold capitalize", role === option ? "bg-ink text-white" : "text-slate-500")}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

const adminTopics = [
  "Plant System: Plant Parts and Functions",
  "Human System: Digestive System",
  "Cycles in Matter and Water: Matter",
  "Energy Forms and Uses: Light",
  "Energy Forms and Uses: Heat",
  "Age Problems",
  "Angles",
  "Area",
  "Area and Perimeter",
  "Calendar Reasoning",
  "Combinatorics",
  "Counting",
  "Counting Shapes",
  "Cryptarithms",
  "Data Interpretation",
  "Decimals",
  "Divisibility",
  "Equation",
  "Factors and Multiples",
  "Factorials",
  "Four Operations",
  "Fractions",
  "Geometry",
  "Geometry Patterns",
  "Line Symmetry",
  "Nets",
  "Number Patterns",
  "Number Properties",
  "Number Theory",
  "Olympiad Patterns",
  "Pigeonhole Principle",
  "Ratio and Speed",
  "Rectangle and Square",
  "Spatial Reasoning",
  "Tables, Line Graphs and Pie Charts",
  "Time",
  "Visual Patterns",
  "Whole Numbers"
];

const difficultyOptions = ["Easy", "Medium", "Hard"];
const trackOptions = ["Fundamental", "Core", "Olympiad"];
const adminGrades = ["P1", "P2", "P3", "P4", "P5", "P6"];

const emptyAdminDraft = {
  subject: "Math",
  grade: "P4",
  ageLevel: "P4",
  topic: "Olympiad Patterns",
  level: 8,
  difficulty: "Medium",
  track: "Olympiad",
  prompt: "",
  helpText: "",
  type: "multiple",
  options: ["A", "B", "C", "D"],
  answer: "",
  acceptedAnswers: [],
  explanation: "",
  hint: "",
  source: "Admin-created",
  imageUrl: ""
};

function AdminDashboard({
  user,
  role,
  onRoleChange,
  questions,
  subject,
  grade,
  status,
  onFilterChange,
  onUpdateQuestion,
  onCreateQuestion,
  users,
  platformInfo,
  adminSection,
  setAdminSection,
  onCreateUser,
  onUpdateUser,
  onUploadQuestionImage,
  onGenerateSimilarQuestion,
  studentInsights,
  onRefreshInsights,
  chineseAdminStatus,
  onChineseAdminStatus
}) {
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [newDraft, setNewDraft] = useState({ ...emptyAdminDraft, subject, grade, ageLevel: grade });
  const byDifficulty = useMemo(() => {
    return questions.reduce(
      (summary, question) => {
        summary[question.difficulty] = (summary[question.difficulty] || 0) + 1;
        return summary;
      },
      { Easy: 0, Medium: 0, Hard: 0 }
    );
  }, [questions]);
  const userTabs = [
    { id: "insights", label: "Student Insights", icon: Brain },
    { id: "users", label: "Students", icon: Users },
    { id: "parents", label: "Parents", icon: UserRoundCog }
  ];
  const userTabIds = userTabs.map((tab) => tab.id);
  const adminNav = [
    { id: "overview", label: "Overview", hint: "Command center", icon: LayoutDashboard },
    { id: "insights", label: "Users", hint: "Insights, students, parents", icon: Users, sections: userTabIds },
    { id: "platform", label: "Platform Management", hint: "Settings and access", icon: SlidersHorizontal },
    { id: "questions", label: "Question Bank", hint: "Curriculum assets", icon: Database, sections: ["questions", "chinese"] }
  ];
  const isNavItemActive = (item) => (item.sections ? item.sections.includes(adminSection) : item.id === adminSection);
  const activeAdminItem = adminNav.find(isNavItemActive) || adminNav[0];
  const isUsersPanel = userTabIds.includes(adminSection);
  const questionSubjectTabs = [
    { id: "Math", label: "Math", icon: Sigma },
    { id: "English", label: "English", icon: BookOpenText },
    { id: "chinese-content", label: "Chinese", hint: "Vocab & levels", icon: Languages },
    { id: "Science", label: "Science", icon: FlaskConical }
  ];
  const isQuestionsPanel = adminSection === "questions" || adminSection === "chinese";

  useEffect(() => {
    setNewDraft((current) => ({ ...current, subject, grade, ageLevel: grade }));
  }, [subject, grade]);

  function updateNewDraft(field, value) {
    setNewDraft((current) => ({ ...current, [field]: value }));
  }

  async function addQuestion(event) {
    event.preventDefault();
    await onCreateQuestion({ ...newDraft, subject, grade, ageLevel: grade });
    setNewDraft({ ...emptyAdminDraft, subject, grade, ageLevel: grade });
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-ink">
      <main className="grid min-h-screen xl:grid-cols-[288px_minmax(0,1fr)]">
        <aside className="flex min-w-0 flex-col gap-5 bg-ink px-4 py-6 text-white">
          <div className="flex items-center gap-3 px-1 pb-2">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-white font-black text-ink">SG</div>
            <div>
              <div className="text-xl font-black leading-tight">SgEdu</div>
              <div className="text-xs font-semibold text-slate-300">Admin Console</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onRoleChange("student")}
            className="grid min-h-11 grid-cols-[34px_minmax(0,1fr)] items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-left text-sm font-black text-slate-100 transition hover:bg-white/10"
          >
            <span className="grid h-8 w-8 place-items-center rounded-md bg-white/10">
              <Home className="h-4 w-4" />
            </span>
            Learning Home
          </button>

          <nav className="grid gap-2" aria-label="Admin dashboard sections">
            {adminNav.map((item) => {
              const active = isNavItemActive(item);
              return (
                <button
                  key={item.id}
                  onClick={() => setAdminSection(item.id)}
                  className={cx(
                    "relative grid min-h-[62px] grid-cols-[38px_minmax(0,1fr)] items-center gap-3 rounded-lg border px-2.5 py-2 text-left transition",
                    active
                      ? "border-white/20 bg-white text-ink shadow-sm before:absolute before:-left-4 before:h-9 before:w-1 before:rounded-r before:bg-teal"
                      : "border-transparent text-slate-100 hover:border-white/15 hover:bg-white/5"
                  )}
                >
                  <span className={cx("grid h-9 w-9 place-items-center rounded-md", active ? "bg-teal/10 text-teal" : "bg-white/10 text-current")}>
                    <item.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-black leading-tight">{item.label}</span>
                    <span className={cx("mt-0.5 block text-xs font-semibold", active ? "text-slate-500" : "text-slate-300")}>{item.hint}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-leaf shadow-[0_0_0_4px_rgba(34,197,94,0.14)]" />
              <div>
                <div className="text-sm font-black">Database connected</div>
                <div className="text-xs text-slate-300">{platformInfo?.stats?.questions || questions.length} questions available</div>
              </div>
            </div>
            <div className="mt-3">
              <RoleSwitch
                role={role}
                onChange={onRoleChange}
                options={user.roles?.length ? user.roles : [user.role]}
              />
            </div>
          </div>
        </aside>

        <section className="min-w-0 bg-slate-50">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-6 md:px-7">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-ink text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-black uppercase text-teal">Administration</p>
            <h1 className="mt-1 text-3xl font-black tracking-normal">{activeAdminItem.label}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Avatar label={user.avatar || "A"} size="h-11 w-11" />
        </div>
      </header>

      <div className="px-5 py-6 md:px-7">
        {isQuestionsPanel && (
        <>
        <div className="mb-5 flex items-end gap-1 border-b border-slate-300" role="tablist" aria-label="Question bank subjects">
          {questionSubjectTabs.map((tab) => {
            const isChineseTab = tab.id === "chinese-content";
            const active = isChineseTab ? adminSection === "chinese" : adminSection === "questions" && subject === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                onClick={() => {
                  if (isChineseTab) {
                    setAdminSection("chinese");
                  } else {
                    setAdminSection("questions");
                    onFilterChange(tab.id, grade);
                  }
                }}
                className={cx(
                  "-mb-px flex items-center gap-2 rounded-t-lg border px-4 py-2.5 text-sm font-black transition",
                  active
                    ? "border-slate-300 border-b-white bg-white text-ink shadow-sm"
                    : "border-transparent text-slate-500 hover:bg-white/70 hover:text-ink"
                )}
              >
                <tab.icon className={cx("h-4 w-4", active ? "text-teal" : "text-slate-400")} />
                {tab.label}
              </button>
            );
          })}
        </div>
        {adminSection === "questions" && (
        <section className="grid gap-4 md:grid-cols-4">
          <AdminMetric icon={ClipboardList} label={`${grade} ${subject}`} value={questions.length} />
          <AdminMetric icon={Medal} label="Easy" value={byDifficulty.Easy || 0} />
          <AdminMetric icon={Target} label="Medium" value={byDifficulty.Medium || 0} />
          <AdminMetric icon={Trophy} label="Hard" value={byDifficulty.Hard || 0} />
        </section>
        )}
        </>
        )}

        {adminSection === "overview" && <AdminOverview platformInfo={platformInfo} users={users} questions={questions} />}
        {isUsersPanel && (
          <>
            <div className="mb-5 flex items-end gap-1 border-b border-slate-300" role="tablist" aria-label="Users sections">
              {userTabs.map((tab) => {
                const active = adminSection === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setAdminSection(tab.id)}
                    className={cx(
                      "-mb-px flex items-center gap-2 rounded-t-lg border px-4 py-2.5 text-sm font-black transition",
                      active
                        ? "border-slate-300 border-b-white bg-white text-ink shadow-sm"
                        : "border-transparent text-slate-500 hover:bg-white/70 hover:text-ink"
                    )}
                  >
                    <tab.icon className={cx("h-4 w-4", active ? "text-teal" : "text-slate-400")} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            {adminSection === "insights" && (
              <StudentInsightsDashboard
                insights={studentInsights}
                selectedStudentId={selectedStudentId}
                onSelectStudent={setSelectedStudentId}
                onRefresh={onRefreshInsights}
              />
            )}
            {adminSection === "users" && <UserManagement users={users} onCreateUser={onCreateUser} onUpdateUser={onUpdateUser} />}
            {adminSection === "parents" && <ParentManagement users={users} onCreateUser={onCreateUser} onUpdateUser={onUpdateUser} />}
          </>
        )}
        {adminSection === "platform" && <PlatformManagement platformInfo={platformInfo} subject={subject} grade={grade} />}

        {adminSection === "chinese" && (
          <ChineseContentAdmin status={chineseAdminStatus} onStatus={onChineseAdminStatus} />
        )}

        {adminSection === "questions" && (
        <section className="mt-5 rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h1 className="text-xl font-black">Question Bank Editor</h1>
              <p className="mt-1 text-sm text-slate-500">Edit student-facing learning and practice content. Changes are saved to the local JSON database.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={grade}
                onChange={(event) => onFilterChange(subject, event.target.value)}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-black outline-none focus:border-teal"
              >
                {adminGrades.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <div className="h-6 min-w-16 text-sm font-black text-leaf">{status}</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1360px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Image</th>
                  <th className="px-4 py-3">Content</th>
                  <th className="px-4 py-3">Topic</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Difficulty</th>
                  <th className="px-4 py-3">Answer</th>
                  <th className="px-4 py-3">Options</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((question) => (
                  <tr key={question.id} className="border-t border-slate-100 align-top">
                    <td className="w-56 px-4 py-4">
                      <QuestionPreviewThumb question={question} />
                      <input
                        value={question.imageUrl || ""}
                        onChange={(event) => onUpdateQuestion(question.id, { imageUrl: event.target.value })}
                        placeholder="/question-assets/..."
                        className="mt-3 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-teal"
                      />
                      <ImageUploadControl onUpload={(imageUrl) => onUpdateQuestion(question.id, { imageUrl })} onUploadQuestionImage={onUploadQuestionImage} compact />
                      <button
                        type="button"
                        disabled={Boolean(question.imageUrl)}
                        onClick={() => onGenerateSimilarQuestion(question.id)}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <WandSparkles className="h-3.5 w-3.5" />
                        Generate similar
                      </button>
                    </td>
                    <td className="w-[420px] px-4 py-4">
                      <EditableArea value={question.prompt} onBlur={(value) => onUpdateQuestion(question.id, { prompt: value })} className="min-h-20 font-black text-slate-800" />
                      <EditableArea value={question.helpText} onBlur={(value) => onUpdateQuestion(question.id, { helpText: value })} placeholder="Help text" className="mt-2 min-h-16 text-slate-600" />
                      <EditableArea value={question.explanation} onBlur={(value) => onUpdateQuestion(question.id, { explanation: value })} placeholder="Explanation" className="mt-2 min-h-20 text-slate-600" />
                      <EditableArea value={question.hint} onBlur={(value) => onUpdateQuestion(question.id, { hint: value })} placeholder="Hint" className="mt-2 min-h-12 text-slate-600" />
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={question.topic}
                        onChange={(event) => onUpdateQuestion(question.id, { topic: event.target.value })}
                        className="w-44 rounded-md border border-slate-200 bg-white px-3 py-2 font-bold outline-none focus:border-teal"
                      >
                        {adminTopics.map((topic) => (
                          <option key={topic} value={topic}>
                            {topic}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <select value={question.level} onChange={(event) => onUpdateQuestion(question.id, { level: event.target.value })} className="w-24 rounded-md border border-slate-200 bg-white px-3 py-2 font-bold outline-none focus:border-teal">
                        {Array.from({ length: 10 }, (_, index) => index + 1).map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={question.difficulty}
                        onChange={(event) => onUpdateQuestion(question.id, { difficulty: event.target.value })}
                        className="w-32 rounded-md border border-slate-200 bg-white px-3 py-2 font-bold outline-none focus:border-teal"
                      >
                        {difficultyOptions.map((difficulty) => (
                          <option key={difficulty} value={difficulty}>
                            {difficulty}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <input
                        value={question.answer}
                        onChange={(event) => onUpdateQuestion(question.id, { answer: event.target.value })}
                        className="w-48 rounded-md border border-slate-200 bg-white px-3 py-2 font-black text-teal outline-none focus:border-teal"
                      />
                    </td>
                    <td className="w-64 px-4 py-4">
                      <EditableArea
                        value={(question.options || []).join("\n")}
                        onBlur={(value) => onUpdateQuestion(question.id, { options: value.split("\n") })}
                        placeholder="One option per line"
                        className="min-h-28 text-slate-600"
                      />
                      <div className="mt-2 text-xs font-semibold text-slate-400">{question.source || "Seed"}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {questions.length === 0 && (
              <div className="px-5 py-10 text-center text-sm font-semibold text-slate-500">
                No questions found for {grade} {subject} yet.
              </div>
            )}
          </div>
        </section>
        )}

        {adminSection === "questions" && (
        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-cloud text-teal">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-black">Add Question</h2>
              <p className="text-sm text-slate-500">Create a new {grade} {subject} question with an optional attached image URL.</p>
            </div>
          </div>
          <form onSubmit={addQuestion} className="mt-5 grid gap-4 xl:grid-cols-[260px_1fr]">
            <div>
              <QuestionPreviewThumb question={newDraft} large />
              <AdminTextInput label="Image URL" value={newDraft.imageUrl} onChange={(value) => updateNewDraft("imageUrl", value)} />
              <ImageUploadControl onUpload={(imageUrl) => updateNewDraft("imageUrl", imageUrl)} onUploadQuestionImage={onUploadQuestionImage} />
              <AdminTextInput label="Source" value={newDraft.source} onChange={(value) => updateNewDraft("source", value)} />
            </div>
            <div className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-4">
                <AdminTextInput label="Topic" value={newDraft.topic} onChange={(value) => updateNewDraft("topic", value)} />
                <label className="text-sm font-bold text-slate-600">
                  Track
                  <select
                    value={newDraft.track}
                    onChange={(event) => updateNewDraft("track", event.target.value)}
                    className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-black outline-none focus:border-teal"
                  >
                    {trackOptions.map((track) => (
                      <option key={track} value={track}>{track}</option>
                    ))}
                  </select>
                </label>
                <AdminTextInput label="Level" type="number" value={newDraft.level} onChange={(value) => updateNewDraft("level", Number(value))} />
                <label className="text-sm font-bold text-slate-600">
                  Difficulty
                  <select value={newDraft.difficulty} onChange={(event) => updateNewDraft("difficulty", event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 outline-none focus:border-teal">
                    {difficultyOptions.map((difficulty) => (
                      <option key={difficulty} value={difficulty}>{difficulty}</option>
                    ))}
                  </select>
                </label>
              </div>
              <EditableArea value={newDraft.prompt} onBlur={(value) => updateNewDraft("prompt", value)} placeholder="Question prompt" className="min-h-20 font-black text-slate-800" />
              <EditableArea value={newDraft.helpText} onBlur={(value) => updateNewDraft("helpText", value)} placeholder="Help text" className="min-h-14 text-slate-600" />
              <div className="grid gap-3 md:grid-cols-2">
                <EditableArea value={(newDraft.options || []).join("\n")} onBlur={(value) => updateNewDraft("options", value.split("\n"))} placeholder="One option per line" className="min-h-28 text-slate-600" />
                <div className="space-y-3">
                  <AdminTextInput label="Answer" value={newDraft.answer} onChange={(value) => updateNewDraft("answer", value)} />
                  <label className="text-sm font-bold text-slate-600">
                    Type
                    <select value={newDraft.type} onChange={(event) => updateNewDraft("type", event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 outline-none focus:border-teal">
                      <option value="multiple">multiple</option>
                      <option value="input">input</option>
                    </select>
                  </label>
                </div>
              </div>
              <EditableArea value={newDraft.explanation} onBlur={(value) => updateNewDraft("explanation", value)} placeholder="Explanation" className="min-h-20 text-slate-600" />
              <AdminTextInput label="Hint" value={newDraft.hint} onChange={(value) => updateNewDraft("hint", value)} />
              <button className="flex w-fit items-center gap-2 rounded-md bg-teal px-5 py-3 font-black text-white">
                <Plus className="h-4 w-4" /> Add question
              </button>
            </div>
          </form>
        </section>
        )}
          </div>
        </section>
      </main>
    </div>
  );
}

function EditableArea({ value, onBlur, placeholder, className }) {
  const [draft, setDraft] = useState(value || "");

  useEffect(() => {
    setDraft(value || "");
  }, [value]);

  return (
    <textarea
      value={draft}
      placeholder={placeholder}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => onBlur(draft)}
      className={cx("w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-5 outline-none focus:border-teal", className)}
    />
  );
}

function ScoreBadge({ score, label, tone = "teal" }) {
  const toneClass = tone === "coral" ? "text-coral" : tone === "leaf" ? "text-leaf" : "text-teal";
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs font-black uppercase text-slate-500">{label}</div>
      <div className={cx("mt-2 text-3xl font-black", toneClass)}>{score}</div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={cx("h-full rounded-full", tone === "coral" ? "bg-coral" : tone === "leaf" ? "bg-leaf" : "bg-teal")} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
    </div>
  );
}

function StudentInsightsDashboard({ insights, selectedStudentId, onSelectStudent, onRefresh }) {
  const students = insights?.students || [];
  const summary = insights?.summary || {};
  const selected = students.find((item) => item.user.id === selectedStudentId) || students[0] || null;

  useEffect(() => {
    if (!selectedStudentId && students[0]) onSelectStudent(students[0].user.id);
  }, [students, selectedStudentId, onSelectStudent]);

  return (
    <section className="mt-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Student Intelligence & Commitment</h2>
          <p className="mt-1 text-sm text-slate-500">See how smart each learner is performing and how committed they are to practice.</p>
        </div>
        <button type="button" onClick={onRefresh} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:border-teal">
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetric icon={Users} label="Students" value={summary.totalStudents || 0} />
        <AdminMetric icon={Brain} label="Avg Smart Score" value={summary.avgSmartScore || 0} />
        <AdminMetric icon={Flame} label="Avg Commitment" value={summary.avgCommitmentScore || 0} />
        <AdminMetric icon={Target} label="At Risk" value={summary.atRiskCount || 0} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-black">All Students</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Smart Score</th>
                  <th className="px-4 py-3">Commitment</th>
                  <th className="px-4 py-3">Accuracy</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Active 7d</th>
                  <th className="px-4 py-3">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {students.map((item) => (
                  <tr
                    key={item.user.id}
                    onClick={() => onSelectStudent(item.user.id)}
                    className={cx(
                      "cursor-pointer border-t border-slate-100 transition hover:bg-slate-50",
                      selected?.user.id === item.user.id && "bg-teal/5"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="font-black text-slate-800">{item.user.name}</div>
                      <div className="text-xs text-slate-500">{item.user.email}</div>
                    </td>
                    <td className="px-4 py-3 font-bold">{item.user.grade || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="font-black text-teal">{item.smartness.score}</div>
                      <div className="text-xs text-slate-500">{item.smartness.label}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-black text-coral">{item.commitment.score}</div>
                      <div className="text-xs text-slate-500">{item.commitment.label}</div>
                    </td>
                    <td className="px-4 py-3 font-bold">{item.smartness.overallAccuracy}%</td>
                    <td className="px-4 py-3 font-bold">L{item.smartness.adaptiveLevel}</td>
                    <td className="px-4 py-3 font-bold">{item.commitment.activeDays7} days</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {item.commitment.lastActiveAt ? new Date(item.commitment.lastActiveAt).toLocaleDateString() : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {students.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-500">No student data yet.</div>}
          </div>
        </div>

        {selected && (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <Avatar label={selected.user.avatar || selected.user.name?.slice(0, 2)} />
                <div>
                  <h3 className="text-lg font-black">{selected.user.name}</h3>
                  <p className="text-sm text-slate-500">{selected.user.email}</p>
                  {selected.parent && <p className="text-xs text-slate-400">Parent: {selected.parent.name}</p>}
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <ScoreBadge score={selected.smartness.score} label="Smart Score" />
                <ScoreBadge score={selected.commitment.score} label="Commitment Score" tone="coral" />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="flex items-center gap-2 font-black">
                <Brain className="h-4 w-4 text-teal" /> How smart is this student?
              </h4>
              <div className="mt-4 grid gap-2 text-sm">
                <InsightRow label="Overall accuracy" value={`${selected.smartness.overallAccuracy}%`} />
                <InsightRow label="Topic mastery avg" value={`${selected.smartness.avgMastery}%`} />
                <InsightRow label="Hard questions (L7+)" value={`${selected.smartness.hardAccuracy}% (${selected.smartness.hardQuestionsAttempted} attempts)`} />
                <InsightRow label="Adaptive level" value={`Level ${selected.smartness.adaptiveLevel}`} />
                <InsightRow label="Recent accuracy trend" value={`${selected.smartness.accuracyTrend >= 0 ? "+" : ""}${selected.smartness.accuracyTrend}%`} />
                <InsightRow label="Olympiad ready" value={selected.smartness.olympiadReady ? "Yes" : "Not yet"} />
              </div>
              <div className="mt-4">
                <p className="text-xs font-black uppercase text-slate-500">Topic mastery</p>
                <div className="mt-2 space-y-2">
                  {Object.entries(selected.smartness.topicMastery).map(([topic, value]) => (
                    <div key={topic}>
                      <div className="flex justify-between text-xs font-bold text-slate-600">
                        <span>{topic}</span>
                        <span>{value}%</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-teal" style={{ width: `${value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="flex items-center gap-2 font-black">
                <Flame className="h-4 w-4 text-coral" /> How committed is this student?
              </h4>
              <div className="mt-4 grid gap-2 text-sm">
                <InsightRow label="Active days (7d / 30d)" value={`${selected.commitment.activeDays7} / ${selected.commitment.activeDays30}`} />
                <InsightRow label="Questions this week" value={selected.commitment.questionsPerWeek} />
                <InsightRow label="Total questions" value={selected.commitment.totalQuestions} />
                <InsightRow label="Study minutes" value={selected.commitment.studyMinutes} />
                <InsightRow label="Login streak" value={`${selected.commitment.loginStreak} days`} />
                <InsightRow label="Practice streak" value={`${selected.commitment.practiceStreak} days`} />
                <InsightRow label="Messages sent" value={selected.commitment.messageCount} />
                <InsightRow label="Parent messages" value={selected.commitment.parentEngagement} />
                <InsightRow label="Logins total" value={selected.commitment.loginCount} />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="font-black">Recent answers</h4>
              <div className="mt-3 space-y-2">
                {selected.recentAnswers.map((answer) => (
                  <div key={answer.id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-bold">{answer.topic} · L{answer.level}</span>
                    <span className={answer.correct ? "font-black text-leaf" : "font-black text-coral"}>{answer.correct ? "Correct" : "Wrong"}</span>
                  </div>
                ))}
                {selected.recentAnswers.length === 0 && <p className="text-sm text-slate-500">No answer history yet.</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function InsightRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
      <span className="font-semibold text-slate-600">{label}</span>
      <span className="font-black text-slate-800">{value}</span>
    </div>
  );
}

function AdminOverview({ platformInfo, users, questions }) {
  const roleCounts = platformInfo?.stats?.roles || {};
  const subjectCounts = platformInfo?.stats?.subjects || {};
  const dash = platformInfo?.dashboard?.stats || {};
  const activity = platformInfo?.dashboard?.activityFeed || [];
  const atRisk = platformInfo?.dashboard?.atRiskStudents || [];
  return (
    <section className="mt-5 space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">Operations command center</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetric icon={Users} label="Users" value={platformInfo?.stats?.users || users.length} />
          <AdminMetric icon={Flame} label="Active today" value={dash.activeToday || 0} />
          <AdminMetric icon={Target} label="Questions today" value={dash.questionsToday || 0} />
          <AdminMetric icon={Brain} label="Avg commitment" value={dash.avgCommitment || 0} />
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">Platform Overview</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetric icon={Users} label="Students" value={dash.students || roleCounts.student || 0} />
          <AdminMetric icon={Database} label="Questions" value={platformInfo?.stats?.questions || questions.length} />
          <AdminMetric icon={MessageCircle} label="Messages" value={platformInfo?.stats?.messages || 0} />
          <AdminMetric icon={WandSparkles} label="At risk" value={dash.atRiskCount || atRisk.length} />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <SummaryList title="Subjects" items={subjectCounts} />
          <SummaryList title="Roles" items={roleCounts} />
        </div>
        {atRisk.length > 0 && (
          <div className="mt-5 rounded-lg border border-orange-200 bg-orange-50 p-4">
            <div className="font-black text-orange-700">Students needing attention</div>
            <ul className="mt-2 space-y-1 text-sm">
              {atRisk.map((s) => (
                <li key={s.id}>{s.name} — commitment {s.commitmentScore}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-black">Live activity</h2>
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm">
          {activity.slice(0, 12).map((item, index) => (
            <div key={index} className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
              <span className="font-bold capitalize">{item.type}</span>
              {item.subject && ` · ${item.subject}`}
              <div className="text-xs text-slate-500">{item.at ? new Date(item.at).toLocaleString() : ""}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-black">Admin Workbench</h2>
        <div className="mt-4 space-y-3 text-sm text-slate-600">
          <WorkbenchItem icon={Database} title="Question Bank" body="Manage Math, Chinese, English and Science question records." />
          <WorkbenchItem icon={Upload} title="Uploads" body="Attach images for figure-based questions using local assets." />
          <WorkbenchItem icon={WandSparkles} title="AI Similar Questions" body="Available for text-only questions; configure OPENAI_API_KEY for live generation." />
        </div>
      </div>
      </div>
      </div>
    </section>
  );
}

function PlatformManagement({ platformInfo, subject, grade }) {
  const settings = platformInfo?.settings || {};
  return (
    <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-md bg-cloud text-teal">
          <SlidersHorizontal className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-black">Platform Management</h2>
          <p className="text-sm text-slate-500">Operational controls for content, access and learning configuration.</p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SettingCard title="Question Bank" value={`${grade} ${subject}`} body="Subject-aware bank with image upload, content editing and AI similar generation." />
        <SettingCard title="Adaptive Levels" value={settings.adaptiveLevels || 10} body="Level 1 to 10 drives practice selection and Olympiad unlocks." />
        <SettingCard title="Image Uploads" value={settings.questionImageUploads ? "Enabled" : "Disabled"} body="Admins can attach local question images to bank records." />
        <SettingCard title="AI Generation" value={settings.aiSimilarGeneration ? "Configured" : "Needs API key"} body="Set OPENAI_API_KEY on the API server to use live AI generation." />
      </div>
      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h3 className="font-black">Question Bank Subjects</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {["Math", "Chinese", "English", "Science"].map((item) => (
            <div key={item} className="rounded-md border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-700">{item}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

function UserManagement({ users, onCreateUser, onUpdateUser }) {
  const students = users.filter((item) => item.role === "student");
  return <PeopleManagement title="User Management" role="student" users={students} allUsers={users} onCreateUser={onCreateUser} onUpdateUser={onUpdateUser} />;
}

function ParentManagement({ users, onCreateUser, onUpdateUser }) {
  const parents = users.filter((item) => item.role === "parent");
  return <PeopleManagement title="Parent Management" role="parent" users={parents} allUsers={users} onCreateUser={onCreateUser} onUpdateUser={onUpdateUser} />;
}

function PeopleManagement({ title, role, users, allUsers, onCreateUser, onUpdateUser }) {
  const [draft, setDraft] = useState({ role, name: "", email: "", password: "", grade: "P4", linkedStudentId: "", linkedParentId: "" });
  const students = allUsers.filter((item) => item.role === "student");
  const parents = allUsers.filter((item) => item.role === "parent");

  useEffect(() => {
    setDraft((current) => ({ ...current, role }));
  }, [role]);

  async function submit(event) {
    event.preventDefault();
    await onCreateUser(draft);
    setDraft({ role, name: "", email: "", password: "", grade: "P4", linkedStudentId: "", linkedParentId: "" });
  }

  return (
    <section className="mt-5 grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-xl font-black">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">Create, link and update {role === "parent" ? "parent accounts" : "student users"}.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">Linked Student</th>
                <th className="px-4 py-3">Linked Parent</th>
              </tr>
            </thead>
            <tbody>
              {users.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <input value={item.name || ""} onChange={(event) => onUpdateUser(item.id, { name: event.target.value })} className="w-full rounded-md border border-slate-200 px-3 py-2 font-bold outline-none focus:border-teal" />
                  </td>
                  <td className="px-4 py-3 font-bold capitalize">{item.role}</td>
                  <td className="px-4 py-3">
                    <input value={item.grade || ""} onChange={(event) => onUpdateUser(item.id, { grade: event.target.value })} className="w-24 rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-teal" />
                  </td>
                  <td className="px-4 py-3">
                    {role === "parent" ? (
                      <div className="space-y-1">
                        {students.map((student) => {
                          const linked = item.linkedStudentIds || (item.linkedStudentId ? [item.linkedStudentId] : []);
                          return (
                            <label key={student.id} className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={linked.includes(student.id)}
                                onChange={(event) => {
                                  const next = event.target.checked
                                    ? [...new Set([...linked, student.id])]
                                    : linked.filter((id) => id !== student.id);
                                  onUpdateUser(item.id, { linkedStudentIds: next, linkedStudentId: next[0] || "" });
                                }}
                              />
                              {student.name}
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                    <select value={item.linkedStudentId || ""} onChange={(event) => onUpdateUser(item.id, { linkedStudentId: event.target.value })} className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-teal">
                      <option value="">None</option>
                      {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
                    </select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select value={item.linkedParentId || ""} onChange={(event) => onUpdateUser(item.id, { linkedParentId: event.target.value })} className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-teal">
                      <option value="">None</option>
                      {parents.map((parent) => <option key={parent.id} value={parent.id}>{parent.name}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-black">Add {role}</h3>
        <AdminTextInput label="Name" value={draft.name} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} />
        <AdminTextInput label="Email" value={draft.email} onChange={(value) => setDraft((current) => ({ ...current, email: value }))} />
        <AdminTextInput label="Password" value={draft.password} onChange={(value) => setDraft((current) => ({ ...current, password: value }))} />
        {role === "student" && <AdminTextInput label="Grade" value={draft.grade} onChange={(value) => setDraft((current) => ({ ...current, grade: value }))} />}
        {role === "parent" && (
          <label className="mt-3 block text-sm font-bold text-slate-600">
            Linked Student
            <select value={draft.linkedStudentId} onChange={(event) => setDraft((current) => ({ ...current, linkedStudentId: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 outline-none focus:border-teal">
              <option value="">Select student</option>
              {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
            </select>
          </label>
        )}
        <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-teal px-4 py-3 font-black text-white">
          <Plus className="h-4 w-4" /> Add
        </button>
      </form>
    </section>
  );
}

function ImageUploadControl({ onUpload, onUploadQuestionImage, compact = false }) {
  async function handleChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const imageUrl = await onUploadQuestionImage(file);
    onUpload(imageUrl);
    event.target.value = "";
  }

  return (
    <label className={cx("flex cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 font-black text-slate-600 hover:bg-slate-50", compact ? "mt-2 text-xs" : "mt-3 text-sm")}>
      <Upload className="h-4 w-4" />
      Upload image
      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleChange} className="hidden" />
    </label>
  );
}

function SummaryList({ title, items }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <h3 className="font-black">{title}</h3>
      <div className="mt-3 space-y-2">
        {Object.entries(items).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
            <span className="font-bold">{key}</span>
            <span className="font-black text-teal">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkbenchItem({ icon: Icon, title, body }) {
  return (
    <div className="flex gap-3 rounded-lg border border-slate-200 p-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-cloud text-teal">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="font-black text-slate-800">{title}</div>
        <p className="mt-1 leading-5">{body}</p>
      </div>
    </div>
  );
}

function SettingCard({ title, value, body }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="text-sm font-black text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-black text-ink">{value}</div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
    </div>
  );
}

function QuestionPreviewThumb({ question, large = false }) {
  if (!question.imageUrl) {
    return (
      <div className={cx("grid place-items-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-slate-400", large ? "h-52 w-full" : "h-36 w-full")}>
        <Image className="h-6 w-6" />
      </div>
    );
  }
  return <img src={question.imageUrl} alt={question.prompt || "Question image"} className={cx("w-full rounded-md border border-slate-200 object-contain object-top", large ? "max-h-72" : "max-h-48")} />;
}

function AdminTextInput({ label, value, onChange, type = "text" }) {
  return (
    <label className="mt-3 block text-sm font-bold text-slate-600">
      {label}
      <input value={value || ""} type={type} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 outline-none focus:border-teal" />
    </label>
  );
}

function AdminMetric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-2xl font-black">{value}</div>
          <div className="text-sm font-semibold text-slate-500">{label}</div>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-md bg-cloud text-teal">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, value, label, color }) {
  return (
    <div className="hidden items-center gap-2 border-l border-slate-200 pl-4 md:flex">
      <Icon className={cx("h-6 w-6 fill-current", color)} />
      <div>
        <div className="text-lg font-black">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}

function LessonCard({ progress, question, onStartLesson, onQuickChallenge }) {
  const topic = question?.topic || "Math Practice";
  const helpText = question?.helpText || "Choose a topic and start practising to build your mastery.";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_320px] lg:items-center">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left lg:gap-5">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blue-600 to-teal text-white shadow-lg shadow-blue-500/20 md:h-24 md:w-24">
            <Target className="h-10 w-10 md:h-12 md:w-12" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-black text-blue-600">Adaptive Lesson</div>
            <h2 className="mt-2 text-xl font-black md:text-2xl">{topic}: Level {progress.adaptiveLevel}</h2>
            <p className="mt-2 text-sm text-slate-500">{helpText}</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm sm:justify-start">
              <span className="font-black lg:hidden">Level {progress.adaptiveLevel}/10</span>
              <span className="hidden font-black lg:inline">Level {progress.adaptiveLevel}</span>
              <div className="hidden lg:block">
                <ProgressDots level={progress.adaptiveLevel} />
              </div>
              <span className="text-slate-500">~15 min</span>
              <span className={cx("font-bold", progress.unlockedOlympiad ? "text-coral" : "text-slate-500")}>
                {progress.unlockedOlympiad ? "Olympiad unlocked" : "Olympiad at L8"}
              </span>
            </div>
          </div>
        </div>
        <div className="w-full space-y-3">
          <button type="button" onClick={onStartLesson} className="flex w-full items-center justify-center gap-2 rounded-md bg-teal px-4 py-4 font-black text-white shadow-lg shadow-teal/20">
            <Sparkles className="h-5 w-5" /> Start Lesson
          </button>
          <button type="button" onClick={onQuickChallenge} className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-3 font-bold text-slate-700">
            <Zap className="h-5 w-5 text-sun" /> Try a Quick Challenge
          </button>
        </div>
      </div>
    </div>
  );
}

function ProgressDots({ level }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 10 }, (_, index) => (
        <span key={index} className={cx("h-3 w-3 rounded-full", index < level ? "bg-leaf" : "bg-slate-200")} />
      ))}
    </div>
  );
}

function PracticeCard({ question, selectedAnswer, setSelectedAnswer, submitAnswer, feedback }) {
  if (!question) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-black">Practice Question</h2>
        <p className="mt-4 text-sm font-semibold text-slate-500">Loading your next question...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-black">Practice Question</h2>
        <span className="text-sm text-slate-500">{question.track} question</span>
      </div>
      <div className="mt-8 text-3xl font-black">{question.prompt}</div>
      <p className="mt-3 text-slate-500">{question.helpText}</p>
      {question.imageUrl && (
        <img src={question.imageUrl} alt={question.prompt} className="mt-5 max-h-96 w-full rounded-lg border border-slate-200 object-contain object-top" />
      )}

      {question.type === "multiple" ? (
        <div className="mt-7 grid grid-cols-2 gap-3">
          {question.options.map((option, index) => (
            <button
              key={option}
              onClick={() => setSelectedAnswer(option)}
              className={cx(
                "flex min-h-20 items-center justify-between rounded-lg border px-5 text-left text-xl font-black transition",
                selectedAnswer === option ? "border-leaf bg-green-50 text-leaf" : "border-slate-200 bg-white hover:border-teal"
              )}
            >
              <span className="text-base text-slate-500">{String.fromCharCode(65 + index)}</span>
              {option}
            </button>
          ))}
        </div>
      ) : (
        <input
          value={selectedAnswer}
          onChange={(event) => setSelectedAnswer(event.target.value)}
          className="mt-7 w-full rounded-lg border border-slate-200 px-4 py-4 text-xl font-bold outline-none focus:border-teal"
          placeholder="Type your answer"
        />
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button className="flex items-center gap-2 font-bold text-slate-600">
          <PenLine className="h-4 w-4" /> Show working
        </button>
        <button onClick={submitAnswer} className="rounded-md bg-teal px-8 py-3 font-black text-white disabled:opacity-40" disabled={!selectedAnswer}>
          Check Answer
        </button>
      </div>

      {feedback && (
        <div className={cx("mt-4 rounded-lg border p-4", feedback.isCorrect ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50")}>
          <div className="flex items-center gap-2 font-black">
            <Ollie mood={feedback.isCorrect ? "cheer" : "think"} size={40} />
            {feedback.isCorrect ? "Great work!" : "Good try. EduSG adjusted the path."}
          </div>
          <p className="mt-1 text-sm text-slate-600">{feedback.explanation}</p>
        </div>
      )}
    </div>
  );
}

function LevelProgress({ level }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-black">Level Progress (1-10)</h2>
      <div className="relative mt-14 h-32">
        <div className="absolute left-7 right-7 top-14 h-1 rounded bg-slate-200" />
        {Array.from({ length: 10 }, (_, index) => {
          const itemLevel = index + 1;
          return (
            <div key={itemLevel} className="absolute" style={{ left: `calc(${index * 10.8}% + 8px)`, top: `${80 - index * 6}px` }}>
              <div className={cx("grid h-10 w-10 place-items-center rounded-full font-black shadow-sm", itemLevel <= level ? "bg-leaf text-white" : "bg-slate-200 text-slate-500", itemLevel === level && "ring-4 ring-orange-200")}>
                {itemLevel}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Trophy className="h-6 w-6 text-sun" />
        <div>
          <div className="font-black">Level {level} - On track!</div>
          <div className="text-sm text-slate-500">Answer 3 in a row to unlock the next level.</div>
        </div>
      </div>
      <div className="mt-4 h-2 rounded-full bg-slate-200">
        <div className="h-2 rounded-full bg-leaf" style={{ width: `${level * 10}%` }} />
      </div>
    </div>
  );
}

function TopicMastery({ topics, questions, selectedTopic, setSelectedTopic, collapseLinkedQuestions = false }) {
  const icons = [LineChart, Sigma, Medal, Target, BarChart3];
  const topicEntries = Object.entries(topics);
  const activeTopic = selectedTopic || topicEntries[0]?.[0] || "";
  const linkedQuestions = questions.filter((question) => question.topic === activeTopic);
  const [linkedOpen, setLinkedOpen] = useState(!collapseLinkedQuestions);
  const topicQuestionCount = useMemo(() => {
    return questions.reduce((counts, question) => {
      counts[question.topic] = (counts[question.topic] || 0) + 1;
      return counts;
    }, {});
  }, [questions]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-black">Topic Mastery</h2>
        <button onClick={() => setSelectedTopic(activeTopic)} className="flex items-center gap-1 text-sm font-bold text-teal">View all topics <ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-5">
        {topicEntries.map(([topic, score], index) => {
          const Icon = icons[index % icons.length];
          const isActive = activeTopic === topic;
          return (
            <button
              key={topic}
              onClick={() => setSelectedTopic(topic)}
              className={cx("rounded-lg border p-4 text-left transition", isActive ? "border-teal bg-teal/5 shadow-sm" : "border-slate-200 hover:border-teal")}
            >
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-cloud text-teal">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black leading-tight sm:text-sm">{topic}</div>
                  <div className="text-sm text-slate-500">{score}%</div>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-teal" style={{ width: `${score}%` }} />
              </div>
              <div className="mt-3 text-xs font-bold text-slate-500">
                {topicQuestionCount[topic] || 0} linked question{(topicQuestionCount[topic] || 0) === 1 ? "" : "s"}
              </div>
            </button>
          );
        })}
      </div>
      {collapseLinkedQuestions ? (
        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => setLinkedOpen((current) => !current)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-black text-teal"
          >
            <span>Linked Questions ({linkedQuestions.length})</span>
            <ChevronRight className={cx("h-4 w-4 transition", linkedOpen && "rotate-90")} />
          </button>
          {linkedOpen && (
            <div className="border-t border-slate-200 p-4">
              <LinkedQuestionsList activeTopic={activeTopic} linkedQuestions={linkedQuestions} />
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <LinkedQuestionsList activeTopic={activeTopic} linkedQuestions={linkedQuestions} showHeader countBadge />
        </div>
      )}
    </div>
  );
}

function LinkedQuestionsList({ activeTopic, linkedQuestions, showHeader = false, countBadge = false }) {
  return (
    <>
      {showHeader && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-teal">{activeTopic}</div>
            <h3 className="mt-1 font-black">Linked Questions</h3>
          </div>
          {countBadge && (
            <span className="rounded-md bg-white px-3 py-2 text-sm font-black text-slate-600">{linkedQuestions.length}</span>
          )}
        </div>
      )}
      {linkedQuestions.length === 0 ? (
        <p className={cx("text-sm font-semibold text-slate-500", showHeader && "mt-4")}>No bank questions are linked to this topic yet.</p>
      ) : (
        <div className={cx("grid gap-3 lg:grid-cols-2", showHeader && "mt-4")}>
          {linkedQuestions.slice(0, 6).map((linkedQuestion) => (
            <div key={linkedQuestion.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex gap-3">
                {linkedQuestion.imageUrl ? (
                  <img src={linkedQuestion.imageUrl} alt="" className="h-20 w-24 shrink-0 rounded-md border border-slate-200 object-cover object-top" />
                ) : (
                  <div className="grid h-20 w-24 shrink-0 place-items-center rounded-md border border-slate-200 bg-cloud text-teal">
                    <BookOpenText className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-sm font-black leading-5">{linkedQuestion.prompt}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-bold text-slate-500">
                    <span className="rounded bg-slate-50 px-2 py-1">L{linkedQuestion.level}</span>
                    <span className="rounded bg-slate-50 px-2 py-1">{linkedQuestion.difficulty || "Core"}</span>
                    <span className="rounded bg-slate-50 px-2 py-1">{linkedQuestion.track}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function MyProgressPanel({ activeSubject, progress, accuracy, student }) {
  const isChinese = activeSubject === "Chinese";
  const { strengths, focus } = useMemo(() => {
    if (isChinese) {
      const picked = pickChineseStrengthsAndFocus(progress.topicMastery || {});
      const topicLabels = Object.keys(progress.topicMastery || {});
      return {
        strengths: picked.strengths.length ? picked.strengths : ["Start practising vocab"],
        focus: picked.focus.length ? picked.focus : topicLabels.slice(0, 2)
      };
    }
    const sortedHigh = Object.entries(progress.topicMastery || {}).sort((a, b) => b[1] - a[1]);
    const sortedLow = Object.entries(progress.topicMastery || {}).sort((a, b) => a[1] - b[1]);
    return {
      strengths: sortedHigh.slice(0, 3).map(([topic]) => topic),
      focus: sortedLow.slice(0, 2).map(([topic]) => topic)
    };
  }, [isChinese, progress.topicMastery]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black">My progress</h2>
        <Ollie mood="happy" size={40} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className={cx("rounded-lg bg-coral/10 p-3 text-center", (student?.streak || 0) >= 3 && "flame-hot")}>
          <div className="text-xl font-black text-coral">{student?.streak || 0}</div>
          <div className="text-xs font-bold text-slate-500">Day streak</div>
        </div>
        <div className="rounded-lg bg-sun/15 p-3 text-center">
          <div className="text-xl font-black text-orange-600">{student?.stars || 0}</div>
          <div className="text-xs font-bold text-slate-500">Stars</div>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-slate-200 p-4">
        <div className="font-black">This week</div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <Metric value={`${Math.floor(progress.studyMinutes / 60)}h ${progress.studyMinutes % 60}m`} label="Study time" />
          <Metric value={`${accuracy}%`} label="Accuracy" />
          <Metric value={`+${progress.starsEarnedWeek}`} label="Stars earned" />
        </div>
        <ListBlock title="I'm great at" items={strengths} good />
        <ListBlock title="Practice next" items={focus} />
      </div>
    </div>
  );
}

function Metric({ value, label }) {
  return (
    <div>
      <div className="text-lg font-black">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function ListBlock({ title, items, good = false }) {
  return (
    <div className="mt-5">
      <div className="text-sm font-black">{title}</div>
      <div className="mt-2 space-y-2">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-2 text-sm text-slate-600">
            <span className={cx("grid h-4 w-4 place-items-center rounded-full text-[10px] text-white", good ? "bg-leaf" : "bg-orange-500")}>{good ? "✓" : "!"}</span>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function Messages({ messages, user, student, value, setValue, onSend }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black">Messages</h2>
        <button className="flex items-center gap-1 text-sm font-bold text-teal">View all messages <ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="mt-4 space-y-3">
        {messages.slice(0, 3).map((message) => (
          <div key={message.id} className="flex gap-3 rounded-lg border border-slate-200 p-3">
            <Avatar label={message.senderName === student.name ? student.avatar : "M"} size="h-10 w-10" />
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-2">
                <div className="font-black">{message.senderName}</div>
                <div className="text-xs text-slate-400">{new Date(message.createdAt).toLocaleDateString("en-SG", { month: "short", day: "numeric" })}</div>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-slate-600">{message.text}</p>
            </div>
            <MessageCircle className="mt-1 h-4 w-4 shrink-0 text-leaf" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && onSend()}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:border-teal"
          placeholder={`Message as ${user.name}`}
        />
        <button onClick={onSend} className="grid h-12 w-12 place-items-center rounded-full bg-teal text-white">
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export function AdminAppShell() {
  const { session, switchRole, role } = useSession();
  const user = session?.user;
  const [adminQuestions, setAdminQuestions] = useState([]);
  const [adminSubject, setAdminSubject] = useState("Math");
  const [adminGrade, setAdminGrade] = useState("P4");
  const [adminStatus, setAdminStatus] = useState("");
  const [adminUsers, setAdminUsers] = useState([]);
  const [platformInfo, setPlatformInfo] = useState(null);
  const [adminSection, setAdminSection] = useState("overview");
  const [studentInsights, setStudentInsights] = useState(null);
  const [adminDashboard, setAdminDashboard] = useState(null);
  const [chineseAdminStatus, setChineseAdminStatus] = useState("");

  useEffect(() => {
    loadAdminQuestions();
    loadAdminMeta();
    loadStudentInsights();
    fetchJson("/admin/dashboard").then(setAdminDashboard).catch(() => {});
  }, []);

  async function loadStudentInsights() {
    const result = await fetchJson("/admin/student-insights");
    setStudentInsights(result);
  }

  async function loadAdminQuestions(subject = adminSubject, grade = adminGrade) {
    const result = await fetchJson(`/admin/questions?subject=${encodeURIComponent(subject)}&grade=${encodeURIComponent(grade)}`);
    setAdminQuestions(result.questions);
    setAdminSubject(subject);
    setAdminGrade(grade);
  }

  async function loadAdminMeta() {
    const [platform, userData] = await Promise.all([fetchJson("/admin/platform"), fetchJson("/admin/users")]);
    setPlatformInfo({ ...platform, dashboard: adminDashboard });
    setAdminUsers(userData.users);
  }

  async function updateAdminQuestion(questionId, changes) {
    setAdminStatus("Saving...");
    const result = await fetchJson(`/admin/questions/${questionId}`, { method: "PATCH", body: JSON.stringify(changes) });
    setAdminQuestions((current) => current.map((item) => (item.id === questionId ? result.question : item)));
    setAdminStatus("Saved");
    window.setTimeout(() => setAdminStatus(""), 1400);
  }

  async function createAdminQuestion(questionData) {
    setAdminStatus("Adding...");
    const result = await fetchJson("/admin/questions", { method: "POST", body: JSON.stringify(questionData) });
    setAdminQuestions((current) => [...current, result.question]);
    setAdminStatus("Added");
    window.setTimeout(() => setAdminStatus(""), 1400);
  }

  async function createAdminUser(userData) {
    setAdminStatus("Adding user...");
    const result = await fetchJson("/admin/users", { method: "POST", body: JSON.stringify(userData) });
    setAdminUsers((current) => [...current, result.user]);
    setAdminStatus("User added");
    window.setTimeout(() => setAdminStatus(""), 1400);
  }

  async function updateAdminUser(userId, changes) {
    setAdminStatus("Saving user...");
    const result = await fetchJson(`/admin/users/${userId}`, { method: "PATCH", body: JSON.stringify({ ...changes, adminUserId: user?.id }) });
    setAdminUsers((current) => current.map((item) => (item.id === userId ? result.user : item)));
    setAdminStatus("User saved");
    window.setTimeout(() => setAdminStatus(""), 1400);
  }

  async function uploadQuestionImage(file) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const result = await fetchJson("/admin/question-images", { method: "POST", body: JSON.stringify({ filename: file.name, dataUrl }) });
    return result.imageUrl;
  }

  async function generateSimilarQuestion(questionId) {
    setAdminStatus("Generating...");
    const result = await fetchJson(`/admin/questions/${questionId}/generate-similar`, { method: "POST" });
    setAdminQuestions((current) => [...current, result.question]);
    setAdminStatus(result.usedAI ? "AI question added" : "Similar question added");
    window.setTimeout(() => setAdminStatus(""), 1600);
  }

  if (!user) return null;

  return (
    <AdminDashboard
      user={user}
      role={role}
      onRoleChange={switchRole}
      questions={adminQuestions}
      subject={adminSubject}
      grade={adminGrade}
      status={adminStatus}
      onFilterChange={loadAdminQuestions}
      onUpdateQuestion={updateAdminQuestion}
      onCreateQuestion={createAdminQuestion}
      users={adminUsers}
      platformInfo={{ ...platformInfo, dashboard: adminDashboard }}
      adminSection={adminSection}
      setAdminSection={setAdminSection}
      onCreateUser={createAdminUser}
      onUpdateUser={updateAdminUser}
      onUploadQuestionImage={uploadQuestionImage}
      onGenerateSimilarQuestion={generateSimilarQuestion}
      studentInsights={studentInsights}
      onRefreshInsights={loadStudentInsights}
      chineseAdminStatus={chineseAdminStatus}
      onChineseAdminStatus={setChineseAdminStatus}
    />
  );
}

