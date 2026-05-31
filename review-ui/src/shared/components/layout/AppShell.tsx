import { useEffect, useRef } from "react";
import { Outlet, useLocation, useSearchParams } from "react-router-dom";

import { ThemeToggle } from "@/shared/components/ui/ThemeToggle";

import { MobileTopBar } from "./MobileTopBar";
import { Sidebar } from "./Sidebar";

export function AppShell() {
  const [searchParams] = useSearchParams();
  const focusMode = searchParams.get("focus") === "1";
  const location = useLocation();
  const isReviewRoute = location.pathname.startsWith("/reviews/");
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {!focusMode && <Sidebar />}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {!focusMode && <MobileTopBar />}
        <main ref={mainRef} className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      {!focusMode && !isReviewRoute && (
        <ThemeToggle
          iconOnly
          className="fixed right-3 top-3 z-40 hidden border border-border bg-surface/90 shadow-sm backdrop-blur lg:inline-flex"
        />
      )}
    </div>
  );
}
