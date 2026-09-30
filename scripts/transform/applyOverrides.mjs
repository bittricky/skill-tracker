/**
 * applyOverrides.mjs
 *
 * Hand-maintained corrections layered over the generated catalogue. Two
 * input files, both optional:
 *
 * `app/data/disciplines.overrides.json`
 *   {
 *     "dropSkills":     ["<skillId>", { "id": "<skillId>", "in": "<disciplineId>" }],
 *     "dropResources":  [{ "skill": "<skillId>", "match": "<substring>" }],
 *     "moveSkills":     [{ "id": "<skillId>", "in": "<disciplineId>", "toSection": "<sectionId | label>" }],
 *     "renameSections": [{ "id": "<sectionId>", "label": "New label" }],
 *     "mergeSections":  [{ "from": "<sectionId>", "into": "<sectionId>" }],
 *     "dropSections":   ["<sectionId>"],
 *     "createSections": [{ "in": "<disciplineId>", "id": "<short>", "label": "New section",
 *                          "after": "<sectionId | label>", "skills": ["<skillId>", ...] }],
 *     "describeDisciplines": { "<disciplineId>": "One-line description" }
 *   }
 *   - `dropSkills` as a bare string removes the skill from every discipline;
 *     with `in` only from that one (use for stray reference rows).
 *   - `dropResources` removes resources whose `label url` contains `match`
 *     (case-insensitive) from every row of `skill` — for one bad link inside
 *     an otherwise-good upstream resource list.
 *   - `toSection` may be a full section id or a section label within `in`.
 *   - `createSections` makes `<in>:sec:<id>` (inserted after `after`, else at
 *     the end) and moves the listed skills into it. This is how sub-headings
 *     that upstream draws as free-floating labels become sections; the parser
 *     deliberately does not detect them.
 *
 * `app/data/resources.overrides.json`
 *   {
 *     "<skillId>":              [ { "kind": "course", "label": "...", "url": "..." } ],
 *     "<disciplineId>:sec:<x>": [ ... ]   // section-level links
 *     "<disciplineId>":         [ ... ]   // discipline-level links
 *   }
 *   Skill-level entries are prepended to the skill's existing resources.
 *
 * Skill ids are never changed here, so user progress in localStorage stays
 * valid across moves/renames.
 */

function findSection(discipline, ref) {
  return (
    discipline.sections.find((s) => s.id === ref) ??
    discipline.sections.find(
      (s) => s.label.trim().toLowerCase() === String(ref).trim().toLowerCase(),
    ) ??
    null
  );
}

