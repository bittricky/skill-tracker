import type { Discipline, Section } from "~/data";
import type { AppliedMap, ProgressMap, Status } from "./storage";

export interface Stats {
  total: number;
  done: number;
  learning: number;
  skipped: number;
  applied: number;
  pct: number;
}

function empty(): Stats {
  return { total: 0, done: 0, learning: 0, skipped: 0, applied: 0, pct: 0 };
}

function tally(
  s: Stats,
  id: string,
  progress: ProgressMap,
  applied?: AppliedMap,
): void {
  s.total++;
  const st = progress[id];
  if (st === "done") s.done++;
  else if (st === "learning") s.learning++;
  else if (st === "skipped") s.skipped++;
  if (applied?.[id]) s.applied++;
}

function finalize(s: Stats): Stats {
  const denom = s.total - s.skipped;
  s.pct = denom > 0 ? Math.round((s.done / denom) * 100) : 0;
  return s;
}

export function statusOf(progress: ProgressMap, id: string): Status {
  return progress[id] ?? "untouched";
}

export function sectionStats(
  section: Section,
  progress: ProgressMap,
  applied?: AppliedMap,
): Stats {
  const s = empty();
  for (const item of section.items) tally(s, item.id, progress, applied);
  return finalize(s);
}

export function disciplineStats(
  discipline: Discipline,
  progress: ProgressMap,
  applied?: AppliedMap,
): Stats {
  const s = empty();
  for (const sec of discipline.sections)
    for (const item of sec.items) tally(s, item.id, progress, applied);
  return finalize(s);
}

export function globalStats(
  disciplines: Discipline[],
  progress: ProgressMap,
  applied?: AppliedMap,
): Stats {
  const seen = new Set<string>();
  const s = empty();
  for (const d of disciplines) {
    for (const sec of d.sections) {
      for (const item of sec.items) {
        if (seen.has(item.id)) continue; // dedupe across disciplines
        seen.add(item.id);
        tally(s, item.id, progress, applied);
      }
    }
  }
  return finalize(s);
}
