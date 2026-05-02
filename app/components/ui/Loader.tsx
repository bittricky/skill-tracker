interface LoaderProps {
  /** Optional label announced to screen readers (default: "Loading"). */
  label?: string;
  className?: string;
}

/**
 * Dual-ring themed loader. The visual styles live in `app.css` (`.loader`)
 * so they can reference CSS custom properties and swap with the theme.
 */
export function Loader({ label = "Loading", className = "" }: LoaderProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`loader ${className}`}
    />
  );
}
