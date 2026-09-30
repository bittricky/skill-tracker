/** Minimal localStorage wrapper with SSR guards. */
const V1_KEY = "skill-tracker:v1";
const V2_KEY = "skill-tracker:v2";

export type Status = "untouched" | "learning" | "done" | "skipped";
export type ProgressMap = Record<string, Exclude<Status, "untouched">>;
export type AppliedMap = Record<string, boolean>;

export type EventKind = "status" | "applied" | "pin";

/**
 * Append-only history of what changed and when. `synthetic` marks events
 * created during migration to seed the timeline from pre-existing state;
 * they never count toward streaks or deltas.
 */
export interface ProgressEvent {
  id: string;
  kind: EventKind;
  from?: string | boolean;
  to: string | boolean;
  at: string;
  synthetic?: true;
}

export interface StorageData {
  progress: ProgressMap;
  applied: AppliedMap;
  /** Skill ids pinned to the dashboard "Active Tracks" panel (ordered). */
  pinned: string[];
  /** Discipline ids excluded from dashboard rollups (still browsable). */
  hidden: string[];
  events: ProgressEvent[];
}

export const MAX_PINNED = 3;
export const MAX_EVENTS = 10_000;
export const STORAGE_KEY = "skill-tracker:v3";

function emptyStorage(): StorageData {
  return { progress: {}, applied: {}, pinned: [], hidden: [], events: [] };
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

function safeWrite(key: string, value: unknown): boolean {
  if (typeof window === "undefined") return true;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

const EVENT_KINDS: EventKind[] = ["status", "applied", "pin"];
const STATUSES: Status[] = ["untouched", "learning", "done", "skipped"];
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

function isEvent(e: unknown): e is ProgressEvent {
  if (!isRecord(e)) return false;
  if (typeof e.id !== "string" || !e.id) return false;
  if (!EVENT_KINDS.includes(e.kind as EventKind)) return false;
  if (typeof e.at !== "string") return false;
  const t = new Date(e.at).getTime();
  if (Number.isNaN(t) || t > Date.now() + FUTURE_TOLERANCE_MS) return false;
  if (e.kind === "status") return STATUSES.includes(e.to as Status);
  return typeof e.to === "boolean";
}

/** Drop malformed elements rather than rejecting the whole payload. */
export function normalizeStorage(raw: unknown): StorageData {
  const obj = isRecord(raw) ? raw : {};

  const progress: ProgressMap = {};
  if (isRecord(obj.progress)) {
    for (const [id, st] of Object.entries(obj.progress)) {
      if (st === "learning" || st === "done" || st === "skipped")
        progress[id] = st;
    }
  }

  const applied: AppliedMap = {};
  if (isRecord(obj.applied)) {
    for (const [id, v] of Object.entries(obj.applied)) {
      if (v === true) applied[id] = true;
    }
  }

  const pinned = [...new Set(strings(obj.pinned))].slice(0, MAX_PINNED);
  const hidden = [...new Set(strings(obj.hidden))];

  const events = (Array.isArray(obj.events) ? obj.events : [])
    .filter(isEvent)
    .map((e) => {
      const clean: ProgressEvent = {
        id: e.id,
        kind: e.kind,
        to: e.to,
        at: e.at,
      };
      if (typeof e.from === "string" || typeof e.from === "boolean")
        clean.from = e.from;
      if (e.synthetic) clean.synthetic = true;
      return clean;
    })
    .sort((a, b) => a.at.localeCompare(b.at));

  return { progress, applied, pinned, hidden, events };
}

/** Seed a timeline for state that predates the event log. */
function synthesizeEvents(
  progress: ProgressMap,
  applied: AppliedMap,
  at: string,
): ProgressEvent[] {
  const out: ProgressEvent[] = [];
  for (const [id, to] of Object.entries(progress))
    out.push({ kind: "status", id, to, at, synthetic: true });
  for (const [id, to] of Object.entries(applied))
    if (to === true)
      out.push({ kind: "applied", id, to: true, at, synthetic: true });
  return out;
}

export function loadStorage(): StorageData {
  if (typeof window === "undefined") return emptyStorage();

  const v3 = safeRead(STORAGE_KEY);
  if (v3 && typeof v3 === "object") return normalizeStorage(v3);

  // Migrate v2 (progress, applied, pinned) → v3 once, seeding the timeline.
  const v2 = safeRead(V2_KEY);
  if (v2 && typeof v2 === "object") {
    const base = normalizeStorage(v2);
    const migrated: StorageData = {
      ...base,
      events: synthesizeEvents(
        base.progress,
        base.applied,
        new Date().toISOString(),
      ),
    };
    safeWrite(STORAGE_KEY, migrated);
    return migrated;
  }

  // Migrate v1 (progress only).
  const v1 = safeRead(V1_KEY);
  if (v1 && typeof v1 === "object") {
    const progress = normalizeStorage({ progress: v1 }).progress;
    const migrated: StorageData = {
      ...emptyStorage(),
      progress,
      events: synthesizeEvents(progress, {}, new Date().toISOString()),
    };
    safeWrite(STORAGE_KEY, migrated);
    return migrated;
  }
  return emptyStorage();
}

/** Returns false when the localStorage write throws (quota, private mode). */
export function saveStorage(data: StorageData): boolean {
  return safeWrite(STORAGE_KEY, data);
}

/**
 * Pure append with a cap: past MAX_EVENTS, drop the oldest synthetic events
 * first, then the oldest real ones.
 */
export function appendEvent(data: StorageData, ev: ProgressEvent): StorageData {
  const events = [...data.events, ev];
  if (events.length <= MAX_EVENTS) return { ...data, events };
  const overflow = events.length - MAX_EVENTS;
  let toDrop = overflow;
  const kept = events.filter((e) => {
    if (toDrop > 0 && e.synthetic) {
      toDrop--;
      return false;
    }
    return true;
  });
  while (toDrop > 0) {
    kept.shift();
    toDrop--;
  }
  return { ...data, events: kept };
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
