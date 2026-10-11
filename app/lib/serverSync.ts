/**
 * Optional backup of progress to the app's own server (`/api/state`).
 *
 * localStorage stays the source of truth; this module mirrors it. One
 * shared instance per page:
 *   - `startSync(initial)` on first mount: GET the server copy, merge it
 *     into local, and PUT back if the server is missing anything.
 *   - `markDirty(data)` after every local save: PUT 2s after the last change.
 *   - The server merges each PUT with what it has and returns the result,
 *     so two devices saving at once can't overwrite each other.
 *   - While changes are unsynced (`dirty`, persisted in localStorage), retry
 *     on `online`, when the tab becomes visible, and on the next load.
 * If the endpoint doesn't exist (404 / non-JSON) the status is
 * `unavailable` and the app keeps working locally.
 */
import {
  loadStorage,
  mergeStorage,
  normalizeStorage,
  sameStorage,
  saveStorage,
  type StorageData,
} from "./storage";

export type SyncState =
  | "syncing"
  | "synced"
  | "pending"
  | "error"
  | "unavailable";

export interface SyncStatus {
  state: SyncState;
  lastSyncedAt: string | null;
}

const META_KEY = "skill-tracker:sync";
const ENDPOINT = "/api/state";
const DEBOUNCE_MS = 2000;

interface SyncMeta {
  dirty: boolean;
  lastSyncedAt: string | null;
}

function readMeta(): SyncMeta {
  try {
    const raw = JSON.parse(window.localStorage.getItem(META_KEY) ?? "null");
    return {
      dirty: raw?.dirty === true,
      lastSyncedAt: typeof raw?.lastSyncedAt === "string" ? raw.lastSyncedAt : null,
    };
  } catch {
    return { dirty: false, lastSyncedAt: null };
  }
}

function writeMeta(meta: SyncMeta) {
  try {
    window.localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    /* best effort */
  }
}

let started = false;
let latest: StorageData | null = null;
let status: SyncStatus = { state: "syncing", lastSyncedAt: null };
let inFlight = false;
let again = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let persistAsked = false;

const statusListeners = new Set<(s: SyncStatus) => void>();
const dataListeners = new Set<(d: StorageData) => void>();

function setStatus(state: SyncState, lastSyncedAt = status.lastSyncedAt) {
  status = { state, lastSyncedAt };
  for (const fn of statusListeners) fn(status);
}

export function getSyncStatus(): SyncStatus {
  return status;
}

export function subscribeSyncStatus(fn: (s: SyncStatus) => void) {
  statusListeners.add(fn);
  return () => void statusListeners.delete(fn);
}

/** Notified when a sync brings in changes from the server. */
export function subscribeRemoteData(fn: (d: StorageData) => void) {
  dataListeners.add(fn);
  return () => void dataListeners.delete(fn);
}

class Unavailable extends Error {}

async function request(
  method: "GET" | "PUT",
  body?: StorageData,
): Promise<StorageData | null> {
  const res = await fetch(ENDPOINT, {
    method,
    cache: "no-store",
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 404) throw new Unavailable();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (!res.headers.get("content-type")?.includes("application/json"))
    throw new Unavailable();
  const json = (await res.json()) as { state?: unknown };
  return json.state ? normalizeStorage(json.state) : null;
}

/** Pull, merge, push. Safe to call any time; concurrent calls coalesce. */
export async function syncNow(): Promise<void> {
  if (typeof window === "undefined") return;
  if (inFlight) {
    again = true;
    return;
  }
  inFlight = true;
  clearTimeout(timer);
  setStatus("syncing");
  try {
    const local = latest ?? loadStorage();
    const remote = await request("GET");
    let merged = remote ? mergeStorage(local, remote) : local;
    if (!remote || !sameStorage(merged, remote))
      merged = (await request("PUT", merged)) ?? merged;

    // Fold in anything changed locally while the requests were in flight.
    const current = latest ?? loadStorage();
    const final = mergeStorage(current, merged);
    if (!sameStorage(final, current)) {
      latest = final;
      saveStorage(final);
      for (const fn of dataListeners) fn(final);
    }
    const changedMeanwhile = !sameStorage(current, local);
    const at = new Date().toISOString();
    writeMeta({ dirty: changedMeanwhile, lastSyncedAt: at });
    setStatus(changedMeanwhile ? "pending" : "synced", at);
    if (changedMeanwhile) again = true;
  } catch (e) {
    if (e instanceof Unavailable) setStatus("unavailable");
    else if (e instanceof TypeError) setStatus("pending"); // network down
    else setStatus("error");
  } finally {
    inFlight = false;
    if (again && status.state !== "unavailable") {
      again = false;
      timer = setTimeout(syncNow, DEBOUNCE_MS);
    }
  }
}

/** Record a local save and schedule a debounced push. */
export function markDirty(data: StorageData) {
  if (typeof window === "undefined") return;
  latest = data;
  writeMeta({ ...readMeta(), dirty: true });
  if (status.state !== "unavailable" && status.state !== "syncing")
    setStatus("pending");
  clearTimeout(timer);
  timer = setTimeout(syncNow, DEBOUNCE_MS);
}

/** Ask the browser not to evict our storage (once per session). */
export function requestPersistence() {
  if (persistAsked || typeof navigator === "undefined") return;
  persistAsked = true;
  const storage = navigator.storage;
  if (!storage?.persist) return;
  storage
    .persisted()
    .then((p) => (p ? undefined : storage.persist()))
    .catch(() => {});
}

/** Begin syncing for this page (idempotent across route changes). */
export function startSync(initial: StorageData) {
  if (typeof window === "undefined" || started) return;
  started = true;
  latest = initial;
  status = { state: "syncing", lastSyncedAt: readMeta().lastSyncedAt };
  const retry = () => {
    if (status.state !== "unavailable") void syncNow();
  };
  window.addEventListener("online", retry);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") retry();
  });
  void syncNow();
}
