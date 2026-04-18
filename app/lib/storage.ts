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

export const STATUS_CYCLE: Status[] = [
  "untouched",
  "learning",
  "done",
  "skipped",
];

export interface StatusConfig {
  label: string;
  color: string;
  bg: string;
  ring: string;
  filled: boolean;
}

export const STATUS: Record<Status, StatusConfig> = {
  untouched: {
    label: "Not started",
    color: "#fbbf24",
    bg: "transparent",
    ring: "#f59e0b",
    filled: false,
  },
  learning: {
    label: "In progress",
    color: "#a855f7",
    bg: "#a855f710",
    ring: "#a855f7",
    filled: false,
  },
  done: {
    label: "Done",
    color: "#4ade80",
    bg: "#4ade8010",
    ring: "#4ade80",
    filled: true,
  },
  skipped: {
    label: "Skipped",
    color: "#f87171",
    bg: "#f8717110",
    ring: "#ef4444",
    filled: false,
  },
};
