import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Panel, PanelHeader, PanelBody } from "~/components/ui/Panel";
import { Pixel } from "~/components/ui/Pixel";
import { Mono } from "~/components/ui/Mono";
import { SecondaryButton, PrimaryButton } from "~/components/ui";
import { cn } from "~/lib/cn";
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

// Glyph icons for cozy aesthetic
const GLYPHS = {
  download: "▼",
  upload: "▲",
  revert: "↺",
  cloudUp: "☁↑",
  cloudDown: "☁↓",
  unlink: "⊘",
  trash: "✕",
  close: "✕",
  check: "✓",
};

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [confirmReset, setConfirmReset] = useState<"none" | "progress" | "all">(
    "none",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gist sync state
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
    if (b) setTimeout(() => setBanner(null), 4000);
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
          flash({ kind: "error", message: `Import failed: ${err}` });
          return;
        }
        applyImport(parsed);
        await swSkipWaiting();
        window.location.reload();
      } catch (e) {
        flash({
          kind: "error",
          message: `Import failed: ${(e as Error).message}`,
        });
      }
    },
    [flash],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      void handleImportFile(file);
      e.target.value = "";
    },
    [handleImportFile],
  );

  const handleRevertDisciplines = useCallback(async () => {
    try {
      clearCustomDisciplines();
      await swSkipWaiting();
      window.location.reload();
    } catch (err) {
      flash({ kind: "error", message: (err as Error).message });
    }
  }, [flash]);

  const handleConnectGist = useCallback(async () => {
    try {
      saveGistConfig({
        token: gistTokenInput.trim(),
        gistId: gistIdInput.trim(),
      });
      const cfg = loadGistConfig();
      if (cfg) {
        setGist(cfg);
        flash({ kind: "success", message: "Gist connected." });
      }
    } catch (err) {
      flash({ kind: "error", message: (err as Error).message });
    }
  }, [gistTokenInput, gistIdInput, flash]);

  const handleDisconnectGist = useCallback(async () => {
    clearGistConfig();
    setGist(null);
    setGistTokenInput("");
    setGistIdInput("");
    flash({ kind: "success", message: "Disconnected." });
  }, [flash]);

  const handleGistPush = useCallback(async () => {
    setGistBusy("push");
    try {
      const result = await pushToGist();
      setGist({
        token: gist?.token ?? gistTokenInput,
        gistId: result.gistId,
        lastSyncedAt: new Date().toISOString(),
      });
      flash({ kind: "success", message: "Pushed to Gist." });
    } catch (err) {
      flash({ kind: "error", message: (err as Error).message });
    } finally {
      setGistBusy("idle");
    }
  }, [gist, gistTokenInput, flash]);

  const handleResetProgress = useCallback(async () => {
    try {
      resetProgressOnly();
      await swSkipWaiting();
      window.location.reload();
    } catch (err) {
      flash({ kind: "error", message: (err as Error).message });
    }
  }, [flash]);

  const handleResetAll = useCallback(async () => {
    try {
      resetAll();
      await swSkipWaiting();
      window.location.reload();
    } catch (err) {
      flash({ kind: "error", message: (err as Error).message });
    } finally {
      setGistBusy("idle");
    }
  }, [flash]);

  const handleGistPull = useCallback(async () => {
    setGistBusy("pull");
    try {
      await pullFromGist();
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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl rounded-xl overflow-hidden"
        style={{
          background: "var(--color-surface-panel)",
          border: "1px solid var(--color-surface-border)",
          boxShadow: "var(--shadow-raised)",
        }}
      >
        {/* Header */}
        <header
          className="flex items-center justify-between px-5 py-3.5 border-b"
          style={{ borderColor: "var(--color-surface-divider)" }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-accent-mustard">◆</span>
              <h2
                id="settings-title"
                className="font-display text-lg font-bold tracking-[0.04em] uppercase"
                style={{ color: "var(--color-ink)" }}
              >
                Settings
              </h2>
            </div>
            <Pixel size={12} color="ink-muted">
              Export, import, or reset your skill tracker config
            </Pixel>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="inline-flex w-8 h-8 items-center justify-center rounded-md transition-colors hover:bg-surface-panel-hi"
            style={{ color: "var(--color-ink-muted)" }}
          >
            <span className="text-lg">✕</span>
          </button>
        </header>

        {/* Body */}
        <div
          className="max-h-[70vh] overflow-y-auto px-5 py-4 flex flex-col gap-4"
          style={{ background: "var(--color-surface-bg)" }}
        >
          {/* Banner */}
          {banner && (
            <div
              className="rounded-md px-3 py-2 text-[12px]"
              style={{
                background:
                  banner.kind === "success"
                    ? "rgba(92, 184, 168, 0.15)"
                    : "rgba(232, 117, 85, 0.15)",
                color:
                  banner.kind === "success"
                    ? "var(--color-accent-teal)"
                    : "var(--color-accent-coral)",
                border: `1px solid ${
                  banner.kind === "success"
                    ? "rgba(92, 184, 168, 0.3)"
                    : "rgba(232, 117, 85, 0.3)"
                }`,
              }}
              role="status"
            >
              {banner.message}
            </div>
          )}

          {/* Config Panel */}
          <Panel>
            <PanelHeader title="Config" glyph="▼" accentColor="mustard" />
            <PanelBody>
              <Pixel size={12} color="ink-muted" className="mb-3">
                The exported JSON contains your current disciplines, per-skill
                progress, applied flags, and completed projects.
                {IS_CUSTOM_CATALOGUE && (
                  <span
                    className="block mt-1"
                    style={{ color: "var(--color-accent-mustard)" }}
                  >
                    Custom catalogue active.
                  </span>
                )}
              </Pixel>
              <div className="flex flex-wrap gap-2">
                <ActionButton glyph={GLYPHS.download} onClick={handleExport}>
                  Export config
                </ActionButton>
                <ActionButton
                  glyph={GLYPHS.upload}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Import config
                </ActionButton>
                {IS_CUSTOM_CATALOGUE && (
                  <ActionButton
                    glyph={GLYPHS.revert}
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
            </PanelBody>
          </Panel>

          {/* Gist Sync Panel */}
          <Panel>
            <PanelHeader
              title="GitHub Gist Sync"
              glyph="☁"
              accentColor="lavender"
            />
            <PanelBody>
              <Pixel size={12} color="ink-muted" className="mb-3">
                Sync across devices without a backend. Create a PAT at{" "}
                <a
                  href="https://github.com/settings/tokens?type=beta"
                  target="_blank"
                  rel="noreferrer noopener"
                  style={{ color: "var(--color-accent-mustard)" }}
                  className="hover:underline"
                >
                  github.com/settings/tokens
                </a>{" "}
                with the <Mono size={11}>gist</Mono> scope.
              </Pixel>

              {!gist ? (
                <div className="flex flex-col gap-3">
                  <InputGroup label="Personal access token">
                    <input
                      type="password"
                      autoComplete="off"
                      placeholder="ghp_… or github_pat_…"
                      value={gistTokenInput}
                      onChange={(e) => setGistTokenInput(e.target.value)}
                      className="w-full font-mono text-xs"
                    />
                  </InputGroup>
                  <InputGroup label="Gist id (optional — blank creates new)">
                    <input
                      type="text"
                      autoComplete="off"
                      placeholder="abc123def456…"
                      value={gistIdInput}
                      onChange={(e) => setGistIdInput(e.target.value)}
                      className="w-full font-mono text-xs"
                    />
                  </InputGroup>
                  <div>
                    <PrimaryButton onClick={handleConnectGist}>
                      {GLYPHS.cloudUp} Connect
                    </PrimaryButton>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div
                    className="rounded-md px-3 py-2 text-[11px]"
                    style={{
                      background: "var(--color-surface-inset)",
                      border: "1px solid var(--color-surface-bg-deep)",
                      boxShadow: "var(--shadow-inset)",
                    }}
                  >
                    <div className="flex flex-col gap-1">
                      <div>
                        <Pixel size={11} color="ink-dim">
                          Gist:
                        </Pixel>{" "}
                        <Mono size={12} color="ink">
                          {gist.gistId || "(not created yet — push to create)"}
                        </Mono>
                      </div>
                      {gist.lastSyncedAt && (
                        <div>
                          <Pixel size={11} color="ink-dim">
                            Last synced:
                          </Pixel>{" "}
                          <Mono size={12} color="ink">
                            {new Date(gist.lastSyncedAt).toLocaleString()}
                          </Mono>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ActionButton
                      glyph={GLYPHS.cloudUp}
                      onClick={handleGistPush}
                      disabled={gistBusy !== "idle"}
                    >
                      {gistBusy === "push" ? "Pushing…" : "Push to gist"}
                    </ActionButton>
                    <ActionButton
                      glyph={GLYPHS.cloudDown}
                      onClick={handleGistPull}
                      disabled={gistBusy !== "idle" || !gist.gistId}
                    >
                      {gistBusy === "pull" ? "Pulling…" : "Pull from gist"}
                    </ActionButton>
                    <ActionButton
                      glyph={GLYPHS.unlink}
                      onClick={handleDisconnectGist}
                      variant="ghost"
                    >
                      Disconnect
                    </ActionButton>
                  </div>
                </div>
              )}
            </PanelBody>
          </Panel>

          {/* Reset Panel */}
          <Panel>
            <PanelHeader title="Reset" glyph="✕" accentColor="coral" />
            <PanelBody>
              {confirmReset === "none" ? (
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    glyph={GLYPHS.trash}
                    onClick={() => setConfirmReset("progress")}
                    variant="danger"
                  >
                    Clear progress
                  </ActionButton>
                  <ActionButton
                    glyph={GLYPHS.trash}
                    onClick={() => setConfirmReset("all")}
                    variant="danger"
                  >
                    Clear everything
                  </ActionButton>
                </div>
              ) : (
                <div
                  className="rounded-md px-3 py-2.5"
                  style={{
                    background: "rgba(232, 117, 85, 0.1)",
                    border: "1px solid rgba(232, 117, 85, 0.3)",
                  }}
                >
                  <Pixel size={12} color="ink" className="mb-2">
                    {confirmReset === "progress"
                      ? "Clear all progress, applied flags, and project completion? Your custom catalogue will be kept."
                      : "Clear progress AND revert to built-in disciplines? This cannot be undone."}
                  </Pixel>
                  <div className="flex gap-2">
                    <ActionButton
                      glyph={GLYPHS.trash}
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
                      glyph={GLYPHS.close}
                      onClick={() => setConfirmReset("none")}
                      variant="ghost"
                    >
                      Cancel
                    </ActionButton>
                  </div>
                </div>
              )}
            </PanelBody>
          </Panel>

          {/* Schema Panel */}
          <Panel>
            <PanelHeader title="Schema" glyph="▤" accentColor="teal" />
            <PanelBody>
              <pre
                className="text-[10px] leading-relaxed p-3 rounded-md overflow-x-auto"
                style={{
                  background: "var(--color-surface-inset)",
                  border: "1px solid var(--color-surface-bg-deep)",
                  boxShadow: "var(--shadow-inset)",
                  color: "var(--color-ink-muted)",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {`{
  "version": 1,
  "disciplines": { … },
  "progress": { "skill:id": "done" },
  "applied": { "skill:id": true },
  "projectsDone": { "project-id": true }
}`}
              </pre>
            </PanelBody>
          </Panel>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

// Input group with cozy inset styling
function InputGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <Pixel size={11} color="ink-dim">
        {label}
      </Pixel>
      <div
        style={{
          background: "var(--color-surface-inset)",
          border: "1px solid var(--color-surface-bg-deep)",
          boxShadow: "var(--shadow-inset)",
          borderRadius: 6,
          padding: "8px 12px",
        }}
      >
        {children}
      </div>
    </label>
  );
}

// Cozy action button
interface ActionButtonProps {
  glyph: string;
  children: React.ReactNode;
  onClick: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
}

function ActionButton({
  glyph,
  children,
  onClick,
  variant = "primary",
  disabled = false,
}: ActionButtonProps) {
  const colors = {
    primary: {
      bg: "rgba(232, 176, 74, 0.15)",
      text: "var(--color-accent-mustard)",
      border: "rgba(232, 176, 74, 0.3)",
    },
    ghost: {
      bg: "transparent",
      text: "var(--color-ink-muted)",
      border: "var(--color-surface-border)",
    },
    danger: {
      bg: "rgba(232, 117, 85, 0.15)",
      text: "var(--color-accent-coral)",
      border: "rgba(232, 117, 85, 0.3)",
    },
  };
  const c = colors[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-display font-semibold tracking-[0.04em] uppercase rounded-md px-3 py-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
        "hover:-translate-y-px",
      )}
      style={{
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
      }}
    >
      <span>{glyph}</span>
      <span>{children}</span>
    </button>
  );
}
