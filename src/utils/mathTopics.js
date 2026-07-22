import { mathCurriculum } from "../curriculum.js";

export function getMoeMathTopics(grade) {
  const plan = mathCurriculum[grade];
  if (!plan?.strands) return new Set();
  return new Set(plan.strands.flatMap((strand) => strand.topics.map((topic) => topic.name)));
}

export function isMoeMathTopic(grade, topic) {
  return getMoeMathTopics(grade).has(topic);
}

export function filterMathTopicGroups(topicGroups, { grade, showAdvanced, search }) {
  const query = search.trim().toLowerCase();
  return topicGroups.filter((group) => {
    if (!showAdvanced && !isMoeMathTopic(grade, group.topic)) return false;
    if (query && !group.topic.toLowerCase().includes(query)) return false;
    return true;
  });
}
