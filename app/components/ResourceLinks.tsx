import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileLines,
  faPlay,
  faGraduationCap,
  faMicrophone,
  faBook,
  faCodeBranch,
  faLink,
  faStar,
  faArrowUpRightFromSquare,
} from "@fortawesome/free-solid-svg-icons";
import type { Resource } from "~/data";

interface ResourceLinksProps {
  label: string;
  resources: Resource[];
  sources?: string[];
  /**
   * When false, this skill is only *referenced* here (not home). Hide the
   * curated "Resources" block so role disciplines don't duplicate resource
   * lists already shown in the skill's home discipline.
   */
  primary?: boolean;
}

const KIND_ICON = {
  article: faFileLines,
  video: faPlay,
  course: faGraduationCap,
  podcast: faMicrophone,
  book: faBook,
  opensource: faCodeBranch,
  website: faLink,
  official: faStar,
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
    { n: "DevDocs", u: `https://devdocs.io/` },
    {
      n: "Udemy",
      u: `https://www.udemy.com/courses/search/?q=${encodeURIComponent(label)}`,
    },
    {
      n: "freeCodeCamp",
      u: `https://www.freecodecamp.org/`,
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
                <span className="w-4 text-center opacity-60">
                  <FontAwesomeIcon
                    icon={
                      KIND_ICON[r.kind as keyof typeof KIND_ICON] ??
                      faArrowUpRightFromSquare
                    }
                    className="text-[11px]"
                  />
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
            {r.n}{" "}
            <FontAwesomeIcon
              icon={faArrowUpRightFromSquare}
              className="text-[9px]"
            />
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
