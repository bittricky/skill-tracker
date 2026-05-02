import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear } from "@fortawesome/free-solid-svg-icons";
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
        <FontAwesomeIcon icon={faGear} className="text-[13px]" />
      </button>
      <SettingsModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
