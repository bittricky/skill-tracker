import { useState } from "react";
import type { Section } from "~/data";
import type { ProgressMap, AppliedMap, Status } from "~/lib/storage";
import { sectionStats } from "~/lib/progress";
import { cn } from "~/lib/cn";
import { Mono } from "~/components/ui/Mono";
import { Pixel } from "~/components/ui/Pixel";
import { ProgressBar } from "~/components/ui/ProgressBar";

import { SkillRow } from "./SkillRow";
import { ResourceList } from "./ResourceLinks";

interface SectionBlockProps {
  section: Section;
  progress: ProgressMap;
  applied: AppliedMap;
  pinned: string[];
  onSetStatus: (id: string, forceTo?: Status) => void;
  onToggleApplied: (id: string, value?: boolean) => void;
  onTogglePinned: (id: string) => void;
  tierColor: string;
  isOpen: boolean;
  onToggle: () => void;
  isLast: boolean;
  currentDisciplineId: string;
  web?: boolean;
  onNavigate?: (disciplineId: string, skillId?: string) => void;
  onRevealSkill?: (skillId: string) => boolean;
  expandedSkillId?: string;
}

export function SectionBlock({
  section,
  progress,
  applied,
  pinned,
  onSetStatus,
  onToggleApplied,
  onTogglePinned,
  tierColor,
  isOpen,
  onToggle,
  isLast,
  currentDisciplineId,
  web,
  onNavigate,
  onRevealSkill,
  expandedSkillId,
}: SectionBlockProps) {
  const [showResources, setShowResources] = useState(false);
  const stats = sectionStats(section, progress);
  const sectionResources = section.resources ?? [];

  return (
    <div
      className={cn("border-b border-surface-divider", isLast && "border-b-0")}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-panel-hi transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Mono size={13} color="ink" weight={600} className="truncate">
            {section.label}
          </Mono>
          <Pixel size={11} color="ink-muted">
            ({stats.done}/{stats.total})
          </Pixel>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <ProgressBar
            pct={stats.pct}
            color={tierColor}
            height={4}
            className="w-14 sm:w-20"
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
          {sectionResources.length > 0 && (
            <div className="mx-1 mb-2 rounded-md border border-accent-lavender/30 bg-accent-lavender/5">
              <button
                type="button"
                onClick={() => setShowResources((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-left"
              >
                <Pixel size={11} color="lavender">
                  Section resources ({sectionResources.length})
                </Pixel>
                <Mono size={11} color="ink-muted">
                  {showResources ? "−" : "+"}
                </Mono>
              </button>
              {showResources && (
                <div className="px-3 pb-2">
                  <ResourceList resources={sectionResources} />
                </div>
              )}
            </div>
          )}
          {section.items.map((item) => (
            <SkillRow
              key={item.id}
              skill={item}
              status={progress[item.id] ?? "untouched"}
              isApplied={!!applied[item.id]}
              isPinned={pinned.includes(item.id)}
              onSetStatus={(forceTo) => onSetStatus(item.id, forceTo)}
              onToggleApplied={() => onToggleApplied(item.id)}
              onTogglePinned={() => onTogglePinned(item.id)}
              currentDisciplineId={currentDisciplineId}
              web={web}
              onNavigate={onNavigate}
              onRevealSkill={onRevealSkill}
              forceExpanded={item.id === expandedSkillId}
              highlighted={item.id === expandedSkillId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
