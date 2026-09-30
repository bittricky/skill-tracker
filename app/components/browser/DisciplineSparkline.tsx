import { useMemo } from "react";
import { Mono } from "~/components/ui/Mono";
import type { Discipline } from "~/data";
import type { ProgressEvent } from "~/lib/storage";
import {
  deltaSince,
  lastTouched,
  relativeTime,
  weeklyCounts,
} from "~/lib/activity";

interface DisciplineSparklineProps {
  discipline: Discipline;
  events: ProgressEvent[];
}

const WEEKS = 12;

export function DisciplineSparkline({
  discipline,
  events,
}: DisciplineSparklineProps) {
  const skillIds = useMemo(() => {
    const ids = new Set<string>();
    for (const sec of discipline.sections)
      for (const item of sec.items) ids.add(item.id);
    return ids;
  }, [discipline]);

  const weeks = useMemo(
    () => weeklyCounts(events, skillIds, WEEKS),
    [events, skillIds],
  );
  const month = useMemo(
    () =>
      deltaSince(
        events,
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        (id) => skillIds.has(id),
      ),
    [events, skillIds],
  );
  const touched = useMemo(
    () => lastTouched(events, skillIds),
    [events, skillIds],
  );

  const max = Math.max(...weeks, 1);

  return (
    <div className="mt-3 pt-3 border-t border-surface-divider">
      <svg
        width="100%"
        height="28"
        viewBox={`0 0 ${WEEKS * 8 - 2} 28`}
        preserveAspectRatio="none"
        className="block"
        role="img"
        aria-label="activity, last 12 weeks"
      >
        {weeks.map((v, i) => {
          const h = v > 0 ? Math.max(3, Math.round((v / max) * 26)) : 2;
          return (
            <rect
              key={i}
              x={i * 8}
              y={28 - h}
              width={6}
              height={h}
              rx={1}
              className={
                v > 0
                  ? "fill-accent-teal"
                  : "fill-surface-inset"
              }
            />
          );
        })}
      </svg>
      <Mono size={10} color="ink-dim" className="block mt-1.5">
        +{month.done} done · last 30 days
        {touched ? ` · last touched ${relativeTime(touched)}` : ""}
      </Mono>
    </div>
  );
}
