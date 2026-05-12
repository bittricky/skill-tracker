import { Icon } from "./Icon";
import { useTheme } from "~/hooks/useTheme";

interface ThemeToggleButtonProps {
  className?: string;
}

/**
 * Lightbulb icon that toggles between light and dark themes.
 * Renders Lightbulb (on) when in light mode, LightbulbOff when in dark mode.
 */
export function ThemeToggleButton({ className = "" }: ThemeToggleButtonProps) {
  const { theme, toggleTheme, mounted } = useTheme();

  // Avoid hydration mismatch — render a neutral placeholder until mounted.
  const iconName = !mounted || theme === "light" ? "Lightbulb" : "LightbulbOff";
  const label = theme === "light" ? "Switch to dark theme" : "Switch to light theme";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={label}
      aria-label={label}
      className={`inline-flex w-9 h-9 items-center justify-center rounded-full text-brand-muted hover:text-brand-ink hover:bg-brand-surface-2 transition-colors ${className}`}
    >
      <Icon name={iconName} size={13} />
    </button>
  );
}
