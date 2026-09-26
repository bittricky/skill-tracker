import { TIER_META, type DepthTier } from "~/lib/depth";

interface TierTagProps {
  tier: DepthTier;
}

export function TierTag({ tier }: TierTagProps) {
  const meta = TIER_META[tier];
  return (
    <span
      className="font-display text-xs font-semibold uppercase tracking-[0.08em] whitespace-nowrap"
      style={{
        color: meta.color,
        background: `${meta.color}1a`,
        border: `1px solid ${meta.color}55`,
        padding: "2px 8px",
        borderRadius: 3,
      }}
    >
      {meta.label}
    </span>
  );
}
