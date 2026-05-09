import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDown,
  faArrowUp,
  faCloudArrowDown,
  faCloudArrowUp,
  faLinkSlash,
  faRotateLeft,
  faTrash,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import {
  applyImport,
  buildExportConfig,
  clearCustomDisciplines,
  downloadConfig,
  resetAll,
  resetProgressOnly,
  validateImport,
  type ExportedConfig,
  type ImportSummary,
} from "~/lib/configExport";
import {
  clearGistConfig,
  loadGistConfig,
  pullFromGist,
  pushToGist,
  saveGistConfig,
  swSkipWaiting,
  type GistSyncConfig,
} from "~/lib/gistSync";
import { IS_CUSTOM_CATALOGUE } from "~/data";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

type Banner =
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | null;

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [confirmReset, setConfirmReset] = useState<"none" | "progress" | "all">(
    "none",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gist sync state; loaded lazily on client.
  const [gist, setGist] = useState<GistSyncConfig | null>(null);
  const [gistTokenInput, setGistTokenInput] = useState("");
  const [gistIdInput, setGistIdInput] = useState("");
  const [gistBusy, setGistBusy] = useState<"idle" | "push" | "pull">("idle");

  useEffect(() => {
    setMounted(true);
    const g = loadGistConfig();
    if (g) {
      setGist(g);
      setGistTokenInput(g.token);
      setGistIdInput(g.gistId);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const flash = useCallback((b: Banner) => {
    setBanner(b);
    if (b) {
      setTimeout(() => setBanner(null), 4000);
    }
  }, []);

  const handleExport = useCallback(() => {
    try {
      downloadConfig(buildExportConfig());
      flash({ kind: "success", message: "Config exported." });
    } catch (err) {
      flash({
        kind: "error",
        message: `Export failed: ${(err as Error).message}`,
      });
    }
  }, [flash]);

  const handleImportFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as ExportedConfig;
        const err = validateImport(parsed);
        if (err) {
          flash({ kind: "error", message: `Invalid file: ${err}` });
          return;
        }
        const summary: ImportSummary = applyImport(parsed);
        const parts: string[] = [];
        if (summary.importedDisciplines)
          parts.push(`${summary.disciplineCount ?? 0} disciplines`);
        if (summary.importedProgress) parts.push("progress");
        if (summary.importedApplied) parts.push("applied");
        if (summary.importedProjects) parts.push("projects");
        const detail = parts.length > 0 ? parts.join(", ") : "nothing to apply";
        flash({
          kind: "success",
          message: `Imported ${detail}. Reloading…`,
        });
        // Full reload so the data module re-reads the custom catalogue.
        // Skip SW waiting first so the reload is served by the fresh bundle.
        swSkipWaiting().then(() => window.location.reload());
      } catch (err) {
        flash({
          kind: "error",
          message: `Import failed: ${(err as Error).message}`,
        });
      }
    },
    [flash],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleImportFile(file);
      // Reset so picking the same file twice re-fires onChange.
      e.target.value = "";
    },
    [handleImportFile],
  );

  const handleRevertDisciplines = useCallback(() => {
    clearCustomDisciplines();
    flash({
      kind: "success",
      message: "Reverted to built-in disciplines. Reloading…",
    });
    swSkipWaiting().then(() => window.location.reload());
  }, [flash]);

  const handleResetProgress = useCallback(() => {
    resetProgressOnly();
    setConfirmReset("none");
    flash({ kind: "success", message: "Progress cleared. Reloading…" });
    swSkipWaiting().then(() => window.location.reload());
  }, [flash]);

  const handleResetAll = useCallback(() => {
    resetAll();
    setConfirmReset("none");
    flash({
      kind: "success",
      message: "Everything cleared. Reloading…",
    });
    swSkipWaiting().then(() => window.location.reload());
  }, [flash]);

  const handleConnectGist = useCallback(() => {
    const token = gistTokenInput.trim();
    if (!token) {
      flash({
        kind: "error",
        message: "Paste a GitHub PAT with `gist` scope.",
      });
      return;
    }
    const next: GistSyncConfig = {
      token,
      gistId: gistIdInput.trim(),
    };
    saveGistConfig(next);
    setGist(next);
    flash({
      kind: "success",
      message: next.gistId
        ? "Gist sync connected."
        : "Token saved. Push to create a new private gist.",
    });
  }, [gistTokenInput, gistIdInput, flash]);

  const handleDisconnectGist = useCallback(() => {
    clearGistConfig();
    setGist(null);
    setGistTokenInput("");
    setGistIdInput("");
    flash({ kind: "success", message: "Gist sync disconnected." });
  }, [flash]);

  const handleGistPush = useCallback(async () => {
    setGistBusy("push");
    try {
      const { gistId } = await pushToGist();
      setGistIdInput(gistId);
      const updated = loadGistConfig();
      if (updated) setGist(updated);
      flash({ kind: "success", message: "Pushed config to gist." });
    } catch (err) {
      flash({ kind: "error", message: (err as Error).message });
    } finally {
      setGistBusy("idle");
    }
  }, [flash]);

  const handleGistPull = useCallback(async () => {
    setGistBusy("pull");
    try {
      const summary = await pullFromGist();
      const parts: string[] = [];
      if (summary.importedDisciplines)
        parts.push(`${summary.disciplineCount ?? 0} disciplines`);
      if (summary.importedProgress) parts.push("progress");
      if (summary.importedApplied) parts.push("applied");
      if (summary.importedProjects) parts.push("projects");
      flash({
        kind: "success",
        message: `Pulled ${parts.join(", ") || "config"}. Reloading…`,
      });
      await swSkipWaiting();
      window.location.reload();
    } catch (err) {
      flash({ kind: "error", message: (err as Error).message });
    } finally {
      setGistBusy("idle");
    }
  }, [flash]);

  if (!mounted || !open) return null;

  const node = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-xl rounded-2xl bg-brand-surface border border-brand-primary/10 shadow-xl overflow-hidden">
        <header className="flex items-center justify-between px-6 py-4 border-b border-brand-primary/10">
          <div>
            <h2
              id="settings-title"
              className="text-[15px] font-semibold text-brand-ink"
            >
              Settings
            </h2>
            <p className="text-[11.5px] text-brand-dim mt-0.5">
              Export, import, or reset your skill tracker config.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="inline-flex w-8 h-8 items-center justify-center rounded-md text-brand-muted hover:text-brand-ink hover:bg-brand-surface-2 transition-colors"
          >
            <FontAwesomeIcon icon={faXmark} className="text-[13px]" />
          </button>
        </header>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 flex flex-col gap-6">
          {banner && (
            <div
              className={`rounded-md px-3 py-2 text-[12px] ${
                banner.kind === "success"
                  ? "bg-brand-green/15 text-brand-green"
                  : "bg-brand-coral/15 text-brand-coral"
              }`}
              role="status"
            >
              {banner.message}
            </div>
          )}

          {/* Export / Import */}
          <section className="flex flex-col gap-3">
            <SectionTitle>Config</SectionTitle>
            <p className="text-[12px] text-brand-muted leading-relaxed">
              The exported JSON contains your current disciplines, per-skill
              progress, applied flags, and completed projects. Edit it by hand
              to adapt the tracker to any skill-based role, then import it back
              to replace the catalogue.
              {IS_CUSTOM_CATALOGUE && (
                <>
                  {" "}
                  <span className="inline-block mt-1 text-brand-primary font-medium">
                    Custom catalogue active.
                  </span>
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <ActionButton icon={faArrowDown} onClick={handleExport}>
                Export config
              </ActionButton>
              <ActionButton
                icon={faArrowUp}
                onClick={() => fileInputRef.current?.click()}
              >
                Import config
              </ActionButton>
              {IS_CUSTOM_CATALOGUE && (
                <ActionButton
                  icon={faRotateLeft}
                  onClick={handleRevertDisciplines}
                  variant="ghost"
                >
                  Revert to built-in
                </ActionButton>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={onFileChange}
                className="hidden"
              />
            </div>
          </section>

          {/* Gist sync */}
          <section className="flex flex-col gap-3">
            <SectionTitle>GitHub Gist sync</SectionTitle>
            <p className="text-[12px] text-brand-muted leading-relaxed">
              Sync across devices without a backend: push/pull your config to a
              private gist you own. Create a PAT at{" "}
              <a
                href="https://github.com/settings/tokens?type=beta"
                target="_blank"
                rel="noreferrer noopener"
                className="text-brand-primary hover:underline"
              >
                github.com/settings/tokens
              </a>{" "}
              with the <code className="font-mono">gist</code> scope.
            </p>
            {!gist ? (
              <div className="flex flex-col gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[10.5px] uppercase tracking-wide font-semibold text-brand-dim">
                    Personal access token
                  </span>
                  <input
                    type="password"
                    autoComplete="off"
                    placeholder="ghp_… or github_pat_…"
                    value={gistTokenInput}
                    onChange={(e) => setGistTokenInput(e.target.value)}
                    className="rounded-md bg-brand-surface-2 border border-brand-primary/10 px-2.5 py-1.5 text-[12px] font-mono text-brand-ink focus:outline-none focus:border-brand-primary/40"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10.5px] uppercase tracking-wide font-semibold text-brand-dim">
                    Gist id{" "}
                    <span className="text-brand-dim normal-case font-normal">
                      (optional — blank creates a new one)
                    </span>
                  </span>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="abc123def456…"
                    value={gistIdInput}
                    onChange={(e) => setGistIdInput(e.target.value)}
                    className="rounded-md bg-brand-surface-2 border border-brand-primary/10 px-2.5 py-1.5 text-[12px] font-mono text-brand-ink focus:outline-none focus:border-brand-primary/40"
                  />
                </label>
                <div>
                  <ActionButton
                    icon={faCloudArrowUp}
                    onClick={handleConnectGist}
                  >
                    Connect
                  </ActionButton>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="rounded-md bg-brand-surface-2 px-3 py-2 text-[11.5px] text-brand-muted flex flex-col gap-0.5">
                  <div>
                    <span className="text-brand-dim">Gist:</span>{" "}
                    <span className="font-mono text-brand-ink">
                      {gist.gistId || "(not created yet — push to create)"}
                    </span>
                  </div>
                  {gist.lastSyncedAt && (
                    <div>
                      <span className="text-brand-dim">Last synced:</span>{" "}
                      {new Date(gist.lastSyncedAt).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    icon={faCloudArrowUp}
                    onClick={handleGistPush}
                    disabled={gistBusy !== "idle"}
                  >
                    {gistBusy === "push" ? "Pushing…" : "Push to gist"}
                  </ActionButton>
                  <ActionButton
                    icon={faCloudArrowDown}
                    onClick={handleGistPull}
                    disabled={gistBusy !== "idle" || !gist.gistId}
                  >
                    {gistBusy === "pull" ? "Pulling…" : "Pull from gist"}
                  </ActionButton>
                  <ActionButton
                    icon={faLinkSlash}
                    onClick={handleDisconnectGist}
                    variant="ghost"
                  >
                    Disconnect
                  </ActionButton>
                </div>
              </div>
            )}
          </section>

          {/* Reset */}
          <section className="flex flex-col gap-3">
            <SectionTitle>Reset</SectionTitle>
            {confirmReset === "none" ? (
              <div className="flex flex-wrap gap-2">
                <ActionButton
                  icon={faTrash}
                  onClick={() => setConfirmReset("progress")}
                  variant="danger"
                >
                  Clear progress
                </ActionButton>
                <ActionButton
                  icon={faTrash}
                  onClick={() => setConfirmReset("all")}
                  variant="danger"
                >
                  Clear everything
                </ActionButton>
              </div>
            ) : (
              <div className="flex flex-col gap-2 rounded-md border border-brand-coral/40 bg-brand-coral/10 px-3 py-2.5">
                <p className="text-[12px] text-brand-ink">
                  {confirmReset === "progress"
                    ? "Clear all progress, applied flags, and project completion? Your custom catalogue (if any) will be kept."
                    : "Clear progress AND revert to built-in disciplines? This cannot be undone."}
                </p>
                <div className="flex gap-2">
                  <ActionButton
                    icon={faTrash}
                    onClick={
                      confirmReset === "progress"
                        ? handleResetProgress
                        : handleResetAll
                    }
                    variant="danger"
                  >
                    Confirm
                  </ActionButton>
                  <ActionButton
                    icon={faXmark}
                    onClick={() => setConfirmReset("none")}
                    variant="ghost"
                  >
                    Cancel
                  </ActionButton>
                </div>
              </div>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <SectionTitle>Schema</SectionTitle>
            <pre className="text-[10.5px] leading-relaxed bg-brand-surface-2 rounded-md p-3 overflow-x-auto text-brand-muted">
              {`{
  "version": 1,
  "disciplines": {
    "disciplines": [
      {
        "id": "design",
        "label": "Design",
        "kind": "role",
        "color": "#34d399",
        "sections": [
          {
            "id": "fundamentals",
            "label": "Fundamentals",
            "items": [
              { "id": "design:color-theory", "label": "Color Theory" }
            ]
          }
        ]
      }
    ]
  },
  "progress":     { "design:color-theory": "done" },
  "applied":      { "design:color-theory": true },
  "projectsDone": { "portfolio-website": true }
}`}
            </pre>
          </section>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-dim">
      {children}
    </div>
  );
}

type ActionVariant = "primary" | "ghost" | "danger";

interface ActionButtonProps {
  icon: typeof faArrowDown;
  children: React.ReactNode;
  onClick: () => void;
  variant?: ActionVariant;
  disabled?: boolean;
}

function ActionButton({
  icon,
  children,
  onClick,
  variant = "primary",
  disabled = false,
}: ActionButtonProps) {
  const base =
    "inline-flex items-center gap-2 text-[12px] font-medium rounded-md px-3 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const styles: Record<ActionVariant, string> = {
    primary: "bg-brand-primary/15 text-brand-primary hover:bg-brand-primary/25",
    ghost: "text-brand-muted hover:text-brand-ink hover:bg-brand-surface-2",
    danger: "bg-brand-coral/15 text-brand-coral hover:bg-brand-coral/25",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles[variant]}`}
    >
      <FontAwesomeIcon icon={icon} className="text-[11px]" />
      <span>{children}</span>
    </button>
  );
}
