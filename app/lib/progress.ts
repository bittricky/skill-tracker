import type { Roadmap, Section } from "~/data";
import type { ProgressMap, Status } from "./storage";

export interface Stats {
  total: number;
  done: number;
  learning: number;
  skipped: number;
  pct: number;
}

function empty(): Stats {
  return { total: 0, done: 0, learning: 0, skipped: 0, pct: 0 };
}

export function statusOf(progress: ProgressMap, id: string): Status {
  return progress[id] ?? "untouched";
}

export function sectionStats(section: Section, progress: ProgressMap): Stats {
  const s = empty();
  for (const item of section.items) {
    s.total++;
    const st = progress[item.id];
    if (st === "done") s.done++;
    else if (st === "learning") s.learning++;
    else if (st === "skipped") s.skipped++;
  }
  const denom = s.total - s.skipped;
  s.pct = denom > 0 ? Math.round((s.done / denom) * 100) : 0;
  return s;
}

export function roadmapStats(rm: Roadmap, progress: ProgressMap): Stats {
  const s = empty();
  for (const sec of rm.sections) {
    for (const item of sec.items) {
      s.total++;
      const st = progress[item.id];
      if (st === "done") s.done++;
      else if (st === "learning") s.learning++;
      else if (st === "skipped") s.skipped++;
    }
  }
  const denom = s.total - s.skipped;
  s.pct = denom > 0 ? Math.round((s.done / denom) * 100) : 0;
  return s;
}

export function globalStats(roadmaps: Roadmap[], progress: ProgressMap): Stats {
  const seen = new Set<string>();
  const s = empty();
  for (const rm of roadmaps) {
    for (const sec of rm.sections) {
      for (const item of sec.items) {
        if (seen.has(item.id)) continue; // dedupe across roadmaps
        seen.add(item.id);
        s.total++;
        const st = progress[item.id];
        if (st === "done") s.done++;
        else if (st === "learning") s.learning++;
        else if (st === "skipped") s.skipped++;
      }
    }
  }
  const denom = s.total - s.skipped;
  s.pct = denom > 0 ? Math.round((s.done / denom) * 100) : 0;
  return s;
}
