import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams, Link } from "react-router";
import type { Route } from "./+types/browser";
import {
  DISCIPLINES,
  DISCIPLINE_BY_ID,
  PROJECTS_BY_DISCIPLINE,
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
import { SpriteIcon } from "~/components/ui/SpriteIcon";
import { ProgressBar } from "~/components/ui/ProgressBar";
import { TierTag } from "~/components/ui/TierTag";
import { ItemSlot } from "~/components/ui/ItemSlot";
import { PrimaryButton } from "~/components/ui/PrimaryButton";
import { SecondaryButton } from "~/components/ui/SecondaryButton";
import { SettingsButton } from "~/components/ui/SettingsButton";
import { SettingsModal } from "~/components/SettingsModal";
import { DisciplineDepthStepper } from "~/components/browser/DisciplineDepthStepper";
import { DisciplineProjects } from "~/components/browser/DisciplineProjects";
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

const SPRITES: Record<string, string> = {
  frontend: "◆",
  backend: "▣",
  fullstack: "◈",
  shopify: "✦",
  devops: "⚙",
  javascript: "⌘",
  typescript: "⌬",
  rust: "⚙",
  sql: "▤",
  react: "⚛",
  remix: "◐",
  "next-js": "◇",
  postgresql: "▤",
  redis: "◉",
  docker: "▦",
};

const KIND_FILTERS: { value: DisciplineKind; label: string }[] = [
  { value: "role", label: "Roles" },
  { value: "foundation", label: "Foundations" },
  { value: "language", label: "Languages" },
  { value: "framework", label: "Frameworks" },
  { value: "tech", label: "Tech" },
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
  const [settingsOpen, setSettingsOpen] = useState(false);

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
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3.5">
            <Link to="/">
              <SpriteIcon
                glyph="◆"
                color="var(--color-accent-mustard)"
                size={44}
              />
            </Link>
            <div>
              <div className="font-display text-[28px] font-bold text-ink tracking-[0.04em] leading-none">
                {activeDiscipline.label}
              </div>
              <Pixel color="ink-muted" size={13}>
                {activeDiscipline.description ||
                  "Explore and master this discipline"}
              </Pixel>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link to="/">
              <SecondaryButton>← Back</SecondaryButton>
            </Link>
            <SettingsButton onClick={() => setSettingsOpen(true)} />
            <PrimaryButton icon="▶">Start Session</PrimaryButton>
          </div>
        </div>

        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />

        {/* Two column layout */}
        <div className="grid grid-cols-[280px_1fr] gap-3.5">
          {/* Left sidebar - Discipline list */}
          <div className="flex flex-col gap-3">
            <Panel>
              <PanelHeader title="Disciplines" glyph="▣" accentColor="teal" />
              <PanelBody className="p-2">
                {/* Kind filter tabs */}
                <div
                  className="flex flex-wrap gap-1 mb-3 p-1 rounded-md"
                  style={{
                    background: "var(--color-surface-inset)",
                    border: "1px solid var(--color-surface-bg-deep)",
                  }}
                >
                  {KIND_FILTERS.map((k) => (
                    <button
                      key={k.value}
                      onClick={() => setKindFilter(k.value)}
                      className="font-display text-xs tracking-[0.04em] px-2 py-1 rounded cursor-pointer transition-all"
                      style={{
                        background:
                          kindFilter === k.value
                            ? "var(--color-surface-panel-hi)"
                            : "transparent",
                        color:
                          kindFilter === k.value
                            ? "var(--color-ink)"
                            : "var(--color-ink-muted)",
                        fontWeight: kindFilter === k.value ? 700 : 400,
                      }}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col gap-1 max-h-[360px] overflow-y-auto">
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
                    const dColor =
                      dTier === "exploring"
                        ? "coral"
                        : dTier === "practicing"
                          ? "mustard"
                          : "teal";

                    return (
                      <button
                        key={d.id}
                        onClick={() => handleNavigate(d.id)}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded cursor-pointer transition-all text-left",
                          isActive && "bg-surface-panel-hi",
                        )}
                      >
                        <SpriteIcon
                          glyph={SPRITES[d.id] || "◆"}
                          color={`var(--color-accent-${dColor})`}
                          size={32}
                        />
                        <div className="flex-1 min-w-0">
                          <Mono
                            size={12}
                            color={isActive ? "ink" : "ink-muted"}
                            weight={isActive ? 600 : 400}
                          >
                            {d.label}
                          </Mono>
                          <ProgressBar
                            pct={dPct}
                            color={`var(--color-accent-${dColor})`}
                            height={4}
                          />
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
                  glyph="◐"
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
                glyph="◆"
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

// Section block component
interface SectionBlockProps {
  section: { id: string; label: string; items: Skill[] };
  progress: ProgressMap;
  applied: AppliedMap;
  onCycle: (id: string, forceTo?: Status) => void;
  onToggleApplied: (id: string, value?: boolean) => void;
  tierColor: string;
  isOpen: boolean;
  onToggle: () => void;
  isLast: boolean;
}

function SectionBlock({
  section,
  progress,
  applied,
  onCycle,
  onToggleApplied,
  tierColor,
  isOpen,
  onToggle,
  isLast,
}: SectionBlockProps) {
  const doneCount = section.items.filter(
    (i) => progress[i.id] === "done",
  ).length;
  const pct =
    section.items.length > 0
      ? Math.round((doneCount / section.items.length) * 100)
      : 0;

  return (
    <div
      className={cn("border-b border-surface-divider", isLast && "border-b-0")}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-panel-hi transition-colors"
      >
        <div className="flex items-center gap-2">
          <Mono size={13} color="ink" weight={600}>
            {section.label}
          </Mono>
          <Pixel size={11} color="ink-muted">
            ({section.items.length})
          </Pixel>
        </div>
        <div className="flex items-center gap-3">
          <ProgressBar
            pct={pct}
            color={tierColor}
            height={4}
            className="w-20"
          />
          <Mono size={11} color="ink-muted">
            {isOpen ? "−" : "+"}
          </Mono>
        </div>
      </button>

      {isOpen && (
        <div className="px-2 pb-2">
          {section.items.map((item) => (
            <SkillRow
              key={item.id}
              skill={item}
              status={progress[item.id] ?? "untouched"}
              isApplied={!!applied[item.id]}
              onCycle={() => onCycle(item.id)}
              onToggleApplied={() => onToggleApplied(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Skill row component
interface SkillRowProps {
  skill: Skill;
  status: Status;
  isApplied: boolean;
  onCycle: () => void;
  onToggleApplied: () => void;
}

const STATUS_META: Record<
  Status,
  { label: string; color: string; bg: string }
> = {
  untouched: {
    label: "TODO",
    color: "var(--color-ink-muted)",
    bg: "var(--color-surface-inset)",
  },
  learning: {
    label: "ACTIVE",
    color: "var(--color-accent-mustard)",
    bg: "rgba(232, 176, 74, 0.15)",
  },
  done: {
    label: "DONE",
    color: "var(--color-accent-teal)",
    bg: "rgba(92, 184, 168, 0.15)",
  },
  skipped: {
    label: "SKIPPED",
    color: "var(--color-ink-dim)",
    bg: "var(--color-surface-inset)",
  },
};

function SkillRow({
  skill,
  status,
  isApplied,
  onCycle,
  onToggleApplied,
}: SkillRowProps) {
  const meta = STATUS_META[status];

  return (
    <div
      id={`skill-${skill.id}`}
      className="flex items-center gap-3 p-2 rounded-md hover:bg-surface-panel-hi transition-colors"
    >
      {/* Status button */}
      <button
        onClick={onCycle}
        className="px-2 py-1 rounded text-[10px] font-display font-bold tracking-[0.06em] transition-colors"
        style={{
          background: meta.bg,
          color: meta.color,
          border: `1px solid ${meta.color}40`,
        }}
      >
        {meta.label}
      </button>

      {/* Skill name */}
      <div className="flex-1 min-w-0">
        <Mono
          size={12}
          color={status === "done" ? "ink-muted" : "ink"}
          weight={500}
          className={status === "done" ? "line-through" : ""}
        >
          {skill.label}
        </Mono>
      </div>

      {/* Applied button */}
      <button
        onClick={onToggleApplied}
        className={cn(
          "px-2 py-1 rounded text-[10px] font-display font-bold tracking-[0.06em] transition-colors",
          isApplied
            ? "text-accent-teal border-accent-teal"
            : "text-ink-dim border-surface-border hover:text-ink-muted",
        )}
        style={{
          border: "1px solid",
          background: isApplied ? "rgba(92, 184, 168, 0.1)" : "transparent",
        }}
      >
        {isApplied ? "✓ APPLIED" : "MARK APPLIED"}
      </button>
    </div>
  );
}