export function slugify(label) {
  return String(label ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * @param disciplines  generated catalogue (mutated)
 * @param overrides    parsed `disciplines.overrides.json`
 * @param contentByDiscipline  optional `Map<disciplineId, Map<nodeId, {slug,title,resources}>>`
 *                     used by `unlinkSkills` to recover the real upstream node.
 */
export function applyDisciplineOverrides(
  disciplines,
  overrides = {},
  contentByDiscipline = new Map(),
) {
  const log = {
    dropped: [],
    droppedResources: [],
    moved: [],
    renamed: [],
    merged: [],
    created: [],
    unlinked: [],
    missing: [],
  };
  const byId = new Map(disciplines.map((d) => [d.id, d]));

  for (const cs of overrides.createSections ?? []) {
    const d = byId.get(cs.in);
    if (!d || !cs.id || !cs.label) {
      log.missing.push({ op: "createSections", in: cs.in, id: cs.id });
      continue;
    }
    const secId = `${d.id}:sec:${cs.id}`;
    if (d.sections.some((s) => s.id === secId)) {
      log.missing.push({
        op: "createSections",
        in: cs.in,
        id: cs.id,
        reason: "exists",
      });
      continue;
    }
    const items = [];
    const notFound = [];
    for (const skillId of cs.skills ?? []) {
      let item = null;
      for (const sec of d.sections) {
        const idx = sec.items.findIndex((it) => it.id === skillId);
        if (idx >= 0) {
          item = sec.items.splice(idx, 1)[0];
          break;
        }
      }
      if (item) items.push({ ...item, order: items.length });
      else notFound.push(skillId);
    }
    if (items.length === 0) {
      log.missing.push({
        op: "createSections",
        in: cs.in,
        id: cs.id,
        reason: "no skills found",
      });
      continue;
    }
    const section = {
      id: secId,
      label: cs.label,
      description: cs.description,
      order: 0,
      items,
    };
    const anchor = cs.after ? findSection(d, cs.after) : null;
    const at = anchor ? d.sections.indexOf(anchor) + 1 : d.sections.length;
    d.sections.splice(at, 0, section);
    log.created.push({ id: secId, in: d.id, count: items.length, notFound });
  }

  // `unlinkSkills`: a row that was wrongly cross-linked by label (e.g. the
  // "Switch" network device pointing at React Native's <Switch>). Replace it
  // in `in` with a standalone primary skill owned by that discipline.
  for (const ul of overrides.unlinkSkills ?? []) {
    const d = byId.get(ul.in);
    if (!d) {
      log.missing.push({ op: "unlinkSkills", ...ul });
      continue;
    }
    let hit = false;
    for (const sec of d.sections) {
      const idx = sec.items.findIndex((it) => it.id === ul.id);
      if (idx < 0) continue;
      const old = sec.items[idx];
      const label = ul.label ?? old.label;
      const content = contentByDiscipline.get(d.id);
      let nodeId = null;
      let resources = [];
      if (content) {
        const want = slugify(label);
        for (const [nid, c] of content) {
          if (c.slug === want || slugify(c.title) === want) {
            nodeId = nid;
            resources = c.resources;
            break;
          }
        }
      }
      const newId = `${d.id}:${nodeId ?? slugify(label)}`;
      sec.items[idx] = {
        ...old,
        id: newId,
        label,
        resources,
        sources: [d.id],
        prerequisites: [],
        related: [],
        primary: true,
        homeDisciplineId: d.id,
        upstreamNodeId: nodeId ?? undefined,
      };
      log.unlinked.push({
        from: ul.id,
        to: newId,
        in: d.id,
        recovered: !!nodeId,
      });
      hit = true;
    }
    if (!hit) log.missing.push({ op: "unlinkSkills", ...ul });
  }

  for (const entry of overrides.dropSkills ?? []) {
    const id = typeof entry === "string" ? entry : entry.id;
    const only = typeof entry === "string" ? null : entry.in;
    let hit = false;
    for (const d of disciplines) {
      if (only && d.id !== only) continue;
      for (const sec of d.sections) {
        const before = sec.items.length;
        sec.items = sec.items.filter((it) => it.id !== id);
        if (sec.items.length !== before) {
          hit = true;
          log.dropped.push({ id, in: d.id, section: sec.id });
        }
      }
    }
    if (!hit) log.missing.push({ op: "dropSkills", id, in: only });
  }

  for (const dr of overrides.dropResources ?? []) {
    const match = String(dr.match ?? "").toLowerCase();
    if (!dr.skill || !match) {
      log.missing.push({ op: "dropResources", ...dr });
      continue;
    }
    let hit = false;
    for (const d of disciplines)
      for (const sec of d.sections)
        for (const it of sec.items) {
          if (it.id !== dr.skill || !it.resources?.length) continue;
          const keep = it.resources.filter(
            (r) => !`${r.label} ${r.url}`.toLowerCase().includes(match),
          );
          if (keep.length !== it.resources.length) {
            log.droppedResources.push({
              skill: it.id,
              in: d.id,
              count: it.resources.length - keep.length,
            });
            it.resources = keep;
            hit = true;
          }
        }
    if (!hit) log.missing.push({ op: "dropResources", ...dr });
  }

  for (const mv of overrides.moveSkills ?? []) {
    const d = byId.get(mv.in);
    const target = d ? findSection(d, mv.toSection) : null;
    if (!d || !target) {
      log.missing.push({ op: "moveSkills", ...mv });
      continue;
    }
    let item = null;
    for (const sec of d.sections) {
      const idx = sec.items.findIndex((it) => it.id === mv.id);
      if (idx >= 0) {
        item = sec.items.splice(idx, 1)[0];
        break;
      }
    }
    if (!item) {
      log.missing.push({ op: "moveSkills", ...mv });
      continue;
    }
    target.items.push({ ...item, order: target.items.length });
    log.moved.push({ id: mv.id, in: d.id, to: target.id });
  }

  for (const rn of overrides.renameSections ?? []) {
    let hit = false;
    for (const d of disciplines) {
      const sec = d.sections.find((s) => s.id === rn.id);
      if (sec) {
        log.renamed.push({ id: sec.id, from: sec.label, to: rn.label });
        sec.label = rn.label;
        if (rn.description) sec.description = rn.description;
        hit = true;
      }
    }
    if (!hit) log.missing.push({ op: "renameSections", ...rn });
  }

  for (const mg of overrides.mergeSections ?? []) {
    let hit = false;
    for (const d of disciplines) {
      const from = d.sections.find((s) => s.id === mg.from);
      const into = d.sections.find((s) => s.id === mg.into);
      if (!from || !into) continue;
      into.items.push(
        ...from.items.map((it, i) => ({ ...it, order: into.items.length + i })),
      );
      d.sections = d.sections.filter((s) => s !== from);
      log.merged.push({
        from: from.id,
        into: into.id,
        count: from.items.length,
      });
      hit = true;
    }
    if (!hit) log.missing.push({ op: "mergeSections", ...mg });
  }

  for (const id of overrides.dropSections ?? []) {
    let hit = false;
    for (const d of disciplines) {
      const before = d.sections.length;
      d.sections = d.sections.filter((s) => s.id !== id);
      if (d.sections.length !== before) hit = true;
    }
    if (!hit) log.missing.push({ op: "dropSections", id });
  }

  for (const [id, description] of Object.entries(
    overrides.describeDisciplines ?? {},
  )) {
    const d = byId.get(id);
    if (d) d.description = description;
    else log.missing.push({ op: "describeDisciplines", id });
  }

  // Drop sections emptied by the operations above.
  for (const d of disciplines) {
    d.sections = d.sections.filter((s) => s.items.length > 0);
    d.sections.forEach((s, i) => (s.order = i));
  }

  return { disciplines, log };
}

export function applyResourceOverrides(disciplines, overrides = {}) {
  const applied = { skills: 0, sections: 0, disciplines: 0 };
  const missing = [];
  const pending = new Map(Object.entries(overrides));

  for (const d of disciplines) {
    if (pending.has(d.id)) {
      d.resources = [...(d.resources ?? []), ...pending.get(d.id)];
      pending.delete(d.id);
      applied.disciplines++;
    }
    for (const sec of d.sections) {
      if (pending.has(sec.id)) {
        sec.resources = [...(sec.resources ?? []), ...pending.get(sec.id)];
        pending.delete(sec.id);
        applied.sections++;
      }
      for (const item of sec.items) {
        const extra = overrides[item.id];
        if (!extra) continue;
        // Only the home (primary) record carries resources; references read
        // from it at runtime.
        if (item.primary) {
          item.resources = [...extra, ...(item.resources ?? [])];
          applied.skills++;
        }
        pending.delete(item.id);
      }
    }
  }
  for (const key of pending.keys()) missing.push(key);
  return { disciplines, log: { applied, missing } };
}
