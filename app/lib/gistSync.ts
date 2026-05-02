/**
 * GitHub Gist sync for cross-device config portability.
 *
 * Model
 * -----
 * The user provides a Personal Access Token (classic or fine-grained) with
 * the `gist` scope. We create (or update) a single private gist that holds
 * one file, `skill-tracker-config.json`, whose contents are the same shape
 * produced by `buildExportConfig()`.
 *
 * The PAT + gist id are stored in `localStorage` under
 * `skill-tracker:gist-sync`. This is sufficient for a single-user personal
 * tracker; do not use this on a shared device.
 *
 * API surface
 * -----------
 *   loadGistConfig()          -> { token, gistId } | null
 *   saveGistConfig(cfg)       -> void
 *   clearGistConfig()         -> void
 *   pushToGist()              -> updates (or creates) the gist from local state
 *   pullFromGist()            -> applies the gist contents to local storage
 */

import {
  applyImport,
  buildExportConfig,
  validateImport,
  type ExportedConfig,
  type ImportSummary,
} from "./configExport";

export const GIST_SYNC_KEY = "skill-tracker:gist-sync";
export const GIST_FILENAME = "skill-tracker-config.json";

export interface GistSyncConfig {
  token: string;
  /** Empty string until the first push creates a gist. */
  gistId: string;
  /** ISO timestamp of the last successful push or pull. */
  lastSyncedAt?: string;
}

export function loadGistConfig(): GistSyncConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GIST_SYNC_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GistSyncConfig;
    if (!parsed || typeof parsed.token !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveGistConfig(cfg: GistSyncConfig): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GIST_SYNC_KEY, JSON.stringify(cfg));
}

export function clearGistConfig(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(GIST_SYNC_KEY);
}

async function gistFetch(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  return res;
}

function errorFromResponse(res: Response, fallback: string): Error {
  if (res.status === 401)
    return new Error("GitHub rejected the token (401). Check the PAT and that it has 'gist' scope.");
  if (res.status === 403)
    return new Error("GitHub denied the request (403). Is the 'gist' scope enabled?");
  if (res.status === 404)
    return new Error("Gist not found (404). It may have been deleted; try pushing to create a new one.");
  return new Error(`${fallback} (HTTP ${res.status})`);
}

/**
 * Push the current local state up to the user's gist, creating the gist
 * on the first push. Returns the gist id and the full config sent.
 */
export async function pushToGist(): Promise<{
  gistId: string;
  config: ExportedConfig;
}> {
  const cfg = loadGistConfig();
  if (!cfg || !cfg.token) throw new Error("No gist sync token configured.");

  const config = buildExportConfig();
  const body = JSON.stringify({
    description: "Skill Tracker config (managed by skill-tracker web app)",
    public: false,
    files: {
      [GIST_FILENAME]: {
        content: JSON.stringify(config, null, 2),
      },
    },
  });

  const isUpdate = cfg.gistId.length > 0;
  const res = await gistFetch(isUpdate ? `/gists/${cfg.gistId}` : "/gists", cfg.token, {
    method: isUpdate ? "PATCH" : "POST",
    body,
  });
  if (!res.ok) throw errorFromResponse(res, isUpdate ? "Gist update failed" : "Gist create failed");

  const json = (await res.json()) as { id: string };
  const nextGistId = json.id ?? cfg.gistId;
  saveGistConfig({
    token: cfg.token,
    gistId: nextGistId,
    lastSyncedAt: new Date().toISOString(),
  });
  return { gistId: nextGistId, config };
}

/**
 * Pull the stored gist's contents and apply them locally. Caller should
 * reload the page after a successful pull so the data module re-reads
 * any custom catalogue.
 */
export async function pullFromGist(): Promise<ImportSummary> {
  const cfg = loadGistConfig();
  if (!cfg || !cfg.token) throw new Error("No gist sync token configured.");
  if (!cfg.gistId) throw new Error("No gist id yet — push first to create one.");

  const res = await gistFetch(`/gists/${cfg.gistId}`, cfg.token);
  if (!res.ok) throw errorFromResponse(res, "Gist fetch failed");

  const json = (await res.json()) as {
    files: Record<string, { content?: string } | undefined>;
  };
  const file = json.files?.[GIST_FILENAME];
  if (!file || !file.content)
    throw new Error(`Gist is missing the "${GIST_FILENAME}" file.`);

  let parsed: ExportedConfig;
  try {
    parsed = JSON.parse(file.content) as ExportedConfig;
  } catch (e) {
    throw new Error(`Gist contents aren't valid JSON: ${(e as Error).message}`);
  }
  const err = validateImport(parsed);
  if (err) throw new Error(`Gist contents invalid: ${err}`);

  const summary = applyImport(parsed);
  saveGistConfig({
    token: cfg.token,
    gistId: cfg.gistId,
    lastSyncedAt: new Date().toISOString(),
  });
  return summary;
}
