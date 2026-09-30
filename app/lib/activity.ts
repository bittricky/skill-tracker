import type { ProgressEvent } from "./storage";

/** Predicate deciding whether a skill id counts toward a rollup. */
export type SkillFilter = (skillId: string) => boolean;

const DAY_MS = 24 * 60 * 60 * 1000;

const validAt = (at: string): number => {
  const t = new Date(at).getTime();
  return Number.isNaN(t) ? NaN : t;
};

/** Events that actually happened — well-formed, not synthetic, not future. */
export function realEvents(
  events: ProgressEvent[],
  now: Date = new Date(),
): ProgressEvent[] {
  const nowMs = now.getTime();
  return events.filter(
    (e) =>
      !e.synthetic && !Number.isNaN(validAt(e.at)) && validAt(e.at) <= nowMs,
  );
}

/**
 * "Learning" activity: status → learning|done, or applied → true.
 * Pins, skips, un-dos and un-applies never count.
 */
export function isLearningEvent(e: ProgressEvent): boolean {
  if (e.kind === "status") return e.to === "learning" || e.to === "done";
  if (e.kind === "applied") return e.to === true;
  return false;
}

/** Local calendar day key, yyyy-mm-dd. */
export function dayKey(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export interface DayCount {
  total: number;
  done: number;
  learning: number;
  applied: number;
}

/**
 * Per-local-day learning-event counts for [from, to] (inclusive, day-grained).
 * Only days with ≥1 event appear in the map.
 */
export function dailyCounts(
  events: ProgressEvent[],
  from: Date,
  to: Date,
  filter?: SkillFilter,
): Map<string, DayCount> {
  const fromMs = startOfDay(from).getTime();
  const toMs = startOfDay(to).getTime() + DAY_MS - 1;
  const out = new Map<string, DayCount>();
  for (const e of realEvents(events, to)) {
    if (!isLearningEvent(e)) continue;
    if (filter && !filter(e.id)) continue;
    const t = validAt(e.at);
    if (t < fromMs || t > toMs) continue;
    const k = dayKey(new Date(t));
    const c = out.get(k) ?? { total: 0, done: 0, learning: 0, applied: 0 };
    c.total++;
    if (e.kind === "applied") c.applied++;
    else if (e.to === "done") c.done++;
    else c.learning++;
    out.set(k, c);
  }
  return out;
}

/**
 * Consecutive days with ≥1 learning event. `current` counts back from today
 * (or yesterday — a streak isn't broken until a full day is missed);
 * `longest` is the all-time run.
 */
export function streakDays(
  events: ProgressEvent[],
  today: Date = new Date(),
  filter?: SkillFilter,
): { current: number; longest: number; lastActiveAt: string | null } {
  const days = new Set<string>();
  let lastActiveAt: string | null = null;
  for (const e of realEvents(events, today)) {
    if (!isLearningEvent(e)) continue;
    if (filter && !filter(e.id)) continue;
    days.add(dayKey(new Date(e.at)));
    if (!lastActiveAt || e.at > lastActiveAt) lastActiveAt = e.at;
  }

  const cursor = startOfDay(today);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let current = 0;
  while (days.has(dayKey(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Compare day keys in UTC so DST transitions (23h/25h days) don't break runs.
  const sorted = [...days].sort();
  let longest = 0;
  let run = 0;
  let prev: number | null = null;
  for (const k of sorted) {
    const [y, m, d] = k.split("-").map(Number);
    const t = Date.UTC(y, m - 1, d);
    run = prev !== null && t - prev === DAY_MS ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = t;
  }

  return { current, longest, lastActiveAt };
}

/**
 * Unique-skill deltas since `since`: for each skill take its latest learning
 * event in the window; count by its `to`. Toggling a skill done twice = 1.
 */
export function deltaSince(
  events: ProgressEvent[],
  since: Date,
  filter?: SkillFilter,
): { done: number; learning: number; applied: number } {
  const sinceMs = since.getTime();
  const latest = new Map<string, ProgressEvent>();
  for (const e of realEvents(events)) {
    if (!isLearningEvent(e)) continue;
    if (filter && !filter(e.id)) continue;
    const t = validAt(e.at);
    if (t < sinceMs) continue;
    const cur = latest.get(e.id);
    if (!cur || e.at > cur.at) latest.set(e.id, e);
  }
  const out = { done: 0, learning: 0, applied: 0 };
  for (const e of latest.values()) {
    if (e.kind === "applied") out.applied++;
    else if (e.to === "done") out.done++;
    else out.learning++;
  }
  return out;
}

/** Latest real status/applied event timestamp across the given ids. */
export function lastTouched(
  events: ProgressEvent[],
  ids: Iterable<string>,
): string | null {
  const set = ids instanceof Set ? ids : new Set(ids);
  let latest: string | null = null;
  for (const e of realEvents(events)) {
    if (e.kind === "pin" || !set.has(e.id)) continue;
    if (!latest || e.at > latest) latest = e.at;
  }
  return latest;
}

/** Learning events per 7-day week, oldest → newest, `weeks` buckets. */
export function weeklyCounts(
  events: ProgressEvent[],
  skillIds: Set<string>,
  weeks = 12,
  today: Date = new Date(),
): number[] {
  const out = new Array<number>(weeks).fill(0);
  const start = startOfDay(today);
  start.setDate(start.getDate() - (weeks * 7 - 1));
  const startMs = start.getTime();
  for (const e of realEvents(events, today)) {
    if (!isLearningEvent(e) || !skillIds.has(e.id)) continue;
    const idx = Math.floor((validAt(e.at) - startMs) / (7 * DAY_MS));
    if (idx >= 0 && idx < weeks) out[idx]++;
  }
  return out;
}

/** "just now", "3h ago", "2d ago", "Mar 4". */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const t = validAt(iso);
  if (Number.isNaN(t)) return "";
  const diff = now.getTime() - t;
  if (diff < 0) return "just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(t).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Distinct years containing ≥1 real learning event, ascending. */
export function yearsWithActivity(events: ProgressEvent[]): number[] {
  const years = new Set<number>();
  for (const e of realEvents(events)) {
    if (!isLearningEvent(e)) continue;
    years.add(new Date(e.at).getFullYear());
  }
  return [...years].sort((a, b) => a - b);
}
