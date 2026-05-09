import { SpriteIcon } from "~/components/ui/SpriteIcon";
import { Pixel } from "~/components/ui/Pixel";
import { Mono } from "~/components/ui/Mono";
import { PrimaryButton } from "~/components/ui/PrimaryButton";

interface HeaderBarProps {
  done: number;
  applied: number;
  learning: number;
  projects: number;
}

export function HeaderBar({ done, applied, learning, projects }: HeaderBarProps) {
  // Calculate mock level based on done skills (simplified)
  const level = Math.floor(done / 20) + 1;
  const xp = done * 10 + applied * 5;
  const xpToNext = level * 200;
  const streak = 4; // Mock streak

  // Format date
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex items-center justify-between mb-4">
      {/* Left — title */}
      <div className="flex items-center gap-3.5">
        <SpriteIcon glyph="◆" color="var(--color-accent-mustard)" size={44} />
        <div>
          <div
            className="font-display text-[28px] font-bold text-ink tracking-[0.04em] leading-none"
          >
            Skill Tracker
          </div>
          <Pixel color="ink-muted" size={13}>
            The Adventurer's Journal · {today}
          </Pixel>
        </div>
      </div>

      {/* Right — level + streak + CTA */}
      <div className="flex items-center gap-2.5">
        <div
          className="flex items-center gap-3 px-3.5 py-2 rounded-md"
          style={{
            background: "var(--color-surface-inset)",
            border: "1px solid var(--color-surface-bg-deep)",
            boxShadow: "var(--shadow-inset)",
          }}
        >
          <span>
            <Pixel color="ink-muted" size={11}>LV</Pixel>{" "}
            <Mono size={16} color="mustard" weight={600}>{level}</Mono>
          </span>
          <span className="w-px h-4" style={{ background: "var(--color-surface-divider)" }} />
          <span>
            <Pixel color="ink-muted" size={11}>XP</Pixel>{" "}
            <Mono size={13} color="ink">{xp.toLocaleString()}</Mono>{" "}
            <Mono size={11} color="ink-dim">/ {xpToNext.toLocaleString()}</Mono>
          </span>
          <span className="w-px h-4" style={{ background: "var(--color-surface-divider)" }} />
          <span>
            <Pixel color="ink-muted" size={11}>STREAK</Pixel>{" "}
            <Mono size={13} color="coral">{streak}d</Mono>
          </span>
        </div>

        <PrimaryButton icon="▶">
          Start Session
        </PrimaryButton>
      </div>
    </div>
  );
}
