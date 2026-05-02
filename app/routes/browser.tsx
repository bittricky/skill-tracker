import { useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { Route } from "./+types/browser";
import { DISCIPLINES, DISCIPLINE_BY_ID, PROJECTS_BY_DISCIPLINE } from "~/data";
import { useProgress } from "~/hooks/useProgress";
import { calculateDepth } from "~/lib/depth";
import { AppShell } from "~/components/AppShell";
import { MainContent, type MainContentHandle } from "~/components/MainContent";
import { DisciplineDepthStepper } from "~/components/browser/DisciplineDepthStepper";
import { DisciplineProjects } from "~/components/browser/DisciplineProjects";
import { Loader } from "~/components/ui/Loader";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Browser | Skill Tracker" },
    {
      name: "description",
      content: "Browse skills and topics across disciplines.",
    },
  ];
}

export default function Browser() {
  const {
    progress,
    applied,
    projectsDone,
    loaded,
    setStatus,
    setApplied,
    toggleProjectDone,
  } = useProgress();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const mainRef = useRef<MainContentHandle>(null);
  const pendingSkillRef = useRef<string | null>(null);

  const requestedId = searchParams.get("discipline") ?? "";
  const activeId = DISCIPLINE_BY_ID[requestedId]
    ? requestedId
    : (DISCIPLINES[0]?.id ?? "");
  const activeDiscipline = DISCIPLINE_BY_ID[activeId];

  const depth = useMemo(
    () =>
      activeDiscipline
        ? calculateDepth(activeDiscipline, progress, applied, projectsDone)
        : null,
    [activeDiscipline, progress, applied, projectsDone],
  );

  const projects = activeDiscipline
    ? (PROJECTS_BY_DISCIPLINE[activeDiscipline.id] ?? [])
    : [];

  // Drain any pending reveal once the discipline actually swapped.
  useEffect(() => {
    if (!pendingSkillRef.current) return;
    const pending = pendingSkillRef.current;
    pendingSkillRef.current = null;
    queueMicrotask(() => {
      requestAnimationFrame(() => {
        mainRef.current?.revealSkill(pending);
      });
    });
  }, [activeId]);

  const handleNavigate = (disciplineId: string, skillId?: string) => {
    if (disciplineId === activeId) {
      if (skillId) mainRef.current?.revealSkill(skillId);
      return;
    }
    pendingSkillRef.current = skillId ?? null;
    setSearchParams({ discipline: disciplineId });
  };

  if (!loaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-brand-bg">
        <Loader label="Loading skill tracker" />
      </div>
    );
  }

  if (!activeDiscipline) {
    return (
      <div className="h-screen flex items-center justify-center bg-brand-bg">
        <span className="text-[13px] text-brand-muted">
          No disciplines found. Run{" "}
          <code className="font-mono">npm run sync:disciplines</code>.
        </span>
      </div>
    );
  }

  return (
    <AppShell progress={progress} activeDisciplineId={activeDiscipline.id}>
      <div className="flex flex-col gap-10">
        <MainContent
          discipline={activeDiscipline}
          progress={progress}
          applied={applied}
          onCycle={setStatus}
          onToggleApplied={setApplied}
          onNavigate={handleNavigate}
          revealRef={mainRef}
          headerSlot={
            <header className="flex flex-col gap-8">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-brand-ink">
                  {activeDiscipline.label}
                </h1>
                {activeDiscipline.description && (
                  <p className="text-sm text-brand-muted mt-2 max-w-2xl">
                    {activeDiscipline.description}
                  </p>
                )}
              </div>
              {depth && (
                <DisciplineDepthStepper
                  tier={depth.tier}
                  donePct={depth.donePct}
                />
              )}
            </header>
          }
        />
        <DisciplineProjects
          projects={projects}
          projectsDone={projectsDone}
          onToggleProjectDone={toggleProjectDone}
        />
      </div>
    </AppShell>
  );
}
