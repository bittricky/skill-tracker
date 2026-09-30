---
name: roadmap-section-assignment
description: >
  Use this skill when re-deriving discipline sections from upstream
  roadmap.sh React Flow layout JSON, when debugging incorrect section
  placement for a skill in the tracker, when modifying
  parseUpstreamRoadmap.mjs or sync-disciplines.mjs, or when a discipline's
  skills appear grouped into the wrong or too few sections.
---

## Purpose

Upstream roadmap.sh layouts are React Flow diagrams: topic nodes, subtopic
nodes, edges between them, x/y positions, and occasional label nodes. This
skill converts that layout into this project's discipline/section/skill
data structure, and preserves stable skill ids across re-fetches.

## Layout semantics (read this before touching the parser)

- Subtopics that belong together form vertical stacks: same x position
  (within 8px), 4–6px vertical gap between consecutive 49px-tall nodes.
- A stack belongs to a topic in one of three ways:
  1. A direct edge from a topic node to a subtopic node in the stack.
  2. A chain of subtopic-to-subtopic edges leading into a stack that is
     already linked to a topic (for example: in the backend discipline,
     Redis stacks with Memcached, which edges into "Server Side," which is
     the actual topic — Redis is not directly linked to a topic).
  3. Spatial proximity only, when no edge evidence exists. Edges cover only
     ~20–50% of subtopics; in redis/cyber-security it is under 5%, so the
     spatial fallback does most of the work there.
- Stacks sit *beside* their topic, in the same row. A topic directly below
  a stack is usually the *next* row's topic, not the owner. This is why the
  spatial distance weights the vertical gap ×2 (`Y_WEIGHT`).
- Dense roadmaps (cyber-security, computer-science, devops) use
  free-standing `label` nodes as sub-headers above a stack. The parser does
  NOT auto-detect these labels — that was evaluated and rejected as
  unnecessary complexity for a single-user tool. Sub-groupings become
  sections through `createSections` in `disciplines.overrides.json` (see
  "Manual override workflow").
- 11 disciplines have no layout JSON upstream at the pinned commit (html,
  css, shell-bash, nextjs, docker, django, kotlin, scala, swift-ui,
  network-engineer, elasticsearch). They are carried forward from the prior
  payload and can only be improved by hand-authoring `app/data/custom/<id>.json`
  like `golang`.

## Assignment algorithm (implemented in `scripts/transform/parseUpstreamRoadmap.mjs`)

`transformUpstreamRoadmap(raw, entry)`:

1. Classify nodes: `topic` → section; `subtopic` (and unknown types with a
   label) → skill; nodes with `data.href` dropped; decorative types ignored
   (`title paragraph button vertical horizontal section label legend …`).
2. `detectStacks(subtopics)` buckets by x (`STACK_X_TOLERANCE` 8px), sorts
   each bucket by y, splits where the gap exceeds `STACK_MAX_GAP` 12px.
   Returns `{ nodes, bbox }[]`.
3. Assign each stack, three passes over all stacks (a stack placed in an
   earlier pass is never revisited):
   - **edge** — any member with a topic↔subtopic edge; majority vote among
     members, tie → nearest topic by box distance.
   - **chain** — BFS over subtopic↔subtopic edges from the stack, depth ≤
     `CHAIN_DEPTH` 3, into a stack placed by *edge*.
   - **spatial** — box-to-box distance (never centre-to-centre; wide topic
     boxes distort that), dy weighted by `Y_WEIGHT` 2. Candidates are
     topics whose box overlaps the stack's y-range ± `ROW_BAND` 400px; if
     none, all topics.
4. Sections are topics in reading order (y, then x); id is
   `<disc>:sec:<topicNodeId>` (the legacy import used the same tail, so
   old override targets still resolve). The topic itself is item 0. Stacks
   within a section are ordered by (y, x).
5. Every item carries `_assign: "topic" | "edge" | "chain" | "spatial"`.
   `sync-disciplines.mjs` strips it (`stripAssign`) and records counts per
   discipline under `sections` in the log. `audit-data.mjs` prints a
   `low-confidence layout` note when > 50% of a discipline's subtopics were
   placed spatially — check those disciplines by eye.

Tuning history: without `Y_WEIGHT` the nodejs frameworks stack (dx 206 to
"Building & Consuming APIs", dy 167 to "Testing") went to Testing. Lone
nodes remain ambiguous (frontend "Vitest" is 56px below Module Bundlers and
207px left of Testing) — fix those with `moveSkills`, not by tuning.

## Id preservation across re-fetch (`preserveIds` in `scripts/sync-disciplines.mjs`)

Skill ids follow `<home-discipline>:<upstream-node-id>` and are the
localStorage key, so they must survive a re-derivation. A cross-linked row
(a skill shown in more than one discipline) carries the id of its home
discipline (`homeDisciplineId`), `primary: false`, and membership in
`sources[]`.

