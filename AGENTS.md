# AGENTS.md

This file is the operating manual for coding agents (and humans) touching this
repo. Read it before changing anything. Keep it current when you change
commands, storage keys, or the data pipeline.

## What this is

A **personal legibility tool**: an offline-first, single-user web app that
shows what the author is learning, how deep they are in each discipline, and
what they have actually applied. It is
*not* a learning platform, a multi-user product, or a backend service.

Non-negotiables:

- No accounts, no database, no required server state. All user state lives in
  the browser's `localStorage`, which is the source of truth. The Node server
  serves the SSR'd React app and an **optional** backup endpoint
  (`/api/state`, a JSON file under `DATA_DIR`). The app must keep working
  fully when that endpoint is missing or unreachable.
- Content comes from roadmap.sh (`nilbuild/developer-roadmap`, CC BY-SA 4.0,
  see `NOTICE.md`) plus the author's hand-curated overrides.
- Skill ids are the persistence key. Never rename or re-mint an existing skill
  id in generated data; moving skills between sections is fine.

## Stack

- React Router 7 in framework mode with SSR on (`react-router.config.ts`),
  React 19, TypeScript `strict`, Tailwind CSS 4 via `@tailwindcss/vite`,
  recharts for the radar, Vite 8.
- **pnpm only** (`packageManager` in `package.json`). Never commit a
  `package-lock.json` or `yarn.lock`. Node ≥ 22.18 (native TS type
  stripping, used by `pnpm test`).

## Commands

| Command                      | When                                                              |
| ---------------------------- | ----------------------------------------------------------------- |
| `pnpm install`               | after cloning / lockfile changes                                  |
| `pnpm run dev`               | dev server on :5173 (SW is *not* registered on localhost:port)    |
| `pnpm run typecheck`         | **must pass before you finish** (`react-router typegen && tsc`)   |
| `pnpm test`                  | **must pass** — `node --test "scripts/*.test.mjs"` (storage merge, check-ins, streaks) |
| `pnpm run build`             | production build → `build/`                                       |
| `pnpm run start`             | serve the build on :3000 (binds `::1` locally; set `HOST=0.0.0.0` in containers) |
| `pnpm run data:check`        | **must pass after any data change**; validates catalogue invariants |
| `pnpm run data:audit`        | heuristic report of misfiled skills; feeds the overrides file     |
| `pnpm run sync:disciplines`  | regenerate `app/data/disciplines.generated.json` (network, cached in `.cache/`) |
| `pnpm run icons`             | regenerate `public/icon*` + `favicon.ico` from the pixelarticons glyph in `scripts/gen-icons.mjs` |
| `pnpm run docker:build/run`  | local image on :3000                                              |

`typecheck` + `pnpm test` + `data:check` + a manual pass in the browser are
the verification bar. Tests are plain `node --test` files in
`scripts/*.test.mjs` that import pure modules (`app/lib/storage.ts`,
`app/lib/activity.ts`) directly — keep those modules free of runtime imports
so Node can load them without a bundler.

## Repo map

