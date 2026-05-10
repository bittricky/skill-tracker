import { useState } from "react";
import { Icon, ICONS } from "./Icon";
import { SettingsModal } from "./SettingsModal";

interface SettingsButtonProps {
  className?: string;
}

/**
 * Gear icon that opens the Settings modal (export / import / reset).
 */
export function SettingsButton({ className = "" }: SettingsButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Settings"
        aria-label="Open settings"
        className={`inline-flex w-9 h-9 items-center justify-center rounded-full text-brand-muted hover:text-brand-ink hover:bg-brand-surface-2 transition-colors ${className}`}
      >
        <Icon name={ICONS.settings} size={13} />
      </button>
      <SettingsModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
