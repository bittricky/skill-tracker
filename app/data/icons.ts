import type { IconName } from "~/components/ui/Icon";
import type { DisciplineKind } from "~/data";

/** Fallback glyph per discipline kind. */
export const KIND_ICON: Record<DisciplineKind, IconName> = {
  role: "User",
  foundation: "BookOpen",
  language: "Braces",
  framework: "Box",
  tech: "SettingsCog",
};

/** Per-discipline glyph overrides; anything missing falls back to `KIND_ICON`. */
export const DISCIPLINE_ICON: Record<string, IconName> = {
  frontend: "Briefcase",
  backend: "Server",
  devops: "SettingsCog",
  "ai-engineer": "UserPlus",
  "ai-agents": "Sparkle",
  "api-design": "Link",
  "game-developer": "Trophy",
  "cyber-security": "SettingsCog",
  blockchain: "Box",
  "network-engineer": "Globe",
  "shell-bash": "Terminal",
  nodejs: "Server",
  redis: "Database",
  mongodb: "Database",
  elasticsearch: "Database",
  graphql: "Database",
  docker: "Server",
  kubernetes: "SettingsCog",
  linux: "Terminal",
  git: "GitBranch",
  html: "BookOpen",
  css: "BookOpen",
};

export function iconForDiscipline(id: string, kind: DisciplineKind): IconName {
  return DISCIPLINE_ICON[id] ?? KIND_ICON[kind];
}
