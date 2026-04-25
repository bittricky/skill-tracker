import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faGem,
  faCircle,
  faCircleDot,
  faSun,
  faMoon,
} from "@fortawesome/free-solid-svg-icons";
import type { Theme } from "~/lib/theme";
import type { Discipline } from "~/data";
import { disciplineStats } from "~/lib/progress";
import { STATUS, type ProgressMap, type Status } from "~/lib/storage";
import { SectionBlock } from "./SectionBlock";
import { StatusButton } from "./StatusButton";

type Filter = "all" | "todo" | "active" | "done" | "skipped";

export interface MainContentHandle {
  /**
   * Reveal a skill inside the currently active discipline: clears search/filter,
   * expands its section, and smooth-scrolls to it (retrying until the DOM
   * node actually exists since React may not have painted yet).
   * Returns true if the skill is present in the current discipline.
   */
  revealSkill: (skillId: string) => boolean;
}

interface MainContentProps {
  discipline: Discipline;
  progress: ProgressMap;
  onCycle: (id: string, forceTo?: Status) => void;
  onNavigate?: (disciplineId: string, skillId?: string) => void;
  /** Ref used by `Home` to drive post-navigation scroll. */
  revealRef?: React.Ref<MainContentHandle>;
  theme: Theme;
  onToggleTheme: () => void;
}

const FILTERS: [Filter, string][] = [
  ["all", "All"],
  ["todo", "To Do"],
  ["active", "Active"],
  ["done", "Done"],
  ["skipped", "Skipped"],
];

function hasSkill(discipline: Discipline, skillId: string): boolean {
  for (const sec of discipline.sections) {
    for (const item of sec.items) if (item.id === skillId) return true;
  }
  return false;
}

function scrollToSkillDom(skillId: string, attempts = 6): void {
  const el = document.getElementById(`skill-${skillId}`);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  if (attempts > 0) {
    setTimeout(() => scrollToSkillDom(skillId, attempts - 1), 40);
  }
}

