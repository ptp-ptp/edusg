import React from "react";

// Ollie the Owl — EduSG mascot. Moods: happy, cheer, sad, think, sleep
export default function Ollie({ mood = "happy", size = 72, className = "", animate = true }) {
  const eyes = {
    happy: (
      <>
        <circle cx="24" cy="30" r="6.5" fill="#fff" />
        <circle cx="40" cy="30" r="6.5" fill="#fff" />
        <circle cx="25" cy="31" r="3" fill="#17233c" />
        <circle cx="41" cy="31" r="3" fill="#17233c" />
        <circle cx="26" cy="30" r="1" fill="#fff" />
        <circle cx="42" cy="30" r="1" fill="#fff" />
      </>
    ),
    cheer: (
      <>
        <path d="M18 30 Q24 24 30 30" stroke="#17233c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M34 30 Q40 24 46 30" stroke="#17233c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </>
    ),
    sad: (
      <>
        <circle cx="24" cy="31" r="6" fill="#fff" />
        <circle cx="40" cy="31" r="6" fill="#fff" />
        <circle cx="24" cy="33" r="2.8" fill="#17233c" />
        <circle cx="40" cy="33" r="2.8" fill="#17233c" />
        <path d="M18 24 L29 27" stroke="#c98d2a" strokeWidth="2" strokeLinecap="round" />
        <path d="M46 24 L35 27" stroke="#c98d2a" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    think: (
      <>
        <circle cx="24" cy="30" r="6" fill="#fff" />
        <circle cx="40" cy="30" r="6" fill="#fff" />
        <circle cx="26" cy="29" r="2.8" fill="#17233c" />
        <circle cx="42" cy="29" r="2.8" fill="#17233c" />
        <path d="M17 22 L29 24" stroke="#c98d2a" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    sleep: (
      <>
        <path d="M19 30 Q24 33 29 30" stroke="#17233c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M35 30 Q40 33 45 30" stroke="#17233c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <text x="48" y="18" fontSize="10" fontWeight="800" fill="#94a3b8">z</text>
        <text x="54" y="11" fontSize="7" fontWeight="800" fill="#cbd5e1">z</text>
      </>
    )
  };

  const mouth = {
    happy: <path d="M28 41 Q32 45 36 41" stroke="#17233c" strokeWidth="2" fill="none" strokeLinecap="round" />,
    cheer: <path d="M27 40 Q32 47 37 40" stroke="#17233c" strokeWidth="2" fill="#ff9d8a" strokeLinecap="round" />,
    sad: <path d="M28 44 Q32 40 36 44" stroke="#17233c" strokeWidth="2" fill="none" strokeLinecap="round" />,
    think: <circle cx="32" cy="42" r="2" fill="#17233c" />,
    sleep: <circle cx="32" cy="42.5" r="1.6" fill="#17233c" />
  };

  const wings =
    mood === "cheer" ? (
      <>
        <ellipse cx="8" cy="30" rx="6" ry="11" fill="#c98d2a" transform="rotate(-35 8 30)" />
        <ellipse cx="56" cy="30" rx="6" ry="11" fill="#c98d2a" transform="rotate(35 56 30)" />
      </>
    ) : (
      <>
        <ellipse cx="9" cy="42" rx="5.5" ry="10" fill="#c98d2a" transform="rotate(12 9 42)" />
        <ellipse cx="55" cy="42" rx="5.5" ry="10" fill="#c98d2a" transform="rotate(-12 55 42)" />
      </>
    );

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`${animate && mood === "cheer" ? "ollie-bounce" : ""} ${className}`}
      role="img"
      aria-label={`Ollie the owl feeling ${mood}`}
    >
      {wings}
      <ellipse cx="32" cy="38" rx="22" ry="23" fill="#e8a33d" />
      <ellipse cx="32" cy="44" rx="14" ry="14" fill="#f7d9a8" />
      <path d="M14 22 Q18 12 24 18 Q32 10 40 18 Q46 12 50 22 Q42 18 32 19 Q22 18 14 22" fill="#c98d2a" />
      {eyes[mood] || eyes.happy}
      <path d="M29 34 L32 39 L35 34 Z" fill="#ff9d3e" />
      {mouth[mood] || null}
      <path d="M24 60 L24 56 M28 60 L28 56 M36 60 L36 56 M40 60 L40 56" stroke="#ff9d3e" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
