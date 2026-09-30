import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import {
  DISCIPLINES,
  KIND_META,
  KIND_ORDER,
  type DisciplineKind,
} from "~/data";
import { iconForDiscipline } from "~/data/icons";
import { calculateDepth, TIER_META } from "~/lib/depth";
import { disciplineStats } from "~/lib/progress";
import type { AppliedMap, ProgressMap } from "~/lib/storage";
import { Panel, PanelHeader } from "~/components/ui/Panel";
import { Pixel } from "~/components/ui/Pixel";
import { Mono } from "~/components/ui/Mono";
import { Icon } from "~/components/ui/Icon";
import { ProgressBar } from "~/components/ui/ProgressBar";

interface SkillMatrixProps {
  progress: ProgressMap;
  applied: AppliedMap;
  hidden: string[];
}

export function SkillMatrix({ progress, applied, hidden }: SkillMatrixProps) {
  const [filter, setFilter] = useState<DisciplineKind>("role");
  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);

  const rows = useMemo(
    () =>
      DISCIPLINES.filter((d) => d.kind === filter && !hiddenSet.has(d.id)).map(
        (d) => ({
          d,
          stats: disciplineStats(d, progress, applied),
          depth: calculateDepth(d, progress, applied),
        }),
      ),
    [filter, progress, applied, hiddenSet],
  );

  const data = useMemo(
    () =>
      rows.map(({ d, stats, depth }) => ({
        skill: d.label,
        done: depth.donePct,
        applied: depth.appliedPct,
        active:
          stats.total > 0
            ? Math.round(((stats.done + stats.learning) / stats.total) * 100)
            : 0,
      })),
    [rows],
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
          className="flex gap-1 p-1 rounded-md flex-wrap justify-end"
          style={{
            background: "var(--color-surface-inset)",
            border: "1px solid var(--color-surface-bg-deep)",
          }}
        >
          {KIND_ORDER.map((k) => {
            const isActive = filter === k;
            return (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className="font-display text-sm tracking-[0.04em] px-2.5 py-1 rounded cursor-pointer transition-all"
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
                {KIND_META[k].plural}
              </button>
            );
          })}
        </div>
      </PanelHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        {/* Left — discipline list */}
        <div className="md:border-r border-b md:border-b-0 border-surface-divider p-3 max-h-95 overflow-y-auto">
          {rows.map(({ d, stats, depth }) => {
            const tierMeta = TIER_META[depth.tier];
            return (
              <Link
                key={d.id}
                to={`/browser?discipline=${d.id}`}
                className="flex items-center gap-2.5 p-2 rounded cursor-pointer transition-all mb-0.5 border border-transparent hover:bg-surface-panel-hi hover:border-surface-border"
              >
                <Icon
                  name={iconForDiscipline(d.id, d.kind)}
                  color={tierMeta.color}
                  size={24}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1 gap-2">
                    <Mono
                      size={12}
                      color="ink"
                      weight={600}
                      className="truncate"
                    >
                      {d.label}
                    </Mono>
                    <Mono size={11} color={tierMeta.accent} weight={600}>
                      {depth.donePct}%
                    </Mono>
                  </div>
                  <ProgressBar
                    pct={depth.donePct}
                    color={tierMeta.color}
                    height={4}
                  />
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
                      <span className="text-accent-lavender ml-1.5">
                        ✓ {depth.appliedPct}%
                      </span>
                    </Mono>
                    <Pixel size={10} color="ink-dim">
                      {tierMeta.label}
                    </Pixel>
                  </div>
                </div>
              </Link>
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
                  name="Applied"
                  dataKey="applied"
                  stroke="var(--color-accent-lavender)"
                  strokeWidth={1.5}
                  fill="none"
                />
                <Radar
                  name="Done"
                  dataKey="done"
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
          <div className="flex justify-center gap-4 pt-2 border-t border-surface-divider flex-wrap">
            <Legend color="var(--color-accent-mustard)" label="Done" />
            <Legend color="var(--color-accent-lavender)" label="Applied" />
            <span className="flex items-center gap-1.5">
              <span
                className="w-3 h-0.75"
                style={{
                  background:
                    "repeating-linear-gradient(to right, var(--color-accent-coral) 0, var(--color-accent-coral) 3px, transparent 3px, transparent 6px)",
                }}
              />
              <Pixel color="ink-soft" size={12}>
                Done + Active
              </Pixel>
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-3 h-0.75 rounded-sm" style={{ background: color }} />
      <Pixel color="ink-soft" size={12}>
        {label}
      </Pixel>
    </span>
  );
}
