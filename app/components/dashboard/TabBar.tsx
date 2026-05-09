import { TabButton } from "~/components/ui/TabButton";
import { Pixel } from "~/components/ui/Pixel";

type TabId = "overview" | "matrix" | "sessions" | "resources";

interface TabBarProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

const TABS = [
  { id: "overview" as TabId, label: "Overview", color: "var(--color-accent-mustard)" },
  { id: "matrix" as TabId, label: "Skill Matrix", color: "var(--color-accent-teal)" },
  { id: "sessions" as TabId, label: "Sessions", color: "var(--color-accent-coral)" },
  { id: "resources" as TabId, label: "Resources", color: "var(--color-accent-lavender)" },
];

export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <div className="flex items-center gap-1.5 mb-4">
      <Pixel color="ink-dim" size={16}>◀</Pixel>
      {TABS.map((t) => (
        <TabButton
          key={t.id}
          active={active === t.id}
          color={t.color}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </TabButton>
      ))}
      <Pixel color="ink-dim" size={16}>▶</Pixel>

      <div className="ml-auto flex gap-2">
        <button
          className="font-display text-sm tracking-[0.04em] uppercase px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-150"
          style={{
            background: "var(--color-surface-panel-lo)",
            color: "var(--color-ink-muted)",
            border: "1px solid var(--color-surface-border)",
          }}
        >
          ⚙ Settings
        </button>
      </div>
    </div>
  );
}
