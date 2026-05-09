import { PROJECTS_BY_DISCIPLINE, type Discipline } from "~/data";
import type { AppliedMap, ProgressMap, ProjectsDoneMap } from "./storage";

export type DepthTier = "exploring" | "practicing" | "fluent";

export interface DepthResult {
  tier: DepthTier;
  donePct: number;
  appliedPct: number;
}

/**
 * Calculate depth tier based on completion and application percentages.
 *
 * Thresholds:
 * - Exploring:   0–40% done
 * - Practicing:  40% done + 40% applied
 * - Fluent:      80% done + 60% applied
 */
export function calculateDepth(
  discipline: Discipline,
  progress: ProgressMap,
  applied: AppliedMap,
  projectsDone: ProjectsDoneMap = {},
): DepthResult {
  const items: string[] = [];
  for (const sec of discipline.sections) {
    for (const item of sec.items) {
      items.push(item.id);
    }
  }

  if (items.length === 0) {
    return { tier: "exploring", donePct: 0, appliedPct: 0 };
  }

  let doneCount = 0;
  let appliedCount = 0;

  for (const id of items) {
    if (progress[id] === "done") doneCount++;
    if (applied[id]) appliedCount++;
  }

  // Completing a roadmap.sh project contributes to the applied metric for
  // every discipline it's listed under.
  const projects = PROJECTS_BY_DISCIPLINE[discipline.id] ?? [];
  for (const p of projects) {
    if (projectsDone[p.id]) appliedCount++;
  }

  // Cap applied at the effective ceiling (skills + projects) so the pct
  // stays within 0..100 when projects push the count past total skills.
  const appliedDenom = items.length + projects.length;
  const donePct = Math.round((doneCount / items.length) * 100);
  const appliedPct =
    appliedDenom > 0 ? Math.round((appliedCount / appliedDenom) * 100) : 0;

  if (donePct >= 80 && appliedPct >= 60) {
    return { tier: "fluent", donePct, appliedPct };
  }
  if (donePct >= 40 && appliedPct >= 40) {
    return { tier: "practicing", donePct, appliedPct };
  }
  return { tier: "exploring", donePct, appliedPct };
}

export function getDepthLabel(tier: DepthTier): string {
  switch (tier) {
    case "exploring":
      return "Exploring";
    case "practicing":
      return "Practicing";
    case "fluent":
      return "Fluent";
  }
}

export function getDepthColor(tier: DepthTier): string {
  switch (tier) {
    case "exploring":
      return "var(--color-accent-coral)";
    case "practicing":
      return "var(--color-accent-mustard)";
    case "fluent":
      return "var(--color-accent-teal)";
  }
}

export function getDepthBgColor(tier: DepthTier): string {
  switch (tier) {
    case "exploring":
      return "rgba(232, 117, 85, 0.15)";
    case "practicing":
      return "rgba(232, 176, 74, 0.15)";
    case "fluent":
      return "rgba(92, 184, 168, 0.15)";
  }
}

export function getDepthBorderColor(tier: DepthTier): string {
  switch (tier) {
    case "exploring":
      return "rgba(232, 117, 85, 0.3)";
    case "practicing":
      return "rgba(232, 176, 74, 0.3)";
    case "fluent":
      return "rgba(92, 184, 168, 0.3)";
  }
}
