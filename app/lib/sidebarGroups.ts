import {
  DISCIPLINES,
  KIND_ORDER,
  type Discipline,
  type DisciplineKind,
} from "~/data";

export interface SidebarGroup {
  kind: DisciplineKind;
  label: string;
  disciplines: Discipline[];
}

const KIND_HEADER: Record<DisciplineKind, string> = {
  role: "Roles",
  foundation: "Foundations",
  language: "Languages",
  framework: "Frameworks",
  tech: "Technologies",
};

export function getSidebarGroups(): SidebarGroup[] {
  return KIND_ORDER.map((kind) => ({
    kind,
    label: KIND_HEADER[kind],
    disciplines: DISCIPLINES.filter((d) => d.kind === kind),
  })).filter((g) => g.disciplines.length > 0);
}