`preserveIds(next, prior)` runs inside the `fetchFromUpstream` branch of
the `include` loop in `main()`, against `priorById.get(entry.id)` (the
prior generated payload — do not add a second lookup). It matches each
freshly parsed item to a prior row of the **same discipline only**
(cross-discipline label matching is how false cross-links were minted in
phase 1 — never do that again):

1. **Pass 1 — `upstreamNodeId`**, authoritative. Runs over all items before
   any label matching because upstream has duplicate labels (two
   "Validation" nodes in graphql, two "Next.js" in frontend); if label
   matching ran first, the duplicate would steal the id and the real node
   would collide with it.
2. **Pass 2 — unique normalized label** (lowercase, whitespace collapsed,
   trailing punctuation stripped). Restores reference rows, whose node id
   belongs to another discipline. Ambiguous labels (2+ prior rows) never
   match.

On match the item takes the prior `id`, `homeDisciplineId`, `sources`,
`prerequisites`, `related`, `primary`, and `resources` if its own are
empty; a reference row also takes the prior `upstreamNodeId`, a primary row
keeps the freshly parsed node id. Section placement always comes from the
new parse. Each prior row is used at most once; a fresh-id collision inside
a discipline is printed as `! id collision`.

Invariants to keep: re-running the sync on its own output must report
`0 new ids`; no id present in the previous `disciplines.generated.json` may
disappear (`git diff` the id set if in doubt).

## Sync log format

`remap.log.json` is fully overwritten on every run of
`scripts/sync-disciplines.mjs`, in a single `writeFile` call inside `main()`.
Top-level keys, assembled together right before that write:

```json
{
  "prereqs": { "rewritten": [...], "dropped": [...], "kept": <n> },
  "overrides": { "dropped": [...], "droppedResources": [...], "moved": [...], "renamed": [...], "merged": [...], "created": [...], "unlinked": [...], "missing": [...] },
  "resourceOverrides": { "applied": { "skills": <n>, "sections": <n>, "disciplines": <n> }, "missing": [...] },
  "idPreservation": { "<discipline>": { "matched": <n>, "byNode": <n>, "byLabel": <n>, "newIds": ["<disc>:<nodeId>", "..."] } },
  "sections": { "<discipline>": { "topic": <n>, "edge": <n>, "chain": <n>, "spatial": <n> } }
}
```

The console prints one summary line per stage; `id preservation: N kept,
M new ids; S items placed spatially` is the one to watch after a re-fetch.

## Manual override workflow

When the algorithm places a skill in the wrong section, do not modify the
parser. Edit `app/data/disciplines.overrides.json` (schema in
`scripts/transform/applyOverrides.mjs`), then run the sync. Operations, in
the order they are applied:

- `createSections` — `{ in, id, label, after, skills[] }` makes
  `<in>:sec:<id>` after the section `after` (id or label) and moves the
  listed skills into it. This is how upstream label sub-headers become
  sections (cyber-security 6 → 37 sections). Runs first so `moveSkills`
  can target the new label.
- `unlinkSkills` — replace a wrongly cross-linked reference row with a
  primary row of `in`, recovering the real upstream node by content slug.
  Once the sync has run, the fix is baked into the generated payload and
  preserved by `preserveIds`; the entry then reports `missing`, so remove
  it (the phase-1 entries were removed this way — see the file's
  `$comment`).
- `dropSkills`, `dropResources` (strip a resource whose `label url` matches a
  substring from every row of a skill), `moveSkills` (`toSection` = section id
  or label within `in`), `renameSections`, `mergeSections`, `dropSections`,
  `describeDisciplines`.

`renameSections` should be rare now: topic labels come straight from
upstream. Use it only for genuine upstream duplicates (game-developer has
two "Game AI" topics; `data:check` errors on duplicate labels).

To draft `createSections` entries for a dense roadmap, read the upstream
JSON's `label` nodes and the stacks directly beneath them, resolve the
node ids to current skill ids, then review and relabel by hand — several
upstream labels are instructions ("Understand the following") rather than
names, and a few sit closer to a neighbouring stack than their own.

## Validation steps to run after any change to this pipeline

1. `pnpm run sync:disciplines` — expect `0 missing` overrides and, on a
   second run, `0 new ids`.
2. `pnpm run data:check` — must pass; duplicate section labels are errors,
   > 40 sections / > 80 items are warnings.
3. `pnpm run data:audit` — `odd reference` count (baseline after phase 2: 9)
   and `low-confidence layout` notes.
4. Manually inspect: backend (Redis under Caching, GraphQL under Learn
   about APIs, CSP/OWASP under Web Security), nodejs (NestJS/Express/Hono
   under Building & Consuming APIs), system-design (caching stack under
   Caching), frontend (Jest/Vitest/Cypress under Testing; Vite/Webpack
   under Module Bundlers), vue (v-* under Directives).
