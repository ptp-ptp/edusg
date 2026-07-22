import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Star, Trophy } from "lucide-react";
import { confettiBurst, confettiCelebration, starBurst } from "../../lib/confetti";
import { playCorrectSound, playWrongSound } from "../../utils/practiceSounds";
import Ollie from "./Ollie";

const CelebrationContext = createContext(null);

let nextId = 1;

function playLevelUpSound() {
  playCorrectSound();
  setTimeout(playCorrectSound, 260);
}

export function CelebrationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [levelUp, setLevelUp] = useState(null);
  const [starPops, setStarPops] = useState([]);
  const soundEnabledRef = useRef(localStorage.getItem("edusg-sound") !== "off");

  const setSoundEnabled = useCallback((enabled) => {
    soundEnabledRef.current = enabled;
    localStorage.setItem("edusg-sound", enabled ? "on" : "off");
  }, []);

  const pushToast = useCallback((toast) => {
    const id = nextId++;
    setToasts((current) => [...current, { ...toast, id }]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  // origin: optional {x, y} in viewport pixels (e.g. the answer button)
  const celebrateCorrect = useCallback(
    ({ stars = 0, origin } = {}) => {
      if (soundEnabledRef.current) playCorrectSound();
      confettiBurst(origin);
      if (stars > 0) {
        const id = nextId++;
        setStarPops((current) => [
          ...current,
          { id, stars, x: origin?.x ?? window.innerWidth / 2, y: origin?.y ?? window.innerHeight / 2 }
        ]);
        setTimeout(() => {
          setStarPops((current) => current.filter((p) => p.id !== id));
        }, 1400);
      }
    },
    []
  );

  const celebrateWrong = useCallback(() => {
    if (soundEnabledRef.current) playWrongSound();
  }, []);

  const celebrateLevelUp = useCallback((newLevel, subject) => {
    setLevelUp({ level: newLevel, subject });
    confettiCelebration();
    if (soundEnabledRef.current) playLevelUpSound();
  }, []);

  const celebrateAchievements = useCallback(
    (achievements = []) => {
      for (const achievement of achievements) {
        pushToast({ kind: "achievement", title: achievement.title });
      }
      if (achievements.length > 0) {
        starBurst({ x: window.innerWidth - 80, y: 80 });
        if (soundEnabledRef.current) playCorrectSound();
      }
    },
    [pushToast]
  );

  // Convenience: process a practice answer API result in one call
  const celebrateAnswerResult = useCallback(
    (result, { subject, origin } = {}) => {
      if (!result) return;
      if (result.isCorrect) {
        celebrateCorrect({ stars: result.starsEarned || 0, origin });
      } else {
        celebrateWrong();
      }
      if (result.newAchievements?.length) celebrateAchievements(result.newAchievements);
      if (result.levelUp) {
        setTimeout(() => celebrateLevelUp(result.levelUp, subject), 650);
      }
    },
    [celebrateCorrect, celebrateWrong, celebrateAchievements, celebrateLevelUp]
  );

  return (
    <CelebrationContext.Provider
      value={{
        celebrateCorrect,
        celebrateWrong,
        celebrateLevelUp,
        celebrateAchievements,
        celebrateAnswerResult,
        pushToast,
        setSoundEnabled,
        confettiCelebration
      }}
    >
      {children}

      {starPops.map((pop) => (
        <div key={pop.id} className="star-pop" style={{ left: pop.x, top: pop.y }} aria-hidden="true">
          {Array.from({ length: Math.min(pop.stars, 3) }, (_, i) => (
            <Star key={i} className="h-5 w-5 fill-sun text-sun" />
          ))}
          <span>+{pop.stars}</span>
        </div>
      ))}

      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast-card">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sun/20">
              <Trophy className="h-5 w-5 text-sun" />
            </span>
            <div>
              <div className="text-xs font-black uppercase tracking-wide text-sun">Badge unlocked!</div>
              <div className="text-sm font-black text-ink">{toast.title}</div>
            </div>
          </div>
        ))}
      </div>

      {levelUp && (
        <div className="levelup-overlay" role="dialog" aria-modal="true" onClick={() => setLevelUp(null)}>
          <div className="levelup-card" onClick={(event) => event.stopPropagation()}>
            <Ollie mood="cheer" size={96} />
            <div className="levelup-badge">LEVEL {levelUp.level}</div>
            <h2 className="mt-3 text-2xl font-black text-ink">Level up!</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {levelUp.subject ? `Your ${levelUp.subject} questions just got more exciting.` : "Your questions just got more exciting."}
            </p>
            <button
              type="button"
              onClick={() => setLevelUp(null)}
              className="mt-5 w-full rounded-xl bg-teal px-4 py-3 font-black text-white shadow-lg shadow-teal/25 transition hover:bg-sea active:scale-95"
            >
              Keep going!
            </button>
          </div>
        </div>
      )}
    </CelebrationContext.Provider>
  );
}

export function useCelebration() {
  const ctx = useContext(CelebrationContext);
  if (!ctx) throw new Error("useCelebration must be used within CelebrationProvider");
  return ctx;
}
