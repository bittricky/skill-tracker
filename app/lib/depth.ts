import type { Discipline } from "~/data";
import type { AppliedMap, ProgressMap } from "./storage";

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

  const donePct = Math.round((doneCount / items.length) * 100);
  const appliedPct = Math.round((appliedCount / items.length) * 100);

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
      return "#fbbf24"; // amber-400
    case "practicing":
      return "#a855f7"; // purple-500
    case "fluent":
      return "#4ade80"; // green-400
  }
}

export function getDepthBgColor(tier: DepthTier): string {
  switch (tier) {
    case "exploring":
      return "rgba(251, 191, 36, 0.15)";
    case "practicing":
      return "rgba(168, 85, 247, 0.15)";
    case "fluent":
      return "rgba(74, 222, 128, 0.15)";
  }
}

export function getDepthBorderColor(tier: DepthTier): string {
  switch (tier) {
    case "exploring":
      return "rgba(251, 191, 36, 0.3)";
    case "practicing":
      return "rgba(168, 85, 247, 0.3)";
    case "fluent":
      return "rgba(74, 222, 128, 0.3)";
  }
}
