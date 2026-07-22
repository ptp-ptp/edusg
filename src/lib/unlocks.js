export const REWARDS = {
  goldFrame: "reward-1",
  oceanTheme: "reward-2",
  sunsetTheme: "reward-5",
  gameUnlock: "reward-3"
};

export function hasUnlock(user, rewardId) {
  return Boolean(user?.unlocks?.includes(rewardId));
}

export function hasGoldFrame(user) {
  return hasUnlock(user, REWARDS.goldFrame);
}

export function getActiveTheme(user) {
  const theme = user?.activeTheme;
  if (theme === "ocean" && hasUnlock(user, REWARDS.oceanTheme)) return "ocean";
  if (theme === "sunset" && hasUnlock(user, REWARDS.sunsetTheme)) return "sunset";
  return null;
}

export const THEME_BY_REWARD = {
  [REWARDS.oceanTheme]: "ocean",
  [REWARDS.sunsetTheme]: "sunset"
};
