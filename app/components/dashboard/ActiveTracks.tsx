import { useMemo } from "react";
import { Panel, PanelHeader, PanelBody } from "~/components/ui/Panel";
import { ItemSlot } from "~/components/ui/ItemSlot";
import { Icon } from "~/components/ui/Icon";
import { Mono } from "~/components/ui/Mono";
import { Pixel } from "~/components/ui/Pixel";
import { ProgressBar } from "~/components/ui/ProgressBar";
import { TierTag } from "~/components/ui/TierTag";
import type { Discipline, Skill } from "~/data";
import type { ProgressMap } from "~/lib/storage";

interface ActiveTracksProps {
  disciplines: Discipline[];
  progress: ProgressMap;
}

interface ActiveItem {
  id: string;
  label: string;
  discipline: string;
  progress: number;
  tier: "exploring" | "practicing" | "fluent";
  skill: Skill;
}

export function ActiveTracks({ disciplines, progress }: ActiveTracksProps) {
  // Derive active tracks from learning status skills
  const activeItems = useMemo<ActiveItem[]>(() => {
    const items: ActiveItem[] = [];
    for (const d of disciplines) {
      for (const sec of d.sections) {
        for (const skill of sec.items) {
          const status = progress[skill.id];
          if (status === "learning" && items.length < 3) {
            // Calculate progress based on prerequisites
            const totalPrereqs = skill.prerequisites?.length || 0;
            const donePrereqs =
              skill.prerequisites?.filter((p) => progress[p] === "done")
                .length || 0;
            const pct =
              totalPrereqs > 0
                ? Math.round((donePrereqs / totalPrereqs) * 100)
                : 50;

            // Determine tier based on done count in discipline
            const doneCount = d.sections.reduce(
              (acc, s) =>
                acc + s.items.filter((i) => progress[i.id] === "done").length,
              0,
            );
            const totalCount = d.sections.reduce(
              (acc, s) => acc + s.items.length,
              0,
            );
            const donePct = doneCount / totalCount;
            let tier: "exploring" | "practicing" | "fluent" = "exploring";
            if (donePct > 0.7) tier = "fluent";
            else if (donePct > 0.3) tier = "practicing";

            items.push({
              id: skill.id,
              label: skill.label,
              discipline: d.label,
              progress: pct,
              tier,
              skill,
            });
          }
        }
      }
    }
    return items;
  }, [disciplines, progress]);

  const tierColorMap: Record<string, string> = {
    exploring: "var(--color-accent-coral)",
    practicing: "var(--color-accent-mustard)",
    fluent: "var(--color-accent-teal)",
  };

  return (
    <Panel>
      <PanelHeader
        title="Active Tracks"
        subtitle="What you're working on right now"
        meta={`${activeItems.length} / 3 slots`}
        accentColor="coral"
        glyph="Briefcase"
      />
      <PanelBody>
        <div className="grid grid-cols-3 gap-2.5">
          {activeItems.map((item) => (
            <ItemSlot key={item.id} hoverColor={tierColorMap[item.tier]}>
              <div className="flex gap-2.5 mb-3">
                <Icon
                  name="Sparkle"
                  color={tierColorMap[item.tier]}
                  size={24}
                />
                <div className="flex-1 min-w-0">
                  <Mono
                    size={13}
                    color="ink"
                    weight={600}
                    className="block leading-tight mb-1"
                  >
                    {item.label}
                  </Mono>
                  <Pixel color="ink-muted" size={12}>
                    {item.discipline}
                  </Pixel>
                </div>
              </div>

              <ProgressBar
                pct={item.progress}
                color={tierColorMap[item.tier]}
              />
              <div className="flex justify-between mt-1.5">
                <Mono
                  size={11}
                  color={
                    item.tier === "exploring"
                      ? "coral"
                      : item.tier === "practicing"
                        ? "mustard"
                        : "teal"
                  }
                  weight={600}
                >
                  {item.progress}%
                </Mono>
                <Mono size={11} color="ink-muted">
                  2h 15m
                </Mono>
              </div>

              <div className="flex justify-between items-center mt-2.5 pt-2.5 border-t border-surface-divider">
                <Pixel color="ink-muted" size={11}>
                  2 days ago
                </Pixel>
                <TierTag tier={item.tier} />
              </div>
            </ItemSlot>
          ))}

          {/* Empty pin slot */}
          <ItemSlot
            empty
            className="flex flex-col items-center justify-center min-h-[130px]"
          >
            <div
              className="w-9 h-9 rounded flex items-center justify-center mb-2.5"
              style={{
                border: "1px dashed var(--color-surface-border)",
              }}
            >
              <span className="text-xl text-ink-dim font-display">+</span>
            </div>
            <Pixel color="ink-dim" size={13}>
              Pin a skill
            </Pixel>
          </ItemSlot>
        </div>
      </PanelBody>
    </Panel>
  );
}
