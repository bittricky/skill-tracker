import type { Skill } from "~/data";
import type { ProgressMap, AppliedMap, Status } from "~/lib/storage";
import { cn } from "~/lib/cn";
import { Mono } from "~/components/ui/Mono";
import { Pixel } from "~/components/ui/Pixel";
import { ProgressBar } from "~/components/ui/ProgressBar";

import { SkillRow } from "./SkillRow";

interface SectionBlockProps {
  section: { id: string; label: string; items: Skill[]; description?: string };
  progress: ProgressMap;
  applied: AppliedMap;
  onCycle: (id: string, forceTo?: Status) => void;
  onToggleApplied: (id: string, value?: boolean) => void;
  tierColor: string;
  isOpen: boolean;
  onToggle: () => void;
  isLast: boolean;
  currentDisciplineId: string;
  onNavigate?: (disciplineId: string, skillId?: string) => void;
  onRevealSkill?: (skillId: string) => boolean;
}

export function SectionBlock({
  section,
  progress,
  applied,
  onCycle,
  onToggleApplied,
  tierColor,
  isOpen,
  onToggle,
  isLast,
  currentDisciplineId,
  onNavigate,
  onRevealSkill,
}: SectionBlockProps) {
  const doneCount = section.items.filter(
    (i) => progress[i.id] === "done",
  ).length;
  const pct =
    section.items.length > 0
      ? Math.round((doneCount / section.items.length) * 100)
      : 0;

  return (
    <div
      className={cn("border-b border-surface-divider", isLast && "border-b-0")}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-panel-hi transition-colors"
      >
        <div className="flex items-center gap-2">
          <Mono size={13} color="ink" weight={600}>
            {section.label}
          </Mono>
          <Pixel size={11} color="ink-muted">
            ({section.items.length})
          </Pixel>
        </div>
        <div className="flex items-center gap-3">
          <ProgressBar
            pct={pct}
            color={tierColor}
            height={4}
            className="w-20"
          />
          <Mono size={11} color="ink-muted">
            {isOpen ? "−" : "+"}
          </Mono>
        </div>
      </button>

      {isOpen && (
        <div className="px-2 pb-2">
          {section.description && (
            <div className="px-3 py-2 mb-2 rounded-md text-ink-dim text-sm italic border-l-2 border-accent-mustard/50 bg-surface-inset/50">
              {section.description}
            </div>
          )}
          {section.items.map((item) => (
            <SkillRow
              key={item.id}
              skill={item}
              status={progress[item.id] ?? "untouched"}
              isApplied={!!applied[item.id]}
              onCycle={() => onCycle(item.id)}
              onToggleApplied={() => onToggleApplied(item.id)}
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
