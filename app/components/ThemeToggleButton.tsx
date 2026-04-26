import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSun, faMoon } from "@fortawesome/free-solid-svg-icons";
import { useTheme } from "~/hooks/useTheme";

interface ThemeToggleButtonProps {
  className?: string;
}

export function ThemeToggleButton({ className = "" }: ThemeToggleButtonProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`flex items-center justify-center w-9 h-9 rounded-full bg-brand-surface text-brand-muted hover:text-brand-primary transition-colors ${className}`}
    >
      <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="text-sm" />
    </button>
  );
}
