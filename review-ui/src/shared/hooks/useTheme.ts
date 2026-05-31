import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "ek.theme";
const CHANGE_EVENT = "ek-theme-change";

function readStoredTheme(): Theme {
  if (typeof document === "undefined") return "light";
  if (document.documentElement.classList.contains("dark")) return "dark";
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* localStorage unavailable — the in-memory toggle still works */
  }
}

/**
 * Light/dark theme toggle backed by a `.dark` class on <html> and
 * persisted to localStorage. A window event keeps every mounted instance
 * (desktop sidebar + mobile bar) in sync after a toggle.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    const onChange = (event: Event) => setTheme((event as CustomEvent<Theme>).detail);
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      applyTheme(next);
      window.dispatchEvent(new CustomEvent<Theme>(CHANGE_EVENT, { detail: next }));
      return next;
    });
  }, []);

  return { theme, toggle };
}
