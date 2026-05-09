import { Keycap } from "~/components/ui/Keycap";
import { Pixel } from "~/components/ui/Pixel";

export function FooterHints() {
  const hints = [
    { key: "TAB", label: "Switch view" },
    { key: "N", label: "New session" },
    { key: "F", label: "Filter" },
    { key: "/", label: "Search" },
  ];

  return (
    <div
      className="flex justify-between items-center mt-4 px-[18px] py-2.5 rounded-md"
      style={{
        background: "var(--color-surface-inset)",
        border: "1px solid var(--color-surface-bg-deep)",
        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.4), inset 0 -1px 0 rgba(45,51,74,0.25)",
      }}
    >
      <div className="flex gap-4">
        {hints.map((h) => (
          <span key={h.key} className="flex items-center gap-1.5">
            <Keycap label={h.key} />
            <Pixel size={12} color="ink-muted">{h.label}</Pixel>
          </span>
        ))}
      </div>
      <Pixel size={12} color="ink-dim">v0.3.0 · single player</Pixel>
    </div>
  );
}
