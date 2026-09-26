import { useCallback, useEffect, useState } from "react";
import {
  loadStorage,
  saveStorage,
  MAX_PINNED,
  STATUS_CYCLE,
  type StorageData,
  type Status,
} from "~/lib/storage";

export interface UseProgress extends StorageData {
  loaded: boolean;
  setStatus: (id: string, forceTo?: Status) => void;
  setApplied: (id: string, value?: boolean) => void;
  togglePinned: (id: string) => void;
  reset: () => void;
}

export function useProgress(): UseProgress {
  const [data, setData] = useState<StorageData>({
    progress: {},
    applied: {},
    pinned: [],
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setData(loadStorage());
    setLoaded(true);
  }, []);

  const persist = useCallback((update: (prev: StorageData) => StorageData) => {
    setData((prev) => {
      const next = update(prev);
      saveStorage(next);
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
        const progress = { ...prev.progress };
        if (next === "untouched") delete progress[id];
        else progress[id] = next;
        return { ...prev, progress };
      });
    },
    [persist],
  );

  const setApplied = useCallback(
    (id: string, value?: boolean) => {
      persist((prev) => {
        const applied = { ...prev.applied };
        if (value ?? !prev.applied[id]) applied[id] = true;
        else delete applied[id];
        return { ...prev, applied };
      });
    },
    [persist],
  );

  const togglePinned = useCallback(
    (id: string) => {
      persist((prev) => {
        const pinned = prev.pinned.includes(id)
          ? prev.pinned.filter((x) => x !== id)
          : [...prev.pinned, id].slice(-MAX_PINNED);
        return { ...prev, pinned };
      });
    },
    [persist],
  );

  const reset = useCallback(() => {
    persist(() => ({ progress: {}, applied: {}, pinned: [] }));
  }, [persist]);

  return { ...data, loaded, setStatus, setApplied, togglePinned, reset };
}
