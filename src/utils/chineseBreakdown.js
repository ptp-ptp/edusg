const CJK_RE = /[\u4e00-\u9fff]/g;

export function splitCjkCharacters(text) {
  if (!text) return [];
  return text.match(CJK_RE) || [];
}

export function getExamplePinyin(example) {
  return example?.pinyin || "";
}

export function getEntryBreakdown(entry) {
  if (entry?.breakdown?.length) return entry.breakdown;
  return splitCjkCharacters(entry?.word).map((char) => ({
    char,
    pinyin: "",
    meaning: ""
  }));
}
