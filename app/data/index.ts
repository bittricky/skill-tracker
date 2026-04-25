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
  | "feed"
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
}

interface GeneratedPayload {
  generatedAt: string;
  upstreamCommit?: string;
  upstreamRepo?: string;
  disciplines: Discipline[];
}

const payload = generated as unknown as GeneratedPayload;

export const DISCIPLINES: Discipline[] = payload.disciplines;
export const GENERATED_AT: string = payload.generatedAt;
export const UPSTREAM_COMMIT: string | undefined = payload.upstreamCommit;
export const UPSTREAM_REPO: string | undefined = payload.upstreamRepo;

export const DISCIPLINE_BY_ID: Record<string, Discipline> = Object.fromEntries(
  DISCIPLINES.map((d) => [d.id, d]),
);

export const KIND_META: Record<DisciplineKind, { label: string; color: string }> =
  {
    role: { label: "Role", color: "#34d399" },
    foundation: { label: "Foundation", color: "#f97316" },
    language: { label: "Language", color: "#a78bfa" },
    framework: { label: "Framework", color: "#38bdf8" },
    tech: { label: "Tech", color: "#22d3ee" },
  };

export const KIND_ORDER: DisciplineKind[] = [
  "role",
  "foundation",
  "language",
  "framework",
  "tech",
];

/**
 * Per-skill lookups (canonical id -> label, home discipline id). Built once at
 * module load so UI code can resolve prereqs and cross-discipline jumps without
 * walking every section.
 */
export const SKILL_LABEL_BY_ID: Record<string, string> = {};
export const SKILL_HOME_DISCIPLINE_BY_ID: Record<string, string> = {};
for (const d of DISCIPLINES) {
  for (const sec of d.sections) {
    for (const item of sec.items) {
      if (!SKILL_LABEL_BY_ID[item.id]) SKILL_LABEL_BY_ID[item.id] = item.label;
      // `primary` rows are from the canonical home discipline; prefer that record.
      if (item.primary || !SKILL_HOME_DISCIPLINE_BY_ID[item.id]) {
        SKILL_HOME_DISCIPLINE_BY_ID[item.id] = item.homeDisciplineId;
      }
    }
  }
}
