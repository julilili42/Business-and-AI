import { useEffect } from "react";

function isInputFocused(): boolean {
  const tag = document.activeElement?.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * Register a global keyboard shortcut that fires only when no text input is focused.
 * key: e.g. "?", "ArrowRight". altKey/ctrlKey/metaKey: modifier flags.
 */
export function useGlobalShortcut(
  key: string,
  callback: () => void,
  options: { altKey?: boolean; disabled?: boolean } = {},
) {
  const { altKey = false, disabled = false } = options;

  useEffect(() => {
    if (disabled) return;

    function handler(e: KeyboardEvent) {
      if (isInputFocused()) return;
      if (e.key !== key) return;
      if (altKey && !e.altKey) return;
      if (!altKey && e.altKey) return;
      e.preventDefault();
      callback();
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, callback, altKey, disabled]);
}
