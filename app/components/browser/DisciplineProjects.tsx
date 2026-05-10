import type { Project, ProjectDifficulty } from "~/data";
import type { ProjectsDoneMap } from "~/lib/storage";
import { Panel, PanelHeader, PanelBody } from "~/components/ui/Panel";
import { Pixel } from "~/components/ui/Pixel";
import { Mono } from "~/components/ui/Mono";
import { ProgressBar } from "~/components/ui/ProgressBar";
import { cn } from "~/lib/cn";

interface DisciplineProjectsProps {
  projects: Project[];
  projectsDone: ProjectsDoneMap;
  onToggleProjectDone: (projectId: string) => void;
}

const DIFFICULTY_META: Record<
  ProjectDifficulty,
  { label: string; color: string }
> = {
  beginner: {
    label: "Beginner",
    color: "var(--color-accent-teal)",
  },
  intermediate: {
    label: "Intermediate",
    color: "var(--color-accent-mustard)",
  },
  advanced: {
    label: "Advanced",
    color: "var(--color-accent-coral)",
  },
};

export function DisciplineProjects({
  projects,
  projectsDone,
  onToggleProjectDone,
}: DisciplineProjectsProps) {
  if (projects.length === 0) return null;

  const doneCount = projects.reduce(
    (acc, p) => acc + (projectsDone[p.id] ? 1 : 0),
    0,
  );
  const pct = Math.round((doneCount / projects.length) * 100);

  return (
    <Panel>
      <PanelHeader
        title="Projects"
        subtitle="Hands-on builds to apply what you've learned"
        accentColor="rose"
        glyph="Briefcase"
      >
        <Mono size={11} color="ink-muted">
          {doneCount} / {projects.length} done
        </Mono>
      </PanelHeader>
      <PanelBody>
        <ProgressBar
          pct={pct}
          color="var(--color-accent-rose)"
          height={4}
          className="mb-3"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {projects.map((p) => {
            const done = !!projectsDone[p.id];
            const diff =
              DIFFICULTY_META[p.difficulty] ?? DIFFICULTY_META.beginner;
            return (
              <article
                key={p.id}
                className={cn(
                  "rounded-md p-3 transition-all",
                  done ? "opacity-60" : "",
                )}
                style={{
                  background: "var(--color-surface-inset)",
                  border: "1px solid var(--color-surface-bg-deep)",
                  boxShadow: "var(--shadow-inset)",
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={() => onToggleProjectDone(p.id)}
                    aria-label={
                      done ? "Mark project as not done" : "Mark project as done"
                    }
                    aria-pressed={done}
                    className={cn(
                      "mt-0.5 shrink-0 w-5 h-5 rounded flex items-center justify-center border transition-colors",
                      done
                        ? "bg-accent-teal/20 text-accent-teal border-accent-teal"
                        : "text-transparent border-surface-border hover:text-ink",
                    )}
                  >
                    {done && <span className="text-xs">✓</span>}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Mono
                        size={13}
                        color={done ? "ink-muted" : "ink"}
                        weight={600}
                        className={done ? "line-through" : ""}
                      >
                        {p.title}
                      </Mono>
                      <span
                        className="font-display text-[10px] font-bold tracking-[0.06em] uppercase px-1.5 py-0.5 rounded"
                        style={{
                          color: diff.color,
                          background: `${diff.color}15`,
                          border: `1px solid ${diff.color}40`,
                        }}
                      >
                        {diff.label}
                      </span>
                      {p.nature && (
                        <span className="font-display text-[10px] tracking-[0.04em] text-ink-dim bg-surface-panel-hi rounded px-1.5 py-0.5">
                          {p.nature}
                        </span>
                      )}
                    </div>
                    <Pixel size={12} color="ink-muted" className="line-clamp-2">
                      {p.description}
                    </Pixel>
                  </div>

                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    onClick={(e) => e.stopPropagation()}
                    title="Open on roadmap.sh"
                    aria-label="Open on roadmap.sh"
                    className="shrink-0 mt-0.5 inline-flex w-7 h-7 items-center justify-center rounded text-ink-muted hover:text-accent-mustard hover:bg-surface-panel-hi transition-colors"
                  >
                    <span className="text-xs">↗</span>
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </PanelBody>
    </Panel>
  );
}
