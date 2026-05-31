import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { ThemeToggle } from "@/shared/components/ui/ThemeToggle";

import { NavLinks } from "./Sidebar";

/**
 * Top bar shown below `lg`, where the desktop sidebar is hidden. The menu
 * button opens the navigation as a left drawer so smaller screens keep
 * access to every section.
 */
export function MobileTopBar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-3">
          <Dialog.Trigger asChild>
            <button
              type="button"
              aria-label="Navigation öffnen"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </Dialog.Trigger>
          <img
            src="/elringklinger-logo.png"
            alt="ElringKlinger"
            className="h-8 w-auto object-contain"
          />
        </div>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/35 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[82%] flex-col border-r border-border bg-surface shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left"
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
              <Dialog.Title className="sr-only">Navigation</Dialog.Title>
              <img
                src="/elringklinger-logo.png"
                alt="ElringKlinger"
                className="h-9 w-auto object-contain"
              />
              <Dialog.Close
                aria-label="Navigation schließen"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Dialog.Close>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              <div className="section-label mb-2 px-3">Navigation</div>
              <NavLinks onNavigate={() => setOpen(false)} />
            </nav>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ThemeToggle iconOnly />
    </header>
  );
}
