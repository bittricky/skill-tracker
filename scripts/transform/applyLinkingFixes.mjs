/**
 * applyLinkingFixes.mjs
 *
 * Enforces the data invariants documented in the plan:
 *
 *   1. Within a single discipline, a skill id appears in at most one section.
 *      Duplicates (notably reused "Checkpoint" divider nodes) are pinned to
 *      the first occurrence; later occurrences are given section-unique
 *      synthetic ids `<disciplineId>:checkpoint:<sectionId>` if the label is
 *      a generic divider, or dropped otherwise.
 *
 *   2. `sources[]` is rebuilt from actual membership across all disciplines,
 *      so it is bidirectional by construction.
 *
 *   3. All section ids are normalized to `<disciplineId>:sec:<short>`.
 *
 *   4. `homeDisciplineId` is forced to be a member of `sources[]`. If the
 *      declared home is missing from sources, we prefer the source where the
 *      skill is `primary=true`; failing that, the first source.
 */

const GENERIC_DIVIDER_LABELS = new Set([
  "checkpoint",
  "Checkpoint",
  "CHECKPOINT",
]);

function isGenericDivider(label) {
  if (!label) return false;
  const t = String(label).trim();
  return GENERIC_DIVIDER_LABELS.has(t) || /^checkpoint\b/i.test(t);
}

function normalizeSectionId(disciplineId, oldId, index) {
  // Prefer the trailing nano from `disciplineId:sec:<nano>` / `disciplineId:<nano>`.
  const parts = String(oldId ?? "").split(":");
  const tail = parts[parts.length - 1] || `s${index}`;
  return `${disciplineId}:sec:${tail}`;
}

export function applyLinkingFixes(disciplines) {
  // Pass 1: dedupe within discipline + normalize section ids.
  const out = disciplines.map((d) => {
    const seenIds = new Set();
    const sections = (d.sections ?? []).map((sec, sIdx) => {
      const newSecId = normalizeSectionId(d.id, sec.id, sIdx);
      const items = [];
      for (const item of sec.items ?? []) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          items.push(item);
          continue;
        }
        // Duplicate within this discipline. If it's a generic divider, clone
        // it with a section-unique id so each section still has its own.
        if (isGenericDivider(item.label)) {
          const synthId = `${d.id}:checkpoint:${newSecId}`;
          if (!seenIds.has(synthId)) {
            seenIds.add(synthId);
            items.push({
              ...item,
              id: synthId,
              upstreamNodeId: item.upstreamNodeId,
              primary: true,
              homeDisciplineId: d.id,
            });
          }
        }
        // Non-divider duplicate: silently drop (first occurrence wins).
      }
      return {
        ...sec,
        id: newSecId,
        order: typeof sec.order === "number" ? sec.order : sIdx,
        items,
      };
    });
    return { ...d, sections };
  });

  // Pass 2: recompute sources[] bidirectionally.
  const sourcesBySkillId = new Map();
  for (const d of out) {
    for (const sec of d.sections) {
      for (const item of sec.items) {
        let set = sourcesBySkillId.get(item.id);
        if (!set) {
          set = new Set();
          sourcesBySkillId.set(item.id, set);
        }
        set.add(d.id);
      }
    }
  }

  for (const d of out) {
    for (const sec of d.sections) {
      for (const item of sec.items) {
        const srcSet = sourcesBySkillId.get(item.id) ?? new Set([d.id]);
        item.sources = [...srcSet].sort();
        // Fix homeDisciplineId if it's not in sources.
        if (!srcSet.has(item.homeDisciplineId)) {
          // Prefer a source where this skill is primary; else first source.
          const preferred = pickPrimaryHome(out, item.id) ?? item.sources[0];
          item.homeDisciplineId = preferred;
        }
        // `primary` is true only in the home discipline.
        item.primary = item.homeDisciplineId === d.id;
      }
    }
  }

  return out;
}

function pickPrimaryHome(disciplines, skillId) {
  for (const d of disciplines) {
    for (const sec of d.sections) {
      for (const item of sec.items) {
        if (item.id === skillId && item.primary === true) return d.id;
      }
    }
  }
  return null;
}
