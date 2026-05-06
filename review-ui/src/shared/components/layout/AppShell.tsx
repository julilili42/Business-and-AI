import { Outlet } from "react-router-dom";
import { KeyboardHintsOverlay } from "@/shared/components/ui/KeyboardHintsOverlay";
import { Sidebar } from "./Sidebar";

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
      <KeyboardHintsOverlay />
    </div>
  );
}
