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

- Subtopics that belong together form vertical stacks: same x position,
  roughly 53px y-step between consecutive nodes.
- A stack belongs to a topic in one of three ways:
  1. A direct edge from a topic node to a subtopic node in the stack.
  2. A chain of subtopic-to-subtopic edges leading into a node that is
     already linked to a topic (for example: in the backend discipline,
     Redis stacks with Memcached, which edges into "Server Side," which is
     the actual topic — Redis is not directly linked to a topic).
  3. Spatial proximity only, when no edge evidence exists.
- Dense roadmaps (cyber-security, game-developer) use free-standing `label`
  nodes as sub-headers, positioned directly above a stack. This skill's
  parsing logic does NOT auto-detect these labels. Section-level fixes for
  labeled sub-groups are made manually in disciplines.overrides.json — see
  "Manual override workflow" below. Do not build automated label detection;
  this was evaluated and rejected as unnecessary complexity for a
  single-user tool.

## Assignment algorithm, in required order

Stop at the first method that produces an assignment. Do not skip ahead to
a later method if an earlier one succeeds.

1. Direct edge: any stack member with a direct topic edge assigns the whole
   stack. Multiple different topics among stack members: assign by vote
   count, tie-break by nearest.
2. Edge chain: breadth-first search over subtopic-to-subtopic edges, depth
   limit 3, looking for a node already assigned by method 1.
3. Spatial fallback: box-to-box bounding box distance (never
   center-to-center — wide topic boxes distort center-to-center distance).
   Restrict candidates to topics whose y position falls inside the stack's
   y-range expanded by 400px in both directions. If nothing qualifies,
   fall back to the globally nearest topic by box-to-box distance.

Record which method produced each assignment (1, 2, or 3) in the sync log.
Method 3 assignments are lower-confidence and should be flagged by
`scripts/audit-data.mjs`.

## Id preservation across re-fetch

Skill ids follow the pattern `<home-discipline>:<upstream-node-id>`. A
cross-linked row (a skill that appears in more than one discipline) carries
the id from its home discipline, not the discipline currently displaying it.
Re-fetching upstream data without preserving ids breaks every cross-link.

To preserve ids: build a map from normalized skill label to the prior row,
scoped to a single discipline (matching labels across different disciplines
caused false cross-links in an earlier version of this pipeline do not do
that again). For each newly parsed skill, if exactly one prior row in the
same discipline has a matching normalized label, reuse that row's `id`,
`homeDisciplineId`, `sources`, `prerequisites`, `related`, `resources` (only
where the new row's value is empty), and `primary` flag. Zero or multiple
matches: keep the freshly generated id.

## Sync log format

Write one entry per discipline to `remap.log.json`:

```json
{
  "<discipline-id>": {
    "matched": <number of skills that reused a prior id>,
    "newIds": ["<discipline>:<nodeId>", "..."]
  }
}
```

Print the total unmatched count to the console after the sync script runs.

## Manual override workflow

When the algorithm above places a skill in the wrong section (this is
expected for dense roadmaps with label sub-headers), do not modify the
parser. Instead, add a `moveSkills` or `renameSections` entry to
`app/data/disciplines.overrides.json` for that specific skill or section.
This keeps the parser simple and general, and keeps discipline-specific
corrections in one reviewable file.

## Validation steps to run after any change to this pipeline

1. `pnpm run sync:disciplines`
2. `pnpm run data:check`
3. `pnpm run data:audit`
4. Manually inspect: backend (Redis under Caching, GraphQL under APIs,
   NestJS under nodejs), system-design (caching stack), frontend (Testing,
   Module Bundlers).