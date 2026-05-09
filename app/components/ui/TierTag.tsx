type Tier = "exploring" | "practicing" | "fluent";

interface TierTagProps {
  tier: Tier;
}

const TIER_META: Record<Tier, { label: string; color: string }> = {
  exploring: { label: "Exploring", color: "var(--color-accent-coral)" },
  practicing: { label: "Practicing", color: "var(--color-accent-mustard)" },
  fluent: { label: "Fluent", color: "var(--color-accent-teal)" },
};

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
