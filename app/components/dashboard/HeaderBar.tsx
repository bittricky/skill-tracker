import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { Icon, type IconName } from "~/components/ui/Icon";
import { Pixel } from "~/components/ui/Pixel";
import { SecondaryButton } from "~/components/ui/SecondaryButton";
import { ThemeToggleButton } from "~/components/ui/ThemeToggleButton";
import { parseImport } from "~/lib/configExport";
import { relativeTime } from "~/lib/activity";
import type { StorageData } from "~/lib/storage";
import type { SyncStatus } from "~/lib/serverSync";
import { cn } from "~/lib/cn";

interface HeaderBarProps {
  title?: string;
  subtitle?: string;
  icon?: IconName;
  iconSize?: number;
  saveError?: boolean;
  syncStatus: SyncStatus;
  onExport: () => void;
  onImport: (data: StorageData) => void;
}

type Notice = { kind: "ok" | "error"; message: string } | null;

const ICON_BUTTON =
  "inline-flex w-9 h-9 items-center justify-center rounded-full text-ink-muted hover:text-ink hover:bg-surface-panel-hi transition-colors cursor-pointer";

const SYNC_META: Record<
  SyncStatus["state"],
  { icon: IconName; className: string; label: (at: string | null) => string }
> = {
  syncing: {
    icon: "Globe",
    className: "text-ink-muted animate-pulse",
    label: () => "Syncing with server…",
  },
  synced: {
    icon: "Check",
    className: "text-accent-teal",
    label: (at) => `Backed up to server${at ? ` ${relativeTime(at)}` : ""}`,
  },
  pending: {
    icon: "Upload",
    className: "text-accent-mustard",
    label: () =>
      "Not backed up yet — saved in this browser, will sync when the server is reachable",
  },
  error: {
    icon: "Cancel",
    className: "text-accent-coral",
    label: () => "Server backup failed — saved in this browser; will retry",
  },
  unavailable: {
    icon: "Unlink",
    className: "text-ink-dim",
    label: () => "No backup server — progress is saved in this browser only",
  },
};

export function HeaderBar({
  title,
  subtitle,
  icon = "Sparkle",
  iconSize = 36,
  saveError,
  syncStatus,
  onExport,
  onImport,
}: HeaderBarProps) {
  const { pathname } = useLocation();
  const isDashboard = pathname === "/" || pathname === "/dashboard";
  const fileRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const result = parseImport(await file.text());
    if (!result.ok) {
      setNotice({ kind: "error", message: `Import failed: ${result.error}` });
      return;
    }
    onImport(result.data);
    setNotice({ kind: "ok", message: "Backup merged into your progress." });
  };

  const resolvedTitle = title ?? "Skill Tracker";
  const resolvedSubtitle =
    subtitle ??
    new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  const sync = SYNC_META[syncStatus.state];
  const syncLabel = sync.label(syncStatus.lastSyncedAt);
  const serverHasIt =
    syncStatus.state === "synced" || syncStatus.state === "syncing";

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between gap-3">
        {/* Left — title */}
        <div className="flex items-center gap-3.5 min-w-0">
          {isDashboard ? (
            <Icon
              name={icon}
              color="var(--color-accent-mustard)"
              size={iconSize}
            />
          ) : (
            <Link to="/">
              <Icon
                name={icon}
                color="var(--color-accent-mustard)"
                size={iconSize}
              />
            </Link>
          )}
          <div className="min-w-0">
            <div className="font-display text-[28px] font-bold text-ink tracking-[0.04em] leading-none">
              {resolvedTitle}
            </div>
            <Pixel color="ink-muted" size={13}>
              {resolvedSubtitle}
            </Pixel>
          </div>
        </div>

        {/* Right — actions */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          {isDashboard ? (
            <Link to="/browser">
              <SecondaryButton>Browse ▶</SecondaryButton>
            </Link>
          ) : (
            <Link to="/">
              <SecondaryButton>◀ Dashboard</SecondaryButton>
            </Link>
          )}
          <button
            type="button"
            onClick={onExport}
            title="Export a backup (JSON)"
            aria-label="Export a backup"
            className={ICON_BUTTON}
          >
            <Icon name="Download" size={14} />
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title="Import a backup (merges into your progress)"
            aria-label="Import a backup"
            className={ICON_BUTTON}
          >
            <Icon name="Upload" size={14} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFile}
            className="hidden"
          />
          <span
            role="status"
            title={syncLabel}
            aria-label={syncLabel}
            className="inline-flex w-9 h-9 items-center justify-center"
          >
            <Icon name={sync.icon} size={13} className={sync.className} />
          </span>
          <ThemeToggleButton />
        </div>
      </div>

      {saveError && (
        <div
          role="alert"
          className="mt-2 rounded-md px-3 py-2 text-[12px] text-accent-coral bg-accent-coral/15 border border-accent-coral/30"
        >
          Couldn&apos;t save to this browser&apos;s storage — export a backup.
          {serverHasIt && " Your changes were sent to the server."}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className={cn(
            "mt-2 rounded-md px-3 py-2 text-[12px] border",
            notice.kind === "ok"
              ? "text-accent-teal bg-accent-teal/15 border-accent-teal/30"
              : "text-accent-coral bg-accent-coral/15 border-accent-coral/30",
          )}
        >
          {notice.message}
        </div>
      )}
    </div>
  );
}
