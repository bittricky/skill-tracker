# AGENTS.md

This file is the operating manual for coding agents (and humans) touching this
repo. Read it before changing anything. Keep it current when you change
commands, storage keys, or the data pipeline.

## What this is

A **personal legibility tool**: an offline-first, single-user web app that
shows what the author is learning, how deep they are in each discipline, and
what they have actually applied — like the skills screen in an RPG. It is
*not* a learning platform, a multi-user product, or a backend service.

Non-negotiables:

- No accounts, no database, no required server state. All user state is in the
  browser's `localStorage`. The Node server only serves the SSR'd React app.
- Content comes from roadmap.sh (`nilbuild/developer-roadmap`, CC BY-SA 4.0,
  see `NOTICE.md`) plus the author's hand-curated overrides.
- Skill ids are the persistence key. Never rename or re-mint an existing skill
  id in generated data; moving skills between sections is fine.

## Stack

- React Router 7 in framework mode with SSR on (`react-router.config.ts`),
  React 19, TypeScript `strict`, Tailwind CSS 4 via `@tailwindcss/vite`,
  recharts for the radar, Vite 8.
- **pnpm only** (`packageManager` in `package.json`). Never commit a
  `package-lock.json` or `yarn.lock`. Node ≥ 22.

## Commands

| Command                      | When                                                              |
| ---------------------------- | ----------------------------------------------------------------- |
| `pnpm install`               | after cloning / lockfile changes                                  |
| `pnpm run dev`               | dev server on :5173 (SW is *not* registered on localhost:port)    |
| `pnpm run typecheck`         | **must pass before you finish** (`react-router typegen && tsc`)   |
| `pnpm run build`             | production build → `build/`                                       |
| `pnpm run start`             | serve the build on :3000 (binds `::1` locally; set `HOST=0.0.0.0` in containers) |
| `pnpm run data:check`        | **must pass after any data change**; validates catalogue invariants |
| `pnpm run data:audit`        | heuristic report of misfiled skills; feeds the overrides file     |
| `pnpm run sync:disciplines`  | regenerate `app/data/disciplines.generated.json` (network, cached in `.cache/`) |
| `pnpm run docker:build/run`  | local image on :3000                                              |

There is no unit-test suite; `typecheck` + `data:check` + a manual pass in the
browser are the verification bar. If you add pure logic worth testing, a
`node --test` script under `scripts/` is the lightest fit.

## Repo map

```
app/routes/            dashboard.tsx (/), browser.tsx (/browser?discipline=<id>)
app/components/
  browser/             SectionBlock, SkillRow, ResourceLinks, LearningResources, DisciplineDepthStepper
  dashboard/           HeaderBar, ActiveTracks (pinned skills), StatRow, SkillMatrix (radar)
  ui/                  Panel/PanelHeader/PanelBody, Pixel, Mono, ProgressBar, TierTag, Icon,
                       SecondaryButton/PrimaryButton, ItemSlot, Tooltip, Loader,
                       SettingsButton, SettingsModal, ThemeToggleButton
app/lib/
  storage.ts           localStorage shape (v2: progress, applied, pinned) + v1 migration
  progress.ts          section/discipline/global Stats
  depth.ts             tierFor / calculateDepth / TIER_META — the ONLY place tiers are computed
  configExport.ts      export / validate / import / reset
  gistSync.ts          GitHub Gist push/pull (handles `truncated` files)
  theme.ts, cn.ts
app/hooks/             useProgress (all mutations), useTheme
app/data/
  disciplines.generated.json   GENERATED. Do not hand-edit. ~3.8 MB.
  disciplines.upstream.json    pinned repo/commit + include[] (fetchFromUpstream | source:"custom" | carried forward)
  disciplines.overrides.json   hand corrections: dropSkills, unlinkSkills, moveSkills, renameSections, mergeSections, dropSections, describeDisciplines
  resources.overrides.json     curated links keyed by skill id / section id / discipline id
  custom/<id>.json             hand-sectioned disciplines whose items are upstream content node ids
  index.ts                     types, DISCIPLINES, lookups (SKILL_BY_ID, SKILL_SECTION_BY_ID, …), KIND_META
  icons.ts                     discipline → glyph
scripts/
  sync-disciplines.mjs         the pipeline (see README "Data pipeline")
  validate-data.mjs            invariants; exits 1 on failure
  audit-data.mjs               heuristics
  transform/                   parseUpstreamRoadmap, fetchContentResources, applyLinkingFixes,
                               applyOverrides, normalizeResources, remapPrereqs
public/                        manifest.webmanifest, sw.js (bump CACHE_VERSION when cached assets change), icons
.github/workflows/docker.yml   multi-arch image → GHCR
```

## Data model and invariants

`Discipline { id, label, kind, color, sections[], resources? }` →
`Section { id: "<disc>:sec:<x>", label, items[], resources? }` →
`Skill { id, label, resources[], sources[], prerequisites[], primary, homeDisciplineId, upstreamNodeId }`.

