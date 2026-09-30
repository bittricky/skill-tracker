#!/usr/bin/env node
/**
 * audit-data.mjs — prints suspicious placements in the generated catalogue
 * so you can extend `app/data/disciplines.overrides.json`.
 *
 * Heuristics (each is a hint, not a verdict):
 *   - tiny sections (1 item) and huge sections (> 60 items)
 *   - duplicate section labels within a discipline
 *   - reference rows (primary=false) whose home discipline is a Language /
 *     Framework / Tech but which sit in a section that doesn't look like a
 *     "pick a language / tools / frameworks" bucket
 *   - skills with no resources
 *   - discipline-level resource coverage
 *   - re-derived disciplines where > 50% of subtopics were placed by the
 *     spatial fallback (from remap.log.json `sections`) — check those by eye
 *
 * Usage: node scripts/audit-data.mjs [disciplineId ...]
 */

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const payload = JSON.parse(
  await readFile(join(ROOT, "app/data/disciplines.generated.json"), "utf8"),
);
let remapLog = {};
try {
  remapLog = JSON.parse(
    await readFile(join(ROOT, "app/data/remap.log.json"), "utf8"),
  );
} catch {
  /* no log yet */
}
const only = new Set(process.argv.slice(2));
const disciplines = payload.disciplines.filter(
  (d) => only.size === 0 || only.has(d.id),
);
const byId = new Map(payload.disciplines.map((d) => [d.id, d]));

const BUCKET_WORDS =
  /language|framework|library|libraries|tool|stack|pick|choose|database|hosting|orchestration|container|runtime|platform|ecosystem|prerequisite|frontend|backend|version control|\bos\b|operating system|testing|networking|network|protocol|async|api|ssr|ssg|static site|security|internet|topics|implementation|preprocessor|architecture|desktop|mobile|module|bundler|programming|skills|terminology/i;

for (const d of disciplines) {
  const notes = [];
  const labels = new Map();
  let total = 0;
  let withRes = 0;

  for (const sec of d.sections) {
    total += sec.items.length;
    withRes += sec.items.filter((i) => i.resources?.length).length;

    const key = sec.label.trim().toLowerCase();
    labels.set(key, (labels.get(key) ?? 0) + 1);

    if (sec.items.length === 1)
      notes.push(`tiny section  ${sec.id}  "${sec.label}"`);
    if (sec.items.length > 60)
      notes.push(
        `huge section  ${sec.id}  "${sec.label}" (${sec.items.length})`,
      );

    for (const it of sec.items) {
      if (it.primary) continue;
      const home = byId.get(it.homeDisciplineId);
      if (!home) continue;
      if (
        ["language", "framework", "tech"].includes(home.kind) &&
        !BUCKET_WORDS.test(sec.label)
      )
        notes.push(
          `odd reference  ${it.id}  "${it.label}" (home ${home.id}) in "${sec.label}"`,
        );
    }
  }

  for (const [label, n] of labels)
    if (n > 1) notes.push(`duplicate section label "${label}" x${n}`);

  const assign = remapLog.sections?.[d.id];
  if (assign) {
    const placed =
      (assign.edge ?? 0) + (assign.chain ?? 0) + (assign.spatial ?? 0);
    const spatialPct = placed
      ? Math.round(((assign.spatial ?? 0) / placed) * 100)
      : 0;
    if (spatialPct > 50)
      notes.push(
        `low-confidence layout  ${spatialPct}% of subtopics placed by spatial fallback (edge ${assign.edge ?? 0}, chain ${assign.chain ?? 0}, spatial ${assign.spatial ?? 0})`,
      );
  }

  const empty = d.sections.flatMap((s) =>
    s.items
      .filter((i) => !i.resources?.length)
      .map((i) => `${s.label} > ${i.label}`),
  );
  const cov = total ? Math.round((withRes / total) * 100) : 0;

  console.log(
    `\n== ${d.id} (${d.kind}) — ${d.sections.length} sections, ${total} skills, ${cov}% with resources`,
  );
  for (const n of notes) console.log(`  - ${n}`);
  if (empty.length && empty.length <= 15)
    console.log(`  - no resources: ${empty.join(" | ")}`);
  else if (empty.length)
    console.log(`  - no resources: ${empty.length} skills`);
}
