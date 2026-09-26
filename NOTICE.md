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
  any include flagged `fetchFromUpstream: true` (currently: `cpp`, `flutter`,
  `git`).
- Reads the per-node markdown under `src/data/roadmaps/<slug>/content/` at the
  pinned commit to fill resource lists and skill titles (also used for the
  hand-sectioned `golang` discipline in `app/data/custom/golang.json`, whose
  node ids and resources are upstream content).
- Reshapes upstream React Flow nodes into the project's `Discipline` /
  `Section` / `Skill` shape.
- Applies linking corrections (dedupe within discipline, recompute `sources[]`,
  normalize section ids, fix `homeDisciplineId`, remap orphan prerequisites)
  and the hand-maintained corrections in `app/data/disciplines.overrides.json`.

Links in `app/data/resources.overrides.json` are curated by the project author
and are not derived from upstream.

## How to refresh

```bash
# 1. Edit `app/data/disciplines.upstream.json` — bump `commit`, add/remove
#    entries.
# 2. Run:
pnpm run sync:disciplines && pnpm run data:check
# 3. Review `app/data/remap.log.json` for override/prereq changes, and commit
#    the regenerated `app/data/disciplines.generated.json`.
```

## Attribution

Original content © Kamran Ahmed and contributors to
`kamranahmedse/developer-roadmap`. See the upstream repository for the full
list of contributors. Modifications and the surrounding application code are
© Mitul Patel.
