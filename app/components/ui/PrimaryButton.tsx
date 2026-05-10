import { cn } from "~/lib/cn";

interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  icon?: string;
}

export function PrimaryButton({
  children,
  onClick,
  className,
  icon,
}: PrimaryButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "font-display text-lg font-bold tracking-[0.05em] uppercase",
        "px-[18px] py-[10px] rounded-lg cursor-pointer transition-all duration-150",
        "hover:-translate-y-[1px]",
        className,
      )}
      style={{
        background: "var(--color-accent-mustard)",
        color: "var(--color-surface-bg-deep)",
        border: "1px solid var(--color-accent-mustard-soft)",
        boxShadow:
          "inset 0 -2px 0 rgba(0,0,0,0.2), 0 2px 0 var(--color-accent-mustard-soft)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow =
          "inset 0 -2px 0 rgba(0,0,0,0.2), 0 3px 0 var(--color-accent-mustard-soft)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow =
          "inset 0 -2px 0 rgba(0,0,0,0.2), 0 2px 0 var(--color-accent-mustard-soft)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <span className="flex items-center gap-2">
        {icon && <span>{icon}</span>}
        {children}
      </span>
    </button>
  );
}
