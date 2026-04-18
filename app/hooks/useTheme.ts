import { useState, useEffect, useCallback } from "react";
import { initTheme, toggleTheme as toggle, type Theme } from "~/lib/theme";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = initTheme();
    setTheme(initial);
    setMounted(true);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      toggle(prev);
      return next;
    });
  }, []);

  return { theme, toggleTheme, mounted };
}
