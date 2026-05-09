interface KeycapProps {
  label: string;
}

export function Keycap({ label }: KeycapProps) {
  return (
    <span
      className="font-display text-[11px] font-semibold min-w-[24px] text-center"
      style={{
        background: "var(--color-surface-panel-hi)",
        border: "1px solid var(--color-surface-border)",
        borderRadius: 3,
        padding: "2px 6px",
        color: "var(--color-ink)",
        boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.3)",
      }}
    >
      {label}
    </span>
  );
}
