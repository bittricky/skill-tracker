import { useMemo } from "react";
import { Link } from "react-router";
import { Panel, PanelHeader, PanelBody } from "~/components/ui/Panel";
import { Pixel } from "~/components/ui/Pixel";
import { Mono } from "~/components/ui/Mono";
import { Icon } from "~/components/ui/Icon";
import { SKILL_BY_ID, SKILL_SECTION_BY_ID, DISCIPLINE_BY_ID } from "~/data";
import { iconForDiscipline } from "~/data/icons";
import type { ProgressEvent } from "~/lib/storage";
import {
  dayKey,
  realEvents,
  relativeTime,
  type SkillFilter,
} from "~/lib/activity";

interface RecentActivityProps {
  events: ProgressEvent[];
  filter?: SkillFilter;
}

function describe(e: ProgressEvent): string {
  if (e.kind === "status") {
    switch (e.to) {
      case "done":
        return "marked done";
      case "learning":
        return "started learning";
      case "skipped":
        return "skipped";
      default:
        return "cleared";
    }
  }
  if (e.kind === "applied") return e.to === true ? "applied" : "un-applied";
  return e.to === true ? "pinned" : "unpinned";
}

function dayLabel(key: string, todayKey: string, yesterdayKey: string) {
  if (key === todayKey) return "Today";
  if (key === yesterdayKey) return "Yesterday";
  return new Date(`${key}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function RecentActivity({ events, filter }: RecentActivityProps) {
  const groups = useMemo(() => {
    const real = realEvents(events)
      .filter((e) => e.kind !== "pin" && (!filter || filter(e.id)))
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 10);
    const out: { key: string; items: ProgressEvent[] }[] = [];
    for (const e of real) {
      const k = dayKey(new Date(e.at));
      const last = out[out.length - 1];
      if (last && last.key === k) last.items.push(e);
      else out.push({ key: k, items: [e] });
    }
    return out;
  }, [events, filter]);

  const todayKey = dayKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dayKey(yesterday);

  return (
    <Panel className="min-w-0">
      <PanelHeader
        title="Recent Activity"
        subtitle="latest changes"
        accentColor="lavender"
        glyph="FileText"
      />
      <PanelBody className="p-2">
        {groups.length === 0 ? (
          <div className="py-8 text-center px-3">
            <Pixel size={12} color="ink-muted">
              No activity yet — mark a skill as learning or done to start your
              history.
            </Pixel>
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.key}>
              <Pixel
                size={11}
                color="ink-dim"
                className="block px-2 pt-2.5 pb-1"
              >
                {dayLabel(g.key, todayKey, yesterdayKey)}
              </Pixel>
              <ul className="flex flex-col">
                {g.items.map((e, i) => {
                  const skill = SKILL_BY_ID[e.id];
                  const loc = SKILL_SECTION_BY_ID[e.id];
                  const discipline = loc
                    ? DISCIPLINE_BY_ID[loc.disciplineId]
                    : undefined;
                  const body = (
                    <>
                      <Icon
                        name={iconForDiscipline(
                          discipline?.id ?? "",
                          discipline?.kind ?? "foundation",
                        )}
                        size={16}
                        className="text-ink-dim shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <Mono
                          size={12}
                          color="ink"
                          weight={500}
                          className="block truncate leading-tight"
                        >
                          {skill?.label ?? e.id}
                        </Mono>
                        <Mono
                          size={10}
                          color="ink-dim"
                          className="block truncate"
                        >
                          {discipline?.label ?? "—"} · {describe(e)}
                        </Mono>
                      </div>
                      <Mono size={10} color="ink-dim" className="shrink-0">
                        {relativeTime(e.at)}
                      </Mono>
                    </>
                  );
                  return (
                    <li key={`${e.at}-${e.id}-${i}`}>
                      {loc ? (
                        <Link
                          to={`/browser?discipline=${loc.disciplineId}#skill-${encodeURIComponent(e.id)}`}
                          className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-surface-panel-hi transition-colors"
                        >
                          {body}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-2.5 px-2 py-1.5">
                          {body}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </PanelBody>
    </Panel>
  );
}
