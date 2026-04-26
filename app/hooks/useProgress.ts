import { useCallback, useEffect, useState } from "react";
import {
  loadStorage,
  saveStorage,
  STATUS_CYCLE,
  type AppliedMap,
  type ProgressMap,
  type Status,
} from "~/lib/storage";

export interface UseProgress {
  progress: ProgressMap;
  applied: AppliedMap;
  loaded: boolean;
  setStatus: (id: string, forceTo?: Status) => void;
  setApplied: (id: string, value?: boolean) => void;
  reset: () => void;
}

export function useProgress(): UseProgress {
  const [progress, setProgress] = useState<ProgressMap>({});
  const [applied, setAppliedState] = useState<AppliedMap>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const data = loadStorage();
    setProgress(data.progress);
    setAppliedState(data.applied);
    setLoaded(true);
  }, []);

  const setStatus = useCallback((id: string, forceTo?: Status) => {
    setProgress((prev) => {
      const cur: Status = prev[id] ?? "untouched";
      const next: Status =
        forceTo ??
        STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % STATUS_CYCLE.length];
      const updated: ProgressMap = { ...prev };
      if (next === "untouched") delete updated[id];
      else updated[id] = next;
      // Persist alongside current applied state.
      setAppliedState((curApplied) => {
        saveStorage({ progress: updated, applied: curApplied });
        return curApplied;
      });
      return updated;
    });
  }, []);

  const setApplied = useCallback((id: string, value?: boolean) => {
    setAppliedState((prev) => {
      const next: AppliedMap = { ...prev };
      const newVal = value ?? !prev[id];
      if (newVal) next[id] = true;
      else delete next[id];
      setProgress((curProgress) => {
        saveStorage({ progress: curProgress, applied: next });
        return curProgress;
      });
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setProgress({});
    setAppliedState({});
    saveStorage({ progress: {}, applied: {} });
  }, []);

  return { progress, applied, loaded, setStatus, setApplied, reset };
}
