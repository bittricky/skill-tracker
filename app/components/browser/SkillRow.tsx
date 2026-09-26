import { useState } from "react";
import type { Skill } from "~/data";
import {
  DISCIPLINE_BY_ID,
  SKILL_BY_ID,
  SKILL_LABEL_BY_ID,
  SKILL_HOME_DISCIPLINE_BY_ID,
} from "~/data";
import { STATUS_CYCLE, type Status } from "~/lib/storage";
import { ResourceLinks } from "~/components/browser/ResourceLinks";
import { Tooltip } from "~/components/ui/Tooltip";
import { cn } from "~/lib/cn";

interface SkillRowProps {
  skill: Skill;
  status: Status;
  isApplied: boolean;
  isPinned: boolean;
  onSetStatus: (forceTo?: Status) => void;
  onToggleApplied: () => void;
  onTogglePinned: () => void;
  currentDisciplineId: string;
  web?: boolean;
  onNavigate?: (disciplineId: string, skillId?: string) => void;
  onRevealSkill?: (skillId: string) => boolean;
}

export const STATUS_META: Record<
  Status,
  { label: string; color: string; bg: string }
> = {
  untouched: {
    label: "TODO",
    color: "var(--color-ink-muted)",
    bg: "var(--color-surface-inset)",
  },
  learning: {
    label: "ACTIVE",
    color: "var(--color-accent-mustard)",
    bg: "rgba(232, 176, 74, 0.15)",
  },
  done: {
    label: "DONE",
    color: "var(--color-accent-teal)",
    bg: "rgba(92, 184, 168, 0.15)",
  },
  skipped: {
    label: "SKIPPED",
    color: "var(--color-ink-dim)",
    bg: "var(--color-surface-inset)",
  },
};

const MAX_PREREQS = 4;

