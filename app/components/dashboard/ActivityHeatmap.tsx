import { useMemo, useState } from "react";
import { Panel, PanelHeader, PanelBody } from "~/components/ui/Panel";
import { Mono } from "~/components/ui/Mono";
import { Pixel } from "~/components/ui/Pixel";
import { SecondaryButton } from "~/components/ui/SecondaryButton";
import {
  activeCheckinDays,
  type CheckinMap,
  type ProgressEvent,
} from "~/lib/storage";
import {
  dailyCounts,
  dayKey,
  dayLevel,
  streakDays,
  yearsWithActivity,
  type DayCount,
  type SkillFilter,
} from "~/lib/activity";
import { cn } from "~/lib/cn";

interface ActivityHeatmapProps {
  events: ProgressEvent[];
  checkins: CheckinMap;
  onToggleCheckin: (day: string) => void;
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
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const LEVEL_CLASS = [
  "bg-surface-inset",
  "bg-accent-teal/25",
  "bg-accent-teal/50",
  "bg-accent-teal/75",
  "bg-accent-teal",
] as const;

const shortDate = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}`;

/** "Thu Oct 9 · 3 done · 1 applied" */
function tooltip(date: Date, c: DayCount | undefined, checkedIn: boolean) {
  const parts = [`${WEEKDAYS[date.getDay()]} ${shortDate(date)}`];
  if (c?.done) parts.push(`${c.done} done`);
  if (c?.learning) parts.push(`${c.learning} learning`);
  if (c?.applied) parts.push(`${c.applied} applied`);
  if (checkedIn) parts.push("checked in");
  if (parts.length === 1) parts.push("no activity");
  return parts.join(" · ");
}

export function ActivityHeatmap({
  events,
  checkins,
  onToggleCheckin,
  filter,
}: ActivityHeatmapProps) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const years = useMemo(
    () => yearsWithActivity(events, checkins),
    [events, checkins],
  );
  const showSwitcher = years.some((y) => y !== currentYear);

  const checkedDays = useMemo(() => activeCheckinDays(checkins), [checkins]);
  const streak = useMemo(
    () => streakDays(events, new Date(), filter, checkins),
    [events, filter, checkins],
  );
  const todayKey = dayKey(new Date());
  const checkedToday = checkedDays.has(todayKey);

  // Weeks starting Sunday, from the week containing Jan 1 through the week
  // containing Dec 31.
  const weeks = useMemo(() => {
    const from = new Date(year, 0, 1);
    const to = new Date(year, 11, 31);
    const counts = dailyCounts(events, from, to, filter);
    const today = dayKey(new Date());

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
          future: key > today,
        });
        d.setDate(d.getDate() + 1);
      }
      cols.push(col);
    }
    return cols;
  }, [events, filter, year]);

  // Month labels: a label sits on the column containing the 1st of a month —
  // exactly one column per month, so labels can never duplicate.
  const monthLabels = useMemo(
    () =>
      weeks.map((col) => {
        const first = col.find((c) => c.date?.getDate() === 1);
        return first?.date ? MONTHS[first.date.getMonth()] : "";
      }),
    [weeks],
  );

  return (
    <Panel className="min-w-0">
      <PanelHeader
        title="Activity"
        subtitle="check-ins and skills learned"
        accentColor="teal"
        glyph="Play"
      >
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <Pixel color="ink-muted" size={13}>
            {streak.current}-day streak · longest {streak.longest}
          </Pixel>
          <SecondaryButton
            active={checkedToday}
            aria-pressed={checkedToday}
            onClick={() => onToggleCheckin(todayKey)}
            title={
              checkedToday ? "Undo today's check-in" : "Mark today as active"
            }
          >
            {checkedToday ? "Checked in ✓" : "Check in today"}
          </SecondaryButton>
          {showSwitcher && (
            <div className="flex items-center gap-2">
              <SecondaryButton
                aria-label="Previous year"
                onClick={() => setYear((y) => y - 1)}
              >
                ‹
              </SecondaryButton>
              <Pixel size={13} color="ink">
                {year}
              </Pixel>
              <SecondaryButton
                aria-label="Next year"
                onClick={() => setYear((y) => Math.min(currentYear, y + 1))}
              >
                ›
              </SecondaryButton>
            </div>
          )}
        </div>
      </PanelHeader>
      <PanelBody>
        {/* One fluid grid: weekday-label column + one equal column per week.
            Cells are square, so the grid fills the panel width with no scroll. */}
        <div
          className="grid w-full"
          role="group"
          aria-label={`Activity in ${year}`}
          style={{
            gridTemplateColumns: `1.75rem repeat(${weeks.length}, minmax(0, 1fr))`,
            gap: "clamp(1px, 0.25vw, 3px)",
          }}
        >
          {/* Month labels (row 1) */}
          {monthLabels.map((l, i) =>
            l ? (
              <div
                key={`m-${i}`}
                className="whitespace-nowrap leading-none pb-1"
                style={{ gridRow: 1, gridColumn: i + 2 }}
              >
                <Mono size={10} color="ink-dim">
                  {l}
                </Mono>
              </div>
            ) : null,
          )}
          {/* Weekday labels (column 1); Sun/Tue/Thu/Sat hide on narrow screens */}
          {WEEKDAYS.map((l, i) => (
            <div
              key={`w-${i}`}
              className={cn(
                "self-center leading-none",
                i % 2 === 0 && "hidden sm:block",
              )}
              style={{ gridRow: i + 2, gridColumn: 1 }}
            >
              <Mono size={10} color="ink-dim">
                {l}
              </Mono>
            </div>
          ))}
          {/* Day cells: columns = weeks, rows = Sun..Sat */}
          {weeks.flatMap((col, ci) =>
            col.map((cell, ri) => {
              const place = { gridColumn: ci + 2, gridRow: ri + 2 };
              if (!cell.date)
                return (
                  <div
                    key={`${ci}-${ri}`}
                    className="aspect-square"
                    style={place}
                    aria-hidden="true"
                  />
                );
              if (cell.future)
                return (
                  <button
                    key={cell.key}
                    type="button"
                    disabled
                    aria-label={`${shortDate(cell.date)}, future`}
                    className="aspect-square w-full rounded-xs bg-surface-inset opacity-40 cursor-not-allowed"
                    style={place}
                  />
                );
              const checked = checkedDays.has(cell.key);
              const level = dayLevel(cell.count?.total ?? 0, checked);
              return (
                <button
                  key={cell.key}
                  type="button"
                  aria-pressed={checked}
                  aria-label={`${shortDate(cell.date)}, ${level > 0 ? "active" : "inactive"}`}
                  title={tooltip(cell.date, cell.count, checked)}
                  onClick={() => onToggleCheckin(cell.key)}
                  className={cn(
                    "aspect-square w-full rounded-xs cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-mustard",
                    LEVEL_CLASS[level],
                    cell.key === todayKey && "ring-1 ring-inset ring-ink-dim",
                  )}
                  style={place}
                />
              );
            }),
          )}
        </div>

        <div className="flex items-center justify-between mt-3 gap-3">
          <Pixel size={10} color="ink-dim">
            Click a day to toggle a check-in
          </Pixel>
          <div className="flex items-center gap-1 shrink-0">
            <Pixel size={10} color="ink-dim">
              Less
            </Pixel>
            {LEVEL_CLASS.map((cls) => (
              <span
                key={cls}
                className={cn("inline-block size-3.25 rounded-xs", cls)}
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
