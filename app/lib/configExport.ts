/**
 * JSON export / import of the user's progress.
 *
 * The export is `{ version, exportedAt, source, progress, applied, hidden,
 * events, checkins, updatedAt }`. Import validates the shape, then
 * normalizes it (malformed entries are dropped, not fatal); the caller
 * merges the result into the current state with `mergeStorage`, so
 * importing can never lose data. Older exports that embed a `disciplines`
 * catalogue or a `pinned` list still import — those keys are ignored.
 */

import {
  loadStorage,
  normalizeStorage,
  type AppliedMap,
  type CheckinMap,
  type ProgressEvent,
  type ProgressMap,
  type StorageData,
} from "./storage";

export const CONFIG_VERSION = 3;

export interface ExportedConfig {
  version: number;
  exportedAt: string;
  source: "skill-tracker";
  progress?: ProgressMap;
  applied?: AppliedMap;
  hidden?: string[];
  events?: ProgressEvent[];
  checkins?: CheckinMap;
  updatedAt?: string;
}

/** Build an export document from the persisted state. */
export function buildExportConfig(
  data: StorageData = loadStorage(),
): ExportedConfig {
  return {
    version: CONFIG_VERSION,
    exportedAt: new Date().toISOString(),
    source: "skill-tracker",
    ...data,
  };
}

/** Trigger a browser download of the given config JSON. */
export function downloadConfig(config: ExportedConfig, filename?: string) {
  const name =
    filename ??
    `skill-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
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

/**
 * Validate an imported document. Returns an error message, or `null` when
 * the payload is acceptable. Every section is optional.
 */
export function validateImport(input: unknown): string | null {
  if (!isRecord(input)) return "expected a JSON object";
  if (input.version !== undefined) {
    if (typeof input.version !== "number") return "version: expected a number";
    if (input.version < 1 || input.version > CONFIG_VERSION)
      return `version: expected 1–${CONFIG_VERSION}`;
  }
  for (const key of ["progress", "applied", "checkins"] as const)
    if (input[key] !== undefined && !isRecord(input[key]))
      return `${key}: expected an object`;
  for (const key of ["hidden", "events"] as const)
    if (input[key] !== undefined && !Array.isArray(input[key]))
      return `${key}: expected an array`;
  return null;
}

/** Parse + validate + normalize an import file's text. */
export function parseImport(
  text: string,
): { ok: true; data: StorageData } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: `not valid JSON: ${(e as Error).message}` };
  }
  const err = validateImport(parsed);
  if (err) return { ok: false, error: err };
  return { ok: true, data: normalizeStorage(parsed) };
}
