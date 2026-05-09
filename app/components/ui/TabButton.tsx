import { cn } from "~/lib/cn";

interface TabButtonProps {
  children: React.ReactNode;
  active?: boolean;
  color?: string;
  onClick?: () => void;
  className?: string;
}

export function TabButton({ children, active, color, onClick, className }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "font-display text-lg tracking-[0.05em] uppercase px-[22px] py-[10px] rounded-lg cursor-pointer transition-all duration-150",
        active ? "font-bold" : "font-normal",
        className
      )}
      style={{
        background: active ? color : "var(--color-surface-panel-lo)",
        color: active ? "var(--color-surface-bg-deep)" : "var(--color-ink-muted)",
        border: `1px solid ${active ? color : "var(--color-surface-border)"}`,
        boxShadow: active ? "inset 0 -2px 0 rgba(0,0,0,0.2)" : "none",
      }}
    >
      {children}
    </button>
  );
}
