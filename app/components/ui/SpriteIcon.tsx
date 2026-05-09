interface SpriteIconProps {
  glyph: string;
  color: string;
  size?: 32 | 36 | 40 | 44;
}

export function SpriteIcon({ glyph, color, size = 40 }: SpriteIconProps) {
  return (
    <div
      className="flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        background: "var(--color-surface-inset)",
        border: "1px solid var(--color-surface-bg-deep)",
        borderRadius: 4,
        boxShadow: "inset 0 1px 1px rgba(0,0,0,0.4), inset 0 -1px 0 rgba(45,51,74,0.3)",
      }}
    >
      <span
        className="font-display leading-none"
        style={{
          fontSize: size * 0.5,
          color,
        }}
      >
        {glyph}
      </span>
    </div>
  );
}
