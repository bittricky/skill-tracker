import { Link } from "react-router";
import { Panel, PanelHeader, PanelBody } from "~/components/ui/Panel";
import { ItemSlot } from "~/components/ui/ItemSlot";
import { Icon } from "~/components/ui/Icon";
import { Mono } from "~/components/ui/Mono";
import { Pixel } from "~/components/ui/Pixel";
import { ProgressBar } from "~/components/ui/ProgressBar";
import { TierTag } from "~/components/ui/TierTag";
import { DISCIPLINE_BY_ID, SKILL_BY_ID } from "~/data";
import { iconForDiscipline } from "~/data/icons";
import { calculateDepth, TIER_META } from "~/lib/depth";
import { disciplineStats } from "~/lib/progress";
import type { AppliedMap, ProgressEvent, ProgressMap } from "~/lib/storage";
import { relativeTime, skillActivityDays } from "~/lib/activity";

/** Rolling window the ranking is computed over. */
const ACTIVE_WINDOW_DAYS = 30;
/** A discipline needs ≥2 touched skills in the window to count as a track. */
const MIN_ACTIVE_SKILLS = 2;
const MAX_TRACKS = 3;

interface ActiveTracksProps {
  progress: ProgressMap;
  applied: AppliedMap;
  /** Hidden disciplines never surface as active tracks. */
  hidden: string[];
  events: ProgressEvent[];
}

interface Track {
  id: string;
  activeDays: number;
  lastAt: string;
  /** Recently touched skills, most recent first. */
  recent: { id: string; label: string }[];
}

/**
 * Most actively practiced disciplines over the last `ACTIVE_WINDOW_DAYS` days —
 * ranked by distinct active days (not raw event count, so one binge can't
 * outweigh steady practice), ties broken by most recent touch. A discipline
 * needs `MIN_ACTIVE_SKILLS` distinct touched skills to qualify.
 */
export function ActiveTracks({
  progress,
  applied,
  hidden,
  events,
}: ActiveTracksProps) {
  const hiddenSet = new Set(hidden);
  const perDisc = new Map<
    string,
    {
      days: Set<string>;
      lastAt: string;
      skills: { id: string; label: string; lastAt: string }[];
    }
  >();
  for (const [skillId, a] of skillActivityDays(events, ACTIVE_WINDOW_DAYS)) {
    const skill = SKILL_BY_ID[skillId];
    const homeId = skill?.homeDisciplineId;
    if (!skill || !homeId || hiddenSet.has(homeId)) continue;
    const cur = perDisc.get(homeId) ?? {
      days: new Set<string>(),
      lastAt: "",
      skills: [],
    };
    for (const d of a.days) cur.days.add(d);
    if (a.lastAt > cur.lastAt) cur.lastAt = a.lastAt;
    cur.skills.push({ id: skillId, label: skill.label, lastAt: a.lastAt });
    perDisc.set(homeId, cur);
  }

  const tracks: Track[] = [...perDisc.entries()]
    .filter(([, a]) => a.skills.length >= MIN_ACTIVE_SKILLS)
    .map(([id, a]) => ({
      id,
      activeDays: a.days.size,
      lastAt: a.lastAt,
      recent: a.skills
        .sort((x, y) => (x.lastAt < y.lastAt ? 1 : -1))
        .slice(0, 3)
        .map((s) => ({ id: s.id, label: s.label })),
    }))
    .sort((x, y) =>
      y.activeDays !== x.activeDays
        ? y.activeDays - x.activeDays
        : x.lastAt < y.lastAt
          ? 1
          : -1,
    )
    .slice(0, MAX_TRACKS);

  const emptySlots = MAX_TRACKS - tracks.length;

  return (
    <Panel>
      <PanelHeader
        title="Active Tracks"
        subtitle={`Most practiced · last ${ACTIVE_WINDOW_DAYS} days`}
        meta={`${tracks.length} / ${MAX_TRACKS} slots`}
        accentColor="mustard"
        glyph="Briefcase"
      />
      <PanelBody>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {tracks.map((track) => {
            const discipline = DISCIPLINE_BY_ID[track.id];
            if (!discipline) return null;
            const depth = calculateDepth(discipline, progress, applied);
            const stats = disciplineStats(discipline, progress);
            const tierColor = TIER_META[depth.tier].color;
            return (
              <Link
                key={track.id}
                to={`/browser?discipline=${track.id}`}
                className="block"
              >
                <ItemSlot hoverColor={tierColor} className="h-full">
                  <div className="flex gap-2.5 mb-3">
                    <Icon
                      name={iconForDiscipline(discipline.id, discipline.kind)}
                      color={tierColor}
                      size={24}
                    />
                    <div className="flex-1 min-w-0">
                      <Mono
                        size={13}
                        color="ink"
                        weight={600}
                        className="block leading-tight mb-1"
                      >
                        {discipline.label}
                      </Mono>
                      <Pixel color="ink-muted" size={12}>
                        {track.activeDays} active day
                        {track.activeDays === 1 ? "" : "s"} ·{" "}
                        {track.recent.length} skills touched
                      </Pixel>
                      <Pixel color="ink-dim" size={11}>
                        touched {relativeTime(track.lastAt)}
                      </Pixel>
                    </div>
                  </div>

                  <ProgressBar pct={stats.pct} color={tierColor} />
                  <div className="flex justify-between mt-1.5">
                    <Mono
                      size={11}
                      color={TIER_META[depth.tier].accent}
                      weight={600}
                    >
                      {stats.pct}% done
                    </Mono>
                    <TierTag tier={depth.tier} />
                  </div>

                  <div className="mt-2.5 pt-2.5 border-t border-surface-divider">
                    <Pixel color="ink-dim" size={10}>
                      recently
                    </Pixel>
                    {track.recent.map((s) => (
                      <Mono
                        key={s.id}
                        size={11}
                        color="ink-muted"
                        className="block truncate leading-snug"
                      >
                        {s.label}
                      </Mono>
                    ))}
                  </div>
                </ItemSlot>
              </Link>
            );
          })}

          {Array.from({ length: emptySlots }).map((_, i) => (
            <Link key={`empty-${i}`} to="/browser" className="block">
              <ItemSlot
                empty
                className="flex flex-col items-center justify-center min-h-32.5 h-full hover:border-accent-mustard/50"
              >
                <div
                  className="w-9 h-9 rounded flex items-center justify-center mb-2.5 text-ink-dim"
                  style={{ border: "1px dashed var(--color-surface-border)" }}
                >
                  <Icon name="GitBranch" size={20} />
                </div>
                <Pixel color="ink-dim" size={13}>
                  Practice a discipline to fill this slot
                </Pixel>
              </ItemSlot>
            </Link>
          ))}
        </div>
      </PanelBody>
    </Panel>
  );
}
