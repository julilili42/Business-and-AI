import { useEffect, useRef } from "react";
import { Outlet, useLocation, useSearchParams } from "react-router-dom";

import { Sidebar } from "./Sidebar";

export function AppShell() {
  const [searchParams] = useSearchParams();
  const focusMode = searchParams.get("focus") === "1";
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {!focusMode && <Sidebar />}
      <main ref={mainRef} className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
