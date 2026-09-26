import { Icon, ICONS } from "~/components/ui/Icon";
import type { Resource } from "~/data";

interface ResourceLinksProps {
  label: string;
  resources: Resource[];
  /** Label of the discipline that owns these resources, when not the current one. */
  fromLabel?: string | null;
  /** Show MDN search (web disciplines only). */
  web?: boolean;
}

const KIND_ICON = {
  article: "article",
  video: "video",
  course: "course",
  podcast: "podcast",
  book: "book",
  opensource: "opensource",
  website: "website",
  official: "official",
  roadmap: "website",
} as const;

/** Rank so curated learning material (courses, books) floats to the top. */
const KIND_RANK: Record<string, number> = {
  course: 0,
  book: 1,
  official: 2,
  video: 3,
  article: 4,
  opensource: 5,
  website: 6,
  roadmap: 7,
};

export function ResourceList({ resources }: { resources: Resource[] }) {
  const sorted = [...resources].sort(
    (a, b) => (KIND_RANK[a.kind] ?? 9) - (KIND_RANK[b.kind] ?? 9),
  );
  return (
    <div className="space-y-0.5">
      {sorted.map((r) => (
        <a
          key={r.url}
          href={r.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 py-0.5 text-xs text-brand-primary hover:text-brand-secondary hover:underline"
          title={r.kind}
        >
          <span className="w-4 text-center opacity-60">
            <Icon
              name={
                ICONS[KIND_ICON[r.kind as keyof typeof KIND_ICON]] ??
                ICONS.external
              }
              size={11}
            />
          </span>
          <span className="truncate">{r.label}</span>
          <span className="ml-auto text-[9px] uppercase tracking-wider text-ink-dim shrink-0">
            {r.kind}
          </span>
        </a>
      ))}
    </div>
  );
}

export function ResourceLinks({
  label,
  resources,
  fromLabel,
  web = false,
}: ResourceLinksProps) {
  const q = encodeURIComponent(label);
  const searches = [
    web && {
      n: "MDN",
      u: `https://developer.mozilla.org/en-US/search?q=${q}`,
    },
    {
      n: "YouTube",
      u: `https://www.youtube.com/results?search_query=${encodeURIComponent(label + " tutorial")}`,
    },
    { n: "Udemy", u: `https://www.udemy.com/courses/search/?q=${q}` },
    {
      n: "roadmap.sh",
      u: `https://roadmap.sh/search?q=${q}`,
    },
  ].filter((s): s is { n: string; u: string } => Boolean(s));

  return (
    <div className="pt-2">
      {resources.length > 0 && (
        <>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-[10px] font-semibold text-brand-dim tracking-wider uppercase">
              Resources
            </span>
            {fromLabel && (
              <span className="text-[10px] text-ink-dim">from {fromLabel}</span>
            )}
          </div>
          <ResourceList resources={resources} />
          <div className="h-px bg-brand-primary/10 my-2" />
        </>
      )}

      <div className="text-[10px] font-semibold text-brand-dim tracking-wider uppercase mb-1.5">
        Search
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {searches.map((r) => (
          <a
            key={r.n}
            href={r.u}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-brand-primary border border-brand-primary/20 rounded-lg px-2 py-0.5 bg-brand-primary/5 hover:bg-brand-primary/15 hover:border-brand-primary/40"
          >
            {r.n} <Icon name={ICONS.external} size={9} />
          </a>
        ))}
      </div>
    </div>
  );
}
