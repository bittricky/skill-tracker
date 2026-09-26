import { useMemo, useState } from "react";
import type { Discipline, Resource } from "~/data";
import { Panel, PanelHeader, PanelBody } from "~/components/ui/Panel";
import { Pixel } from "~/components/ui/Pixel";
import { Mono } from "~/components/ui/Mono";
import { ResourceList } from "./ResourceLinks";

interface LearningResourcesProps {
  discipline: Discipline;
  onRevealSkill?: (skillId: string) => boolean;
}

/** Resource kinds that count as "structured learning material". */
const LEARNING_KINDS = new Set(["course", "book"]);

interface SectionGroup {
  sectionId: string;
  sectionLabel: string;
  entries: { skillId: string; skillLabel: string; resource: Resource }[];
}

/**
 * Discipline-level view of curated learning material: discipline-wide links
 * from `resources.overrides.json` plus every course/book attached to a skill
 * in this discipline, grouped by section.
 */
export function LearningResources({
  discipline,
  onRevealSkill,
}: LearningResourcesProps) {
  const [open, setOpen] = useState(true);

  const groups = useMemo<SectionGroup[]>(() => {
    const out: SectionGroup[] = [];
    for (const sec of discipline.sections) {
      const entries: SectionGroup["entries"] = [];
      for (const skill of sec.items) {
        if (!skill.primary) continue;
        for (const r of skill.resources ?? []) {
          if (LEARNING_KINDS.has(r.kind))
            entries.push({ skillId: skill.id, skillLabel: skill.label, resource: r });
        }
      }
      if (entries.length)
        out.push({ sectionId: sec.id, sectionLabel: sec.label, entries });
    }
    return out;
  }, [discipline]);

  const disciplineLinks = discipline.resources ?? [];
  const total =
    disciplineLinks.length + groups.reduce((n, g) => n + g.entries.length, 0);

  if (total === 0) return null;

  return (
    <Panel>
      <PanelHeader
        title="Learning Resources"
        glyph="BookOpen"
        accentColor="lavender"
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2"
        >
          <Pixel size={11} color="ink-muted">
            {total}
          </Pixel>
          <Mono size={11} color="ink-muted">
            {open ? "−" : "+"}
          </Mono>
        </button>
      </PanelHeader>
      {open && (
        <PanelBody className="p-3 max-h-90 overflow-y-auto">
          {disciplineLinks.length > 0 && (
            <div className="mb-3">
              <Pixel size={10} color="ink-dim" className="block mb-1">
                Whole discipline
              </Pixel>
              <ResourceList resources={disciplineLinks} />
            </div>
          )}
          {groups.map((g) => (
            <div key={g.sectionId} className="mb-3 last:mb-0">
              <Pixel size={10} color="ink-dim" className="block mb-1">
                {g.sectionLabel}
              </Pixel>
              <div className="space-y-1">
                {g.entries.map(({ skillId, skillLabel, resource }) => (
                  <div key={`${skillId}:${resource.url}`} className="text-xs">
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-primary hover:underline"
                    >
                      {resource.label}
                    </a>
                    <button
                      type="button"
                      onClick={() => onRevealSkill?.(skillId)}
                      className="ml-1.5 text-[10px] text-ink-dim hover:text-accent-mustard"
                      title="Jump to skill"
                    >
                      → {skillLabel}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </PanelBody>
      )}
    </Panel>
  );
}
