import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Discipline } from "~/data";
import {
  STATUS,
  type ProgressMap,
  type Status,
  type AppliedMap,
} from "~/lib/storage";
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
  applied?: AppliedMap;
  onCycle: (id: string, forceTo?: Status) => void;
  onToggleApplied?: (id: string) => void;
  onNavigate?: (disciplineId: string, skillId?: string) => void;
  /** Ref used by parent route to drive post-navigation scroll. */
  revealRef?: React.Ref<MainContentHandle>;
  /** Slot rendered above the filter bar (e.g. discipline title + depth stepper). */
  headerSlot?: React.ReactNode;
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
  applied,
  onCycle,
  onToggleApplied,
  onNavigate,
  revealRef,
  headerSlot,
}: MainContentProps) {
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
    <div className="flex flex-col gap-8 min-w-0">
      {headerSlot}

      {/* Filter + search bar */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex gap-1 bg-brand-surface rounded-lg p-1">
            {FILTERS.map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => setFilter(v)}
                className={`px-3 py-1.5 rounded-md text-[11.5px] cursor-pointer transition-colors font-medium ${
                  filter === v
                    ? "bg-brand-bg text-brand-ink"
                    : "bg-transparent text-brand-muted hover:text-brand-ink"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-surface w-64">
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

          <div className="flex-1" />
          <div className="hidden md:flex items-center gap-3">
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
        <div ref={mainRef} className="flex flex-col">
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
                  className="text-xs text-brand-primary bg-transparent border-none cursor-pointer underline font-medium hover:opacity-80"
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
                  applied={applied}
                  onCycle={onCycle}
                  onToggleApplied={onToggleApplied}
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
