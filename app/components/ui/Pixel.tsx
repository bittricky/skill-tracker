import { cn } from "~/lib/cn";

interface PixelProps {
  children: React.ReactNode;
  color?:
    | "ink"
    | "ink-soft"
    | "ink-muted"
    | "ink-dim"
    | "mustard"
    | "coral"
    | "teal"
    | "lavender"
    | "rose";
  size?: 10 | 11 | 12 | 13 | 14 | 16 | 18;
  className?: string;
}

export function Pixel({
  children,
  color = "ink-muted",
  size = 11,
  className,
}: PixelProps) {
  const colorClasses: Record<string, string> = {
    ink: "text-ink",
    "ink-soft": "text-ink-soft",
    "ink-muted": "text-ink-muted",
    "ink-dim": "text-ink-dim",
    mustard: "text-accent-mustard",
    coral: "text-accent-coral",
    teal: "text-accent-teal",
    lavender: "text-accent-lavender",
    rose: "text-accent-rose",
  };

  const sizeClasses: Record<number, string> = {
    10: "text-[10px]",
    11: "text-[11px]",
    12: "text-xs",
    13: "text-sm",
    14: "text-[14px]",
    16: "text-base",
    18: "text-lg",
  };

  return (
    <span
      className={cn(
        "font-display uppercase tracking-[0.06em] leading-tight",
        colorClasses[color],
        sizeClasses[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
