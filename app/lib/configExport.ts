/**
 * Config export / import for the skill tracker.
 *
 * The "config" is a single JSON document containing any subset of:
 *   - `disciplines`   : user-authored catalogue (replaces the built-in one
 *                       when present; stored under `skill-tracker:custom-disciplines`)
 *   - `progress`      : per-skill status map
 *   - `applied`       : per-skill applied flags
 *   - `pinned`        : skill ids pinned to the dashboard
 *   - `hidden`        : discipline ids hidden from dashboard rollups
 *   - `events`        : append-only progress history
 *
 * Hand-editing this JSON lets anyone repurpose the tracker for any skill
 * domain (design, music, research, etc.) — not just developer roadmaps.
 *
 * The built-in catalogue is only embedded on request (`includeCatalogue`)
 * or when a custom catalogue is active. Re-importing an export that happens
 * to contain the bundled catalogue does NOT pin it as a custom override,
 * otherwise users would silently freeze themselves on a stale copy.
 */

import {
  BUILT_IN_PAYLOAD,
  CUSTOM_DISCIPLINES_KEY,
  DISCIPLINES,
  GENERATED_AT,
  IS_CUSTOM_CATALOGUE,
  UPSTREAM_COMMIT,
  UPSTREAM_REPO,
  type Discipline,
  type GeneratedPayload,
} from "~/data";
import {
  loadStorage,
  normalizeStorage,
  saveStorage,
  type AppliedMap,
  type ProgressEvent,
  type ProgressMap,
} from "./storage";

export const CONFIG_VERSION = 3;

export interface ExportedConfig {
  version: number;
  exportedAt: string;
  source: "skill-tracker";
  /** Optional: user-authored or current built-in discipline catalogue. */
  disciplines?: GeneratedPayload;
  progress?: ProgressMap;
  applied?: AppliedMap;
  pinned?: string[];
  hidden?: string[];
  events?: ProgressEvent[];
}

export interface ImportSummary {
  importedDisciplines: boolean;
  importedProgress: boolean;
  importedApplied: boolean;
  importedPinned: boolean;
  disciplineCount?: number;
}

export interface ExportOptions {
  /** Force-embed the catalogue even when it's the bundled one. */
  includeCatalogue?: boolean;
}

/**
 * Build an export document from the live app state. The catalogue is
 * embedded when it is custom (so it round-trips) or when explicitly asked.
 */
export function buildExportConfig(opts: ExportOptions = {}): ExportedConfig {
  const storage = loadStorage();
  const config: ExportedConfig = {
    version: CONFIG_VERSION,
    exportedAt: new Date().toISOString(),
    source: "skill-tracker",
    progress: storage.progress,
    applied: storage.applied,
    pinned: storage.pinned,
    hidden: storage.hidden,
    events: storage.events,
  };
  if (IS_CUSTOM_CATALOGUE || opts.includeCatalogue) {
    config.disciplines = {
      generatedAt: GENERATED_AT,
      upstreamCommit: UPSTREAM_COMMIT,
      upstreamRepo: UPSTREAM_REPO,
      disciplines: DISCIPLINES,
    };
  }
  return config;
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
  if (input.version !== undefined) {
    if (typeof input.version !== "number") return "version: expected a number";
    if (input.version < 1 || input.version > CONFIG_VERSION)
      return `version: expected 1–${CONFIG_VERSION}`;
  }
  if (input.disciplines !== undefined) {
    const err = validateDisciplineCatalogue(input.disciplines);
    if (err) return err;
  }
  if (input.progress !== undefined && !isRecord(input.progress))
    return "progress: expected an object";
  if (input.applied !== undefined && !isRecord(input.applied))
    return "applied: expected an object";
  if (input.pinned !== undefined && !Array.isArray(input.pinned))
    return "pinned: expected an array";
  if (input.hidden !== undefined && !Array.isArray(input.hidden))
    return "hidden: expected an array";
  if (input.events !== undefined && !Array.isArray(input.events))
    return "events: expected an array";
  return null;
}

/** True when a payload is (by provenance) the catalogue bundled with this build. */
function isBuiltInCatalogue(p: GeneratedPayload): boolean {
  return (
    p.generatedAt === BUILT_IN_PAYLOAD.generatedAt &&
    p.upstreamCommit === BUILT_IN_PAYLOAD.upstreamCommit &&
    p.disciplines.length === BUILT_IN_PAYLOAD.disciplines.length
  );
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
    importedPinned: false,
  };
  if (typeof window === "undefined") return summary;

  if (input.disciplines) {
    if (isBuiltInCatalogue(input.disciplines)) {
      // Same catalogue as the bundle: drop any stale override instead.
      window.localStorage.removeItem(CUSTOM_DISCIPLINES_KEY);
    } else {
      window.localStorage.setItem(
        CUSTOM_DISCIPLINES_KEY,
        JSON.stringify(input.disciplines),
      );
      summary.importedDisciplines = true;
      summary.disciplineCount = input.disciplines.disciplines.length;
    }
  }

  // normalizeStorage drops malformed entries instead of rejecting them.
  const current = loadStorage();
  saveStorage(
    normalizeStorage({
      progress: input.progress ?? current.progress,
      applied: input.applied ?? current.applied,
      pinned: input.pinned ?? current.pinned,
      hidden: input.hidden ?? current.hidden,
      events: input.events ?? current.events,
    }),
  );
  summary.importedProgress = input.progress !== undefined;
  summary.importedApplied = input.applied !== undefined;
  summary.importedPinned = input.pinned !== undefined;

  return summary;
}

/** Remove the custom discipline override; the next load uses the built-in catalogue. */
export function clearCustomDisciplines(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CUSTOM_DISCIPLINES_KEY);
}

/** Wipe progress only, keeping any custom catalogue and hidden disciplines. */
export function resetProgressOnly(): void {
  saveStorage({
    ...normalizeStorage(null),
    hidden: loadStorage().hidden,
  });
}

/** Wipe everything (progress + hidden + custom catalogue). */
export function resetAll(): void {
  saveStorage(normalizeStorage(null));
  clearCustomDisciplines();
}

export type { Discipline };
