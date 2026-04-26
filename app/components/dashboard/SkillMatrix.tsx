import { useMemo, useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { DISCIPLINES, type DisciplineKind } from "~/data";
import { disciplineStats } from "~/lib/progress";
import type { ProgressMap } from "~/lib/storage";

interface SkillMatrixProps {
  progress: ProgressMap;
}

type Filter = DisciplineKind;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "foundation", label: "Foundations" },
  { value: "language", label: "Languages" },
  { value: "framework", label: "Frameworks" },
  { value: "tech", label: "Tech" },
];

export function SkillMatrix({ progress }: SkillMatrixProps) {
  const [filter, setFilter] = useState<Filter>("foundation");

  const data = useMemo(
    () =>
      DISCIPLINES.filter((d) => d.kind === filter).map((d) => ({
        discipline: d.label,
        pct: disciplineStats(d, progress).pct,
      })),
    [progress, filter],
  );

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-dim">
          Skill Matrix
        </div>
        <div className="flex gap-1 bg-brand-surface rounded-lg p-1">
          {FILTERS.map((f) => {
            const isActive = filter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1 rounded-md text-[11px] cursor-pointer transition-colors font-medium ${
                  isActive
                    ? "bg-brand-bg text-brand-ink"
                    : "bg-transparent text-brand-muted hover:text-brand-ink"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>
      {data.length === 0 ? (
        <div
          className="w-full flex items-center justify-center text-[12px] text-brand-muted"
          style={{ height: 420 }}
        >
          No disciplines in this category.
        </div>
      ) : (
        <div className="w-full" style={{ height: 480 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart
              data={data}
              margin={{ top: 40, right: 100, bottom: 40, left: 100 }}
              outerRadius="80%"
            >
              <PolarGrid
                stroke="var(--color-brand-line)"
                strokeWidth={1}
                gridType="polygon"
              />
              <PolarAngleAxis
                dataKey="discipline"
                tick={{
                  fill: "var(--color-brand-ink)",
                  fontSize: 12,
                  fontWeight: 500,
                }}
                tickLine={false}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={false}
                axisLine={false}
              />
              <Tooltip
                cursor={false}
                contentStyle={{
                  background: "var(--color-brand-surface)",
                  border: "1px solid var(--color-brand-line)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--color-brand-ink)",
                }}
                formatter={(value: number) => [`${value}%`, "Done"]}
              />
              <Radar
                name="Progress"
                dataKey="pct"
                stroke="var(--color-brand-primary)"
                strokeWidth={2}
                fill="var(--color-brand-primary)"
                fillOpacity={0.28}
                dot={{
                  r: 3,
                  fill: "var(--color-brand-primary)",
                  stroke: "var(--color-brand-bg)",
                  strokeWidth: 2,
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
