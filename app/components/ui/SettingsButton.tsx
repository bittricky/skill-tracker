import { SecondaryButton } from "./SecondaryButton";

interface SettingsButtonProps {
  onClick: () => void;
}

export function SettingsButton({ onClick }: SettingsButtonProps) {
  return (
    <SecondaryButton onClick={onClick}>
      <span className="flex items-center gap-1.5">
        <span className="text-sm">⚙</span>
        <span>Settings</span>
      </span>
    </SecondaryButton>
  );
}
