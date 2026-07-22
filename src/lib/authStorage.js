const USER_ID_KEY = "edusg-user-id";
const ROLE_KEY = "edusg-role";
const REMEMBER_KEY = "edusg-remember-device";

export function getRememberDevice() {
  const stored = localStorage.getItem(REMEMBER_KEY);
  return stored !== "false";
}

export function setRememberDevice(remember) {
  localStorage.setItem(REMEMBER_KEY, remember ? "true" : "false");
}

export function saveAuthCredentials(userId, role, remember = getRememberDevice()) {
  setRememberDevice(remember);
  const primary = remember ? localStorage : sessionStorage;
  const secondary = remember ? sessionStorage : localStorage;
  primary.setItem(USER_ID_KEY, userId);
  primary.setItem(ROLE_KEY, role);
  secondary.removeItem(USER_ID_KEY);
  secondary.removeItem(ROLE_KEY);
}

export function getUserId() {
  return localStorage.getItem(USER_ID_KEY) || sessionStorage.getItem(USER_ID_KEY) || "";
}

export function getSavedRole() {
  return localStorage.getItem(ROLE_KEY) || sessionStorage.getItem(ROLE_KEY) || "";
}

export function clearAuthCredentials() {
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(ROLE_KEY);
  sessionStorage.removeItem(USER_ID_KEY);
  sessionStorage.removeItem(ROLE_KEY);
}
