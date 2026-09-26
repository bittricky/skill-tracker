/**
 * normalizeResources.mjs
 *
 * Cleans every `Skill.resources[]` (and section/discipline resource lists):
 *   - lowercases `kind` and maps upstream aliases onto our canonical set
 *   - drops `feed` links (daily.dev tag pages, not learning material)
 *   - trims labels, strips stray wrapping quotes
 *   - dedupes by URL within a single list (first occurrence wins)
 */

export const ALLOWED_KINDS = new Set([
  "article",
  "video",
  "course",
  "podcast",
  "book",
  "opensource",
  "website",
  "official",
  "roadmap",
]);

const KIND_ALIASES = {
  "roadmap.sh": "roadmap",
  roadmaps: "roadmap",
  docs: "official",
  documentation: "official",
  tutorial: "article",
  blog: "article",
  youtube: "video",
  videos: "video",
  courses: "course",
  repo: "opensource",
  github: "opensource",
  link: "website",
  site: "website",
};

const DROP_KINDS = new Set(["feed"]);

export function normalizeKind(kind) {
  const k = String(kind ?? "").trim().toLowerCase();
  const mapped = KIND_ALIASES[k] ?? k;
  return ALLOWED_KINDS.has(mapped) ? mapped : "website";
}

export function normalizeResourceList(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const r of list) {
    if (!r || typeof r.url !== "string") continue;
    const rawKind = String(r.kind ?? "").trim().toLowerCase();
    if (DROP_KINDS.has(rawKind)) continue;
    const url = r.url.trim();
    if (!/^https?:\/\//i.test(url)) continue;
    const key = url.replace(/\/+$/, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    let label = String(r.label ?? "")
      .trim()
      .replace(/^["'“”]+|["'“”]+$/g, "")
      .trim();
    if (!label) label = url.replace(/^https?:\/\/(www\.)?/, "");
    out.push({ kind: normalizeKind(rawKind), label, url });
  }
  return out;
}

export function normalizeResources(disciplines) {
  for (const d of disciplines) {
    if (d.resources) d.resources = normalizeResourceList(d.resources);
    for (const sec of d.sections ?? []) {
      if (sec.resources) sec.resources = normalizeResourceList(sec.resources);
      for (const item of sec.items ?? []) {
        item.resources = normalizeResourceList(item.resources);
      }
    }
  }
  return disciplines;
}
