import { useCallback, useEffect, useState } from "react";
import {
  appendEvent,
  loadStorage,
  saveStorage,
  MAX_PINNED,
  STATUS_CYCLE,
  type ProgressEvent,
  type StorageData,
  type Status,
} from "~/lib/storage";

export interface UseProgress extends StorageData {
  loaded: boolean;
  /** True when the last localStorage write threw (quota, private mode). */
  saveError: boolean;
  setStatus: (id: string, forceTo?: Status) => void;
  setApplied: (id: string, value?: boolean) => void;
  togglePinned: (id: string) => void;
  setHidden: (id: string, hidden: boolean) => void;
  reset: () => void;
}

const now = () => new Date().toISOString();
const EMPTY: StorageData = {
  progress: {},
  applied: {},
  pinned: [],
  hidden: [],
  events: [],
};

export function useProgress(): UseProgress {
  const [data, setData] = useState<StorageData>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    setData(loadStorage());
    setLoaded(true);
  }, []);

  const persist = useCallback((update: (prev: StorageData) => StorageData) => {
    setData((prev) => {
      const next = update(prev);
      const ok = saveStorage(next);
      // Defer so we don't setState inside the updater.
      queueMicrotask(() => setSaveError(!ok));
      return next;
    });
  }, []);

  const setStatus = useCallback(
    (id: string, forceTo?: Status) => {
      persist((prev) => {
        const cur: Status = prev.progress[id] ?? "untouched";
        const next: Status =
          forceTo ??
          STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % STATUS_CYCLE.length];
        if (next === cur) return prev;
        const progress = { ...prev.progress };
        if (next === "untouched") delete progress[id];
        else progress[id] = next;
        return appendEvent(
          { ...prev, progress },
          { kind: "status", id, from: cur, to: next, at: now() },
        );
      });
    },
    [persist],
  );

  const setApplied = useCallback(
    (id: string, value?: boolean) => {
      persist((prev) => {
        const to = value ?? !prev.applied[id];
        if (to === !!prev.applied[id]) return prev;
        const applied = { ...prev.applied };
        if (to) applied[id] = true;
        else delete applied[id];
        return appendEvent(
          { ...prev, applied },
          { kind: "applied", id, from: !to, to, at: now() },
        );
      });
    },
    [persist],
  );

  const togglePinned = useCallback(
    (id: string) => {
      persist((prev) => {
        const adding = !prev.pinned.includes(id);
        const nextPinned = adding
          ? [...prev.pinned, id].slice(-MAX_PINNED)
          : prev.pinned.filter((x) => x !== id);
        if (nextPinned.length === prev.pinned.length && !adding) return prev;
        const events: ProgressEvent[] = [
          { kind: "pin", id, from: !adding, to: adding, at: now() },
        ];
        // When the cap pushes the oldest pin out, log its removal too.
        if (adding && prev.pinned.length >= MAX_PINNED) {
          const dropped = prev.pinned[0];
          events.push({
            kind: "pin",
            id: dropped,
            from: true,
            to: false,
            at: now(),
          });
        }
        let next: StorageData = { ...prev, pinned: nextPinned };
        for (const e of events) next = appendEvent(next, e);
        return next;
      });
    },
    [persist],
  );

  const setHidden = useCallback(
    (id: string, hide: boolean) => {
      persist((prev) => {
        const has = prev.hidden.includes(id);
        if (has === hide) return prev;
        return {
          ...prev,
          hidden: hide
            ? [...prev.hidden, id]
            : prev.hidden.filter((x) => x !== id),
        };
      });
    },
    [persist],
  );

  const reset = useCallback(() => {
    persist((prev) => ({ ...EMPTY, hidden: prev.hidden }));
  }, [persist]);

  return {
    ...data,
    loaded,
    saveError,
    setStatus,
    setApplied,
    togglePinned,
    setHidden,
    reset,
  };
}
