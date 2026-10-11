import generated from "./disciplines.generated.json";

export type ResourceKind =
  | "article"
  | "video"
  | "course"
  | "podcast"
  | "book"
  | "opensource"
  | "website"
  | "official"
  | "roadmap"
  | string;

export interface Resource {
  kind: ResourceKind;
  label: string;
  url: string;
}

export interface Skill {
  id: string;
  label: string;
  resources: Resource[];
  sources: string[]; // discipline ids that reference this skill
  prerequisites: string[]; // canonical skill ids this builds on
  related?: string[]; // optional non-prereq cross-discipline edges
  primary: boolean; // true only in the skill's home discipline
  homeDisciplineId: string; // discipline that owns this skill's resources
  /** Stable upstream node id (developer-roadmap React Flow node id). */
  upstreamNodeId?: string;
  order?: number;
}

export interface Section {
  id: string;
  label: string;
  description?: string;
  order?: number;
  items: Skill[];
  /** Curated section-level links (from `resources.overrides.json`). */
  resources?: Resource[];
}

export type DisciplineKind =
  | "role"
  | "foundation"
  | "language"
  | "framework"
  | "tech";

export interface Discipline {
  id: string;
  label: string;
  color: string;
  kind: DisciplineKind;
  description?: string;
  /** e.g. `react -> ["javascript"]`. */
  prerequisiteDisciplineIds?: string[];
  /** Slug in the upstream developer-roadmap repo, when applicable. */
  upstreamId?: string;
  sections: Section[];
  /** Curated discipline-level links (from `resources.overrides.json`). */
  resources?: Resource[];
}

export interface GeneratedPayload {
  generatedAt: string;
  upstreamCommit?: string;
  upstreamRepo?: string;
  disciplines: Discipline[];
}

const payload = generated as unknown as GeneratedPayload;

export const DISCIPLINES: Discipline[] = payload.disciplines;

export const DISCIPLINE_BY_ID: Record<string, Discipline> = Object.fromEntries(
  DISCIPLINES.map((d) => [d.id, d]),
);

export const KIND_META: Record<
  DisciplineKind,
  { label: string; plural: string; color: string; description: string }
> = {
  role: {
    label: "Role",
    plural: "Roles",
    color: "#34d399",
    description: "Job-shaped tracks that span many skills",
  },
  foundation: {
    label: "Foundation",
    plural: "Foundations",
    color: "#f97316",
    description: "Theory and fundamentals that transfer everywhere",
  },
  language: {
    label: "Language",
    plural: "Languages",
    color: "#a78bfa",
    description: "Programming and markup languages",
  },
  framework: {
    label: "Framework",
    plural: "Frameworks",
    color: "#38bdf8",
    description: "Libraries and frameworks built on a language",
  },
  tech: {
    label: "Tech",
    plural: "Tech",
    color: "#22d3ee",
    description: "Runtimes, databases, infrastructure and tooling",
  },
};

export const KIND_ORDER: DisciplineKind[] = [
  "role",
  "foundation",
  "language",
  "framework",
  "tech",
];

/**
 * Per-skill lookups (canonical id -> label, home discipline id, primary
 * record). Built once at module load so UI code can resolve prereqs and
 * cross-discipline jumps without walking every section.
 */
export const SKILL_LABEL_BY_ID: Record<string, string> = {};
export const SKILL_HOME_DISCIPLINE_BY_ID: Record<string, string> = {};
export const SKILL_BY_ID: Record<string, Skill> = {};
export const SKILL_SECTION_BY_ID: Record<
  string,
  { disciplineId: string; sectionId: string }
> = {};
for (const d of DISCIPLINES) {
  for (const sec of d.sections) {
    for (const item of sec.items) {
      if (!SKILL_LABEL_BY_ID[item.id]) SKILL_LABEL_BY_ID[item.id] = item.label;
      // `primary` rows are from the canonical home discipline; prefer that record.
      if (item.primary || !SKILL_HOME_DISCIPLINE_BY_ID[item.id]) {
        SKILL_HOME_DISCIPLINE_BY_ID[item.id] = item.homeDisciplineId;
        SKILL_BY_ID[item.id] = item;
        SKILL_SECTION_BY_ID[item.id] = {
          disciplineId: d.id,
          sectionId: sec.id,
        };
      }
    }
  }
}
