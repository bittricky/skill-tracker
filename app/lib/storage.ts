/** Minimal localStorage wrapper with SSR guards. */
const V1_KEY = "skill-tracker:v1";
const V2_KEY = "skill-tracker:v2";

export type Status = "untouched" | "learning" | "done" | "skipped";
export type ProgressMap = Record<string, Exclude<Status, "untouched">>;
export type AppliedMap = Record<string, boolean>;

export interface StorageData {
  progress: ProgressMap;
  applied: AppliedMap;
  /** Skill ids pinned to the dashboard "Active Tracks" panel (ordered). */
  pinned: string[];
}

export const MAX_PINNED = 3;

function emptyStorage(): StorageData {
  return { progress: {}, applied: {}, pinned: [] };
}

function safeRead(key: string): unknown | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

export function loadStorage(): StorageData {
  if (typeof window === "undefined") return emptyStorage();
  const v2 = safeRead(V2_KEY);
  if (v2 && typeof v2 === "object") {
    const obj = v2 as Partial<StorageData>;
    return {
      progress: (obj.progress ?? {}) as ProgressMap,
      applied: (obj.applied ?? {}) as AppliedMap,
      pinned: Array.isArray(obj.pinned)
        ? obj.pinned.filter((x): x is string => typeof x === "string")
        : [],
    };
  }
  // Migrate from v1 (progress only) once.
  const v1 = safeRead(V1_KEY);
  if (v1 && typeof v1 === "object") {
    const migrated: StorageData = {
      ...emptyStorage(),
      progress: v1 as ProgressMap,
    };
    safeWrite(V2_KEY, migrated);
    return migrated;
  }
  return emptyStorage();
}

export function saveStorage(data: StorageData): void {
  safeWrite(V2_KEY, data);
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
