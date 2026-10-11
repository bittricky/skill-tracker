import { cn } from "~/lib/cn";

interface SecondaryButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "style"
> {
  children: React.ReactNode;
  active?: boolean;
}

export function SecondaryButton({
  children,
  className,
  active,
  type = "button",
  ...rest
}: SecondaryButtonProps) {
  return (
    <button
      type={type}
      {...rest}
      className={cn(
        "font-display text-sm tracking-[0.04em] uppercase",
        "px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-150",
        active ? "font-bold" : "font-normal",
        className,
      )}
      style={{
        background: active
          ? "var(--color-surface-panel-hi)"
          : "var(--color-surface-panel-lo)",
        color: active ? "var(--color-ink)" : "var(--color-ink-muted)",
        border: "1px solid var(--color-surface-border)",
      }}
    >
      {children}
    </button>
  );
}
