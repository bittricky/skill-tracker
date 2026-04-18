import { useCallback, useEffect, useState } from "react";
import {
  loadProgress,
  saveProgress,
  STATUS_CYCLE,
  type ProgressMap,
  type Status,
} from "~/lib/storage";

export interface UseProgress {
  progress: ProgressMap;
  loaded: boolean;
  setStatus: (id: string, forceTo?: Status) => void;
  reset: () => void;
}

export function useProgress(): UseProgress {
  const [progress, setProgress] = useState<ProgressMap>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setProgress(loadProgress());
    setLoaded(true);
  }, []);

  const setStatus = useCallback((id: string, forceTo?: Status) => {
    setProgress((prev) => {
      const cur: Status = prev[id] ?? "untouched";
      const next: Status =
        forceTo ?? STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % STATUS_CYCLE.length];
      const updated: ProgressMap = { ...prev };
      if (next === "untouched") delete updated[id];
      else updated[id] = next;
      saveProgress(updated);
      return updated;
    });
  }, []);

  const reset = useCallback(() => {
    setProgress({});
    saveProgress({});
  }, []);

  return { progress, loaded, setStatus, reset };
}
