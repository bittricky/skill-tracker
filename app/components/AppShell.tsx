import type { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { ThemeToggleButton } from "./ThemeToggleButton";
import type { ProgressMap } from "~/lib/storage";

interface AppShellProps {
  progress: ProgressMap;
  activeDisciplineId?: string;
  children: ReactNode;
}

export function AppShell({
  progress,
  activeDisciplineId,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-brand-bg font-sans text-brand-ink flex">
      <AppSidebar
        progress={progress}
        activeDisciplineId={activeDisciplineId}
      />
      <main className="flex-1 relative min-w-0">
        <div className="absolute top-6 right-8 z-10">
          <ThemeToggleButton />
        </div>
        <div className="px-10 py-12 max-w-5xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
