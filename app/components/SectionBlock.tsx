import type { Section } from "~/data";
import { sectionStats } from "~/lib/progress";
import type { ProgressMap, Status } from "~/lib/storage";
import { TopicRow } from "./TopicRow";

interface SectionBlockProps {
  section: Section;
  progress: ProgressMap;
  onCycle: (id: string, forceTo?: Status) => void;
  color: string;
  openIds: Set<string>;
  setOpenIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  currentDisciplineId: string;
  onNavigate?: (disciplineId: string, skillId?: string) => void;
  /** Controlled open state (parent owns so reveal-skill can force-expand). */
  isOpen: boolean;
  onToggle: (sectionId: string) => void;
  /** Attempt an in-discipline scroll to a skill id; returns false if absent. */
  onRevealSkill?: (skillId: string) => boolean;
}

export function SectionBlock({
  section,
  progress,
  onCycle,
  color,
  openIds,
  setOpenIds,
  currentDisciplineId,
  onNavigate,
  isOpen,
  onToggle,
  onRevealSkill,
}: SectionBlockProps) {
  const s = sectionStats(section, progress);
  return (
    <div className="rounded-xl bg-brand-surface border border-brand-primary/10 overflow-hidden card-shadow">
      <button
        type="button"
        onClick={() => onToggle(section.id)}
        className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer bg-transparent border-none text-left hover:bg-brand-surface-2/50 transition-colors"
      >
        <span
          className={`inline-flex w-5 h-5 rounded-lg items-center justify-center shrink-0 text-[9px] transition-transform border border-brand-primary/20 ${
            isOpen ? "" : "-rotate-90"
          }`}
          style={{
            background: isOpen ? "rgba(0, 212, 255, 0.1)" : "transparent",
            color: isOpen
              ? "var(--color-brand-primary)"
              : "var(--color-brand-dim)",
          }}
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2 4L6 8L10 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="flex-1 text-[13px] font-semibold text-brand-ink">
          {section.label}
        </span>
        {s.learning > 0 && (
          <span
            className="text-[10px] font-medium rounded-md px-2 py-0.5 border border-brand-yellow/30"
            style={{
              background: "rgba(251, 146, 60, 0.1)",
              color: "var(--color-brand-yellow)",
            }}
          >
            {s.learning} active
          </span>
        )}
        <span
          className={`text-[11px] tabular-nums ${
            s.pct === 100
              ? "text-brand-green font-semibold"
              : "text-brand-muted"
          }`}
        >
          {s.done}/{s.total}
        </span>
        <div className="w-14 h-[3px] bg-brand-dim/30 rounded-full overflow-hidden shrink-0">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{
              width: `${s.pct}%`,
              background:
                s.pct === 100
                  ? "var(--color-brand-green)"
                  : "linear-gradient(90deg, #00d4ff, #a855f7)",
              boxShadow:
                s.pct === 100
                  ? "0 0 6px var(--color-brand-green)"
                  : "0 0 6px rgba(0, 212, 255, 0.3)",
            }}
          />
        </div>
      </button>
      {isOpen && (
        <div className="bg-brand-bg/30 border-t border-brand-primary/5">
          {section.items.map((item) => (
            <TopicRow
              key={item.id}
              item={item}
              status={progress[item.id] ?? "untouched"}
              onCycle={onCycle}
              openIds={openIds}
              setOpenIds={setOpenIds}
              currentDisciplineId={currentDisciplineId}
              onNavigate={onNavigate}
              onRevealSkill={onRevealSkill}
            />
          ))}
        </div>
      )}
    </div>
  );
}
