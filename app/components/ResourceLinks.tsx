import type { Resource } from "~/data";

interface ResourceLinksProps {
  label: string;
  resources: Resource[];
  sources?: string[];
  /**
   * When false, this skill is only *referenced* here (not home). Hide the
   * curated "Resources" block so role roadmaps don't duplicate resource lists
   * already shown in the skill's home roadmap.
   */
  primary?: boolean;
}

const KIND_ICON: Record<string, string> = {
  article: "📄",
  video: "▶",
  course: "🎓",
  podcast: "🎙",
  book: "📘",
  opensource: "⌥",
  website: "🔗",
  official: "★",
};

export function ResourceLinks({
  label,
  resources,
  sources,
  primary = true,
}: ResourceLinksProps) {
  const curated = primary ? resources.filter((r) => r.kind !== "feed") : [];
  const searches = [
    {
      n: "MDN",
      u: `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(label)}`,
    },
    {
      n: "Educative",
      u: `https://www.educative.io/search?query=${encodeURIComponent(label)}`,
    },
    {
      n: "YouTube",
      u: `https://www.youtube.com/results?search_query=${encodeURIComponent(label + " tutorial")}`,
    },
    { n: "DevDocs", u: `https://devdocs.io/#q=${encodeURIComponent(label)}` },
    {
      n: "Udemy",
      u: `https://www.udemy.com/courses/search/?q=${encodeURIComponent(label)}`,
    },
  ];

  return (
    <div className="pt-2">
      {curated.length > 0 && (
        <>
          <div className="text-[10px] font-semibold text-brand-dim tracking-wider uppercase mb-1.5">
            Resources
          </div>
          <div className="space-y-0.5">
            {curated.map((r) => (
              <a
                key={r.url}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 py-0.5 text-xs text-brand-primary hover:text-brand-secondary hover:underline"
              >
                <span className="w-4 text-center text-[11px] opacity-60">
                  {KIND_ICON[r.kind] ?? "↗"}
                </span>
                <span className="truncate">{r.label}</span>
              </a>
            ))}
          </div>
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
            {r.n} ↗
          </a>
        ))}
      </div>

      {sources && sources.length > 1 && (
        <div className="mt-3 text-[10px] text-brand-dim">
          Appears in:{" "}
          <span className="text-brand-muted">{sources.join(" · ")}</span>
        </div>
      )}
    </div>
  );
}
