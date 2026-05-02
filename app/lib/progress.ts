import { PROJECTS_BY_DISCIPLINE, type Discipline, type Section } from "~/data";
import type {
  AppliedMap,
  ProgressMap,
  ProjectsDoneMap,
  Status,
} from "./storage";

export interface Stats {
  total: number;
  done: number;
  learning: number;
  skipped: number;
  pct: number;
}

export interface ProjectStats {
  total: number;
  done: number;
  pct: number;
}

function empty(): Stats {
  return { total: 0, done: 0, learning: 0, skipped: 0, pct: 0 };
}

/**
 * Count applied items for a discipline. By design (user choice: "Both"),
 * completing a roadmap.sh project counts toward the Applied metric for
 * each discipline that project lists in its `roadmapIds`, in addition to
 * any per-skill applied flags.
 */
export function appliedCount(
  discipline: Discipline,
  applied: AppliedMap,
  projectsDone: ProjectsDoneMap,
): number {
  let count = 0;
  for (const sec of discipline.sections) {
    for (const item of sec.items) {
      if (applied[item.id]) count++;
    }
  }
  const projects = PROJECTS_BY_DISCIPLINE[discipline.id] ?? [];
  for (const p of projects) {
    if (projectsDone[p.id]) count++;
  }
  return count;
}

export function projectStats(
  discipline: Discipline,
  projectsDone: ProjectsDoneMap,
): ProjectStats {
  const list = PROJECTS_BY_DISCIPLINE[discipline.id] ?? [];
  const total = list.length;
  let done = 0;
  for (const p of list) if (projectsDone[p.id]) done++;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return { total, done, pct };
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

export function disciplineStats(
  discipline: Discipline,
  progress: ProgressMap,
): Stats {
  const s = empty();
  for (const sec of discipline.sections) {
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

export function globalStats(
  disciplines: Discipline[],
  progress: ProgressMap,
): Stats {
  const seen = new Set<string>();
  const s = empty();
  for (const d of disciplines) {
    for (const sec of d.sections) {
      for (const item of sec.items) {
        if (seen.has(item.id)) continue; // dedupe across disciplines
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
