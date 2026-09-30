import { useEffect, useMemo, useRef, useState } from "react";
import { Panel, PanelHeader, PanelBody } from "~/components/ui/Panel";
import { Mono } from "~/components/ui/Mono";
import { Pixel } from "~/components/ui/Pixel";
import { SecondaryButton } from "~/components/ui/SecondaryButton";
import type { ProgressEvent } from "~/lib/storage";
import {
  dailyCounts,
  dayKey,
  relativeTime,
  streakDays,
  yearsWithActivity,
  type DayCount,
  type SkillFilter,
} from "~/lib/activity";
import { cn } from "~/lib/cn";

interface ActivityHeatmapProps {
  events: ProgressEvent[];
  filter?: SkillFilter;
}

interface Cell {
  date: Date | null; // null = outside the selected year
  key: string;
  count?: DayCount;
  future?: boolean;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function bucketClass(total: number): string {
  if (total <= 0) return "bg-surface-inset";
  if (total === 1) return "bg-accent-teal/25";
  if (total <= 3) return "bg-accent-teal/50";
  if (total <= 6) return "bg-accent-teal/75";
  return "bg-accent-teal";
}

function describe(date: Date, c?: DayCount): string {
  const label = date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  if (!c || c.total === 0) return `${label} · no activity`;
  const parts: string[] = [];
  if (c.done) parts.push(`${c.done} done`);
  if (c.learning) parts.push(`${c.learning} learning`);
  if (c.applied) parts.push(`${c.applied} applied`);
  return `${label} · ${parts.join(" · ")}`;
}

export function ActivityHeatmap({ events, filter }: ActivityHeatmapProps) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [selected, setSelected] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const years = useMemo(() => yearsWithActivity(events), [events]);
  const showSwitcher = years.some((y) => y !== currentYear);

  const streak = useMemo(
    () => streakDays(events, new Date(), filter),
    [events, filter],
  );

  // Weeks starting Sunday, from the week containing Jan 1 through the week
  // containing Dec 31.
  const weeks = useMemo(() => {
    const from = new Date(year, 0, 1);
    const to = new Date(year, 11, 31);
    const counts = dailyCounts(events, from, to, filter);
    const todayKey = dayKey(new Date());

    const first = new Date(from);
    first.setDate(first.getDate() - first.getDay());
    const last = new Date(to);
    last.setDate(last.getDate() + (6 - last.getDay()));

    const cols: Cell[][] = [];
    const d = new Date(first);
    while (d <= last) {
      const col: Cell[] = [];
      for (let r = 0; r < 7; r++) {
        const inYear = d.getFullYear() === year;
        const key = dayKey(d);
        col.push({
          date: inYear ? new Date(d) : null,
          key,
          count: inYear ? counts.get(key) : undefined,
          future: key > todayKey,
        });
        d.setDate(d.getDate() + 1);
      }
      cols.push(col);
    }
    return cols;
  }, [events, filter, year]);

  // Month labels: a label sits on the first column whose first in-year day
  // falls within the 1st–7th of a month.
  const monthLabels = useMemo(
    () =>
      weeks.map((col) => {
        const firstInYear = col.find((c) => c.date !== null);
        if (firstInYear?.date && firstInYear.date.getDate() <= 7)
          return MONTHS[firstInYear.date.getMonth()];
        return "";
      }),
    [weeks],
  );

  // Scroll so the current month is visible (only when viewing this year).
  useEffect(() => {
    if (year !== currentYear || !scrollRef.current) return;
    const month = new Date().getMonth();
    const colIdx = monthLabels.findIndex((l) => l === MONTHS[month]);
    if (colIdx >= 0)
      scrollRef.current.scrollLeft = Math.max(0, colIdx * 16 - 32);
  }, [year, currentYear, monthLabels]);

  const meta = streak.lastActiveAt
    ? `${streak.current}-day streak · longest ${streak.longest} · last active ${relativeTime(streak.lastActiveAt)}`
    : "no activity yet";

  return (
    <Panel className="min-w-0">
      <PanelHeader
        title="Activity"
        subtitle="Skills marked learning/done/applied"
        accentColor="teal"
        glyph="Play"
      >
        <div className="flex items-center gap-3">
          <Pixel color="ink-muted" size={13}>
            {meta}
          </Pixel>
          {showSwitcher && (
            <div className="flex items-center gap-2">
              <SecondaryButton onClick={() => setYear((y) => y - 1)}>
                ‹
              </SecondaryButton>
              <Pixel size={13} color="ink">
                {year}
              </Pixel>
              <SecondaryButton
                onClick={() => setYear((y) => Math.min(currentYear, y + 1))}
              >
                ›
              </SecondaryButton>
            </div>
          )}
        </div>
      </PanelHeader>
      <PanelBody>
        <div ref={scrollRef} className="overflow-x-auto">
          <div className="min-w-max">
            {/* Month labels */}
            <div
              className="grid mb-1 ml-7"
              style={{
                gridTemplateColumns: `repeat(${weeks.length}, 13px)`,
                columnGap: 3,
              }}
            >
              {monthLabels.map((l, i) => (
                <Mono key={i} size={10} color="ink-dim">
                  {l}
                </Mono>
              ))}
            </div>
            <div className="flex">
              {/* Weekday labels */}
              <div
                className="grid w-7 shrink-0"
                style={{ gridTemplateRows: "repeat(7, 13px)", rowGap: 3 }}
              >
                {WEEKDAY_LABELS.map((l, i) => (
                  <Mono key={i} size={10} color="ink-dim">
                    {l}
                  </Mono>
                ))}
              </div>
              {/* Grid: columns = weeks, rows = Sun..Sat */}
              <div
                className="grid"
                role="grid"
                style={{
                  gridTemplateRows: "repeat(7, 13px)",
                  gridAutoFlow: "column",
                  gridAutoColumns: "13px",
                  gap: 3,
                }}
              >
                {weeks.flatMap((col, ci) =>
                  col.map((cell, ri) => {
                    if (!cell.date)
                      return (
                        <div
                          key={`${ci}-${ri}`}
                          className="size-3.25"
                          aria-hidden="true"
                        />
                      );
                    if (cell.future)
                      return (
                        <div
                          key={cell.key}
                          className="size-3.25 rounded-xs bg-surface-inset opacity-40"
                          aria-hidden="true"
                        />
                      );
                    const label = describe(cell.date, cell.count);
                    return (
                      <button
                        key={cell.key}
                        type="button"
                        role="gridcell"
                        title={label}
                        aria-label={label}
                        onClick={() => setSelected(label)}
                        className={cn(
                          "size-3.25 rounded-xs",
                          bucketClass(cell.count?.total ?? 0),
                          selected === label && "ring-1 ring-accent-mustard",
                        )}
                      />
                    );
                  }),
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 gap-3">
          <Mono size={10} color="ink-muted" className="truncate">
            {selected ?? ""}
          </Mono>
          <div className="flex items-center gap-1 shrink-0">
            <Pixel size={10} color="ink-dim">
              Less
            </Pixel>
            {[0, 1, 2, 4, 7].map((n) => (
              <span
                key={n}
                className={cn(
                  "inline-block size-3.25 rounded-xs",
                  bucketClass(n),
                )}
              />
            ))}
            <Pixel size={10} color="ink-dim">
              More
            </Pixel>
          </div>
        </div>
      </PanelBody>
    </Panel>
  );
}
