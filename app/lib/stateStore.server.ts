/**
 * Server-side backup of the single user's progress, used by
 * `routes/api.state.ts`. One JSON file under `DATA_DIR` (Docker volume in
 * production, `./data` in dev). Writes are atomic (temp file + rename) and
 * serialised through an in-process queue; a daily snapshot is kept for
 * manual rollback.
 */
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  mergeStorage,
  normalizeStorage,
  type StorageData,
} from "~/lib/storage";

const DATA_DIR = path.resolve(process.env.DATA_DIR ?? "./data");
const STATE_FILE = path.join(DATA_DIR, "state.json");
const SNAPSHOT_DIR = path.join(DATA_DIR, "snapshots");
const KEEP_SNAPSHOTS = 14;

let queue: Promise<unknown> = Promise.resolve();

/** Run `fn` after every previously queued store operation. */
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

async function readState(): Promise<StorageData | null> {
  try {
    return normalizeStorage(JSON.parse(await readFile(STATE_FILE, "utf8")));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

async function writeAtomic(file: string, body: string) {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, body, "utf8");
  await rename(tmp, file);
}

async function snapshot(body: string) {
  await mkdir(SNAPSHOT_DIR, { recursive: true });
  const day = new Date().toISOString().slice(0, 10);
  await writeAtomic(path.join(SNAPSHOT_DIR, `state-${day}.json`), body);
  const files = (await readdir(SNAPSHOT_DIR))
    .filter((f) => /^state-\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();
  for (const f of files.slice(0, Math.max(0, files.length - KEEP_SNAPSHOTS)))
    await rm(path.join(SNAPSHOT_DIR, f), { force: true });
}

export function loadServerState(): Promise<StorageData | null> {
  return serial(readState);
}

/** Merge `incoming` into the stored state, persist it, and return the result. */
export function mergeServerState(incoming: StorageData): Promise<StorageData> {
  return serial(async () => {
    const current = await readState();
    const merged = current ? mergeStorage(incoming, current) : incoming;
    const body = JSON.stringify(merged);
    await mkdir(DATA_DIR, { recursive: true });
    await writeAtomic(STATE_FILE, body);
    await snapshot(body);
    return merged;
  });
}
