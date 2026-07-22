import { scienceP4Questions, thinkAcademyP4OlympiadQuestions } from "./questionBank.js";
import { p4FundamentalMathQuestions } from "./p4FundamentalQuestions.js";
import { p4EquationQuestions } from "./p4EquationQuestions.js";
import { p4CountingShapesQuestions } from "./p4CountingShapesQuestions.js";
import { englishP4Questions } from "./englishQuestions.js";

export const seedDatabase = {
  users: [
    {
      id: "stu-jayden",
      role: "student",
      name: "Jayden Tan",
      email: "jayden@edusg.sg",
      grade: "P4",
      avatar: "JT",
      linkedParentId: "par-mum",
      stars: 2450,
      streak: 12,
      currentSubject: "Math",
      dailyMinutesTarget: 120,
      notificationPrefs: { achievements: true, parentMessages: true, reminders: true },
      dashboardOnboarded: true,
      lastActiveAt: "2026-06-29T08:00:00.000Z"
    },
    {
      id: "stu-emma",
      role: "student",
      name: "Emma Tan",
      email: "emma@edusg.sg",
      grade: "P2",
      avatar: "ET",
      linkedParentId: "par-mum",
      stars: 890,
      streak: 5,
      currentSubject: "English",
      dailyMinutesTarget: 60,
      notificationPrefs: { achievements: true, parentMessages: true, reminders: true },
      dashboardOnboarded: true,
      lastActiveAt: "2026-06-28T16:00:00.000Z"
    },
    {
      id: "stu-steven",
      role: "student",
      name: "Steven Pham",
      email: "stevenpham@edusg.sg",
      grade: "P4",
      avatar: "SP",
      linkedParentId: "usr-philip",
      stars: 1200,
      streak: 7,
      currentSubject: "Math",
      dailyMinutesTarget: 90,
      notificationPrefs: { achievements: true, parentMessages: true, reminders: true },
      dashboardOnboarded: true,
      lastActiveAt: "2026-06-29T09:00:00.000Z"
    },
    {
      id: "stu-anna",
      role: "student",
      name: "Anna Pham",
      email: "annapham@edusg.sg",
      grade: "P2",
      avatar: "AP",
      linkedParentId: "usr-philip",
      stars: 640,
      streak: 3,
      currentSubject: "English",
      dailyMinutesTarget: 45,
      notificationPrefs: { achievements: true, parentMessages: true, reminders: true },
      dashboardOnboarded: true,
      lastActiveAt: "2026-06-28T12:00:00.000Z"
    },
    {
      id: "usr-philip",
      role: "admin",
      roles: ["admin", "parent"],
      name: "Philip",
      email: "tphuongcdc@edusg.sg",
      avatar: "PH",
      linkedStudentId: "stu-steven",
      linkedStudentIds: ["stu-steven", "stu-anna"],
      notificationPrefs: { weeklyReport: true, alerts: true },
      dashboardOnboarded: true
    },
    {
      id: "par-mum",
      role: "parent",
      name: "Mum",
      email: "mum@edusg.sg",
      avatar: "M",
      linkedStudentId: "stu-jayden",
      linkedStudentIds: ["stu-jayden", "stu-emma"],
      notificationPrefs: { weeklyReport: true, alerts: true },
      dashboardOnboarded: true
    },
    {
      id: "admin-content",
      role: "admin",
      name: "Content Admin",
      email: "admin@edusg.sg",
      avatar: "CA",
      linkedStudentId: "stu-jayden"
    }
  ],
  progress: {
    "stu-jayden": {
      Math: {
        grade: "P4",
        adaptiveLevel: 4,
        correctStreak: 1,
        struggleStreak: 0,
        answered: 18,
        correct: 15,
        studyMinutes: 260,
        starsEarnedWeek: 18,
        unlockedOlympiad: false,
        topicMastery: {
          Fractions: 80,
          "Whole Numbers": 70,
          Decimals: 45,
          Geometry: 60,
          Measurement: 30
        },
        levelHistory: [1, 2, 3, 4],
        recentAnswers: [
          { topic: "Fractions", correct: true, level: 4 },
          { topic: "Geometry", correct: false, level: 5 },
          { topic: "Whole Numbers", correct: true, level: 3 }
        ]
      },
      Chinese: {
        rememberedWords: {}
      },
      English: {
        grade: "P4",
        adaptiveLevel: 3,
        correctStreak: 1,
        struggleStreak: 0,
        answered: 12,
        correct: 9,
        studyMinutes: 85,
        starsEarnedWeek: 14,
        unlockedChampionLeague: false,
        titleRank: "Word Explorer",
        topicMastery: {
          "Subject-Verb Agreement": 65,
          "Prepositions & Conjunctions": 55,
          "Synthesis Basics": 40,
          "Editing": 50,
          "Inference & Vocabulary": 70,
          "Comprehension MCQ": 45
        },
        levelHistory: [1, 2, 3],
        recentAnswers: [
          { topic: "Subject-Verb Agreement", correct: true, level: 3 },
          { topic: "Editing", correct: false, level: 3 },
          { topic: "Inference & Vocabulary", correct: true, level: 3 }
        ],
        completedLessons: ["P4|Subject-Verb Agreement", "P4|Prepositions & Conjunctions"],
        unlockedGames: ["word-quest", "grammar-ninja", "sentence-scramble"]
      },
      Science: {
        grade: "P4",
        adaptiveLevel: 2,
        correctStreak: 0,
        struggleStreak: 0,
        answered: 6,
        correct: 4,
        studyMinutes: 45,
        starsEarnedWeek: 6,
        topicMastery: {
          "Plant Parts": 70,
          "Digestive System": 55,
          Matter: 40
        },
        levelHistory: [1, 2],
        recentAnswers: []
      }
    },
    "stu-emma": {
      Math: {
        grade: "P2",
        adaptiveLevel: 2,
        correctStreak: 1,
        struggleStreak: 0,
        answered: 8,
        correct: 6,
        studyMinutes: 40,
        starsEarnedWeek: 8,
        unlockedOlympiad: false,
        topicMastery: { "Whole Numbers": 60, Fractions: 35 },
        levelHistory: [1, 2],
        recentAnswers: []
      },
      English: {
        grade: "P2",
        adaptiveLevel: 2,
        answered: 5,
        correct: 4,
        studyMinutes: 30,
        starsEarnedWeek: 5,
        topicMastery: { Phonics: 55 },
        levelHistory: [1, 2],
        recentAnswers: [],
        completedLessons: [],
        unlockedGames: ["word-quest"]
      },
      Chinese: { rememberedWords: {} },
      Science: {
        grade: "P2",
        adaptiveLevel: 1,
        answered: 2,
        correct: 1,
        studyMinutes: 15,
        topicMastery: {},
        levelHistory: [1],
        recentAnswers: []
      }
    },
    "stu-steven": {
      Math: {
        grade: "P4",
        adaptiveLevel: 3,
        correctStreak: 2,
        struggleStreak: 0,
        answered: 14,
        correct: 11,
        studyMinutes: 180,
        starsEarnedWeek: 12,
        unlockedOlympiad: false,
        topicMastery: {
          Fractions: 65,
          "Whole Numbers": 75,
          Decimals: 50,
          Geometry: 55
        },
        levelHistory: [1, 2, 3],
        recentAnswers: [
          { topic: "Fractions", correct: true, level: 3 },
          { topic: "Decimals", correct: false, level: 3 }
        ]
      },
      English: {
        grade: "P4",
        adaptiveLevel: 2,
        answered: 8,
        correct: 6,
        studyMinutes: 60,
        starsEarnedWeek: 8,
        topicMastery: { "Subject-Verb Agreement": 50, Editing: 45 },
        levelHistory: [1, 2],
        recentAnswers: [],
        completedLessons: [],
        unlockedGames: ["word-quest"]
      },
      Chinese: { rememberedWords: {} },
      Science: {
        grade: "P4",
        adaptiveLevel: 2,
        answered: 4,
        correct: 3,
        studyMinutes: 35,
        topicMastery: { "Plant Parts": 60 },
        levelHistory: [1, 2],
        recentAnswers: []
      }
    },
    "stu-anna": {
      Math: {
        grade: "P2",
        adaptiveLevel: 2,
        correctStreak: 1,
        struggleStreak: 0,
        answered: 6,
        correct: 5,
        studyMinutes: 35,
        starsEarnedWeek: 6,
        unlockedOlympiad: false,
        topicMastery: { "Whole Numbers": 55 },
        levelHistory: [1, 2],
        recentAnswers: []
      },
      English: {
        grade: "P2",
        adaptiveLevel: 2,
        answered: 7,
        correct: 6,
        studyMinutes: 40,
        starsEarnedWeek: 7,
        topicMastery: { Phonics: 60 },
        levelHistory: [1, 2],
        recentAnswers: [],
        completedLessons: [],
        unlockedGames: ["word-quest"]
      },
      Chinese: { rememberedWords: {} },
      Science: {
        grade: "P2",
        adaptiveLevel: 1,
        answered: 3,
        correct: 2,
        studyMinutes: 20,
        topicMastery: {},
        levelHistory: [1],
        recentAnswers: []
      }
    }
  },
  achievements: [
    { id: "ach-1", studentId: "stu-jayden", type: "questions-10", title: "10 Questions Answered", earnedAt: "2026-06-20T10:00:00.000Z", meta: {} },
    { id: "ach-2", studentId: "stu-jayden", type: "level-5", title: "Level 5 Achiever", earnedAt: "2026-06-25T14:00:00.000Z", meta: { subject: "Math" } },
    { id: "ach-3", studentId: "stu-emma", type: "questions-10", title: "10 Questions Answered", earnedAt: "2026-06-22T09:00:00.000Z", meta: {} }
  ],
  goals: [
    { id: "goal-j1", studentId: "stu-jayden", setBy: "parent", subject: "Math", target: "Practice fractions 15 min", targetCount: 15, progress: 8, dueAt: "2026-07-05T23:59:59.000Z", createdAt: "2026-06-28T09:00:00.000Z" },
    { id: "goal-j2", studentId: "stu-jayden", setBy: "system", subject: "All", target: "Answer 5 questions", targetCount: 5, progress: 3, dueAt: "2026-06-29T23:59:59.000Z", createdAt: "2026-06-29T00:00:00.000Z" }
  ],
  studySessions: [
    { id: "sess-1", studentId: "stu-jayden", subject: "Math", topic: "Fractions", startedAt: "2026-06-29T07:30:00.000Z", endedAt: "2026-06-29T07:45:00.000Z", minutes: 15, questionsAnswered: 4 },
    { id: "sess-2", studentId: "stu-jayden", subject: "English", topic: "Subject-Verb Agreement", startedAt: "2026-06-28T18:00:00.000Z", endedAt: "2026-06-28T18:20:00.000Z", minutes: 20, questionsAnswered: 3 }
  ],
  notifications: [
    { id: "notif-1", userId: "stu-jayden", type: "achievement", title: "Level 5 Achiever!", body: "You reached level 5 in Math. Keep going!", read: false, createdAt: "2026-06-25T14:00:00.000Z" },
    { id: "notif-2", userId: "stu-jayden", type: "parent", title: "Message from Mum", body: "Remember to review fraction notes.", read: false, createdAt: "2026-06-28T09:30:00.000Z" },
    { id: "notif-3", userId: "par-mum", type: "alert", title: "Emma inactive", body: "Emma has not practiced in 2 days.", read: false, createdAt: "2026-06-29T08:00:00.000Z" }
  ],
  rewardsCatalog: [
    { id: "reward-1", name: "Gold Star Frame", cost: 100, category: "avatar", emoji: "⭐", description: "A shiny gold ring around your avatar" },
    { id: "reward-2", name: "Ocean Theme", cost: 250, category: "theme", emoji: "🌊", description: "Turn your dashboard ocean blue" },
    { id: "reward-5", name: "Sunset Theme", cost: 250, category: "theme", emoji: "🌅", description: "Warm sunset colours everywhere" },
    { id: "reward-6", name: "Streak Freeze", cost: 150, category: "powerup", emoji: "🧊", description: "Protects your streak if you miss a day" },
    { id: "reward-3", name: "Bonus Game Unlock", cost: 500, category: "game", emoji: "🎮", description: "Unlock all English mini-games early" },
    { id: "reward-4", name: "Ice Cream Treat", cost: 1000, category: "treat", emoji: "🍦", description: "Show this to your parents to claim!" }
  ],
  rewardRedemptions: [],
  platformSettings: {
    subjects: ["Math", "Chinese", "English", "Science"],
    adaptiveLevels: 10,
    featureFlags: { rewards: true, achievements: true, parentGoals: true },
    aiSimilarGeneration: true,
    questionImageUploads: true
  },
  auditEvents: [],
  messages: [
    {
      id: "msg-1",
      studentId: "stu-jayden",
      senderId: "par-mum",
      senderName: "Mum",
      text: "Remember to review the fraction notes we discussed yesterday.",
      createdAt: "2026-06-28T09:30:00.000Z"
    },
    {
      id: "msg-2",
      studentId: "stu-jayden",
      senderId: "stu-jayden",
      senderName: "Jayden",
      text: "Can you help me check question 7? I'm not sure about my answer.",
      createdAt: "2026-06-27T14:20:00.000Z"
    }
  ],
  questions: [
    {
      id: "math-p4-fractions-l4-1",
      subject: "Math",
      grade: "P4",
      topic: "Fractions",
      level: 4,
      track: "Core",
      prompt: "3/8 + 2/8 = ?",
      helpText: "Add fractions with the same denominator.",
      type: "multiple",
      options: ["1/8", "5/8", "5/4", "3/4"],
      answer: "5/8",
      explanation: "The denominators are the same, so add the numerators: 3 + 2 = 5. The answer is 5/8.",
      hint: "Keep the denominator 8 and add only the top numbers."
    },
    {
      id: "math-p4-fractions-l5-1",
      subject: "Math",
      grade: "P4",
      topic: "Fractions",
      level: 5,
      track: "Core",
      prompt: "7/10 - 3/10 = ?",
      helpText: "Subtract fractions with the same denominator.",
      type: "multiple",
      options: ["4/10", "10/10", "3/7", "4/20"],
      answer: "4/10",
      explanation: "Subtract the numerators and keep the denominator: 7 - 3 = 4, so the answer is 4/10.",
      hint: "Same denominator means the bottom number stays 10."
    },
    {
      id: "math-p4-whole-l3-1",
      subject: "Math",
      grade: "P4",
      topic: "Whole Numbers",
      level: 3,
      track: "Core",
      prompt: "Round 34,567 to the nearest 1,000.",
      helpText: "Use place value to round.",
      type: "input",
      options: [],
      answer: "35000",
      acceptedAnswers: ["35000", "35,000", "35 000"],
      explanation: "The hundreds digit is 5, so round 34,567 up to 35,000.",
      hint: "Look at the hundreds digit."
    },
    {
      id: "math-p4-decimals-l4-1",
      subject: "Math",
      grade: "P4",
      topic: "Decimals",
      level: 4,
      track: "Core",
      prompt: "0.5 + 0.25 = ?",
      helpText: "Line up decimal places.",
      type: "multiple",
      options: ["0.30", "0.55", "0.75", "0.205"],
      answer: "0.75",
      explanation: "0.50 + 0.25 = 0.75.",
      hint: "Think of 0.5 as 0.50."
    },
    {
      id: "math-p4-geometry-l6-1",
      subject: "Math",
      grade: "P4",
      topic: "Geometry",
      level: 6,
      track: "Core",
      prompt: "A rectangle has length 12 cm and breadth 5 cm. What is its perimeter?",
      helpText: "Perimeter is the distance around a shape.",
      type: "multiple",
      options: ["17 cm", "34 cm", "60 cm", "24 cm"],
      answer: "34 cm",
      explanation: "Perimeter = 2 x (12 + 5) = 34 cm.",
      hint: "Add length and breadth, then double it."
    },
    {
      id: "math-p4-olympiad-l8-1",
      subject: "Math",
      grade: "P4",
      topic: "Olympiad Patterns",
      level: 8,
      track: "Olympiad",
      prompt: "The pattern is 2, 5, 11, 23, 47. What is the next number?",
      helpText: "Look for a rule between each pair.",
      type: "multiple",
      options: ["94", "95", "96", "97"],
      answer: "95",
      explanation: "Each term is double the previous term plus 1: 47 x 2 + 1 = 95.",
      hint: "Try multiplying by 2 before adding something."
    },
    ...p4FundamentalMathQuestions,
    ...p4EquationQuestions,
    ...p4CountingShapesQuestions,
    ...thinkAcademyP4OlympiadQuestions,
    ...scienceP4Questions,
    ...englishP4Questions
  ]
};
