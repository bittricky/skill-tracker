import { STATUS, type Status } from "~/lib/storage";

interface StatusButtonProps {
  status: Status;
  onClick?: () => void;
  size?: number;
  title?: string;
}

export function StatusButton({
  status,
  onClick,
  size = 16,
  title,
}: StatusButtonProps) {
  const cfg = STATUS[status];
  const glowColor =
    status === "learning"
      ? "rgba(0, 212, 255, 0.4)"
      : status === "done"
        ? "rgba(74, 222, 128, 0.4)"
        : undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? `${cfg.label} — click to cycle`}
      className="shrink-0 rounded-full flex items-center justify-center p-0 outline-none transition-all cursor-pointer hover:scale-110"
      style={{
        width: size,
        height: size,
        border: `1.5px solid ${cfg.ring}`,
        background: cfg.filled ? cfg.ring : "transparent",
        boxShadow: glowColor ? `0 0 8px ${glowColor}` : "none",
      }}
    >
      {status === "done" && (
        <svg
          width={size * 0.5}
          height={size * 0.5}
          viewBox="0 0 8 8"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M1.5 4L3.2 5.8L6.5 2"
            stroke="var(--color-brand-bg)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {status === "learning" && (
        <div
          className="rounded-full"
          style={{
            width: size * 0.38,
            height: size * 0.38,
            background: cfg.ring,
          }}
        />
      )}
      {status === "skipped" && (
        <div
          style={{
            width: size * 0.44,
            height: 1.5,
            borderRadius: 1,
            background: cfg.ring,
          }}
        />
      )}
    </button>
  );
}
