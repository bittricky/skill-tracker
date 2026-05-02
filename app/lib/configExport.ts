/**
 * Config export / import for the skill tracker.
 *
 * The "config" is a single JSON document containing any subset of:
 *   - `disciplines`   : user-authored catalogue (replaces the built-in one
 *                       when present; stored under `skill-tracker:custom-disciplines`)
 *   - `progress`      : per-skill status map
 *   - `applied`       : per-skill applied flags
 *   - `projectsDone`  : per-project done flags
 *
 * Hand-editing this JSON lets anyone repurpose the tracker for any skill
 * domain (design, music, research, etc.) — not just developer roadmaps.
 */

import {
  CUSTOM_DISCIPLINES_KEY,
  DISCIPLINES,
  GENERATED_AT,
  UPSTREAM_COMMIT,
  UPSTREAM_REPO,
  type Discipline,
} from "~/data";
import {
  loadStorage,
  saveStorage,
  type AppliedMap,
  type ProgressMap,
  type ProjectsDoneMap,
} from "./storage";

export const CONFIG_VERSION = 1;

export interface ExportedConfig {
  version: number;
  exportedAt: string;
  source: "skill-tracker";
  /** Optional: user-authored or current built-in discipline catalogue. */
  disciplines?: {
    generatedAt: string;
    upstreamCommit?: string;
    upstreamRepo?: string;
    disciplines: Discipline[];
  };
  progress?: ProgressMap;
  applied?: AppliedMap;
  projectsDone?: ProjectsDoneMap;
}

export interface ImportSummary {
  importedDisciplines: boolean;
  importedProgress: boolean;
  importedApplied: boolean;
  importedProjects: boolean;
  disciplineCount?: number;
}

/**
 * Build an export document from the live app state. Always includes the
 * current catalogue so recipients can see the schema, even if they only
 * intend to use the progress fields.
 */
export function buildExportConfig(): ExportedConfig {
  const storage = loadStorage();
  return {
    version: CONFIG_VERSION,
    exportedAt: new Date().toISOString(),
    source: "skill-tracker",
    disciplines: {
      generatedAt: GENERATED_AT,
      upstreamCommit: UPSTREAM_COMMIT,
      upstreamRepo: UPSTREAM_REPO,
      disciplines: DISCIPLINES,
    },
    progress: storage.progress,
    applied: storage.applied,
    projectsDone: storage.projectsDone,
  };
}

/** Trigger a browser download of the given config JSON. */
export function downloadConfig(config: ExportedConfig, filename?: string) {
  const name =
    filename ??
    `skill-tracker-config-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(config, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** Strict-enough validator for a discipline catalogue payload. */
function validateDisciplineCatalogue(value: unknown): string | null {
  if (!isRecord(value)) return "disciplines: expected an object";
  if (!Array.isArray(value.disciplines))
    return "disciplines.disciplines: expected an array";
  for (const [i, d] of (value.disciplines as unknown[]).entries()) {
    if (!isRecord(d)) return `disciplines[${i}]: expected an object`;
    if (typeof d.id !== "string" || !d.id)
      return `disciplines[${i}].id: expected a non-empty string`;
    if (typeof d.label !== "string" || !d.label)
      return `disciplines[${i}].label: expected a non-empty string`;
    if (typeof d.kind !== "string")
      return `disciplines[${i}].kind: expected a string`;
    if (!Array.isArray(d.sections))
      return `disciplines[${i}].sections: expected an array`;
    for (const [j, sec] of (d.sections as unknown[]).entries()) {
      if (!isRecord(sec))
        return `disciplines[${i}].sections[${j}]: expected an object`;
      if (typeof sec.id !== "string")
        return `disciplines[${i}].sections[${j}].id: expected a string`;
      if (typeof sec.label !== "string")
        return `disciplines[${i}].sections[${j}].label: expected a string`;
      if (!Array.isArray(sec.items))
        return `disciplines[${i}].sections[${j}].items: expected an array`;
      for (const [k, item] of (sec.items as unknown[]).entries()) {
        if (!isRecord(item))
          return `disciplines[${i}].sections[${j}].items[${k}]: expected an object`;
        if (typeof item.id !== "string" || !item.id)
          return `disciplines[${i}].sections[${j}].items[${k}].id: expected a non-empty string`;
        if (typeof item.label !== "string" || !item.label)
          return `disciplines[${i}].sections[${j}].items[${k}].label: expected a non-empty string`;
      }
    }
  }
  return null;
}

/**
 * Validate an imported config document. Returns an error message on
 * failure, or `null` when the payload is acceptable. Each top-level
 * section is optional — you can import progress without disciplines,
 * or vice versa.
 */
export function validateImport(input: unknown): string | null {
  if (!isRecord(input)) return "expected a JSON object";
  if (input.version !== undefined && typeof input.version !== "number")
    return "version: expected a number";
  if (input.disciplines !== undefined) {
    const err = validateDisciplineCatalogue(input.disciplines);
    if (err) return err;
  }
  if (input.progress !== undefined && !isRecord(input.progress))
    return "progress: expected an object";
  if (input.applied !== undefined && !isRecord(input.applied))
    return "applied: expected an object";
  if (input.projectsDone !== undefined && !isRecord(input.projectsDone))
    return "projectsDone: expected an object";
  return null;
}

/**
 * Apply a validated import to localStorage. Caller should reload the
 * page after import so the data module picks up any catalogue override.
 */
export function applyImport(input: ExportedConfig): ImportSummary {
  const summary: ImportSummary = {
    importedDisciplines: false,
    importedProgress: false,
    importedApplied: false,
    importedProjects: false,
  };
  if (typeof window === "undefined") return summary;

  if (input.disciplines) {
    window.localStorage.setItem(
      CUSTOM_DISCIPLINES_KEY,
      JSON.stringify(input.disciplines),
    );
    summary.importedDisciplines = true;
    summary.disciplineCount = input.disciplines.disciplines.length;
  }

  const current = loadStorage();
  const next = {
    progress: input.progress ?? current.progress,
    applied: input.applied ?? current.applied,
    projectsDone: input.projectsDone ?? current.projectsDone,
  };
  if (input.progress !== undefined) summary.importedProgress = true;
  if (input.applied !== undefined) summary.importedApplied = true;
  if (input.projectsDone !== undefined) summary.importedProjects = true;
  saveStorage(next);

  return summary;
}

/** Remove the custom discipline override; the next load uses the built-in catalogue. */
export function clearCustomDisciplines(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CUSTOM_DISCIPLINES_KEY);
}

/** Wipe progress only, keeping any custom catalogue. */
export function resetProgressOnly(): void {
  saveStorage({ progress: {}, applied: {}, projectsDone: {} });
}

/** Wipe everything (progress + custom catalogue). */
export function resetAll(): void {
  resetProgressOnly();
  clearCustomDisciplines();
}
