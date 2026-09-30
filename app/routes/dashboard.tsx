import { useMemo } from "react";
import type { Route } from "./+types/dashboard";
import { DISCIPLINES, SKILL_BY_ID } from "~/data";
import { useProgress } from "~/hooks/useProgress";
import { globalStats } from "~/lib/progress";
import type { SkillFilter } from "~/lib/activity";
import { Loader } from "~/components/ui/Loader";
import { Pixel } from "~/components/ui/Pixel";
import {
  HeaderBar,
  ActiveTracks,
  StatRow,
  SkillMatrix,
  ActivityHeatmap,
  RecentActivity,
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
  const {
    progress,
    applied,
    pinned,
    hidden,
    events,
    loaded,
    saveError,
    togglePinned,
    setHidden,
  } = useProgress();

  // A skill counts when ANY discipline it appears in is still visible.
  const filter = useMemo<SkillFilter>(() => {
    const hiddenSet = new Set(hidden);
    return (id) => {
      const sources = SKILL_BY_ID[id]?.sources;
      if (!sources || sources.length === 0) return true;
      return sources.some((s) => !hiddenSet.has(s));
    };
  }, [hidden]);

  const stats = useMemo(() => {
    const hiddenSet = new Set(hidden);
    const visible = DISCIPLINES.filter((d) => !hiddenSet.has(d.id)).map(
      (d) => ({
        ...d,
        sections: d.sections.map((s) => ({
          ...s,
          items: s.items.filter((i) => filter(i.id)),
        })),
      }),
    );
    return globalStats(visible, progress, applied);
  }, [progress, applied, hidden, filter]);

  const allHidden =
    hidden.length > 0 && DISCIPLINES.every((d) => hidden.includes(d.id));

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
        <HeaderBar
          hidden={hidden}
          onSetHidden={setHidden}
          saveError={saveError}
        />

        {allHidden ? (
          <div className="py-20 text-center">
            <Pixel size={13} color="ink-muted">
              All disciplines are hidden — show some from the Browser or
              Settings.
            </Pixel>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            <ActiveTracks
              pinned={pinned}
              progress={progress}
              applied={applied}
              events={events}
              onUnpin={togglePinned}
            />
            <StatRow stats={stats} events={events} filter={filter} />
            <SkillMatrix
              progress={progress}
              applied={applied}
              hidden={hidden}
            />
            <ActivityHeatmap events={events} filter={filter} />
            <RecentActivity events={events} filter={filter} />
          </div>
        )}
      </div>
    </div>
  );
}
