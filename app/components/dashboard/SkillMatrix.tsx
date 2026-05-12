import { useMemo, useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { DISCIPLINES, type DisciplineKind } from "~/data";
import { disciplineStats } from "~/lib/progress";
import type { ProgressMap } from "~/lib/storage";
import { Panel, PanelHeader } from "~/components/ui/Panel";
import { Pixel } from "~/components/ui/Pixel";
import { Mono } from "~/components/ui/Mono";
import { Icon, type IconName } from "~/components/ui/Icon";
import { ProgressBar } from "~/components/ui/ProgressBar";
import { TierTag } from "~/components/ui/TierTag";

interface SkillMatrixProps {
  progress: ProgressMap;
}

type Filter = DisciplineKind;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "role", label: "Roles" },
  { value: "foundation", label: "Foundations" },
  { value: "language", label: "Languages" },
  { value: "framework", label: "Frameworks" },
  { value: "tech", label: "Tech" },
];

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

const TIER_META = {
  exploring: { label: "Exploring", color: "var(--color-accent-coral)" },
  practicing: { label: "Practicing", color: "var(--color-accent-mustard)" },
  fluent: { label: "Fluent", color: "var(--color-accent-teal)" },
};

function getTier(pct: number): "exploring" | "practicing" | "fluent" {
  if (pct > 70) return "fluent";
  if (pct > 30) return "practicing";
  return "exploring";
}

export function SkillMatrix({ progress }: SkillMatrixProps) {
  const [filter, setFilter] = useState<Filter>("role");
  const [selected, setSelected] = useState<string | null>(null);

  const items = useMemo(
    () => DISCIPLINES.filter((d) => d.kind === filter),
    [filter],
  );

  const data = useMemo(
    () =>
      items.map((d) => {
        const stats = disciplineStats(d, progress);
        return {
          skill: d.label,
          value: stats.pct,
          active:
            stats.learning > 0
              ? Math.round(((stats.done + stats.learning) / stats.total) * 100)
              : 0,
        };
      }),
    [items, progress],
  );

  return (
    <Panel>
      <PanelHeader
        title="Skill Matrix"
        subtitle="Where you're strong, where you're growing"
        accentColor="teal"
        glyph="CircuitBoard"
      >
        <div
          className="flex gap-1 p-1 rounded-md"
          style={{
            background: "var(--color-surface-inset)",
            border: "1px solid var(--color-surface-bg-deep)",
          }}
        >
          {FILTERS.map((f) => {
            const isActive = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className="font-display text-sm tracking-[0.04em] px-3 py-1.5 rounded cursor-pointer transition-all"
                style={{
                  background: isActive
                    ? "var(--color-surface-panel-hi)"
                    : "transparent",
                  color: isActive
                    ? "var(--color-ink)"
                    : "var(--color-ink-muted)",
                  fontWeight: isActive ? 700 : 400,
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </PanelHeader>

      <div className="grid grid-cols-2 gap-0">
        {/* Left — discipline list */}
        <div className="border-r border-surface-divider p-3 max-h-[380px] overflow-y-auto">
          {items.map((d) => {
            const stats = disciplineStats(d, progress);
            const pct = stats.pct;
            const tier = getTier(pct);
            const tierColor = TIER_META[tier].color;
            const isSelected = selected === d.id;
            const sprite = SPRITES[d.id] || "Home";

            return (
              <div
                key={d.id}
                onClick={() => setSelected(d.id)}
                className="flex items-center gap-2.5 p-2 rounded cursor-pointer transition-all mb-0.5"
                style={{
                  background: isSelected ? `${tierColor}1a` : "transparent",
                  border: `1px solid ${isSelected ? tierColor : "transparent"}`,
                }}
                onMouseEnter={(e) => {
                  if (!isSelected)
                    e.currentTarget.style.background =
                      "var(--color-surface-panel-hi)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected)
                    e.currentTarget.style.background = "transparent";
                }}
              >
                <Icon name={sprite as IconName} color={tierColor} size={24} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <Mono size={12} color="ink" weight={600}>
                      {d.label}
                    </Mono>
                    <Mono
                      size={11}
                      color={
                        tier === "exploring"
                          ? "coral"
                          : tier === "practicing"
                            ? "mustard"
                            : "teal"
                      }
                      weight={600}
                    >
                      {pct}%
                    </Mono>
                  </div>
                  <ProgressBar pct={pct} color={tierColor} height={4} />
                  <div className="flex justify-between mt-1">
                    <Mono size={10} color="ink-muted">
                      {stats.done}
                      <span style={{ color: "var(--color-ink-dim)" }}>
                        /{stats.total}
                      </span>
                      {stats.learning > 0 && (
                        <span className="text-accent-coral ml-1.5">
                          ● {stats.learning}
                        </span>
                      )}
                    </Mono>
                    <Pixel size={10} color="ink-dim">
                      {TIER_META[tier].label}
                    </Pixel>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right — radar */}
        <div className="p-3.5 flex flex-col">
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart
                data={data}
                margin={{ top: 16, right: 36, bottom: 16, left: 36 }}
              >
                <defs>
                  <radialGradient id="mustardFillV3">
                    <stop
                      offset="0%"
                      stopColor="var(--color-accent-mustard)"
                      stopOpacity={0.45}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--color-accent-mustard)"
                      stopOpacity={0.05}
                    />
                  </radialGradient>
                  <radialGradient id="coralFillV3">
                    <stop
                      offset="0%"
                      stopColor="var(--color-accent-coral)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--color-accent-coral)"
                      stopOpacity={0.05}
                    />
                  </radialGradient>
                </defs>
                <PolarGrid
                  stroke="var(--color-surface-divider)"
                  strokeWidth={1}
                />
                <PolarAngleAxis
                  dataKey="skill"
                  tick={{
                    fill: "var(--color-ink-soft)",
                    fontSize: 13,
                    fontFamily: "VT323, monospace",
                    letterSpacing: "0.04em",
                  }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={false}
                  tickCount={5}
                  axisLine={false}
                  stroke="var(--color-surface-divider)"
                />
                <Radar
                  name="Active"
                  dataKey="active"
                  stroke="var(--color-accent-coral)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="url(#coralFillV3)"
                  fillOpacity={0.5}
                />
                <Radar
                  name="Done"
                  dataKey="value"
                  stroke="var(--color-accent-mustard)"
                  strokeWidth={2}
                  fill="url(#mustardFillV3)"
                  fillOpacity={0.7}
                  dot={{
                    fill: "var(--color-accent-mustard)",
                    stroke: "var(--color-surface-bg)",
                    strokeWidth: 1.5,
                    r: 3.5,
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 pt-2 border-t border-surface-divider">
            <span className="flex items-center gap-1.5">
              <span
                className="w-3 h-[3px] rounded-sm"
                style={{ background: "var(--color-accent-mustard)" }}
              />
              <Pixel color="ink-soft" size={12}>
                Done
              </Pixel>
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="w-3 h-[3px]"
                style={{
                  background:
                    "repeating-linear-gradient(to right, var(--color-accent-coral) 0, var(--color-accent-coral) 3px, transparent 3px, transparent 6px)",
                }}
              />
              <Pixel color="ink-soft" size={12}>
                + Active
              </Pixel>
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );
}
