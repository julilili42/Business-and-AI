import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

/**
 * AppShell
 *
 * Persistent chrome for non-focus routes — sidebar on the left, page
 * content on the right. The Vollbild route (Step 3 with `?focus=1`)
 * bypasses this and renders standalone.
 */
export function AppShell() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
