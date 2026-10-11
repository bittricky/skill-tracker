/** Minimal localStorage wrapper with SSR guards. */
const V1_KEY = "skill-tracker:v1";
const V2_KEY = "skill-tracker:v2";

export type Status = "untouched" | "learning" | "done" | "skipped";
export type ProgressMap = Record<string, Exclude<Status, "untouched">>;
export type AppliedMap = Record<string, boolean>;

export type EventKind = "status" | "applied";

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

/**
 * A manual habit check-in for one local day. Turning a check-in off keeps
 * the entry (`on: false`) with a fresh `at`, so merges between devices can
 * tell "unchecked later" from "never checked".
 */
export interface Checkin {
  on: boolean;
  at: string;
}
export type CheckinMap = Record<string, Checkin>;

export interface StorageData {
  progress: ProgressMap;
  applied: AppliedMap;
  /** Discipline ids excluded from dashboard rollups (still browsable). */
  hidden: string[];
  events: ProgressEvent[];
  /** Manual check-ins keyed by local day (`yyyy-mm-dd`). */
  checkins: CheckinMap;
  /** Last local modification; decides `hidden` on merge. */
  updatedAt?: string;
}

export const MAX_EVENTS = 10_000;
export const STORAGE_KEY = "skill-tracker:v3";

export function emptyStorage(): StorageData {
  return {
    progress: {},
    applied: {},
    hidden: [],
    events: [],
    checkins: {},
  };
}

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function localDayKey(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Latest day a check-in may be recorded for (tomorrow, for TZ slack). */
function maxCheckinDay(now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  return localDayKey(d);
}

/** Days whose most recent check-in is on. */
export function activeCheckinDays(checkins: CheckinMap): Set<string> {
  const out = new Set<string>();
  for (const [day, c] of Object.entries(checkins)) if (c.on) out.add(day);
  return out;
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

const EVENT_KINDS: EventKind[] = ["status", "applied"];
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

  const checkins: CheckinMap = {};
  if (isRecord(obj.checkins)) {
    const maxDay = maxCheckinDay();
    for (const [day, c] of Object.entries(obj.checkins)) {
      if (!DAY_KEY_RE.test(day) || day > maxDay || !isRecord(c)) continue;
      if (typeof c.on !== "boolean" || typeof c.at !== "string") continue;
      if (Number.isNaN(new Date(c.at).getTime())) continue;
      checkins[day] = { on: c.on, at: c.at };
    }
  }

  const out: StorageData = {
    progress,
    applied,
    hidden,
    events: capEvents(events),
    checkins,
  };
  if (
    typeof obj.updatedAt === "string" &&
    !Number.isNaN(new Date(obj.updatedAt).getTime())
  )
    out.updatedAt = obj.updatedAt;
  return out;
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

/** Keys from removed features (custom catalogue, Gist sync). */
const RETIRED_KEYS = [
  "skill-tracker:custom-disciplines",
  "skill-tracker:gist-sync",
];

export function loadStorage(): StorageData {
  if (typeof window === "undefined") return emptyStorage();
  try {
    for (const k of RETIRED_KEYS) window.localStorage.removeItem(k);
  } catch {
    /* storage unavailable — nothing to clean */
  }

  const v3 = safeRead(STORAGE_KEY);
  if (v3 && typeof v3 === "object") return normalizeStorage(v3);

  // Migrate v2 (progress, applied) → v3 once, seeding the timeline.
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
 * Cap a sorted event list at MAX_EVENTS: drop the oldest synthetic events
 * first, then the oldest real ones.
 */
export function capEvents(events: ProgressEvent[]): ProgressEvent[] {
  if (events.length <= MAX_EVENTS) return events;
  let toDrop = events.length - MAX_EVENTS;
  const kept = events.filter((e) => {
    if (toDrop > 0 && e.synthetic) {
      toDrop--;
      return false;
    }
    return true;
  });
  return toDrop > 0 ? kept.slice(toDrop) : kept;
}

/** Pure append with the MAX_EVENTS cap. */
export function appendEvent(data: StorageData, ev: ProgressEvent): StorageData {
  return { ...data, events: capEvents([...data.events, ev]) };
}

const eventKey = (e: ProgressEvent) =>
  `${e.kind}|${e.id}|${e.at}|${String(e.to)}`;

const later = (x?: string, y?: string) => (!x ? y : !y ? x : x >= y ? x : y);

/**
 * Merge two snapshots (devices, server copy, imported backup) without
 * losing either side's changes:
 *   - events: union (deduped), sorted, capped
 *   - progress/applied: per skill, the latest event in the merged history
 *     decides; skills with no events keep `a`'s value, else `b`'s
 *   - checkins: per day, the later `at` wins (so "unchecked" survives)
 *   - hidden: from the side with the newer `updatedAt` (ties → `a`)
 * Commutative for everything except tie-breaks, and idempotent.
 */
export function mergeStorage(a: StorageData, b: StorageData): StorageData {
  const byKey = new Map<string, ProgressEvent>();
  for (const e of [...a.events, ...b.events]) {
    const k = eventKey(e);
    const cur = byKey.get(k);
    // Prefer the real copy when one side has a synthetic duplicate.
    if (!cur || (cur.synthetic && !e.synthetic)) byKey.set(k, e);
  }
  const events = capEvents(
    [...byKey.values()].sort((x, y) => x.at.localeCompare(y.at)),
  );

  const lastStatus = new Map<string, ProgressEvent>();
  const lastApplied = new Map<string, ProgressEvent>();
  for (const e of events) {
    if (e.kind === "status") lastStatus.set(e.id, e);
    else if (e.kind === "applied") lastApplied.set(e.id, e);
  }

  const progress: ProgressMap = {};
  for (const id of new Set([
    ...Object.keys(a.progress),
    ...Object.keys(b.progress),
    ...lastStatus.keys(),
  ])) {
    const ev = lastStatus.get(id);
    const st = ev ? (ev.to as Status) : (a.progress[id] ?? b.progress[id]);
    if (st && st !== "untouched") progress[id] = st;
  }

  const applied: AppliedMap = {};
  for (const id of new Set([
    ...Object.keys(a.applied),
    ...Object.keys(b.applied),
    ...lastApplied.keys(),
  ])) {
    const ev = lastApplied.get(id);
    const on = ev ? ev.to === true : !!(a.applied[id] ?? b.applied[id]);
    if (on) applied[id] = true;
  }

  const checkins: CheckinMap = { ...b.checkins };
  for (const [day, c] of Object.entries(a.checkins)) {
    const o = checkins[day];
    if (!o || c.at >= o.at) checkins[day] = c;
  }

  const newer = (b.updatedAt ?? "") > (a.updatedAt ?? "") ? b : a;
  const out: StorageData = {
    progress,
    applied,
    hidden: [...newer.hidden],
    events,
    checkins,
  };
  const updatedAt = later(a.updatedAt, b.updatedAt);
  if (updatedAt) out.updatedAt = updatedAt;
  return out;
}

/** Structural equality of two snapshots (cheap enough at this size). */
export function sameStorage(a: StorageData, b: StorageData): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export const STATUS_CYCLE: Status[] = [
  "untouched",
  "learning",
  "done",
  "skipped",
];
