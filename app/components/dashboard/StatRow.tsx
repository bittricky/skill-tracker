import { Pixel } from "~/components/ui/Pixel";

interface StatRowProps {
  done: number;
  applied: number;
  learning: number;
  projects?: number;
}

export function StatRow({ done, applied, learning, projects }: StatRowProps) {
  const showProjects = typeof projects === "number";
  const stats = [
    {
      label: "Skills Done",
      value: String(done),
      sub: "+14 this week",
      color: "var(--color-accent-teal)",
      hero: false,
    },
    {
      label: "Active",
      value: String(learning),
      sub: `${applied} applied`,
      color: "var(--color-accent-mustard)",
      hero: true,
    },
    {
      label: "Applied",
      value: String(applied),
      sub: `in ${projects ?? 0} projects`,
      color: "var(--color-accent-lavender)",
      hero: false,
    },
    {
      label: "Total Hours",
      value: "142",
      sub: "4.5 / week avg",
      color: "var(--color-accent-rose)",
      hero: false,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2.5">
      {stats.map((s) => (
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
              className="absolute top-0 left-0 right-0 h-[3px]"
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
