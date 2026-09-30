import { useState } from "react";
import { Icon, ICONS } from "./Icon";
import { SettingsModal } from "./SettingsModal";

interface SettingsButtonProps {
  className?: string;
  hidden?: string[];
  onSetHidden?: (id: string, hidden: boolean) => void;
  saveError?: boolean;
}

/**
 * Gear icon that opens the Settings modal (export / import / reset).
 */
export function SettingsButton({
  className = "",
  hidden,
  onSetHidden,
  saveError = false,
}: SettingsButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={
          saveError
            ? "Settings — changes aren't being saved to browser storage"
            : "Settings"
        }
        aria-label="Open settings"
        className={`relative inline-flex w-9 h-9 items-center justify-center rounded-full text-brand-muted hover:text-brand-ink hover:bg-brand-surface-2 transition-colors ${className}`}
      >
        <Icon name={ICONS.settings} size={13} />
        {saveError && (
          <span
            className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent-coral"
            aria-hidden="true"
          />
        )}
      </button>
      <SettingsModal
        open={open}
        onClose={() => setOpen(false)}
        hidden={hidden}
        onSetHidden={onSetHidden}
        saveError={saveError}
      />
    </>
  );
}