```
app/routes/            dashboard.tsx (/), browser.tsx (/browser?discipline=<id>),
                       api.state.ts (/api/state — GET/PUT backup, same-origin only)
app/components/
  browser/             SectionBlock, SkillRow, ResourceLinks, LearningResources, DisciplineDepthStepper
  dashboard/           HeaderBar, ActiveTracks (most-practiced disciplines), StatRow,
                       SkillMatrix (radar),
                       ActivityHeatmap, RecentActivity
  ui/                  Panel/PanelHeader/PanelBody, Pixel, Mono, ProgressBar, TierTag, Icon,
                       SecondaryButton/PrimaryButton, ItemSlot, Tooltip, Loader,
                       ThemeToggleButton
app/lib/
  storage.ts           localStorage shape (v3: progress, applied, hidden, events, checkins,
                       updatedAt) + v1/v2 migration; mergeStorage (device/server/import merge);
                       saveStorage returns boolean (false on quota/private-mode failure) — pure
  activity.ts          realEvents, dailyCounts, dayLevel, streakDays, deltaSince, lastTouched,
                       skillActivityDays, weeklyCounts, relativeTime, yearsWithActivity — pure, no React
  progress.ts          section/discipline/global Stats
  depth.ts             tierFor / calculateDepth / TIER_META — the ONLY place tiers are computed
  configExport.ts      JSON backup: buildExportConfig / downloadConfig / parseImport
  serverSync.ts        client mirror to /api/state (debounced PUT, retry, status, persist())
  stateStore.server.ts atomic JSON file store + daily snapshots under DATA_DIR
  theme.ts, cn.ts
app/hooks/             useProgress (all mutations), useTheme
app/data/
  disciplines.generated.json   GENERATED. Do not hand-edit. ~3.8 MB.
  disciplines.upstream.json    pinned content commit + layoutBaseUrl/contentRoot + include[]
                               (fetchFromUpstream → <layoutBaseUrl>/<upstreamId ?? id>.json;
                               upstreamPath optional, legacy repo file | source:"custom" | carried forward)
  disciplines.overrides.json   hand corrections: createSections, addSkills, dropSkills, dropResources,
                               unlinkSkills, moveSkills, renameSections, mergeSections, dropSections,
                               describeDisciplines
  resources.overrides.json     curated links keyed by skill id / section id / discipline id
  custom/<id>.json             hand-sectioned disciplines whose items are upstream content node ids
  index.ts                     types, DISCIPLINES, lookups (SKILL_BY_ID, SKILL_SECTION_BY_ID, …), KIND_META
  icons.ts                     discipline → glyph
scripts/
  sync-disciplines.mjs         the pipeline (see README "Data pipeline")
  validate-data.mjs            invariants; exits 1 on failure
  audit-data.mjs               heuristics
  gen-icons.mjs                app icon set generator (sharp + png-to-ico); swap GLYPH to re-theme
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
| split a big section along upstream's label sub-headers | `disciplines.overrides.json` → `createSections` | sync + data:check |
| add a skill row upstream doesn't carry (e.g. the Open Source LLMs list) | `disciplines.overrides.json` → `addSkills` | sync + data:check |
| change how sections are derived from the layout | `scripts/transform/parseUpstreamRoadmap.mjs` — read `.agents/skills/roadmap-section-assignment/SKILL.md` first | sync twice (2nd run must report `0 new ids`) + data:check |
| fix a row wrongly linked to another discipline | `disciplines.overrides.json` → `unlinkSkills`  | sync (recovers the real node by content slug when possible) |
| attach your own course/book/link to a topic    | `resources.overrides.json`                     | sync |
| add a discipline that has upstream JSON        | `disciplines.upstream.json` with `fetchFromUpstream: true`; optional `upstreamId` when the site slug differs (e.g. git → git-github) | sync |
| add a discipline without upstream JSON         | `app/data/custom/<id>.json` + `source: "custom"` entry | sync |
| find candidates for the above                  | `pnpm run data:audit`                          | — |

Never edit `disciplines.generated.json` by hand; the next sync would erase it.
The sync reads the *previous* generated file to preserve skill ids
(`preserveIds`), so keep it committed and never delete it before a sync.
`pnpm run data:check` errors on duplicate section labels within a
discipline and warns above 40 sections / 80 items per section.

## Progress model

- Status per skill: `learning | done | skipped` (absent = untouched).
  `applied: true` is orthogonal. The dashboard's "Active Tracks" panel is
  derived from event history — the top 3 disciplines by distinct active
  days in a rolling 30-day window (≥2 touched skills required; hidden
  excluded). There is no manual pinning.
- Tiers: `exploring` → `practicing` (≥40 % done and ≥40 % applied) →
  `fluent` (≥80 % / ≥60 %). `tierFor()` in `app/lib/depth.ts` is the single
  source of truth; do not reintroduce ad-hoc thresholds in components.
- `pct` in `progress.ts` excludes skipped skills from the denominator.
- Check-ins: `checkins[yyyy-mm-dd] = { on, at }`; un-checking keeps the entry
  with `on: false`. A heatmap day is active with an "on" check-in or ≥1
  learning event; `dayLevel()` and `streakDays()` in `activity.ts` own the
  rules.
- localStorage keys: `skill-tracker:v3`, `skill-tracker:sync`
  (`{ dirty, lastSyncedAt }`), `skill-tracker-theme`. Retired keys
  (`skill-tracker:custom-disciplines`, `skill-tracker:gist-sync`) are removed
  on load. The catalogue is always the bundled one.
- Every mutation goes through `useProgress.persist`, which stamps
  `updatedAt`, saves, and calls `markDirty` for the server mirror. Anything
  that combines two states (import, server sync) must use `mergeStorage` —
  never overwrite, or another device's changes are lost.

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
  `localhost:<port>`. Bump `CACHE_VERSION` (currently `v3`) whenever cached
  assets or the SW logic change. It must never intercept `/api/*`.

## Deploy

- `Dockerfile`: multi-stage, pnpm via corepack, runs as `node`,
  `HOST=0.0.0.0 PORT=3000 DATA_DIR=/data` (`VOLUME /data`, owned by `node`).
  `docker-compose.yml` has `dev` (bind mount, :5173; backup lands in the
  gitignored `./data`) and `prod` (named volume `skill-tracker-data:/data`).
- `.github/workflows/docker.yml` builds `linux/amd64,linux/arm64` and pushes
  `ghcr.io/bittricky/skill-tracker` on tags / `main`.


## Definition of done for an agent change

1. `pnpm run typecheck` and `pnpm test` pass.
2. If anything under `app/data/` or `scripts/` changed: `pnpm run sync:disciplines`
   (if applicable) and `pnpm run data:check` pass; `remap.log.json` reviewed.
3. `pnpm run build` passes; quick manual check of `/` and `/browser`.
4. README / this file updated if commands, storage keys, data files or deploy
   steps changed.
5. Nothing from `.cache/`, `build/`, `.react-router/`, `data/`, `.DS_Store` is staged.
