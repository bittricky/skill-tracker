import { useMemo } from "react";
import type { Route } from "./+types/dashboard";
import { DISCIPLINES } from "~/data";
import { useProgress } from "~/hooks/useProgress";
import { AppShell } from "~/components/AppShell";
import { SkillMatrix } from "~/components/dashboard/SkillMatrix";
import { StatRow } from "~/components/dashboard/StatRow";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Skill Tracker" },
    {
      name: "description",
      content: "Track your progress across different disciplines.",
    },
  ];
}

export default function Dashboard() {
  const { progress, applied, loaded } = useProgress();

  const stats = useMemo(() => {
    let done = 0;
    let learning = 0;
    let appliedCount = 0;
    const seen = new Set<string>();
    for (const d of DISCIPLINES) {
      for (const sec of d.sections) {
        for (const item of sec.items) {
          if (seen.has(item.id)) continue;
          seen.add(item.id);
          const st = progress[item.id];
          if (st === "done") done++;
          else if (st === "learning") learning++;
          if (applied[item.id]) appliedCount++;
        }
      }
    }
    return { done, learning, applied: appliedCount };
  }, [progress, applied]);

  if (!loaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-brand-bg">
        <span className="text-[13px] text-brand-muted">Loading…</span>
      </div>
    );
  }

  return (
    <AppShell progress={progress}>
      <div className="flex flex-col gap-14">
        <div className="sticky top-6 z-0 bg-brand-bg">
          <SkillMatrix progress={progress} />
        </div>

        <div className="sticky bottom-6 z-10">
          <div className="backdrop-blur-sm rounded-2xl">
            <StatRow
              done={stats.done}
              applied={stats.applied}
              learning={stats.learning}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
