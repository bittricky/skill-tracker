import { cn } from "~/lib/cn";

interface ItemSlotProps {
  children: React.ReactNode;
  className?: string;
  hoverColor?: string;
  onClick?: () => void;
  empty?: boolean;
}

export function ItemSlot({ children, className, hoverColor, onClick, empty }: ItemSlotProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-md p-[14px] transition-all duration-150",
        onClick && "cursor-pointer",
        className
      )}
      style={{
        background: "var(--color-surface-inset)",
        border: empty ? "1px dashed var(--color-surface-border)" : "1px solid var(--color-surface-bg-deep)",
        boxShadow: "var(--shadow-inset)",
      }}
      onMouseEnter={(e) => {
        if (hoverColor && onClick) {
          e.currentTarget.style.borderColor = hoverColor;
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        if (hoverColor && onClick) {
          e.currentTarget.style.borderColor = "var(--color-surface-bg-deep)";
          e.currentTarget.style.transform = "translateY(0)";
        }
      }}
    >
      {children}
    </div>
  );
}
