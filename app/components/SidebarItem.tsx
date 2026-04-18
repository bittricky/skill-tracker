import type { Roadmap } from "~/data";
import { roadmapStats } from "~/lib/progress";
import type { ProgressMap } from "~/lib/storage";

interface SidebarItemProps {
  rm: Roadmap;
  progress: ProgressMap;
  isActive: boolean;
  onClick: () => void;
}

export function SidebarItem({
  rm,
  progress,
  isActive,
  onClick,
}: SidebarItemProps) {
  const s = roadmapStats(rm, progress);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left bg-transparent border-none p-0 cursor-pointer group rounded-lg transition-all ${
        isActive
          ? "bg-brand-primary/10 border border-brand-primary/30"
          : "hover:bg-brand-surface-2 border border-transparent"
      }`}
    >
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              background: isActive ? "var(--color-brand-primary)" : rm.color,
              boxShadow: isActive
                ? "0 0 8px var(--color-brand-primary)"
                : "none",
            }}
          />
          <span
            className={`flex-1 text-[12.5px] leading-tight truncate ${
              isActive
                ? "font-semibold text-brand-primary"
                : "font-medium text-brand-muted group-hover:text-brand-ink"
            }`}
          >
            {rm.label}
          </span>
          {s.pct === 100 && (
            <span
              className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: "var(--color-brand-green)",
                boxShadow: "0 0 6px var(--color-brand-green)",
              }}
            >
              <svg
                width="8"
                height="8"
                viewBox="0 0 8 8"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M1.5 4L3.2 5.8L6.5 2"
                  stroke="#0a0814"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 pl-4">
          <div
            className={`flex-1 h-[3px] rounded-full overflow-hidden ${
              isActive ? "bg-brand-primary/20" : "bg-brand-dim/30"
            }`}
          >
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{
                width: `${s.pct}%`,
                background: isActive
                  ? "linear-gradient(90deg, #00d4ff, #a855f7)"
                  : rm.color,
                boxShadow: isActive ? "0 0 6px rgba(0, 212, 255, 0.5)" : "none",
              }}
            />
          </div>
          <span
            className={`text-[10px] min-w-7 text-right tabular-nums ${
              isActive
                ? s.pct === 100
                  ? "text-brand-green font-semibold"
                  : "text-brand-primary"
                : "text-brand-dim"
            }`}
          >
            {s.pct}%
          </span>
        </div>
      </div>
    </button>
  );
}
