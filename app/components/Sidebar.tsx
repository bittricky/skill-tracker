import { ROADMAPS, KIND_ORDER, type RoadmapKind } from "~/data";
import { globalStats } from "~/lib/progress";
import type { ProgressMap } from "~/lib/storage";
import { SidebarItem } from "./SidebarItem";

interface SidebarProps {
  progress: ProgressMap;
  activeId: string;
  setActiveId: (id: string) => void;
}

const KIND_HEADER: Record<RoadmapKind, string> = {
  role: "Roles",
  foundation: "Foundations",
  language: "Languages",
  framework: "Frameworks",
  tech: "Technologies",
};

export function Sidebar({ progress, activeId, setActiveId }: SidebarProps) {
  const gs = globalStats(ROADMAPS, progress);
  const byKind = KIND_ORDER.map((k) => ({
    kind: k,
    roadmaps: ROADMAPS.filter((r) => r.kind === k),
  })).filter((g) => g.roadmaps.length > 0);

  return (
    <aside className="w-64 shrink-0 flex flex-col overflow-hidden rounded-2xl card-shadow bg-brand-surface">
      {/* Brand / logo */}
      <div className="px-5 pt-5 pb-3 shrink-0 flex items-center gap-3 border-b border-brand-primary/10">
        <div className="w-10 h-10 rounded-xl bg-brand-primary/10 ring-1 ring-brand-primary/30 flex items-center justify-center">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="var(--color-brand-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[15px] font-bold tracking-tight text-brand-ink">
            Skill Tracker
          </span>
        </div>
      </div>

      {/* Overall progress card */}
      <div className="mx-4 mt-4 mb-3 rounded-xl bg-brand-surface-2 border border-brand-primary/10 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] uppercase tracking-wider text-brand-muted font-semibold">
            Progress
          </span>
          <span className="text-[14px] font-bold text-brand-primary">
            {gs.pct}%
          </span>
        </div>
        <div className="h-1 bg-brand-bg rounded-full overflow-hidden mb-2">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${gs.pct}%`,
              background: "linear-gradient(90deg, #00d4ff 0%, #a855f7 100%)",
              boxShadow: "0 0 10px rgba(0, 212, 255, 0.5)",
            }}
          />
        </div>
        <div className="flex gap-3 text-[10.5px] text-brand-muted">
          <span>
            <span className="text-brand-green font-semibold">{gs.done}</span>{" "}
            done
          </span>
          <span>
            <span className="text-brand-primary font-semibold">
              {gs.learning}
            </span>{" "}
            active
          </span>
          <span className="text-brand-dim">{gs.total} topics</span>
        </div>
      </div>

      {/* Nav */}
      <div className="overflow-y-auto flex-1 scroll-soft px-3 pb-3">
        {byKind.map((group) => (
          <div key={group.kind} className="mb-2">
            <div className="px-3 pt-3 pb-1.5 text-[10px] font-semibold text-brand-dim tracking-[0.16em] uppercase">
              {KIND_HEADER[group.kind]}
            </div>
            <div className="flex flex-col gap-0.5">
              {group.roadmaps.map((rm) => (
                <SidebarItem
                  key={rm.id}
                  rm={rm}
                  progress={progress}
                  isActive={activeId === rm.id}
                  onClick={() => setActiveId(rm.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
