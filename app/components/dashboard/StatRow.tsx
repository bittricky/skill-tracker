import { Pixel } from "~/components/ui/Pixel";
import type { Stats } from "~/lib/progress";
import type { ProgressEvent } from "~/lib/storage";
import { deltaSince, streakDays, type SkillFilter } from "~/lib/activity";

interface StatRowProps {
  stats: Stats;
  events: ProgressEvent[];
  filter?: SkillFilter;
}

export function StatRow({ stats, events, filter }: StatRowProps) {
  const week = deltaSince(
    events,
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    filter,
  );
  const month = deltaSince(
    events,
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    filter,
  );
  const streak = streakDays(events, new Date(), filter);
  const remaining = Math.max(0, stats.total - stats.done - stats.skipped);
  const cards = [
    {
      label: "Skills Done",
      value: String(stats.done),
      sub: `+${week.done} done · last 7 days`,
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
      sub: `+${month.applied} applied · last 30 days`,
      color: "var(--color-accent-lavender)",
      hero: false,
    },
    {
      label: "Remaining",
      value: String(remaining),
      sub:
        streak.current > 0 ? `${streak.current}-day streak` : "no streak yet",
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
