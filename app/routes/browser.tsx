import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router";
import type { Route } from "./+types/browser";
import {
  DISCIPLINES,
  DISCIPLINE_BY_ID,
  PROJECTS_BY_DISCIPLINE,
  SKILL_LABEL_BY_ID,
  SKILL_HOME_DISCIPLINE_BY_ID,
  type Discipline,
  type Skill,
  type DisciplineKind,
} from "~/data";
import { useProgress } from "~/hooks/useProgress";
import { calculateDepth, type DepthTier } from "~/lib/depth";
import {
  STATUS,
  type Status,
  type ProgressMap,
  type AppliedMap,
} from "~/lib/storage";
import { Loader } from "~/components/ui/Loader";
import { Panel, PanelHeader, PanelBody } from "~/components/ui/Panel";
import { Pixel } from "~/components/ui/Pixel";
import { Mono } from "~/components/ui/Mono";
import { ProgressBar } from "~/components/ui/ProgressBar";
import { SecondaryButton } from "~/components/ui/SecondaryButton";
import { TierTag } from "~/components/ui/TierTag";
import { DisciplineDepthStepper } from "~/components/browser/DisciplineDepthStepper";
import { DisciplineProjects } from "~/components/browser/DisciplineProjects";
import { SectionBlock } from "~/components/browser/SectionBlock";
import { Icon, ICONS, type IconName } from "~/components/ui/Icon";
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

const SPRITES: Record<string, IconName> = {
  // Roles — unique icons
  frontend: "Briefcase",
  backend: "Server",
  fullstack: "Globe",
  shopify: "Sparkle",
  devops: "SettingsCog",
  "ai-engineer": "UserPlus",
  "ai-agents": "Sparkle",
  "api-design": "Link",
  "game-developer": "Trophy",
  "cyber-security": "SettingsCog",
  blockchain: "Box",
  "network-engineer": "Server",

  // Languages — braces { }
  javascript: "Braces",
  typescript: "Braces",
  rust: "Braces",
  sql: "Braces",
  python: "Braces",
  golang: "Braces",
  kotlin: "Braces",
  ruby: "Braces",
  scala: "Braces",
  cpp: "Braces",
  "shell-bash": "Terminal",
  zsh: "Terminal",

  // Frameworks — blocks (composable building units)
  react: "Box",
  nextjs: "Box",
  vue: "Box",
  svelte: "Box",
  nuxt: "Box",
  "react-native": "Box",
  nestjs: "Box",
  "swift-ui": "Box",
  flutter: "Box",
  django: "Box",
  flask: "Box",
  nodejs: "Server",

  // Tech — server (infrastructure / runtime services)
  postgresql: "Server",
  redis: "Server",
  docker: "Server",
  mongodb: "Server",
  kubernetes: "SettingsCog",
  graphql: "Database",
  linux: "Terminal",
  elasticsearch: "Database",
  git: "GitBranch",

  // Foundations — book-open (foundational knowledge / textbook learning)
  html: "BookOpen",
  css: "BookOpen",
  "computer-science": "BookOpen",
  "datastructures-and-algorithms": "BookOpen",
  "software-design-architecture": "BookOpen",
  "system-design": "BookOpen",
};

const KIND_FILTERS: {
  value: DisciplineKind;
  label: string;
  glyph: IconName;
}[] = [
  { value: "role", label: "Roles", glyph: "User" },
  { value: "foundation", label: "Foundations", glyph: "BookOpen" },
  { value: "language", label: "Languages", glyph: "Braces" },
  { value: "framework", label: "Frameworks", glyph: "Box" },
  { value: "tech", label: "Tech", glyph: "SettingsCog" },
];

const FILTERS: [Status | "all", string][] = [
  ["all", "All"],
  ["untouched", "To Do"],
  ["learning", "Active"],
  ["done", "Done"],
  ["skipped", "Skipped"],
];

