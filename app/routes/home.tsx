import { useRef, useState } from "react";
import type { Route } from "./+types/home";
import { ROADMAPS, ROADMAP_BY_ID } from "~/data";
import { useProgress } from "~/hooks/useProgress";
import { useTheme } from "~/hooks/useTheme";
import { Sidebar } from "~/components/Sidebar";
import { MainContent, type MainContentHandle } from "~/components/MainContent";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Skill Tracker" },
    {
      name: "description",
      content: "Track your progress across developer roadmaps.",
    },
  ];
}

export default function Home() {
  const { progress, loaded, setStatus } = useProgress();
  const [activeId, setActiveId] = useState<string>(ROADMAPS[0]?.id ?? "");
  const activeRm = ROADMAP_BY_ID[activeId] ?? ROADMAPS[0];
  const mainRef = useRef<MainContentHandle>(null);
  const pendingSkillRef = useRef<string | null>(null);
  const { theme, toggleTheme, mounted } = useTheme();

  const handleNavigate = (roadmapId: string, skillId?: string) => {
    if (roadmapId === activeId) {
      // Same roadmap: reveal immediately via the imperative handle.
      if (skillId) mainRef.current?.revealSkill(skillId);
      return;
    }
    // Different roadmap: queue the reveal, then switch. The effect below runs
    // after MainContent re-renders and drives the reveal with retry-scroll.
    pendingSkillRef.current = skillId ?? null;
    setActiveId(roadmapId);
  };

  // Drain any pending reveal once the roadmap actually swapped.
  if (pendingSkillRef.current && activeRm?.id === activeId) {
    const pending = pendingSkillRef.current;
    pendingSkillRef.current = null;
    // Defer so MainContent has mounted/reset for the new roadmap.
    queueMicrotask(() => {
      requestAnimationFrame(() => {
        mainRef.current?.revealSkill(pending);
      });
    });
  }

  if (!loaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-brand-bg">
        <span className="text-[13px] text-brand-muted">Loading…</span>
      </div>
    );
  }

  if (!activeRm) {
    return (
      <div className="h-screen flex items-center justify-center bg-brand-bg">
        <span className="text-[13px] text-brand-muted">
          No roadmaps found. Run{" "}
          <code className="font-mono">npm run build:data</code>.
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-brand-bg overflow-hidden font-sans text-brand-ink p-4 gap-4">
      <Sidebar
        progress={progress}
        activeId={activeRm.id}
        setActiveId={setActiveId}
      />
      <MainContent
        rm={activeRm}
        progress={progress}
        onCycle={setStatus}
        onNavigate={handleNavigate}
        revealRef={mainRef}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    </div>
  );
}
