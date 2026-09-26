import type { Discipline } from "~/data";
import type { AppliedMap, ProgressMap } from "./storage";
import { disciplineStats } from "./progress";

export type DepthTier = "exploring" | "practicing" | "fluent";

export interface DepthResult {
  tier: DepthTier;
  donePct: number;
  appliedPct: number;
}

/**
 * Single source of truth for depth tiers.
 *
 * Thresholds:
 * - Exploring:   anything below Practicing
 * - Practicing:  ≥40% done AND ≥40% applied
 * - Fluent:      ≥80% done AND ≥60% applied
 */
export function tierFor(donePct: number, appliedPct: number): DepthTier {
  if (donePct >= 80 && appliedPct >= 60) return "fluent";
  if (donePct >= 40 && appliedPct >= 40) return "practicing";
  return "exploring";
}

export function calculateDepth(
  discipline: Discipline,
  progress: ProgressMap,
  applied: AppliedMap,
): DepthResult {
  const s = disciplineStats(discipline, progress, applied);
  if (s.total === 0) return { tier: "exploring", donePct: 0, appliedPct: 0 };
  const donePct = s.pct;
  const appliedPct = Math.round((s.applied / s.total) * 100);
  return { tier: tierFor(donePct, appliedPct), donePct, appliedPct };
}

export const TIER_META: Record<
  DepthTier,
  { label: string; color: string; accent: "coral" | "mustard" | "teal" }
> = {
  exploring: {
    label: "Exploring",
    color: "var(--color-accent-coral)",
    accent: "coral",
  },
  practicing: {
    label: "Practicing",
    color: "var(--color-accent-mustard)",
    accent: "mustard",
  },
  fluent: {
    label: "Fluent",
    color: "var(--color-accent-teal)",
    accent: "teal",
  },
};

export function getDepthLabel(tier: DepthTier): string {
  return TIER_META[tier].label;
}

export function getDepthColor(tier: DepthTier): string {
  return TIER_META[tier].color;
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
