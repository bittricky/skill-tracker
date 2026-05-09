interface ProgressBarProps {
  pct: number;
  color?: string;
  height?: 4 | 6;
  className?: string;
}

export function ProgressBar({ pct, color = "var(--color-accent-mustard)", height = 6, className }: ProgressBarProps) {
  return (
    <div
      className="w-full overflow-hidden"
      style={{
        height,
        background: "var(--color-surface-inset)",
        border: "1px solid var(--color-surface-bg-deep)",
        borderRadius: height / 2,
        boxShadow: "inset 0 1px 1px rgba(0,0,0,0.3)",
      }}
    >
      <div
        className="h-full transition-[width] duration-300 ease-out"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(180deg, ${color} 0%, ${color}dd 100%)`,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)",
          borderRadius: height / 2,
        }}
      />
    </div>
  );
}