- Skill id is `<homeDisciplineId>:<upstreamNodeId>` (or `<disc>:<slug>` for
  hand-authored rows). The same skill can appear in several disciplines; each
  appearance is a row. Exactly **one** row has `primary: true` and it lives in
  `homeDisciplineId`. Reference rows may carry stale/empty `resources`; the UI
  reads the home record via `SKILL_BY_ID`.
- `sources[]` is the exact set of disciplines the skill appears in, and
  `homeDisciplineId ∈ sources`.
- Section ids are unique and never empty. Resource kinds ⊆
  `article video course podcast book opensource website official roadmap`.
- `pnpm run data:check` enforces all of the above. Coverage < 90 % is a
  warning (`--strict` makes it an error); `cpp` and `datastructures-and-algorithms`
  are known upstream gaps.

### How to change data

| You want to…                                   | Edit                                           | Then |
| ---------------------------------------------- | ---------------------------------------------- | ---- |
| move / drop / rename / merge a skill or section | `disciplines.overrides.json`                   | sync + data:check |
| fix a row wrongly linked to another discipline | `disciplines.overrides.json` → `unlinkSkills`  | sync (recovers the real node by content slug when possible) |
| attach your own course/book/link to a topic    | `resources.overrides.json`                     | sync |
| add a discipline that has upstream JSON        | `disciplines.upstream.json` with `fetchFromUpstream`, `upstreamPath`, optional `contentSlug` | sync |
| add a discipline without upstream JSON         | `app/data/custom/<id>.json` + `source: "custom"` entry | sync |
| find candidates for the above                  | `pnpm run data:audit`                          | — |

Never edit `disciplines.generated.json` by hand; the next sync would erase it.

## Progress model

- Status per skill: `learning | done | skipped` (absent = untouched).
  `applied: true` is orthogonal. `pinned: string[]` holds up to
  `MAX_PINNED` (3) skill ids for the dashboard.
- Tiers: `exploring` → `practicing` (≥40 % done and ≥40 % applied) →
  `fluent` (≥80 % / ≥60 %). `tierFor()` in `app/lib/depth.ts` is the single
  source of truth; do not reintroduce ad-hoc thresholds in components.
- `pct` in `progress.ts` excludes skipped skills from the denominator.
- localStorage keys: `skill-tracker:v2`, `skill-tracker:custom-disciplines`,
  `skill-tracker:gist-sync`, `skill-tracker-theme`. Exports embed the
  catalogue only when it is custom or explicitly requested; importing the
  bundled catalogue must not pin it as custom (`isBuiltInCatalogue`).

## UI conventions

- Design language: "cozy game menu" — warm matte palette, rounded panels,
  VT323 display font (`Pixel`) + JetBrains Mono body (`Mono`). Tokens live in
  `app/app.css` under `@theme` (dark) and `[data-theme="light"]`. Use
  `var(--color-…)` / Tailwind classes like `bg-surface-panel`,
  `text-accent-mustard`; never hard-code hex in components.
- Accents and their meaning: mustard = active/practicing, coral =
  exploring/danger, teal = done/fluent, lavender = applied/resources,
  rose = misc.
- Compose from primitives (`Panel`, `PanelHeader`, `Pixel`, `Mono`,
  `ProgressBar`, `TierTag`, `Icon`, `SecondaryButton`) before adding new ones.
  Discipline glyphs come from `iconForDiscipline()`.
- Mobile-first grids (`grid-cols-1 lg:grid-cols-[280px_1fr]`, etc.). Check
  ~375 px width; the PWA is meant to be used from a phone too.
- SSR-safe: guard `window`/`localStorage` behind `typeof window` and render
  `Loader` until `loaded`. Avoid hydration mismatches (see `ThemeToggleButton`).
- Don't add comments to code you didn't otherwise change, and don't add
  dependencies without a concrete need (check `package.json` first).

## Service worker / PWA

- `public/sw.js` is registered from `root.tsx` only when *not* on
  `localhost:<port>`. Bump `CACHE_VERSION` whenever cached assets or the SW
  logic change.

## Deploy

- `Dockerfile`: multi-stage, pnpm via corepack, runs as `node`,
  `HOST=0.0.0.0 PORT=3000`. `docker-compose.yml` has `dev` (bind mount,
  :5173) and `prod` targets.
- `.github/workflows/docker.yml` builds `linux/amd64,linux/arm64` and pushes
  `ghcr.io/bittricky/skill-tracker` on tags / `main`.


## Definition of done for an agent change

1. `pnpm run typecheck` passes.
2. If anything under `app/data/` or `scripts/` changed: `pnpm run sync:disciplines`
   (if applicable) and `pnpm run data:check` pass; `remap.log.json` reviewed.
3. `pnpm run build` passes; quick manual check of `/` and `/browser`.
4. README / this file updated if commands, storage keys, data files or deploy
   steps changed.
5. Nothing from `.cache/`, `build/`, `.react-router/`, `.DS_Store` is staged.
