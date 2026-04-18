import {
  ROADMAP_BY_ID,
  SKILL_HOME_BY_ID,
  SKILL_LABEL_BY_ID,
  type Skill,
} from "~/data";
import { STATUS, STATUS_CYCLE, type Status } from "~/lib/storage";
import { StatusButton } from "./StatusButton";
import { ResourceLinks } from "./ResourceLinks";

interface TopicRowProps {
  item: Skill;
  status: Status;
  onCycle: (id: string, forceTo?: Status) => void;
  openIds: Set<string>;
  setOpenIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  currentRoadmapId: string;
  onNavigate?: (roadmapId: string, skillId?: string) => void;
  /** Scroll within the current roadmap. Returns false if skill isn't here. */
  onRevealSkill?: (skillId: string) => boolean;
}

const MAX_PREREQS = 4;

export function TopicRow({
  item,
  status,
  onCycle,
  openIds,
  setOpenIds,
  currentRoadmapId,
  onNavigate,
  onRevealSkill,
}: TopicRowProps) {
  const isOpen = openIds.has(item.id);
  const toggle = () =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });

  const rowBg =
    status === "learning"
      ? "bg-brand-yellow/5 hover:bg-brand-yellow/10"
      : status === "done"
        ? "bg-brand-green/5 hover:bg-brand-green/10"
        : "hover:bg-brand-surface-2/30";

  const labelCls =
    status === "done"
      ? "text-brand-muted line-through decoration-brand-muted/40"
      : status === "skipped"
        ? "text-brand-muted/60"
        : "text-brand-ink";

  const prereqs = (item.prerequisites || [])
    .map((id) => ({ id, label: SKILL_LABEL_BY_ID[id] }))
    .filter((p): p is { id: string; label: string } => Boolean(p.label));
  const isReference = item.primary === false;
  const homeRm =
    isReference && item.homeRoadmapId !== currentRoadmapId
      ? ROADMAP_BY_ID[item.homeRoadmapId]
      : null;

  return (
    <div
      id={`skill-${item.id}`}
      className="border-b border-brand-primary/5 last:border-b-0 scroll-mt-28"
    >
      <div
        onClick={toggle}
        className={`flex items-start gap-3 px-4 py-2.5 cursor-pointer select-none transition-colors ${rowBg} group`}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            onCycle(item.id);
          }}
          className="shrink-0 mt-0.5"
        >
          <StatusButton status={status} />
        </div>
        <div className="flex-1 min-w-0">
          <span className={`text-[13px] leading-snug ${labelCls}`}>
            {item.label}
          </span>
          {prereqs.length > 0 && (
            <div className="mt-0.5 text-[11px] leading-snug">
              <span className="text-brand-muted">Builds on:</span>{" "}
              {prereqs.slice(0, MAX_PREREQS).map((p, i) => (
                <span key={p.id}>
                  {i > 0 && <span className="text-brand-muted/50">, </span>}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Try to reveal within the current roadmap first; if the
                      // prereq lives elsewhere, jump to its canonical home.
                      const revealed = onRevealSkill?.(p.id);
                      if (!revealed) {
                        const homeId = SKILL_HOME_BY_ID[p.id];
                        if (homeId) onNavigate?.(homeId, p.id);
                      }
                    }}
                    className="text-brand-primary hover:underline bg-transparent border-none p-0 cursor-pointer font-medium"
                  >
                    {p.label}
                  </button>
                </span>
              ))}
              {prereqs.length > MAX_PREREQS && (
                <span className="text-brand-muted">
                  {" "}
                  +{prereqs.length - MAX_PREREQS}
                </span>
              )}
            </div>
          )}
          {homeRm && (
            <div className="mt-0.5 text-[11px] text-brand-muted leading-snug">
              Tracked in:{" "}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate?.(homeRm.id, item.id);
                }}
                className="text-brand-primary hover:underline bg-transparent border-none p-0 cursor-pointer font-medium"
              >
                {homeRm.label}
              </button>
            </div>
          )}
        </div>
        {item.sources && item.sources.length > 1 && (
          <span className="text-[9.5px] text-brand-dim bg-brand-surface-2 rounded-md px-1.5 py-[2px] shrink-0 mt-0.5 font-medium border border-brand-primary/10">
            ×{item.sources.length}
          </span>
        )}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`text-brand-dim shrink-0 mt-1 transition-transform group-hover:text-brand-primary ${isOpen ? "rotate-180 text-brand-primary" : ""}`}
        >
          <path
            d="M2 4L6 8L10 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {isOpen && (
        <div className="px-4 pt-3 pb-4 pl-11 border-t border-brand-primary/10 bg-brand-surface-2/30">
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {STATUS_CYCLE.map((s) => {
              const sc = STATUS[s];
              const isActive = status === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCycle(item.id, s);
                  }}
                  className={`px-3 py-1 rounded-md text-[11px] cursor-pointer transition-all font-medium border ${
                    isActive
                      ? "text-brand-ink border-transparent"
                      : "text-brand-muted border-brand-primary/20 hover:border-brand-primary/40 hover:text-brand-ink"
                  }`}
                  style={{
                    background: isActive ? sc.ring : "transparent",
                    boxShadow: isActive ? `0 0 12px ${sc.ring}60` : "none",
                  }}
                >
                  {sc.label}
                </button>
              );
            })}
          </div>
          <ResourceLinks
            label={item.label}
            resources={item.resources}
            sources={item.sources}
            primary={item.primary !== false}
          />
        </div>
      )}
    </div>
  );
}