export function SkillRow({
  skill,
  status,
  isApplied,
  isPinned,
  onSetStatus,
  onToggleApplied,
  onTogglePinned,
  currentDisciplineId,
  web = false,
  onNavigate,
  onRevealSkill,
}: SkillRowProps) {
  const [expanded, setExpanded] = useState(false);
  const meta = STATUS_META[status];

  const rowBg =
    status === "learning"
      ? "bg-accent-mustard/5 hover:bg-accent-mustard/10"
      : status === "done"
        ? "bg-accent-teal/5 hover:bg-accent-teal/10"
        : "hover:bg-surface-panel-hi";

  const labelCls =
    status === "done"
      ? "text-ink-muted line-through decoration-ink-muted/40"
      : status === "skipped"
        ? "text-ink-muted/60"
        : "text-ink";

  const prereqs = (skill.prerequisites || [])
    .map((id) => ({ id, label: SKILL_LABEL_BY_ID[id] }))
    .filter((p): p is { id: string; label: string } => Boolean(p.label));

  const isReference = skill.primary === false;
  const homeDiscipline =
    isReference && skill.homeDisciplineId !== currentDisciplineId
      ? DISCIPLINE_BY_ID[skill.homeDisciplineId]
      : null;
  // Reference rows may carry a stale/empty copy; always read the home record.
  const resources = SKILL_BY_ID[skill.id]?.resources ?? skill.resources ?? [];

  const hasDetails =
    resources.length > 0 || prereqs.length > 0 || Boolean(homeDiscipline);

  return (
    <div
      id={`skill-${skill.id}`}
      className="border-b border-surface-divider/30 last:border-b-0 scroll-mt-28"
    >
      <div
        onClick={() => setExpanded(!expanded)}
        className={`flex items-start gap-2 sm:gap-3 px-3 py-2.5 cursor-pointer select-none transition-colors ${rowBg} group`}
      >
        {/* Status button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSetStatus();
          }}
          title="Cycle status"
          className="shrink-0 mt-0.5 px-2 py-1 rounded text-[10px] font-display font-bold tracking-[0.06em] transition-colors min-w-14.5"
          style={{
            background: meta.bg,
            color: meta.color,
            border: `1px solid ${meta.color}40`,
          }}
        >
          {meta.label}
        </button>

        {/* Skill content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[13px] leading-snug ${labelCls}`}>
              {skill.label}
            </span>
            {hasDetails && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className={`text-ink-dim shrink-0 transition-transform group-hover:text-accent-mustard ${
                  expanded ? "rotate-180 text-accent-mustard" : ""
                }`}
              >
                <path
                  d="M2 4L6 8L10 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>

          {/* Prerequisites */}
          {prereqs.length > 0 && (
            <div className="mt-0.5 text-[11px] leading-snug">
              <span className="text-ink-muted">Builds on:</span>{" "}
              {prereqs.slice(0, MAX_PREREQS).map((p, i) => (
                <span key={p.id}>
                  {i > 0 && <span className="text-ink-muted/50">, </span>}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Try to reveal within the current discipline first; if
                      // the prereq lives elsewhere, jump to its canonical home.
                      const revealed = onRevealSkill?.(p.id);
                      if (!revealed) {
                        const homeId = SKILL_HOME_DISCIPLINE_BY_ID[p.id];
                        if (homeId) onNavigate?.(homeId, p.id);
                      }
                    }}
                    className="text-accent-mustard hover:underline bg-transparent border-none p-0 cursor-pointer font-medium"
                  >
                    {p.label}
                  </button>
                </span>
              ))}
              {prereqs.length > MAX_PREREQS && (
                <span className="text-ink-muted">
                  {" "}
                  +{prereqs.length - MAX_PREREQS}
                </span>
              )}
            </div>
          )}

          {/* Home discipline for reference skills */}
          {homeDiscipline && (
            <div className="mt-0.5 text-[11px] text-ink-muted leading-snug">
              Tracked in:{" "}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate?.(homeDiscipline.id, skill.id);
                }}
                className="text-accent-mustard hover:underline bg-transparent border-none p-0 cursor-pointer font-medium"
              >
                {homeDiscipline.label}
              </button>
            </div>
          )}
        </div>

        {/* Multi-discipline indicator */}
        {skill.sources && skill.sources.length > 1 && (
          <Tooltip
            label={`Appears in ${skill.sources.length} disciplines`}
            className="shrink-0 mt-0.5 hidden sm:block"
          >
            <span className="text-[9.5px] text-ink-dim bg-surface-inset rounded-md px-1.5 py-0.5 font-medium border border-surface-border/50">
              ×{skill.sources.length}
            </span>
          </Tooltip>
        )}

        {/* Pin button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePinned();
          }}
          title={isPinned ? "Unpin from dashboard" : "Pin to dashboard"}
          aria-pressed={isPinned}
          className={cn(
            "shrink-0 mt-0.5 w-7 h-7 rounded text-[12px] leading-none transition-colors border",
            isPinned
              ? "text-accent-mustard border-accent-mustard/60 bg-accent-mustard/10"
              : "text-ink-dim border-transparent hover:border-surface-border hover:text-ink-muted",
          )}
        >
          {isPinned ? "★" : "☆"}
        </button>

        {/* Applied button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleApplied();
          }}
          className={cn(
            "shrink-0 mt-0.5 px-2 py-1 rounded text-[10px] font-display font-bold tracking-[0.06em] transition-colors",
            isApplied
              ? "text-accent-teal border-accent-teal"
              : "text-ink-dim border-surface-border hover:text-ink-muted",
          )}
          style={{
            border: "1px solid",
            background: isApplied ? "rgba(92, 184, 168, 0.1)" : "transparent",
          }}
        >
          <span className="sm:hidden">{isApplied ? "✓" : "APPLY"}</span>
          <span className="hidden sm:inline">
            {isApplied ? "✓ APPLIED" : "MARK APPLIED"}
          </span>
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pt-3 pb-4 sm:pl-11 border-t border-surface-divider/30 bg-surface-inset/30">
          {/* Status quick-change buttons */}
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {STATUS_CYCLE.map((s) => {
              const isActive = status === s;
              const m = STATUS_META[s];
              return (
                <button
                  key={s}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetStatus(s);
                  }}
                  className={`px-3 py-1 rounded-md text-[11px] cursor-pointer transition-all font-medium border ${
                    isActive
                      ? "text-ink border-transparent"
                      : "text-ink-muted border-surface-border/50 hover:border-surface-border hover:text-ink"
                  }`}
                  style={{
                    background: isActive ? m.color : "transparent",
                    boxShadow: isActive ? `0 0 12px ${m.color}40` : "none",
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          <ResourceLinks
            label={skill.label}
            resources={resources}
            fromLabel={homeDiscipline?.label ?? null}
            web={web}
          />
        </div>
      )}
    </div>
  );
}
