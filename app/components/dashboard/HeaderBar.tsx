import { Link, useLocation } from "react-router";
import { Icon, type IconName } from "~/components/ui/Icon";
import { Pixel } from "~/components/ui/Pixel";
import { SecondaryButton } from "~/components/ui/SecondaryButton";
import { SettingsButton } from "~/components/ui/SettingsButton";

interface HeaderBarProps {
  title?: string;
  subtitle?: string;
  icon?: IconName;
  iconSize?: number;
}

export function HeaderBar({
  title,
  subtitle,
  icon = "Home",
  iconSize = 36,
}: HeaderBarProps) {
  const { pathname } = useLocation();
  const isDashboard = pathname === "/" || pathname === "/dashboard";

  const resolvedTitle = title ?? "Skill Tracker";
  const resolvedSubtitle =
    subtitle ??
    new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

  return (
    <div className="flex items-center justify-between mb-4">
      {/* Left — title */}
      <div className="flex items-center gap-3.5">
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
        <div>
          <div className="font-display text-[28px] font-bold text-ink tracking-[0.04em] leading-none">
            {resolvedTitle}
          </div>
          <Pixel color="ink-muted" size={13}>
            {resolvedSubtitle}
          </Pixel>
        </div>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-2.5">
        {isDashboard ? (
          <Link to="/browser">
            <SecondaryButton>Browse ▶</SecondaryButton>
          </Link>
        ) : (
          <Link to="/">
            <SecondaryButton>← Back</SecondaryButton>
          </Link>
        )}
        <SettingsButton />
      </div>
    </div>
  );
}
