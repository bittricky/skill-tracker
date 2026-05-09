import { useMemo, useState } from "react";
import type { Route } from "./+types/dashboard";
import { DISCIPLINES } from "~/data";
import { useProgress } from "~/hooks/useProgress";
import { Loader } from "~/components/ui/Loader";
import { SettingsModal } from "~/components/SettingsModal";
import {
  HeaderBar,
  TabBar,
  ActiveTracks,
  StatRow,
  SkillMatrix,
  WeeklyActivity,
  ResourceInventory,
  FooterHints,
} from "~/components/dashboard";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Skill Tracker" },
    {
      name: "description",
      content: "Track your progress across different disciplines.",
    },
  ];
}

type TabId = "overview" | "matrix" | "sessions" | "resources";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { progress, applied, projectsDone, loaded } = useProgress();

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
    const projects = Object.keys(projectsDone).filter(
      (id) => projectsDone[id],
    ).length;
    return { done, learning, applied: appliedCount, projects };
  }, [progress, applied, projectsDone]);

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
    <div className="min-h-screen p-5">
      <div className="max-w-[1280px] mx-auto">
        <HeaderBar
          done={stats.done}
          applied={stats.applied}
          learning={stats.learning}
          projects={stats.projects}
          onSettingsClick={() => setSettingsOpen(true)}
        />

        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
        <TabBar active={activeTab} onChange={setActiveTab} />

        <div className="flex flex-col gap-3.5">
          <ActiveTracks disciplines={DISCIPLINES} progress={progress} />
          <StatRow
            done={stats.done}
            applied={stats.applied}
            learning={stats.learning}
            projects={stats.projects}
          />
          <SkillMatrix progress={progress} />

          <div className="grid grid-cols-[1.3fr_1fr] gap-3.5">
            <WeeklyActivity />
            <ResourceInventory />
          </div>
        </div>

        <FooterHints />
      </div>
    </div>
  );
}
