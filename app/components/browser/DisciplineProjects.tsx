import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowUpRightFromSquare,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
import type { Project, ProjectDifficulty } from "~/data";
import type { ProjectsDoneMap } from "~/lib/storage";

interface DisciplineProjectsProps {
  projects: Project[];
  projectsDone: ProjectsDoneMap;
  onToggleProjectDone: (projectId: string) => void;
}

const DIFFICULTY_META: Record<
  ProjectDifficulty,
  { label: string; color: string }
> = {
  beginner: { label: "Beginner", color: "var(--color-brand-green)" },
  intermediate: { label: "Intermediate", color: "var(--color-brand-yellow)" },
  advanced: { label: "Advanced", color: "var(--color-brand-coral)" },
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

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-dim mb-1">
            Projects
          </div>
          <h2 className="text-sm text-brand-muted">
            Hands-on builds to apply what you've learned
          </h2>
        </div>
        <span className="text-[11px] tabular-nums text-brand-dim">
          {doneCount} / {projects.length} done
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {projects.map((p) => {
          const done = !!projectsDone[p.id];
          const diff =
            DIFFICULTY_META[p.difficulty] ?? DIFFICULTY_META.beginner;
          return (
            <article
              key={p.id}
              className={`surface-card rounded-xl p-4 flex flex-col gap-2 transition-opacity ${
                done ? "opacity-70" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => onToggleProjectDone(p.id)}
                  aria-label={
                    done ? "Mark project as not done" : "Mark project as done"
                  }
                  aria-pressed={done}
                  className={`mt-0.5 shrink-0 w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                    done
                      ? "bg-brand-green/20 text-brand-green"
                      : "text-transparent hover:text-brand-ink"
                  }`}
                  style={{
                    borderColor: done
                      ? "var(--color-brand-green)"
                      : "var(--color-brand-line)",
                  }}
                >
                  <FontAwesomeIcon icon={faCheck} className="text-[10px]" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3
                      className={`text-[13.5px] font-semibold leading-tight ${
                        done
                          ? "text-brand-muted line-through decoration-brand-muted/40"
                          : "text-brand-ink"
                      }`}
                    >
                      {p.title}
                    </h3>
                    <span
                      className="text-[9.5px] uppercase tracking-wide font-semibold rounded px-1.5 py-0.5"
                      style={{
                        color: diff.color,
                        background: `${diff.color}18`,
                      }}
                    >
                      {diff.label}
                    </span>
                    {p.nature && (
                      <span className="text-[9.5px] uppercase tracking-wide font-medium text-brand-dim bg-brand-surface-2 rounded px-1.5 py-0.5">
                        {p.nature}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-brand-muted leading-snug line-clamp-2">
                    {p.description}
                  </p>
                </div>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  onClick={(e) => e.stopPropagation()}
                  title="Open on roadmap.sh"
                  aria-label="Open on roadmap.sh"
                  className="shrink-0 mt-0.5 inline-flex w-7 h-7 items-center justify-center rounded-md text-brand-muted hover:text-brand-primary hover:bg-brand-surface-2 transition-colors"
                >
                  <FontAwesomeIcon
                    icon={faArrowUpRightFromSquare}
                    className="text-[11px]"
                  />
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
