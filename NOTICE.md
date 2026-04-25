# Notice

This project incorporates content derived from the
[`kamranahmedse/developer-roadmap`](https://github.com/kamranahmedse/developer-roadmap)
project.

The upstream content is licensed under
[Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/).
Per that license, derived content distributed by this project is also made
available under CC BY-SA 4.0.

## What is derived

The file `app/data/disciplines.generated.json` is produced by
`scripts/sync-disciplines.mjs` from upstream JSON pinned at the commit recorded
in `app/data/disciplines.upstream.json` (field: `commit`). The transform:

- Carries forward content from earlier syncs that originated upstream.
- Fetches `src/data/roadmaps/<slug>/<slug>.json` from the pinned commit for
  any include flagged `fetchFromUpstream: true` (currently: `git`).
- Reshapes upstream React Flow nodes into the project's `Discipline` /
  `Section` / `Skill` shape.
- Applies linking corrections (dedupe within discipline, recompute `sources[]`,
  normalize section ids, fix `homeDisciplineId`, remap orphan prerequisites).

## How to refresh

```bash
# 1. Edit `app/data/disciplines.upstream.json` — bump `commit`, add/remove
#    entries.
# 2. Run:
npm run sync:disciplines
# 3. Review `app/data/remap.log.json` for any rewritten or dropped prereq
#    edges, and commit the regenerated `app/data/disciplines.generated.json`.
```

## Attribution

Original content © Kamran Ahmed and contributors to
`kamranahmedse/developer-roadmap`. See the upstream repository for the full
list of contributors. Modifications and the surrounding application code are
© Mitul Patel.
