import { useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router";
import type { Route } from "./+types/browser";
import {
  DISCIPLINES,
  DISCIPLINE_BY_ID,
  KIND_META,
  KIND_ORDER,
  type DisciplineKind,
} from "~/data";
import { iconForDiscipline, KIND_ICON } from "~/data/icons";
import { useProgress } from "~/hooks/useProgress";
import { calculateDepth, TIER_META } from "~/lib/depth";
import { disciplineStats } from "~/lib/progress";
import type { Status } from "~/lib/storage";
import { Loader } from "~/components/ui/Loader";
import { Panel, PanelHeader, PanelBody } from "~/components/ui/Panel";
import { Pixel } from "~/components/ui/Pixel";
import { Mono } from "~/components/ui/Mono";
import { ProgressBar } from "~/components/ui/ProgressBar";
import { SecondaryButton } from "~/components/ui/SecondaryButton";
import { TierTag } from "~/components/ui/TierTag";
import { DisciplineDepthStepper } from "~/components/browser/DisciplineDepthStepper";
import { LearningResources } from "~/components/browser/LearningResources";
import { SectionBlock } from "~/components/browser/SectionBlock";
import { Icon } from "~/components/ui/Icon";
import { HeaderBar } from "~/components/dashboard/HeaderBar";
import { cn } from "~/lib/cn";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Browser | Skill Tracker" },
    {
      name: "description",
      content: "Browse skills and topics across disciplines.",
    },
  ];
}

const FILTERS: [Status | "all", string][] = [
  ["all", "All"],
  ["untouched", "To Do"],
  ["learning", "Active"],
  ["done", "Done"],
  ["skipped", "Skipped"],
];

/** Disciplines where an MDN search chip makes sense. */
const WEB_DISCIPLINES = new Set([
  "frontend",
  "html",
  "css",
  "javascript",
  "typescript",
  "react",
  "vue",
  "svelte",
  "nextjs",
  "nuxt",
  "nodejs",
  "api-design",
]);

function scrollToSkill(skillId: string, attempts = 6): void {
  const el = document.getElementById(`skill-${skillId}`);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  if (attempts > 0) {
    setTimeout(() => scrollToSkill(skillId, attempts - 1), 40);
  }
}

