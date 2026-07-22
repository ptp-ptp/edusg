function lessonKey(grade, topic) {
  return `${grade}|${topic}`;
}

const ASSET = "/question-assets/counting-shapes";

const lessonModules = {
  "P4|Counting Shapes": {
    hook: {
      emoji: "🔍",
      title: "Shape Detective Academy",
      body: "Ollie needs your help! Hidden triangles and cubes are everywhere in Olympiad puzzles. Learn the detective tricks, then crack the quiz."
    },
    teach: [
      {
        title: "SAM — your safety net",
        diagram: `${ASSET}/lesson-sam.svg`,
        body: "SAM means Small → Add bigger → Missing. First count the tiniest triangles, then triangles made from 2 or 3 small ones, then the biggest. Finally check overlaps you missed. SAM always works — use it to check tricky figures!"
      },
      {
        title: "Vertex-to-base sum trick",
        diagram: `${ASSET}/lesson-vertex.svg`,
        body: "When lines run from one corner to the opposite side, label each strip along the base 1, 2, 3… Then add: 1+2+3 = 6 triangles. Fast trick — but SAM checks your answer!"
      },
      {
        title: "Squares & rectangles with diagonals",
        diagram: `${ASSET}/lesson-diagonal.svg`,
        body: "A square with both diagonals has 4 small triangles in each half — 8 in total. Label the smallest regions, then double if the figure is symmetric."
      },
      {
        title: "Nested shapes — count layer by layer",
        diagram: `${ASSET}/lesson-nested.svg`,
        body: "Triangle inside triangle? Square inside square? Count each layer separately, then add. An inner triangle ring often gives 4 triangles; the outer shell adds more."
      },
      {
        title: "3D cubes — the layer method",
        diagram: `${ASSET}/lesson-3d.svg`,
        body: "Don't count cube by cube! Count cubes in one flat layer, then multiply by how many layers are stacked. Remember hidden cubes behind the ones you see."
      }
    ],
    tryIt: [
      {
        prompt: "How many triangles are in this figure?",
        diagram: `${ASSET}/try-01.svg`,
        options: ["4", "6", "8", "10"],
        answer: "6",
        hint: "Use the vertex trick: label the base 1, 2, 3 and add."
      },
      {
        prompt: "The base has 4 equal strips. How many triangles?",
        diagram: `${ASSET}/try-02.svg`,
        options: ["6", "8", "10", "12"],
        answer: "10",
        hint: "Add 1 + 2 + 3 + 4."
      },
      {
        prompt: "How many triangles in this square?",
        diagram: `${ASSET}/try-03.svg`,
        options: ["4", "6", "8", "16"],
        answer: "8",
        hint: "Count the 4 smallest triangles, then remember both halves."
      },
      {
        prompt: "How many unit cubes are in this block?",
        diagram: `${ASSET}/try-04.svg`,
        options: ["8", "10", "12", "18"],
        answer: "12",
        hint: "One layer has 3 × 2 = 6 cubes. How many layers?"
      }
    ],
    mission:
      "Draw a triangle, split the base into 3 parts with lines from the top corner, label the strips 1-2-3, and teach someone why the total is 6 triangles."
  }
};

export function getMathLesson(grade, topic) {
  const key = lessonKey(grade, topic);
  if (lessonModules[key]) return { grade, topic, ...lessonModules[key] };
  return {
    grade,
    topic,
    hook: { emoji: "📐", title: `Let's learn: ${topic}`, body: `Explore ${topic} with Ollie!` },
    teach: [{ title: topic, body: `In ${grade}, build skills in ${topic}. Open Practice when you're ready!` }],
    tryIt: [
      { prompt: `Ready to practise ${topic}?`, options: ["Yes!", "Not yet"], answer: "Yes!", hint: "You've got this!" }
    ],
    mission: `Tell someone one new thing you learned about ${topic}.`
  };
}

export function listMathLessonKeys() {
  return Object.keys(lessonModules);
}

export function hasMathLesson(grade, topic) {
  return Boolean(lessonModules[lessonKey(grade, topic)]);
}
