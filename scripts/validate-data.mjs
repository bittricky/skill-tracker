#!/usr/bin/env node
/**
 * validate-data.mjs — invariant checks for `app/data/disciplines.generated.json`.
 * Run via `pnpm run data:check`. Exits non-zero on any failure.
 *
 * Invariants:
 *   - discipline ids unique; kinds ∈ role|foundation|language|framework|tech
 *   - section ids unique, shaped `<disciplineId>:sec:<x>`, never empty
 *   - a skill id appears at most once per discipline
 *   - exactly one primary row per skill id, and it lives in `homeDisciplineId`
 *   - `sources[]` equals the set of disciplines the skill appears in
 *   - `homeDisciplineId ∈ sources`
 *   - labels present, not "(untitled)"
 *   - resource kinds ⊆ allowed set; urls are http(s); no dup urls in a row
 *   - prerequisites reference existing skill ids
 *   - per-discipline resource coverage ≥ MIN_COVERAGE (warning unless --strict)
 */

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ALLOWED_KINDS } from "./transform/normalizeResources.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const strict = process.argv.includes("--strict");
const MIN_COVERAGE = 90;
const KINDS = new Set(["role", "foundation", "language", "framework", "tech"]);

const payload = JSON.parse(
  await readFile(join(ROOT, "app/data/disciplines.generated.json"), "utf8"),
);

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const disciplineIds = new Set();
const sectionIds = new Set();
const occurrences = new Map(); // skillId -> [{ disciplineId, primary, home, sources }]
const allSkillIds = new Set();

for (const d of payload.disciplines) {
  if (disciplineIds.has(d.id)) err(`duplicate discipline id ${d.id}`);
  disciplineIds.add(d.id);
  if (!KINDS.has(d.kind)) err(`${d.id}: unknown kind "${d.kind}"`);
  if (!d.sections?.length) err(`${d.id}: no sections`);

  const seenInDiscipline = new Set();
  let total = 0;
  let withRes = 0;

  for (const sec of d.sections ?? []) {
    if (sectionIds.has(sec.id)) err(`duplicate section id ${sec.id}`);
    sectionIds.add(sec.id);
    if (!sec.id.startsWith(`${d.id}:sec:`))
      err(`${sec.id}: section id must start with "${d.id}:sec:"`);
    if (!sec.items?.length) err(`${sec.id}: empty section`);
    if (!sec.label) err(`${sec.id}: missing label`);

    for (const it of sec.items ?? []) {
      total++;
      allSkillIds.add(it.id);
      if (!it.label || it.label === "(untitled)")
        err(`${d.id} / ${sec.id} / ${it.id}: missing label`);
      if (seenInDiscipline.has(it.id))
        err(`${d.id}: skill ${it.id} appears in more than one section`);
      seenInDiscipline.add(it.id);

      const list = occurrences.get(it.id) ?? [];
      list.push({
        disciplineId: d.id,
        primary: it.primary === true,
        home: it.homeDisciplineId,
        sources: it.sources ?? [],
      });
      occurrences.set(it.id, list);

      if (it.resources?.length) withRes++;
      const urls = new Set();
      for (const r of it.resources ?? []) {
        if (!ALLOWED_KINDS.has(r.kind))
          err(`${it.id}: resource kind "${r.kind}" not allowed`);
        if (!/^https?:\/\//.test(r.url ?? ""))
          err(`${it.id}: bad resource url "${r.url}"`);
        if (!r.label) err(`${it.id}: resource ${r.url} has no label`);
        const key = r.url.toLowerCase().replace(/\/+$/, "");
        if (urls.has(key)) err(`${it.id}: duplicate resource url ${r.url}`);
        urls.add(key);
      }
    }
  }

  const cov = total ? Math.round((withRes / total) * 100) : 0;
  if (cov < MIN_COVERAGE)
    (strict ? err : warn)(`${d.id}: resource coverage ${cov}% (${withRes}/${total}) below ${MIN_COVERAGE}%`);
}

for (const [id, occ] of occurrences) {
  const primaries = occ.filter((o) => o.primary);
  if (primaries.length !== 1)
    err(`${id}: expected exactly 1 primary row, found ${primaries.length} (${occ.map((o) => o.disciplineId).join(", ")})`);
  const homes = new Set(occ.map((o) => o.home));
  if (homes.size !== 1) err(`${id}: inconsistent homeDisciplineId across rows: ${[...homes].join(", ")}`);
  const home = [...homes][0];
  if (primaries[0] && primaries[0].disciplineId !== home)
    err(`${id}: primary row is in ${primaries[0].disciplineId} but home is ${home}`);
  const actual = [...new Set(occ.map((o) => o.disciplineId))].sort().join(",");
  for (const o of occ) {
    const declared = [...o.sources].sort().join(",");
    if (declared !== actual)
      err(`${id} (in ${o.disciplineId}): sources [${declared}] ≠ actual [${actual}]`);
    if (!o.sources.includes(o.home)) err(`${id}: home ${o.home} not in sources`);
  }
}

// Prerequisites must resolve.
for (const d of payload.disciplines)
  for (const sec of d.sections)
    for (const it of sec.items)
      for (const p of it.prerequisites ?? [])
        if (!allSkillIds.has(p)) err(`${it.id}: prerequisite ${p} does not exist`);

const uniqueSkills = occurrences.size;
console.log(
  `checked ${payload.disciplines.length} disciplines, ${sectionIds.size} sections, ${uniqueSkills} unique skills`,
);
for (const w of warnings) console.log(`  warn  ${w}`);
for (const e of errors) console.log(`  FAIL  ${e}`);
console.log(errors.length ? `✗ ${errors.length} error(s)` : "✓ all invariants hold");
process.exit(errors.length ? 1 : 0);
