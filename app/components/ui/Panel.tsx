import { cn } from "~/lib/cn";
import { Pixel } from "./Pixel";
import { Mono } from "./Mono";
import { Icon, ICONS, type IconName } from "./Icon";

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  accentColor?: string;
}

interface PanelHeaderProps {
  title: string;
  subtitle?: string;
  meta?: string;
  accentColor?: "coral" | "mustard" | "teal" | "lavender" | "rose";
  glyph?: IconName;
  children?: React.ReactNode;
}

export function Panel({ children, className }: PanelProps) {
  return (
    <div
      className={cn("rounded-xl overflow-hidden", className)}
      style={{
        background: "var(--color-surface-panel)",
        border: "1px solid var(--color-surface-border)",
        boxShadow: "var(--shadow-raised)",
      }}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  subtitle,
  meta,
  accentColor = "mustard",
  glyph = "Home",
  children,
}: PanelHeaderProps) {
  const accentClasses: Record<string, string> = {
    coral: "text-accent-coral",
    mustard: "text-accent-mustard",
    teal: "text-accent-teal",
    lavender: "text-accent-lavender",
    rose: "text-accent-rose",
  };

  return (
    <div
      className="flex items-center justify-between px-[18px] py-[14px]"
      style={{ borderBottom: "1px solid var(--color-surface-divider)" }}
    >
      <div className="flex items-center gap-2">
        <Icon name={glyph} size={16} className={accentClasses[accentColor]} />
        <Pixel
          color={accentColor}
          size={13}
          className={accentClasses[accentColor]}
        >
          {title}
        </Pixel>
        {subtitle && (
          <div className="mt-0.5">
            <Mono size={11} color="ink-muted">
              {subtitle}
            </Mono>
          </div>
        )}
      </div>
      {children ? (
        children
      ) : meta ? (
        <Pixel color="ink-muted" size={13}>
          {meta}
        </Pixel>
      ) : null}
    </div>
  );
}

export function PanelBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("p-[14px]", className)}>{children}</div>;
}
