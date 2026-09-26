import { useMemo } from "react";
import type { Route } from "./+types/dashboard";
import { DISCIPLINES } from "~/data";
import { useProgress } from "~/hooks/useProgress";
import { globalStats } from "~/lib/progress";
import { Loader } from "~/components/ui/Loader";
import {
  HeaderBar,
  ActiveTracks,
  StatRow,
  SkillMatrix,
} from "~/components/dashboard";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Dashboard | Skill Tracker" },
    {
      name: "description",
      content: "Track your progress across different disciplines.",
    },
  ];
}

export default function Dashboard() {
  const { progress, applied, pinned, loaded, togglePinned } = useProgress();

  const stats = useMemo(
    () => globalStats(DISCIPLINES, progress, applied),
    [progress, applied],
  );

  if (!loaded) {
    return (
      <div
        className="h-screen flex items-center justify-center"
        style={{ background: "var(--color-surface-bg)" }}
      >
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-5">
      <div className="max-w-7xl mx-auto">
        <HeaderBar />

        <div className="flex flex-col gap-3.5">
          <ActiveTracks
            pinned={pinned}
            progress={progress}
            applied={applied}
            onUnpin={togglePinned}
          />
          <StatRow stats={stats} />
          <SkillMatrix progress={progress} applied={applied} />
        </div>
      </div>
    </div>
  );
}
