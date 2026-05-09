import { Panel, PanelHeader, PanelBody } from "~/components/ui/Panel";
import { Pixel } from "~/components/ui/Pixel";
import { Mono } from "~/components/ui/Mono";

// Mock weekly data - in real implementation this would come from sessions
const WEEK = [
  { day: "M", sessions: 2, mins: 45 },
  { day: "T", sessions: 1, mins: 30 },
  { day: "W", sessions: 0, mins: 0 },
  { day: "T", sessions: 3, mins: 90 },
  { day: "F", sessions: 2, mins: 60 },
  { day: "S", sessions: 0, mins: 0 },
  { day: "S", sessions: 1, mins: 35 },
];

export function WeeklyActivity() {
  const max = Math.max(...WEEK.map((d) => d.mins));
  const totalMins = WEEK.reduce((acc, d) => acc + d.mins, 0);
  const totalSessions = WEEK.reduce((acc, d) => acc + d.sessions, 0);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const todayIndex = 4; // Friday as mock "today"

  const stats = [
    { label: "Avg / day", value: `${Math.round(totalMins / 7)}m`, color: "var(--color-accent-lavender)" },
    { label: "Best day", value: WEEK.reduce((a, b) => (a.mins > b.mins ? a : b)).day, color: "var(--color-accent-mustard)" },
    { label: "Sessions", value: String(totalSessions), color: "var(--color-accent-teal)" },
  ];

  return (
    <Panel>
      <PanelHeader
        title="This Week"
        subtitle={`${hours}h ${mins}m across ${totalSessions} sessions`}
        accentColor="lavender"
        glyph="◐"
      >
        <Pixel color="teal" size={12}>+18% vs last</Pixel>
      </PanelHeader>
      <PanelBody>
        {/* Day bars */}
        <div className="grid grid-cols-7 gap-2 mb-3">
          {WEEK.map((d, i) => {
            const intensity = max > 0 ? d.mins / max : 0;
            const fillH = Math.round(intensity * 96);
            const isToday = i === todayIndex;

            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div
                  className="w-full relative overflow-hidden rounded-md"
                  style={{
                    height: 96,
                    background: "var(--color-surface-inset)",
                    border: "1px solid var(--color-surface-bg-deep)",
                    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.4), inset 0 -1px 0 rgba(45,51,74,0.25)",
                  }}
                >
                  {intensity > 0 && (
                    <div
                      className="absolute bottom-0 left-0 right-0"
                      style={{
                        height: fillH,
                        background: "linear-gradient(to top, var(--color-accent-lavender) 0%, rgba(155, 140, 212, 0.5) 100%)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)",
                      }}
                    />
                  )}
                  {isToday && (
                    <div
                      className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{ background: "var(--color-accent-mustard)" }}
                    />
                  )}
                  <Mono
                    size={11}
                    color={intensity > 0 ? "ink" : "ink-dim"}
                    weight={600}
                    className="absolute top-2 left-0 right-0 text-center"
                  >
                    {d.mins}
                  </Mono>
                </div>
                <Pixel size={12} color={isToday ? "mustard" : intensity > 0 ? "ink-soft" : "ink-dim"}>
                  {d.day}
                </Pixel>
              </div>
            );
          })}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-surface-divider">
          {stats.map((s) => (
            <div key={s.label}>
              <Pixel color="ink-dim" size={11}>{s.label}</Pixel>
              <div className="mt-1">
                <span
                  className="font-display text-xl font-bold"
                  style={{ color: s.color }}
                >
                  {s.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </PanelBody>
    </Panel>
  );
}
