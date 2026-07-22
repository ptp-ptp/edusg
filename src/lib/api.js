import { getUserId } from "./authStorage.js";

const apiBase = import.meta.env.VITE_API_BASE || "/api";

export { getUserId };

export async function fetchJson(path, options = {}) {
  const userId = getUserId();
  const response = await fetch(`${apiBase}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { "X-User-Id": userId } : {}),
      ...(options.headers || {})
    },
    ...options
  });
  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try {
      const body = JSON.parse(text);
      if (body.error) message = body.error;
    } catch {
      // keep raw text
    }
    throw new Error(message);
  }
  return response.json();
}

export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}
