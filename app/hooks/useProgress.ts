import { useCallback, useEffect, useState } from "react";
import {
  loadStorage,
  saveStorage,
  STATUS_CYCLE,
  type AppliedMap,
  type ProgressMap,
  type ProjectsDoneMap,
  type Status,
} from "~/lib/storage";

export interface UseProgress {
  progress: ProgressMap;
  applied: AppliedMap;
  projectsDone: ProjectsDoneMap;
  loaded: boolean;
  setStatus: (id: string, forceTo?: Status) => void;
  setApplied: (id: string, value?: boolean) => void;
  toggleProjectDone: (projectId: string, value?: boolean) => void;
  reset: () => void;
}

export function useProgress(): UseProgress {
  const [progress, setProgress] = useState<ProgressMap>({});
  const [applied, setAppliedState] = useState<AppliedMap>({});
  const [projectsDone, setProjectsDoneState] = useState<ProjectsDoneMap>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const data = loadStorage();
    setProgress(data.progress);
    setAppliedState(data.applied);
    setProjectsDoneState(data.projectsDone);
    setLoaded(true);
  }, []);

  const persist = useCallback(
    (
      p: ProgressMap | ((prev: ProgressMap) => ProgressMap) = (x) => x,
      a: AppliedMap | ((prev: AppliedMap) => AppliedMap) = (x) => x,
      pd: ProjectsDoneMap | ((prev: ProjectsDoneMap) => ProjectsDoneMap) = (
        x,
      ) => x,
    ) => {
      setProgress((curP) => {
        const nextP = typeof p === "function" ? p(curP) : p;
        setAppliedState((curA) => {
          const nextA = typeof a === "function" ? a(curA) : a;
          setProjectsDoneState((curPd) => {
            const nextPd = typeof pd === "function" ? pd(curPd) : pd;
            saveStorage({
              progress: nextP,
              applied: nextA,
              projectsDone: nextPd,
            });
            return nextPd;
          });
          return nextA;
        });
        return nextP;
      });
    },
    [],
  );

  const setStatus = useCallback(
    (id: string, forceTo?: Status) => {
      persist((prev) => {
        const cur: Status = prev[id] ?? "untouched";
        const next: Status =
          forceTo ??
          STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % STATUS_CYCLE.length];
        const updated: ProgressMap = { ...prev };
        if (next === "untouched") delete updated[id];
        else updated[id] = next;
        return updated;
      });
    },
    [persist],
  );

  const setApplied = useCallback(
    (id: string, value?: boolean) => {
      persist(undefined, (prev) => {
        const next: AppliedMap = { ...prev };
        const newVal = value ?? !prev[id];
        if (newVal) next[id] = true;
        else delete next[id];
        return next;
      });
    },
    [persist],
  );

  const toggleProjectDone = useCallback(
    (projectId: string, value?: boolean) => {
      persist(undefined, undefined, (prev) => {
        const next: ProjectsDoneMap = { ...prev };
        const newVal = value ?? !prev[projectId];
        if (newVal) next[projectId] = true;
        else delete next[projectId];
        return next;
      });
    },
    [persist],
  );

  const reset = useCallback(() => {
    setProgress({});
    setAppliedState({});
    setProjectsDoneState({});
    saveStorage({ progress: {}, applied: {}, projectsDone: {} });
  }, []);

  return {
    progress,
    applied,
    projectsDone,
    loaded,
    setStatus,
    setApplied,
    toggleProjectDone,
    reset,
  };
}