export function MainContent({
  discipline,
  progress,
  onCycle,
  onNavigate,
  revealRef,
  theme,
  onToggleTheme,
}: MainContentProps) {
  const isDark = theme === "dark";
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  // Lifted section state: tracks explicitly collapsed sections. Default is
  // all-open; a navigation event can clear this set to guarantee visibility.
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<Set<string>>(
    new Set(),
  );
  const mainRef = useRef<HTMLDivElement>(null);

  // Reset UI state when discipline changes
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
    setOpenIds(new Set());
    setFilter("all");
    setSearch("");
    setCollapsedSectionIds(new Set());
  }, [discipline.id]);

  const toggleSection = useCallback((id: string) => {
    setCollapsedSectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const revealSkill = useCallback(
    (skillId: string): boolean => {
      if (!hasSkill(discipline, skillId)) return false;
      // Clear anything that could hide the row, then scroll (retry).
      setFilter("all");
      setSearch("");
      setCollapsedSectionIds(new Set());
      scrollToSkillDom(skillId);
      return true;
    },
    [discipline],
  );

  useImperativeHandle(revealRef, () => ({ revealSkill }), [revealSkill]);

  const stats = disciplineStats(discipline, progress);

  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    return discipline.sections
      .map((sec) => ({
        ...sec,
        items: sec.items.filter((item) => {
          const st = (progress[item.id] ?? "untouched") as Status;
          const mf =
            filter === "all"
              ? true
              : filter === "todo"
                ? st === "untouched"
                : filter === "active"
                  ? st === "learning"
                  : filter === "done"
                    ? st === "done"
                    : filter === "skipped"
                      ? st === "skipped"
                      : true;
          const ms = !q || item.label.toLowerCase().includes(q);
          return mf && ms;
        }),
      }))
      .filter((s) => s.items.length > 0);
  }, [discipline, progress, filter, search]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden gap-4 min-w-0">
      {/* Page header (discipline title + stat pills + search) */}
      <header className="flex items-center gap-4 shrink-0 pl-1 pr-1">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-brand-primary/30"
            style={{
              background: "var(--color-brand-surface)",
              boxShadow: "0 0 20px rgba(0, 212, 255, 0.15)",
            }}
          >
            <span className="text-brand-primary font-bold text-[15px]">
              {discipline.label.charAt(0)}
            </span>
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <h1 className="text-[22px] font-bold tracking-tight truncate text-brand-ink">
              {discipline.label}
            </h1>
            <span className="text-[11.5px] text-brand-muted font-medium">
              {discipline.sections.length} sections · {stats.total} topics
            </span>
          </div>
        </div>

        {/* Search pill */}
        <div className="flex items-center gap-2 bg-brand-surface rounded-xl border border-brand-primary/20 card-shadow px-4 py-2 w-64">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            className="text-brand-muted"
            aria-hidden="true"
          >
            <circle
              cx="11"
              cy="11"
              r="7"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M20 20l-3.5-3.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search topics…"
            className="flex-1 bg-transparent outline-none text-[12.5px] text-brand-ink placeholder-brand-dim min-w-0"
          />
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-surface border border-brand-primary/20 hover:border-brand-primary/40 hover:bg-brand-primary/10 transition-all"
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          <FontAwesomeIcon
            icon={isDark ? faSun : faMoon}
            className="text-brand-primary text-sm"
          />
        </button>
      </header>

      {/* Stat cards row */}
      <div className="grid grid-cols-3 gap-4 shrink-0">
        <StatCard
          label="Completed"
          value={`${stats.pct}%`}
          sub={`${stats.done} of ${stats.total}`}
          accent="var(--color-brand-primary)"
          icon={faGem}
        />
        <StatCard
          label="In progress"
          value={String(stats.learning)}
          sub="currently active"
          accent="var(--color-brand-yellow)"
          icon={faCircleDot}
        />
        <StatCard
          label="To explore"
          value={String(
            Math.max(
              stats.total - stats.done - stats.learning - stats.skipped,
              0,
            ),
          )}
          sub="untouched topics"
          accent="var(--color-brand-green)"
          icon={faCircle}
        />
      </div>

      {/* Main card (filters + scrollable body) */}
      <section className="bg-brand-surface rounded-2xl card-shadow flex-1 flex flex-col overflow-hidden min-h-0 border border-brand-primary/10">
        {/* Filter bar */}
        <div className="px-5 pt-4 pb-3 flex items-center gap-3 shrink-0 flex-wrap border-b border-brand-primary/10">
          <div className="flex gap-1 bg-brand-bg rounded-lg p-1">
            {FILTERS.map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => setFilter(v)}
                className={`px-3 py-1.5 rounded-md text-[11.5px] cursor-pointer border transition-all font-medium ${
                  filter === v
                    ? "bg-brand-surface-2 text-brand-primary border-brand-primary/30"
                    : "bg-transparent text-brand-muted border-transparent hover:text-brand-ink hover:border-brand-primary/20"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <div className="hidden sm:flex items-center gap-3">
            {(
              Object.entries(STATUS) as [Status, (typeof STATUS)[Status]][]
            ).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <StatusButton status={k} size={11} />
                <span className="text-[10.5px] text-brand-muted">
                  {v.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div
          ref={mainRef}
          className="overflow-y-auto flex-1 scroll-soft px-5 pb-5"
        >
          {filteredSections.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-[13px] text-brand-muted mb-1">
                No topics match this filter.
              </div>
              {(filter !== "all" || search) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilter("all");
                    setSearch("");
                  }}
                  className="text-xs text-brand-primary bg-transparent border-none cursor-pointer underline font-medium hover:text-brand-secondary"
                >
                  Show all topics
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredSections.map((sec) => (
                <SectionBlock
                  key={sec.id}
                  section={sec}
                  progress={progress}
                  onCycle={onCycle}
                  color={discipline.color}
                  openIds={openIds}
                  setOpenIds={setOpenIds}
                  currentDisciplineId={discipline.id}
                  onNavigate={onNavigate}
                  isOpen={!collapsedSectionIds.has(sec.id)}
                  onToggle={toggleSection}
                  onRevealSkill={revealSkill}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  accent: string;
  icon: IconDefinition;
}

function StatCard({ label, value, sub, accent, icon }: StatCardProps) {
  return (
    <div className="bg-brand-surface rounded-xl card-shadow px-4 py-3 flex flex-col gap-0.5 relative overflow-hidden border border-brand-primary/10">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-dim">
          {label}
        </span>
        <FontAwesomeIcon
          icon={icon}
          className="text-[14px] opacity-40"
          style={{ color: accent }}
        />
      </div>
      <span
        className="text-[24px] font-bold leading-none mt-1"
        style={{ color: accent, textShadow: `0 0 20px ${accent}40` }}
      >
        {value}
      </span>
      <span className="text-[10px] text-brand-muted">{sub}</span>
    </div>
  );
}
