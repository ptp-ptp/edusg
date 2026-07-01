let activeUtterance = null;

function pickChineseVoice() {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => voice.lang === "zh-CN") ||
    voices.find((voice) => voice.lang?.startsWith("zh")) ||
    null
  );
}

export function speakChineseWord(word) {
  if (!word || typeof window === "undefined" || !window.speechSynthesis) return false;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "zh-CN";
  utterance.rate = 0.85;

  const voice = pickChineseVoice();
  if (voice) utterance.voice = voice;

  activeUtterance = utterance;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopChineseSpeech() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  activeUtterance = null;
}

export function isSpeakingChinese() {
  return typeof window !== "undefined" && window.speechSynthesis?.speaking;
}
