/** Minimal localStorage wrapper with SSR guards. */
const KEY = "skill-tracker:v1";

export type Status = "untouched" | "learning" | "done" | "skipped";
export type ProgressMap = Record<string, Exclude<Status, "untouched">>;

export function loadProgress(): ProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as ProgressMap) : {};
  } catch {
    return {};
  }
}

export function saveProgress(data: ProgressMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* ignore quota errors */
  }
}

export const STATUS_CYCLE: Status[] = ["untouched", "learning", "done", "skipped"];

export interface StatusConfig {
  label: string;
  color: string;
  bg: string;
  ring: string;
  filled: boolean;
}

export const STATUS: Record<Status, StatusConfig> = {
  untouched: { label: "Not started", color: "#9ca3af", bg: "transparent", ring: "#e5e7eb", filled: false },
  learning:  { label: "In progress", color: "#d97706", bg: "#fffbeb",     ring: "#f59e0b", filled: false },
  done:      { label: "Done",        color: "#15803d", bg: "#f0fdf4",     ring: "#22c55e", filled: true  },
  skipped:   { label: "Skipped",     color: "#d1d5db", bg: "transparent", ring: "#e5e7eb", filled: false },
};
