import { useCallback, useState } from "react";
import { Keyboard } from "lucide-react";
import { useGlobalShortcut } from "@/shared/hooks/useGlobalShortcut";

interface Shortcut {
  keys: string[];
  label: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ["Alt", "→"], label: "Nächster Schritt" },
  { keys: ["Alt", "←"], label: "Vorheriger Schritt" },
  { keys: ["?"], label: "Shortcuts anzeigen/ausblenden" },
];

function KbdKey({ k }: { k: string }) {
  return (
    <kbd className="inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-semibold text-muted-foreground">
      {k}
    </kbd>
  );
}

export function KeyboardHintsOverlay() {
  const [visible, setVisible] = useState(false);
  const toggle = useCallback(() => setVisible((v) => !v), []);

  useGlobalShortcut("?", toggle);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Tastaturkürzel"
      className="fixed bottom-6 right-6 z-50 w-72 rounded-xl border border-border bg-surface/95 shadow-lg backdrop-blur-sm"
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Keyboard className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tastaturkürzel
        </span>
        <button
          onClick={toggle}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground"
          aria-label="Schließen"
        >
          ✕
        </button>
      </div>
      <ul className="divide-y divide-border/50">
        {SHORTCUTS.map((s) => (
          <li key={s.label} className="flex items-center justify-between px-4 py-2">
            <span className="text-xs text-foreground">{s.label}</span>
            <span className="flex items-center gap-1">
              {s.keys.map((k) => (
                <KbdKey key={k} k={k} />
              ))}
            </span>
          </li>
        ))}
      </ul>
      <p className="px-4 py-2 text-[10px] text-muted-foreground">
        Kürzel funktionieren wenn kein Eingabefeld aktiv ist.
      </p>
    </div>
  );
}
