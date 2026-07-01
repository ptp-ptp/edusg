import { englishCurriculum } from "../../curriculum.js";

function lessonKey(grade, topic) {
  return `${grade}|${topic}`;
}

const lessonModules = {
  "P1|Phonics & Letter Sounds": {
    hook: { emoji: "🔤", title: "Meet Sam the Sound!", body: "Every letter has a special sound. Let's hunt them together!" },
    teach: [
      { title: "Letter A says /a/", body: "Apple, ant, astronaut — hear the short 'a' at the start." },
      { title: "Letter B says /b/", body: "Ball, bat, book — press your lips and say /b/." },
      { title: "Blends: bl, cl, fl", body: "Blend two sounds smoothly: bl-ue, cl-ap, fl-ag." }
    ],
    tryIt: [
      { prompt: "Which word starts with /b/?", options: ["cat", "ball", "sun"], answer: "ball", hint: "Listen for /b/ at the start." },
      { prompt: "Which blend is in 'flag'?", options: ["bl", "fl", "cl"], answer: "fl", hint: "f + l together." }
    ],
    mission: "Find 3 things at home that start with the letter B. Say the sound out loud!"
  },
  "P1|Sight Words": {
    hook: { emoji: "⭐", title: "Super Sight Words!", body: "Some words appear everywhere — learn them by heart!" },
    teach: [
      { title: "the", body: "The cat. The sun. 'The' points to something special." },
      { title: "I and can", body: "I can run. I can read. Short but powerful!" },
      { title: "and, is", body: "Sam is happy and kind. Link ideas with 'and'." }
    ],
    tryIt: [
      { prompt: "Fill in: ___ can jump.", options: ["The", "I", "And"], answer: "I", hint: "Who can jump? Me!" },
      { prompt: "Fill in: The dog ___ big.", options: ["and", "is", "the"], answer: "is", hint: "Describes the dog." }
    ],
    mission: "Read your favourite picture book and circle every 'the' you find!"
  },
  "P2|Long Vowels & Digraphs": {
    hook: { emoji: "🎵", title: "Rhyme Time Rally!", body: "Long vowels stretch their sound. Digraphs are two letters, one sound!" },
    teach: [
      { title: "sh, ch, th", body: "ship, chat, think — two letters, one sound." },
      { title: "Long a: cake, rain", body: "The vowel says its name: c-a-ke." },
      { title: "Long e: tree, bee", body: "ee and ea often make long e." }
    ],
    tryIt: [
      { prompt: "Which word has 'sh'?", options: ["chip", "shop", "top"], answer: "shop", hint: "sh at the start." },
      { prompt: "Which has a long a?", options: ["cat", "cake", "cap"], answer: "cake", hint: "The vowel says its name." }
    ],
    mission: "Write 3 words that rhyme with 'rain'."
  },
  "P2|Story Writing": {
    hook: { emoji: "📖", title: "Story Starter Spinner!", body: "Every great story has a beginning, middle and end." },
    teach: [
      { title: "Beginning", body: "Who? Where? When? Once upon a sunny day..." },
      { title: "Middle", body: "What happened? A problem or adventure!" },
      { title: "End", body: "How did it finish? Happy, funny or surprising?" }
    ],
    tryIt: [
      { prompt: "Best story opening?", options: ["And then I went home.", "One morning, Max found a tiny dragon.", "The end."], answer: "One morning, Max found a tiny dragon.", hint: "Hooks the reader!" },
      { prompt: "What goes in the middle?", options: ["The problem", "Goodbye", "The title"], answer: "The problem", hint: "Something exciting happens." }
    ],
    mission: "Tell a 4-sentence story to someone at home tonight!"
  },
  "P3|Comprehension Basics": {
    hook: { emoji: "🔍", title: "Detective Reading!", body: "Good readers hunt for clues in the text." },
    teach: [
      { title: "Main idea", body: "What is the passage mostly about? One big idea." },
      { title: "Who, what, where", body: "Answer these questions from the text." },
      { title: "Clues", body: "If it's not said directly, use clues to infer." }
    ],
    tryIt: [
      { prompt: "Passage: 'Sara watered the plants every evening.' Who watered the plants?", options: ["Tom", "Sara", "Nobody"], answer: "Sara", hint: "Read the subject." },
      { prompt: "Main idea of a passage about how seeds grow?", options: ["Plant growth", "Cooking", "Sports"], answer: "Plant growth", hint: "The whole passage topic." }
    ],
    mission: "Read a short article and tell someone the main idea in one sentence."
  },
  "P4|Subject-Verb Agreement": {
    hook: { emoji: "🦉", title: "Ollie the Owl says: Match your verb!", body: "One subject = one matching verb. Let's practise!" },
    teach: [
      { title: "Singular subjects", body: "He, she, it, one dog → verb often ends in -s: runs, eats." },
      { title: "Plural subjects", body: "They, we, dogs → base verb: run, eat." },
      { title: "Tricky ones", body: "Everyone is singular. The team is singular." }
    ],
    tryIt: [
      { prompt: "She ___ to school.", options: ["walk", "walks", "walking"], answer: "walks", hint: "She walks." },
      { prompt: "The birds ___ loudly.", options: ["sing", "sings", "singing"], answer: "sing", hint: "More than one bird." }
    ],
    mission: "Write 3 sentences: one with he, one with they, one with it. Check your verbs!"
  },
  "P4|Prepositions & Conjunctions": {
    hook: { emoji: "🗺️", title: "Word Map Adventure!", body: "Prepositions show place. Conjunctions join ideas." },
    teach: [
      { title: "Prepositions", body: "in, on, under, between, behind — where is it?" },
      { title: "and, but", body: "'And' adds. 'But' contrasts." },
      { title: "because, so", body: "'Because' gives reason. 'So' shows result." }
    ],
    tryIt: [
      { prompt: "The ball rolled ___ the chair.", options: ["on", "under", "between"], answer: "under", hint: "Below the chair." },
      { prompt: "I was hungry, ___ I ate a sandwich.", options: ["but", "so", "although"], answer: "so", hint: "Result of hunger." }
    ],
    mission: "Describe your room using 5 prepositions: in, on, under, behind, next to."
  },
  "P4|Synthesis Basics": {
    hook: { emoji: "🔗", title: "Sentence Link Lab!", body: "Combine short sentences into one powerful sentence." },
    teach: [
      { title: "Using and", body: "Tom is tall. Tom is kind. → Tom is tall and kind." },
      { title: "Using but / although", body: "Show contrast between two ideas." },
      { title: "Using because / so", body: "Link reason and result without changing meaning." }
    ],
    tryIt: [
      { prompt: "Combine: 'It was late.' + 'We went home.'", options: ["It was late, so we went home.", "It was late, but we went home.", "It was late, or we went home."], answer: "It was late, so we went home.", hint: "Going home follows being late." },
      { prompt: "Use although: 'He was scared.' + 'He tried.'", options: ["Although he was scared, he tried.", "He was scared although he tried.", "Although he tried, he was scared."], answer: "Although he was scared, he tried.", hint: "Scared contrasts with trying." }
    ],
    mission: "Combine two sentences about your day using 'because'."
  },
  "P4|Editing": {
    hook: { emoji: "🔧", title: "Grammar Fix-It Workshop!", body: "Spot the mistake. Fix it. Become an editing hero!" },
    teach: [
      { title: "Spelling", body: "Double-check tricky words: receive, beautiful, tomorrow." },
      { title: "Grammar", body: "Check verbs match subjects. Check tense stays the same." },
      { title: "Punctuation", body: "Capitals at start. Full stops at end." }
    ],
    tryIt: [
      { prompt: "Fix: 'they goes to the park'", options: ["they go", "they goes", "they going"], answer: "they go", hint: "Plural subject." },
      { prompt: "Spelling fix: 'beutiful'", options: ["beautifull", "beautiful", "beatiful"], answer: "beautiful", hint: "bea-u-ti-ful" }
    ],
    mission: "Edit a short note you wrote — fix one spelling and one grammar mistake."
  },
  "P5|Synthesis & Transformation": {
    hook: { emoji: "⚡", title: "Transform Challenge!", body: "Change the sentence without changing the meaning." },
    teach: [
      { title: "Unless = if not", body: "'Unless you hurry' = 'If you do not hurry'." },
      { title: "Despite / in spite of", body: "Show contrast with a noun phrase." },
      { title: "No sooner... than", body: "Advanced PSLE pattern for keen learners." }
    ],
    tryIt: [
      { prompt: "Unless it rains, we will picnic. Same meaning?", options: ["If it does not rain, we will picnic.", "If it rains, we will picnic.", "We will picnic because it rains."], answer: "If it does not rain, we will picnic.", hint: "Unless = if not." },
      { prompt: "Despite the heat, she ran. Shows?", options: ["Contrast", "Reason", "Time"], answer: "Contrast", hint: "Heat vs running." }
    ],
    mission: "Rewrite one sentence from your textbook using 'although'."
  },
  "P6|PSLE Grammar MCQ": {
    hook: { emoji: "🎯", title: "PSLE Mission Briefing!", body: "Grammar MCQ — read the whole sentence, then choose." },
    teach: [
      { title: "Read in context", body: "The answer must fit the whole sentence." },
      { title: "Eliminate", body: "Cross out clearly wrong options first." },
      { title: "Watch traps", body: "Check subject-verb, tense and word form." }
    ],
    tryIt: [
      { prompt: "Neither Tom nor his friends ___ ready.", options: ["was", "were", "is", "are being"], answer: "were", hint: "Friends is nearer to the verb." },
      { prompt: "She has ___ finished her homework.", options: ["already", "all ready", "alright"], answer: "already", hint: "Means 'by now'." }
    ],
    mission: "Do 5 grammar MCQs from a past paper — underline clue words."
  }
};

export function getEnglishLesson(grade, topic) {
  const key = lessonKey(grade, topic);
  if (lessonModules[key]) return { grade, topic, ...lessonModules[key] };
  return {
    grade,
    topic,
    hook: { emoji: "📚", title: `Let's learn: ${topic}`, body: `Explore ${topic} with Ollie the Owl!` },
    teach: [{ title: topic, body: `In ${grade}, you will build skills in ${topic}. Open Practice when you're ready!` }],
    tryIt: [
      { prompt: `Ready to practise ${topic}?`, options: ["Yes!", "Not yet"], answer: "Yes!", hint: "You've got this!" }
    ],
    mission: `Tell someone one new thing you learned about ${topic}.`
  };
}

export function getEnglishTopicsForGrade(grade) {
  const curriculum = englishCurriculum[grade];
  if (!curriculum) return [];
  return curriculum.strands.flatMap((strand) =>
    strand.topics.map((topic) => ({ strand: strand.name, topic: topic.name, skills: topic.skills }))
  );
}

export function listEnglishLessonKeys() {
  return Object.keys(lessonModules);
}