function getTier(pct: number): DepthTier {
  if (pct > 70) return "fluent";
  if (pct > 30) return "practicing";
  return "exploring";
}

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
    projectsDone,
    loaded,
    setStatus,
    setApplied,
    toggleProjectDone,
  } = useProgress();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<Status | "all">("all");
  const [kindFilter, setKindFilter] = useState<DisciplineKind>("role");
  const [search, setSearch] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(),
  );

  const requestedId = searchParams.get("discipline") ?? "";
  const activeId = DISCIPLINE_BY_ID[requestedId]
    ? requestedId
    : (DISCIPLINES[0]?.id ?? "");
  const activeDiscipline = DISCIPLINE_BY_ID[activeId];

  const depth = useMemo(
    () =>
      activeDiscipline
        ? calculateDepth(activeDiscipline, progress, applied, projectsDone)
        : null,
    [activeDiscipline, progress, applied, projectsDone],
  );

  const projects = activeDiscipline
    ? (PROJECTS_BY_DISCIPLINE[activeDiscipline.id] ?? [])
    : [];

  // Calculate discipline stats
  const stats = useMemo(() => {
    if (!activeDiscipline) return { done: 0, total: 0, learning: 0, pct: 0 };
    let done = 0,
      learning = 0,
      total = 0;
    for (const sec of activeDiscipline.sections) {
      for (const item of sec.items) {
        total++;
        if (progress[item.id] === "done") done++;
        else if (progress[item.id] === "learning") learning++;
      }
    }
    return {
      done,
      total,
      learning,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }, [activeDiscipline, progress]);

  const tier = getTier(stats.pct);
  const tierColor =
    tier === "exploring"
      ? "var(--color-accent-coral)"
      : tier === "practicing"
        ? "var(--color-accent-mustard)"
        : "var(--color-accent-teal)";

  const handleNavigate = useCallback(
    (disciplineId: string, skillId?: string) => {
      if (disciplineId === activeId && skillId) {
        scrollToSkill(skillId);
        return;
      }
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
      // Check if skill exists in current discipline
      const hasSkill = activeDiscipline.sections.some((sec) =>
        sec.items.some((item) => item.id === skillId),
      );

      if (hasSkill) {
        // Clear anything that could hide the row, then scroll
        setFilter("all");
        setSearch("");
        setCollapsedSections(new Set());
        scrollToSkill(skillId);
        return true;
      }
      return false;
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

  if (!activeDiscipline) {
    return (
      <div
        className="h-screen flex items-center justify-center"
        style={{ background: "var(--color-surface-bg)" }}
      >
        <Pixel size={13} color="ink-muted">
          No disciplines found. Run{" "}
          <code className="font-mono">npm run sync:disciplines</code>.
        </Pixel>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-5">
      <div className="max-w-[1280px] mx-auto">
        <HeaderBar
          title={activeDiscipline.label}
          subtitle={
            activeDiscipline.description || "Explore and master this discipline"
          }
          iconSize={44}
        />

        {/* Two column layout */}
        <div className="grid grid-cols-[280px_1fr] gap-3.5">
          {/* Left sidebar - Discipline list */}
          <div className="flex flex-col gap-3">
            <Panel>
              <PanelHeader
                title="Disciplines"
                glyph="Settings2"
                accentColor="teal"
              />
              <PanelBody className="p-2">
                {/* Kind Filter Pills */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {KIND_FILTERS.map((k) => {
                    const isActive = kindFilter === k.value;
                    return (
                      <button
                        key={k.value}
                        onClick={() => setKindFilter(k.value)}
                        className={cn(
                          "flex items-center gap-1.5 font-display text-xs tracking-[0.04em] px-3 py-1.5 rounded-full cursor-pointer transition-all duration-200 ease-in-out transform hover:scale-105",
                          isActive ? "shadow-md" : "hover:shadow-sm",
                        )}
                        style={{
                          background: isActive
                            ? k.color
                            : "var(--color-surface-inset)",
                          color: isActive ? "" : "var(--color-ink-muted)",
                          fontWeight: isActive ? 600 : 400,
                          border: isActive
                            ? `1px solid ${k.color}80`
                            : "1px solid var(--color-surface-border)",
                          boxShadow: isActive
                            ? `0 4px 12px ${k.color}30`
                            : "none",
                        }}
                        title={k.description}
                      >
                        <Icon
                          name={k.glyph}
                          size={16}
                          className={cn(
                            "transition-transform duration-200",
                            isActive && "scale-110",
                          )}
                        />
                        <span className="hidden sm:inline">{k.label}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Discipline List */}
                <div className="flex flex-col gap-1.5 max-h-[360px] overflow-y-auto pr-1">
                  {DISCIPLINES.filter((d) => d.kind === kindFilter).map((d) => {
                    const isActive = d.id === activeId;
                    const dStats = { done: 0, total: 0 };
                    for (const sec of d.sections) {
                      for (const item of sec.items) {
                        dStats.total++;
                        if (progress[item.id] === "done") dStats.done++;
                      }
                    }
                    const dPct =
                      dStats.total > 0
                        ? Math.round((dStats.done / dStats.total) * 100)
                        : 0;
                    const dTier = getTier(dPct);
                    const kindFilterInfo = KIND_FILTERS.find(
                      (k) => k.value === kindFilter,
                    );
                    const accentColor =
                      kindFilterInfo?.color || "var(--color-accent-coral)";

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
                            "flex items-center justify-center w-10 h-10 rounded-lg transition-all",
                            isActive
                              ? "bg-surface-inset"
                              : "bg-surface-inset/50 group-hover:bg-surface-inset",
                          )}
                        >
                          <Icon
                            name={SPRITES[d.id] || "Home"}
                            size={20}
                            style={{ color: accentColor }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Mono
                              size={12}
                              color={isActive ? "ink" : "ink-muted"}
                              weight={isActive ? 700 : 500}
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
                                pct={dPct}
                                color={accentColor}
                                height={4}
                              />
                            </div>
                            <Mono size={10} color="ink-dim">
                              {dPct}%
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
                  />
                </PanelBody>
              </Panel>
            )}
          </div>

          {/* Right content */}
          <div className="flex flex-col gap-3">
            {/* Filter bar */}
            <div
              className="flex items-center gap-2 p-2 rounded-lg"
              style={{
                background: "var(--color-surface-panel)",
                border: "1px solid var(--color-surface-border)",
              }}
            >
              <div className="flex gap-1">
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
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-ink-muted"
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
                  className="bg-transparent outline-none text-xs text-ink placeholder-ink-dim min-w-0 w-32"
                />
              </div>
            </div>

            {/* Skills */}
            <Panel className="flex-1">
              <PanelHeader
                title="Skills"
                subtitle={`${stats.done}/${stats.total} completed · ${stats.learning} learning`}
                accentColor={
                  tier === "exploring"
                    ? "coral"
                    : tier === "practicing"
                      ? "mustard"
                      : "teal"
                }
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
                        className="mt-2 text-xs text-accent-mustard hover:opacity-80"
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
                        onCycle={setStatus}
                        onToggleApplied={setApplied}
                        tierColor={tierColor}
                        isOpen={!collapsedSections.has(sec.id)}
                        onToggle={() => toggleSection(sec.id)}
                        isLast={secIndex === filteredSections.length - 1}
                        currentDisciplineId={activeDiscipline.id}
                        onNavigate={handleNavigate}
                        onRevealSkill={revealSkill}
                      />
                    ))}
                  </div>
                )}
              </PanelBody>
            </Panel>

            {/* Projects */}
            <DisciplineProjects
              projects={projects}
              projectsDone={projectsDone}
              onToggleProjectDone={toggleProjectDone}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
