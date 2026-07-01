let audioContext = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    audioContext = new AudioCtx();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  return audioContext;
}

function playTone({ frequency, duration = 0.12, type = "sine", gain = 0.12, delay = 0 }) {
  const context = getAudioContext();
  if (!context) return;

  const oscillator = context.createOscillator();
  const volume = context.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;
  volume.gain.value = gain;

  oscillator.connect(volume);
  volume.connect(context.destination);

  const start = context.currentTime + delay;
  oscillator.start(start);
  oscillator.stop(start + duration);

  volume.gain.setValueAtTime(gain, start);
  volume.gain.exponentialRampToValueAtTime(0.001, start + duration);
}

export function playCorrectSound() {
  playTone({ frequency: 523.25, duration: 0.1, gain: 0.1 });
  playTone({ frequency: 659.25, duration: 0.14, gain: 0.1, delay: 0.1 });
  playTone({ frequency: 783.99, duration: 0.18, gain: 0.1, delay: 0.22 });
}

export function playWrongSound() {
  playTone({ frequency: 220, duration: 0.16, type: "triangle", gain: 0.1 });
  playTone({ frequency: 185, duration: 0.22, type: "triangle", gain: 0.09, delay: 0.14 });
}
