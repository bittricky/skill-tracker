import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faCheck,
  faStamp,
  faCircleDot,
  faCode,
} from "@fortawesome/free-solid-svg-icons";

interface StatRowProps {
  done: number;
  applied: number;
  learning: number;
  projects?: number;
}

export function StatRow({ done, applied, learning, projects }: StatRowProps) {
  const showProjects = typeof projects === "number";
  return (
    <div
      className={`grid gap-4 ${showProjects ? "grid-cols-2 md:grid-cols-4" : "grid-cols-3"}`}
    >
      <StatCard
        icon={faCheck}
        label="Completed"
        value={done}
        accent="var(--color-brand-green)"
      />
      <StatCard
        icon={faStamp}
        label="Applied"
        value={applied}
        accent="var(--color-brand-primary)"
      />
      <StatCard
        icon={faCircleDot}
        label="In Progress"
        value={learning}
        accent="var(--color-brand-yellow)"
      />
      {showProjects && (
        <StatCard
          icon={faCode}
          label="Projects Done"
          value={projects}
          accent="var(--color-brand-coral)"
        />
      )}
    </div>
  );
}

interface StatCardProps {
  icon: IconDefinition;
  label: string;
  value: number;
  accent: string;
}

function StatCard({ icon, label, value, accent }: StatCardProps) {
  return (
    <div className="surface-card rounded-2xl px-5 py-5 flex items-center gap-4">
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
        style={{ background: `${accent}15` }}
      >
        <FontAwesomeIcon
          icon={icon}
          className="text-sm"
          style={{ color: accent }}
          aria-hidden="true"
        />
      </div>
      <div className="flex flex-col leading-tight min-w-0">
        <span className="text-[10px] uppercase tracking-[0.16em] text-brand-dim">
          {label}
        </span>
        <span className="text-2xl font-semibold tabular-nums text-brand-ink mt-1">
          {value}
        </span>
      </div>
    </div>
  );
}
