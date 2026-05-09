import { Panel, PanelHeader, PanelBody } from "~/components/ui/Panel";
import { ItemSlot } from "~/components/ui/ItemSlot";
import { SpriteIcon } from "~/components/ui/SpriteIcon";
import { Mono } from "~/components/ui/Mono";
import { Pixel } from "~/components/ui/Pixel";

// Mock resource data
const RESOURCES = [
  { id: "r1", code: "EDU", label: "Educative", count: 12, active: 3, color: "var(--color-accent-teal)" },
  { id: "r2", code: "UDM", label: "Udemy", count: 8, active: 1, color: "var(--color-accent-coral)" },
  { id: "r3", code: "YT", label: "YouTube", count: 23, active: 5, color: "var(--color-accent-rose)" },
  { id: "r4", code: "BK", label: "Books", count: 6, active: 1, color: "var(--color-accent-mustard)" },
  { id: "r5", code: "DOC", label: "Articles", count: 47, active: 8, color: "var(--color-accent-lavender)" },
  { id: "r6", code: "RM", label: "Roadmap", count: 14, active: 2, color: "var(--color-accent-teal)" },
];

export function ResourceInventory() {
  const totalItems = RESOURCES.reduce((a, r) => a + r.count, 0);
  const totalActive = RESOURCES.reduce((a, r) => a + r.active, 0);

  return (
    <Panel>
      <PanelHeader
        title="Learning Sources"
        subtitle={`${totalItems} items · ${totalActive} in progress`}
        accentColor="rose"
        glyph="▤"
      />
      <PanelBody>
        <div className="grid grid-cols-2 gap-2">
          {RESOURCES.map((r) => (
            <ItemSlot
              key={r.id}
              hoverColor={r.color}
            >
              <div className="flex items-center gap-2.5">
                <SpriteIcon glyph={r.code.charAt(0)} color={r.color} size={36} />
                <div className="flex-1 min-w-0">
                  <Mono size={12} color="ink" weight={600}>{r.label}</Mono>
                  <div className="flex justify-between items-center mt-1">
                    <Pixel size={11} color="ink-muted">{r.count} items</Pixel>
                    {r.active > 0 ? (
                      <span
                        className="font-display text-[11px] font-semibold tracking-[0.04em] uppercase px-1.5 py-0.5 rounded"
                        style={{
                          background: `${r.color}22`,
                          border: `1px solid ${r.color}55`,
                          color: r.color,
                        }}
                      >
                        {r.active} ACTIVE
                      </span>
                    ) : (
                      <Pixel size={10} color="ink-dim">—</Pixel>
                    )}
                  </div>
                </div>
              </div>
            </ItemSlot>
          ))}

          <button
            className="col-span-2 font-display text-sm tracking-[0.04em] uppercase py-2.5 px-3.5 rounded cursor-pointer transition-all text-center"
            style={{
              background: "transparent",
              border: "1px dashed var(--color-surface-border)",
              color: "var(--color-ink-muted)",
            }}
          >
            + Connect new source
          </button>
        </div>
      </PanelBody>
    </Panel>
  );
}
