import { Pixel } from "~/components/ui/Pixel";
import type { Stats } from "~/lib/progress";

interface StatRowProps {
  stats: Stats;
}

export function StatRow({ stats }: StatRowProps) {
  const remaining = Math.max(0, stats.total - stats.done - stats.skipped);
  const cards = [
    {
      label: "Skills Done",
      value: String(stats.done),
      sub: `${stats.pct}% of ${stats.total - stats.skipped} tracked`,
      color: "var(--color-accent-teal)",
      hero: false,
    },
    {
      label: "Active",
      value: String(stats.learning),
      sub: "currently learning",
      color: "var(--color-accent-mustard)",
      hero: true,
    },
    {
      label: "Applied",
      value: String(stats.applied),
      sub: "used in practice",
      color: "var(--color-accent-lavender)",
      hero: false,
    },
    {
      label: "Remaining",
      value: String(remaining),
      sub: `${stats.skipped} skipped`,
      color: "var(--color-accent-rose)",
      hero: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
      {cards.map((s) => (
        <div
          key={s.label}
          className="rounded-xl overflow-hidden relative"
          style={{
            background: "var(--color-surface-panel)",
            border: "1px solid var(--color-surface-border)",
            boxShadow: "var(--shadow-raised)",
            padding: "16px 18px",
          }}
        >
          {s.hero && (
            <div
              className="absolute top-0 left-0 right-0 h-0.75"
              style={{ background: s.color }}
            />
          )}
          <Pixel color="ink-muted" size={13}>
            {s.label}
          </Pixel>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className="font-display leading-none tracking-[0.02em]"
              style={{ fontSize: 36, color: s.color, fontWeight: 700 }}
            >
              {s.value}
            </span>
          </div>
          <div className="mt-1.5">
            <Pixel color="ink-dim" size={12}>
              {s.sub}
            </Pixel>
          </div>
        </div>
      ))}
    </div>
  );
}
