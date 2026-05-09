import { cn } from "~/lib/cn";

interface MonoProps {
  children: React.ReactNode;
  color?: "ink" | "ink-soft" | "ink-muted" | "ink-dim" | "mustard" | "coral" | "teal" | "lavender" | "rose";
  size?: 10 | 11 | 12 | 13 | 14 | 16 | 20 | 24 | 28 | 36;
  weight?: 400 | 500 | 600 | 700;
  className?: string;
}

export function Mono({ children, color = "ink", size = 12, weight = 400, className }: MonoProps) {
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
    20: "text-xl",
    24: "text-2xl",
    28: "text-[28px]",
    36: "text-[36px]",
  };

  const weightClasses: Record<number, string> = {
    400: "font-normal",
    500: "font-medium",
    600: "font-semibold",
    700: "font-bold",
  };

  return (
    <span
      className={cn(
        "font-body tabular-nums",
        colorClasses[color],
        sizeClasses[size],
        weightClasses[weight],
        className
      )}
    >
      {children}
    </span>
  );
}
