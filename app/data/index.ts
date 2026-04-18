import generated from "./roadmaps.generated.json";

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
  sources: string[]; // roadmap ids that reference this skill
  prerequisites: string[]; // canonical skill ids this builds on
  primary: boolean; // true only in the skill's home roadmap
  homeRoadmapId: string; // roadmap that owns this skill's resources
}

export interface Section {
  id: string;
  label: string;
  items: Skill[];
}

export type RoadmapKind =
  | "role"
  | "foundation"
  | "language"
  | "framework"
  | "tech";

export interface Roadmap {
  id: string;
  label: string;
  color: string;
  kind: RoadmapKind;
  sections: Section[];
}

interface GeneratedPayload {
  generatedAt: string;
  roadmaps: Roadmap[];
}

const payload = generated as unknown as GeneratedPayload;

export const ROADMAPS: Roadmap[] = payload.roadmaps;
export const GENERATED_AT: string = payload.generatedAt;

export const ROADMAP_BY_ID: Record<string, Roadmap> = Object.fromEntries(
  ROADMAPS.map((r) => [r.id, r]),
);

export const KIND_META: Record<RoadmapKind, { label: string; color: string }> =
  {
    role: { label: "Role", color: "#34d399" },
    foundation: { label: "Foundation", color: "#f97316" },
    language: { label: "Language", color: "#a78bfa" },
    framework: { label: "Framework", color: "#38bdf8" },
    tech: { label: "Tech", color: "#22d3ee" },
  };

export const KIND_ORDER: RoadmapKind[] = [
  "role",
  "foundation",
  "language",
  "framework",
  "tech",
];

/**
 * Per-skill lookups (canonical id -> label, home roadmap id). Built once at
 * module load so UI code can resolve prereqs and cross-roadmap jumps without
 * walking every section.
 */
export const SKILL_LABEL_BY_ID: Record<string, string> = {};
export const SKILL_HOME_BY_ID: Record<string, string> = {};
for (const rm of ROADMAPS) {
  for (const sec of rm.sections) {
    for (const item of sec.items) {
      if (!SKILL_LABEL_BY_ID[item.id]) SKILL_LABEL_BY_ID[item.id] = item.label;
      // `primary` rows are from the canonical home roadmap; prefer that record.
      if (item.primary || !SKILL_HOME_BY_ID[item.id]) {
        SKILL_HOME_BY_ID[item.id] = item.homeRoadmapId;
      }
    }
  }
}
