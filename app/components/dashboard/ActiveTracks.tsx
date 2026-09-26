import { Link } from "react-router";
import { Panel, PanelHeader, PanelBody } from "~/components/ui/Panel";
import { ItemSlot } from "~/components/ui/ItemSlot";
import { Icon } from "~/components/ui/Icon";
import { Mono } from "~/components/ui/Mono";
import { Pixel } from "~/components/ui/Pixel";
import { ProgressBar } from "~/components/ui/ProgressBar";
import { TierTag } from "~/components/ui/TierTag";
import { DISCIPLINE_BY_ID, SKILL_BY_ID, SKILL_SECTION_BY_ID } from "~/data";
import { iconForDiscipline } from "~/data/icons";
import { calculateDepth, TIER_META } from "~/lib/depth";
import { sectionStats } from "~/lib/progress";
import { MAX_PINNED, type AppliedMap, type ProgressMap } from "~/lib/storage";
import { STATUS_META } from "~/components/browser/SkillRow";

interface ActiveTracksProps {
  pinned: string[];
  progress: ProgressMap;
  applied: AppliedMap;
  onUnpin: (id: string) => void;
}

/**
 * Pinned skills — the handful of things you're focusing on right now.
 * Each card shows the skill's own status, its section's completion, and the
 * home discipline's depth tier.
 */
export function ActiveTracks({
  pinned,
  progress,
  applied,
  onUnpin,
}: ActiveTracksProps) {
  const cards = pinned
    .map((id) => {
      const skill = SKILL_BY_ID[id];
      const loc = SKILL_SECTION_BY_ID[id];
      const discipline = loc ? DISCIPLINE_BY_ID[loc.disciplineId] : undefined;
      const section = discipline?.sections.find((s) => s.id === loc?.sectionId);
      if (!skill || !discipline || !section) return null;
      const depth = calculateDepth(discipline, progress, applied);
      const secStats = sectionStats(section, progress);
      return { skill, discipline, section, depth, secStats };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const emptySlots = Math.max(0, MAX_PINNED - cards.length);

  return (
    <Panel>
      <PanelHeader
        title="Active Tracks"
        subtitle="Pinned skills you're focusing on"
        meta={`${cards.length} / ${MAX_PINNED} slots`}
        accentColor="coral"
        glyph="Briefcase"
      />
      <PanelBody>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {cards.map(({ skill, discipline, section, depth, secStats }) => {
            const tierColor = TIER_META[depth.tier].color;
            const status = progress[skill.id] ?? "untouched";
            const sm = STATUS_META[status];
            return (
              <ItemSlot key={skill.id} hoverColor={tierColor}>
                <div className="flex gap-2.5 mb-3">
                  <Icon
                    name={iconForDiscipline(discipline.id, discipline.kind)}
                    color={tierColor}
                    size={24}
                  />
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/browser?discipline=${discipline.id}`}
                      className="block hover:underline"
                    >
                      <Mono
                        size={13}
                        color="ink"
                        weight={600}
                        className="block leading-tight mb-1"
                      >
                        {skill.label}
                      </Mono>
                    </Link>
                    <Pixel color="ink-muted" size={12}>
                      {discipline.label} · {section.label}
                    </Pixel>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUnpin(skill.id)}
                    title="Unpin"
                    className="text-accent-mustard hover:opacity-70 text-sm leading-none"
                  >
                    ★
                  </button>
                </div>

                <ProgressBar pct={secStats.pct} color={tierColor} />
                <div className="flex justify-between mt-1.5">
                  <Mono
                    size={11}
                    color={TIER_META[depth.tier].accent}
                    weight={600}
                  >
                    {secStats.pct}% of section
                  </Mono>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-display font-bold tracking-[0.06em]"
                    style={{
                      background: sm.bg,
                      color: sm.color,
                      border: `1px solid ${sm.color}40`,
                    }}
                  >
                    {sm.label}
                  </span>
                </div>

                <div className="flex justify-between items-center mt-2.5 pt-2.5 border-t border-surface-divider">
                  <Pixel color="ink-muted" size={11}>
                    {applied[skill.id] ? "Applied" : "Not yet applied"}
                  </Pixel>
                  <TierTag tier={depth.tier} />
                </div>
              </ItemSlot>
            );
          })}

          {Array.from({ length: emptySlots }).map((_, i) => (
            <Link key={`empty-${i}`} to="/browser" className="block">
              <ItemSlot
                empty
                className="flex flex-col items-center justify-center min-h-32.5 h-full hover:border-accent-mustard/50"
              >
                <div
                  className="w-9 h-9 rounded flex items-center justify-center mb-2.5"
                  style={{ border: "1px dashed var(--color-surface-border)" }}
                >
                  <span className="text-xl text-ink-dim font-display">☆</span>
                </div>
                <Pixel color="ink-dim" size={13}>
                  Pin a skill in the browser
                </Pixel>
              </ItemSlot>
            </Link>
          ))}
        </div>
      </PanelBody>
    </Panel>
  );
}