export default function Browser() {
  const {
    progress,
    applied,
    pinned,
    loaded,
    setStatus,
    setApplied,
    togglePinned,
  } = useProgress();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<Status | "all">("all");
  const [search, setSearch] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(),
  );

  const requestedId = searchParams.get("discipline") ?? "";
  const activeId = DISCIPLINE_BY_ID[requestedId]
    ? requestedId
    : (DISCIPLINES[0]?.id ?? "");
  const activeDiscipline = DISCIPLINE_BY_ID[activeId];
  const [kindFilter, setKindFilter] = useState<DisciplineKind>(
    activeDiscipline?.kind ?? "role",
  );

  const depth = useMemo(
    () =>
      activeDiscipline
        ? calculateDepth(activeDiscipline, progress, applied)
        : null,
    [activeDiscipline, progress, applied],
  );

  const stats = useMemo(
    () =>
      activeDiscipline
        ? disciplineStats(activeDiscipline, progress, applied)
        : null,
    [activeDiscipline, progress, applied],
  );

  const tier = depth?.tier ?? "exploring";
  const tierMeta = TIER_META[tier];

  const handleNavigate = useCallback(
    (disciplineId: string, skillId?: string) => {
      if (disciplineId === activeId && skillId) {
        scrollToSkill(skillId);
        return;
      }
      const target = DISCIPLINE_BY_ID[disciplineId];
      if (target) setKindFilter(target.kind);
      setSearchParams({ discipline: disciplineId });
    },
    [activeId, setSearchParams],
  );

  const toggleSection = useCallback((id: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const revealSkill = useCallback(
    (skillId: string): boolean => {
      if (!activeDiscipline) return false;
      const hasSkill = activeDiscipline.sections.some((sec) =>
        sec.items.some((item) => item.id === skillId),
      );
      if (!hasSkill) return false;
      // Clear anything that could hide the row, then scroll
      setFilter("all");
      setSearch("");
      setCollapsedSections(new Set());
      scrollToSkill(skillId);
      return true;
    },
    [activeDiscipline],
  );

  const filteredSections = useMemo(() => {
    if (!activeDiscipline) return [];
    const q = search.trim().toLowerCase();
    return activeDiscipline.sections
      .map((sec) => ({
        ...sec,
        items: sec.items.filter((item) => {
          const st = progress[item.id] ?? "untouched";
          const matchesFilter = filter === "all" ? true : st === filter;
          const matchesSearch = !q || item.label.toLowerCase().includes(q);
          return matchesFilter && matchesSearch;
        }),
      }))
      .filter((s) => s.items.length > 0);
  }, [activeDiscipline, progress, filter, search]);

  if (!loaded) {
    return (
      <div
        className="h-screen flex items-center justify-center"
        style={{ background: "var(--color-surface-bg)" }}
      >
        <Loader />
      </div>
    );
  }

  if (!activeDiscipline || !stats) {
    return (
      <div
        className="h-screen flex items-center justify-center"
        style={{ background: "var(--color-surface-bg)" }}
      >
        <Pixel size={13} color="ink-muted">
          No disciplines found. Run{" "}
          <code className="font-mono">pnpm run sync:disciplines</code>.
        </Pixel>
      </div>
    );
  }

  const kindColor = KIND_META[kindFilter].color;

  return (
    <div className="min-h-screen p-3 sm:p-5">
      <div className="max-w-7xl mx-auto">
        <HeaderBar
          title={activeDiscipline.label}
          subtitle={
            activeDiscipline.description ||
            `${KIND_META[activeDiscipline.kind].label} · ${stats.total} skills`
          }
          icon={iconForDiscipline(activeDiscipline.id, activeDiscipline.kind)}
          iconSize={44}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-3.5">
          {/* Left column */}
          <div className="flex flex-col gap-3">
            <Panel>
              <PanelHeader
                title="Disciplines"
                glyph="Settings2"
                accentColor="teal"
              />
              <PanelBody className="p-2">
                {/* Kind Filter Pills */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {KIND_ORDER.map((k) => {
                    const km = KIND_META[k];
                    const isActive = kindFilter === k;
                    return (
                      <button
                        key={k}
                        onClick={() => setKindFilter(k)}
                        title={km.description}
                        className={cn(
                          "flex items-center gap-1.5 font-display text-xs tracking-[0.04em] px-2.5 py-1 rounded-full cursor-pointer transition-all",
                          isActive ? "shadow-md" : "hover:shadow-sm",
                        )}
                        style={{
                          background: isActive
                            ? km.color
                            : "var(--color-surface-inset)",
                          color: isActive
                            ? "var(--color-surface-bg)"
                            : "var(--color-ink-muted)",
                          fontWeight: isActive ? 600 : 400,
                          border: isActive
                            ? `1px solid ${km.color}80`
                            : "1px solid var(--color-surface-border)",
                        }}
                      >
                        <Icon name={KIND_ICON[k]} size={14} />
                        <span>{km.plural}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Discipline List */}
                <div className="flex flex-col gap-1.5 max-h-65 lg:max-h-90 overflow-y-auto pr-1">
                  {DISCIPLINES.filter((d) => d.kind === kindFilter).map((d) => {
                    const isActive = d.id === activeId;
                    const dStats = disciplineStats(d, progress);
                    return (
                      <button
                        key={d.id}
                        onClick={() => handleNavigate(d.id)}
                        className={cn(
                          "group flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all text-left border",
                          isActive
                            ? "bg-surface-panel border-accent-mustard/50 shadow-sm"
                            : "bg-transparent border-transparent hover:bg-surface-panel/50 hover:border-surface-border",
                        )}
                      >
                        <div
                          className={cn(
                            "flex items-center justify-center w-10 h-10 rounded-lg transition-all shrink-0",
                            isActive
                              ? "bg-surface-inset"
                              : "bg-surface-inset/50 group-hover:bg-surface-inset",
                          )}
                        >
                          <Icon
                            name={iconForDiscipline(d.id, d.kind)}
                            size={20}
                            color={kindColor}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Mono
                              size={12}
                              color={isActive ? "ink" : "ink-muted"}
                              weight={isActive ? 700 : 500}
                              className="truncate"
                            >
                              {d.label}
                            </Mono>
                            {isActive && (
                              <span className="text-accent-mustard text-xs">
                                ◄
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1">
                              <ProgressBar
                                pct={dStats.pct}
                                color={kindColor}
                                height={4}
                              />
                            </div>
                            <Mono size={10} color="ink-dim">
                              {dStats.pct}%
                            </Mono>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </PanelBody>
            </Panel>

            {depth && (
              <Panel>
                <PanelHeader
                  title="Progress"
                  glyph="Play"
                  accentColor="lavender"
                />
                <PanelBody>
                  <DisciplineDepthStepper
                    tier={depth.tier}
                    donePct={depth.donePct}
                    appliedPct={depth.appliedPct}
                  />
                </PanelBody>
              </Panel>
            )}

            <LearningResources
              discipline={activeDiscipline}
              onRevealSkill={revealSkill}
            />
          </div>

          {/* Right content */}
          <div className="flex flex-col gap-3 min-w-0">
            {/* Filter bar */}
            <div
              className="flex flex-wrap items-center gap-2 p-2 rounded-lg"
              style={{
                background: "var(--color-surface-panel)",
                border: "1px solid var(--color-surface-border)",
              }}
            >
              <div className="flex gap-1 flex-wrap">
                {FILTERS.map(([v, l]) => (
                  <SecondaryButton
                    key={v}
                    active={filter === v}
                    onClick={() => setFilter(v)}
                  >
                    {l}
                  </SecondaryButton>
                ))}
              </div>

              <div className="flex-1" />

              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-md"
                style={{
                  background: "var(--color-surface-inset)",
                  border: "1px solid var(--color-surface-bg-deep)",
                }}
              >
                <Icon name="Search" size={14} className="text-ink-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search topics…"
                  className="bg-transparent outline-none text-xs text-ink placeholder-ink-dim min-w-0 w-32"
                />
              </div>
            </div>

            {/* Skills */}
            <Panel className="flex-1">
              <PanelHeader
                title="Skills"
                subtitle={`${stats.done}/${stats.total} done · ${stats.learning} active · ${stats.applied} applied`}
                accentColor={tierMeta.accent}
                glyph="Home"
              >
                <TierTag tier={tier} />
              </PanelHeader>
              <PanelBody className="p-0">
                {filteredSections.length === 0 ? (
                  <div className="py-16 text-center">
                    <Pixel size={13} color="ink-muted">
                      No topics match this filter.
                    </Pixel>
                    {(filter !== "all" || search) && (
                      <button
                        onClick={() => {
                          setFilter("all");
                          setSearch("");
                        }}
                        className="mt-2 text-xs text-accent-mustard hover:opacity-80 block mx-auto"
                      >
                        Show all topics
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {filteredSections.map((sec, secIndex) => (
                      <SectionBlock
                        key={sec.id}
                        section={sec}
                        progress={progress}
                        applied={applied}
                        pinned={pinned}
                        onSetStatus={setStatus}
                        onToggleApplied={setApplied}
                        onTogglePinned={togglePinned}
                        tierColor={tierMeta.color}
                        isOpen={!collapsedSections.has(sec.id)}
                        onToggle={() => toggleSection(sec.id)}
                        isLast={secIndex === filteredSections.length - 1}
                        currentDisciplineId={activeDiscipline.id}
                        web={WEB_DISCIPLINES.has(activeDiscipline.id)}
                        onNavigate={handleNavigate}
                        onRevealSkill={revealSkill}
                      />
                    ))}
                  </div>
                )}
              </PanelBody>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
