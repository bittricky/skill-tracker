/**
 * remapPrereqs.mjs
 *
 * Rewrites prerequisite ids that no longer resolve (because the target
 * discipline was removed, e.g. `full-stack`) to a canonical equivalent in a
 * kept discipline.
 *
 * Matching strategy:
 *   1. The skill id format is `<disciplineId>:<upstreamNodeId>`. Build an
 *      index `upstreamNodeId -> [skillId, ...]` across all kept disciplines.
 *   2. For each prereq id that no longer exists in the kept payload:
 *        a. Extract its `upstreamNodeId` (suffix after the last `:`).
 *        b. Look up canonical kept skills with that same node id.
 *        c. Prefer the one whose discipline is the kept skill's home
 *           discipline (best match), then any `primary=true` one, then any.
 *      If no match, fall back to label-based matching using a label index
 *      built from the prior payload (so we can still resolve label-stable
 *      duplicates that didn't carry the same node id).
 *   3. Otherwise drop the prereq edge and log it.
 */

export function remapPrereqs(disciplines, opts = {}) {
  const priorDisciplines = opts.priorDisciplines ?? [];

  // Index of valid skill ids in the kept payload.
  const validIds = new Set();
  // upstreamNodeId -> array of { id, disciplineId, primary, label }
  const byUpstreamNode = new Map();
  // normalized label -> array of { id, disciplineId, primary }
  const byLabel = new Map();

  for (const d of disciplines) {
    for (const sec of d.sections) {
      for (const item of sec.items) {
        validIds.add(item.id);
        const upId =
          item.upstreamNodeId ??
          (item.id.includes(":") ? item.id.slice(item.id.lastIndexOf(":") + 1) : null);
        if (upId) {
          const arr = byUpstreamNode.get(upId) ?? [];
          arr.push({
            id: item.id,
            disciplineId: d.id,
            primary: item.primary !== false,
            label: item.label,
          });
          byUpstreamNode.set(upId, arr);
        }
        const lab = normalizeLabel(item.label);
        if (lab) {
          const arr = byLabel.get(lab) ?? [];
          arr.push({
            id: item.id,
            disciplineId: d.id,
            primary: item.primary !== false,
          });
          byLabel.set(lab, arr);
        }
      }
    }
  }

  // Build a label lookup for prior payload so we can resolve dropped
  // discipline prereqs that don't share an upstream node id.
  const priorLabelById = new Map();
  for (const d of priorDisciplines) {
    for (const sec of d.sections ?? []) {
      for (const item of sec.items ?? []) {
        if (item?.id && item?.label) priorLabelById.set(item.id, item.label);
      }
    }
  }

  const log = { rewritten: [], dropped: [], kept: 0 };

  for (const d of disciplines) {
    for (const sec of d.sections) {
      for (const item of sec.items) {
        const newPrereqs = [];
        for (const prereqId of item.prerequisites ?? []) {
          if (validIds.has(prereqId)) {
            newPrereqs.push(prereqId);
            log.kept++;
            continue;
          }
          const remapped = resolveOrphan(
            prereqId,
            item,
            d.id,
            byUpstreamNode,
            byLabel,
            priorLabelById,
          );
          if (remapped) {
            newPrereqs.push(remapped);
            log.rewritten.push({
              from: prereqId,
              to: remapped,
              skill: item.id,
              discipline: d.id,
            });
          } else {
            log.dropped.push({
              prereq: prereqId,
              skill: item.id,
              discipline: d.id,
              priorLabel: priorLabelById.get(prereqId) ?? null,
            });
          }
        }
        item.prerequisites = dedupe(newPrereqs);
      }
    }
  }

  return { disciplines, log };
}

function dedupe(arr) {
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    if (!seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  }
  return out;
}

function normalizeLabel(label) {
  if (!label) return "";
  return String(label).trim().toLowerCase().replace(/\s+/g, " ");
}

function resolveOrphan(orphanId, item, parentDisciplineId, byNode, byLabel, priorLabelById) {
  // 1) Try upstream-node-id suffix match.
  const colon = orphanId.lastIndexOf(":");
  if (colon !== -1) {
    const upId = orphanId.slice(colon + 1);
    const candidates = byNode.get(upId);
    if (candidates && candidates.length > 0) {
      return pickBest(candidates, item, parentDisciplineId);
    }
  }

  // 2) Try label match using the prior payload's label for this id.
  const priorLabel = priorLabelById.get(orphanId);
  if (priorLabel) {
    const candidates = byLabel.get(normalizeLabel(priorLabel));
    if (candidates && candidates.length > 0) {
      return pickBest(candidates, item, parentDisciplineId);
    }
  }

  return null;
}

function pickBest(candidates, item, parentDisciplineId) {
  // Prefer a candidate in the same discipline as the skill that owns the
  // prereq (so a Frontend prereq remaps to a Frontend equivalent first).
  const sameDiscipline = candidates.find((c) => c.disciplineId === parentDisciplineId);
  if (sameDiscipline) return sameDiscipline.id;
  // Then prefer the home discipline of the owning skill.
  const sameHome = candidates.find((c) => c.disciplineId === item.homeDisciplineId);
  if (sameHome) return sameHome.id;
  // Then any primary.
  const primary = candidates.find((c) => c.primary);
  if (primary) return primary.id;
  return candidates[0].id;
}
