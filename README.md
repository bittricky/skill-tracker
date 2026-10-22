# Skill Tracker

> This is more of a [legibility](https://www.youtube.com/shorts/bej9ZXkIyaU) tool than a learning platform.

A personal, offline-first, installable skill progression tracker built on
top of data collected and organized from [roadmap.sh](https://roadmap.sh)
roadmaps.

Progress is stored locally in the browser. No accounts, no mandatory server.
When self-hosted, the app's own server keeps an optional automatic backup
that also syncs progress across devices; JSON export/import works anywhere.

## Features

- **Discipline catalogue** grouped by kind: Role, Foundation, Language,
  Framework, Tech — 47 disciplines, ~4.5k unique skills.
- **Cross-discipline skill linking** — e.g. `What is HTTP?` is owned by HTML
  and referenced from Frontend and Backend. Reference rows show the home
  discipline's resources and link back to it.
- **Two-axis progress model**:
  - _Status_ (`learning | done | skipped`) tracks what you've studied.
  - _Applied_ flag tracks what you've actually used in practice.
- **Depth tiers** — per-discipline rollup of status + applied, shown as a
  three-step stepper: **Exploring → Practicing → Fluent**. One formula, in
  `app/lib/depth.ts`:
  - Practicing: ≥40% done & ≥40% applied.
  - Fluent: ≥80% done & ≥60% applied.
- **Active Tracks** (dashboard) — the three disciplines you've practiced most
  in the last 30 days, derived automatically from your activity. Ranked by
  distinct active days (a binge counts once), ties broken by most recent
  touch; a discipline needs at least two touched skills to qualify, and
  hidden disciplines never surface.
- **Skill matrix radar** (dashboard) plots done / applied / active per
  discipline with kind filters.
- **Activity heatmap** (dashboard) — a habit tracker on a GitHub-style
  calendar-year grid. A day is active with a manual check-in or at least
  one skill marked learning/done/applied. Intensity: check-in only → level
  1; 1 event → 2; 2–3 → 3; 4+ → 4. Click any past day (or **Check in
  today**) to toggle its check-in. Streaks survive an empty today as long as
  yesterday was active.
- **Recent activity** (dashboard) — the last ten changes, grouped by day,
  deep-linking back to the skill (`/browser?discipline=<id>#skill-<id>`).
- **Hidden disciplines** — hide disciplines from dashboard rollups via the
  eye toggle in the browser sidebar; they stay fully browsable.
- **Self-hosted fonts** — VT323 + JetBrains Mono ship via `@fontsource`; no
  third-party requests on page load.
- **Learning Resources** panel per discipline: your curated links
  (`app/data/resources.overrides.json`) plus every course/book roadmap.sh
  attaches to a skill, grouped by section.
- **Backup & sync** (header icons) — export / import a JSON backup, plus an
  automatic merge-based backup to the self-hosted server with a sync-status
  indicator. See [Backup & sync](#backup--sync).
- **Installable PWA** — works offline after first visit when served over
  HTTPS (or `localhost`). Manifest, icons, and a vanilla service worker are
  included.
- **Light/dark theme** with persistent preference.

## Progress persistence

All state is stored client-side under `localStorage` (the source of truth):

| Key                   | Contents                                                                 |
| --------------------- | ------------------------------------------------------------------------ |
| `skill-tracker:v3`    | `{ progress, applied, hidden, events, checkins, updatedAt }`             |
| `skill-tracker:sync`  | `{ dirty, lastSyncedAt }` — whether local changes still need a backup    |
| `skill-tracker-theme` | `"light" \| "dark"`                                                      |

The legacy `skill-tracker:v1` (progress-only) and `skill-tracker:v2`
(no `hidden`/`events`) keys are auto-migrated on first load — the migration
seeds synthetic timeline events that don't count toward streaks. `checkins`
maps a local day (`yyyy-mm-dd`) to `{ on, at }`; un-checking keeps the entry
with `on: false` so merges can't resurrect it. Keys from removed features
(`skill-tracker:custom-disciplines`, `skill-tracker:gist-sync`) are deleted on
load. The app also asks the browser for persistent storage
(`navigator.storage.persist()`) so it isn't evicted under disk pressure or by
Safari's 7-day rule. Skill ids are the persistence key, so the data pipeline
never renames ids — moving a skill between sections keeps your progress.

## Project structure

```
app/
  components/
    browser/               Discipline detail UI (sections, skill rows, depth stepper, sparkline, learning resources)
    dashboard/             Dashboard UI (active tracks, stat row, skill matrix, activity heatmap, recent activity, header)
    ui/                    Primitives (Panel, Pixel, Mono, ProgressBar, TierTag, Icon, ThemeToggleButton, …)
  data/
    disciplines.generated.json  GENERATED — never hand-edit
    disciplines.upstream.json   Pinned content commit + layoutBaseUrl/contentRoot + include list
    disciplines.overrides.json  Hand corrections (create / drop / unlink / move / rename / merge / dropResources)
    resources.overrides.json    Your curated links (skill / section / discipline level)
    custom/golang.json          Hand-sectioned discipline built from upstream content nodes
    index.ts                    Types + runtime exports and lookups
    icons.ts                    Discipline → glyph map
  hooks/                   useProgress, useTheme
  lib/                     storage (+ mergeStorage), progress (stats), depth (tiers), activity (streaks/levels),
                           configExport (JSON backup), serverSync (client backup), stateStore.server (file store), theme
  routes/                  dashboard (/), browser (/browser?discipline=<id>), api.state (/api/state backup endpoint)
  app.css                  Theme tokens (dark + light), fonts, scrollbar
  root.tsx                 Layout, manifest link, SW registration, error boundary
public/                    manifest.webmanifest, sw.js, icons
scripts/
  sync-disciplines.mjs     Upstream → transform → overrides → disciplines.generated.json
  validate-data.mjs        Invariant checks (pnpm run data:check)
  storage.test.mjs         Merge / check-in / streak tests (pnpm test)
  audit-data.mjs           Heuristic report of suspicious placements (pnpm run data:audit)
  transform/               Pure transform steps used by the sync
```

## Getting started

Requires **Node.js 22.18+** and **pnpm** (pinned via `packageManager`; `corepack enable`
if you don't have it).

```bash
pnpm install
pnpm run dev          # http://localhost:5173
```

| Command                     | Purpose                                                          |
| --------------------------- | ---------------------------------------------------------------- |
| `pnpm run dev`              | React Router dev server with HMR                                 |
| `pnpm run build`            | Production build into `build/`                                   |
| `pnpm run start`            | Serve the production build on :3000                              |
| `pnpm run typecheck`        | React Router typegen + `tsc`                                     |
| `pnpm test`                 | `node --test` for storage merge / check-ins / streaks            |
| `pnpm run data:check`       | Validate `disciplines.generated.json` invariants                 |
| `pnpm run data:audit`       | Print suspicious placements to extend the overrides file         |
| `pnpm run sync:disciplines` | Regenerate the catalogue from the pinned upstream + overrides    |
| `pnpm run docker:build`     | Build the production image locally                               |
| `pnpm run docker:run`       | Run it on :3000                                                  |

## Data pipeline

```
disciplines.upstream.json ──┐
  fetchFromUpstream entries ─┼─► parseUpstreamRoadmap (site React Flow JSON
  source: "custom" entries ──┤   at <layoutBaseUrl>/<slug>.json → sections:
  carried-forward entries ───┘   stacks → topic by edge+connector / edge-chain /
            │                    spatial fallback) ─► preserveIds (keep skill ids
            │                    from the prior payload: node id → oldId → label)
            ▼
  fetchContentResources  ── per-node roadmaps/<slug>/content/*.md at the
            │                pinned commit (contentRoot)
            │              fills empty resources[] and missing labels
            ▼
  applyLinkingFixes ─► applyDisciplineOverrides ─► applyLinkingFixes
            │                      (create / drop / unlink / move / rename / merge)
            ▼
  applyResourceOverrides ─► normalizeResources ─► remapPrereqs
            │
            ▼
  disciplines.generated.json  +  remap.log.json
```

The pinned `commit` now governs **content markdown only** — since the 2026
upstream restructure the repo holds just `roadmaps/<slug>/content/` (set via
`contentRoot`), while the React Flow layout is fetched live from
`<layoutBaseUrl>/<slug>.json` (default `https://roadmap.sh`). The site JSON
is unversioned, so the copy cached under `.cache/upstream/<commit>/site/` is
the reproducibility record for a given generated catalogue. `upstreamPath`
remains as an optional legacy override for repo-resident layout files.
Directory listings use the GitHub REST API (60 req/h anonymous); set
`GITHUB_TOKEN` if you hit the limit. Everything is cached under `.cache/`.

Disciplines with `fetchFromUpstream` are re-derived from the live site
layout on every sync (skill ids are preserved, so progress survives). The 11
carried-forward content-only disciplines (html, css, shell-bash, nextjs,
docker, django, kotlin, scala, swift-ui, network-engineer, elasticsearch)
now have site layouts available but were deliberately not re-derived this
pass, and Go is hand-authored in `app/data/custom/golang.json`. The
catalogue currently holds 47 disciplines / ~4.5k unique skills.

To fix a misfiled skill, add an entry to `disciplines.overrides.json` and
re-run the sync. Sub-headings that roadmap.sh draws as free-floating labels
(cyber-security, computer-science) become sections through `createSections`
there. To attach your own course/book/article to a topic, add it to
`resources.overrides.json` keyed by skill id, section id or discipline id.
See `.agents/skills/roadmap-section-assignment/SKILL.md` for the parser's
rules and the id-preservation contract.

## Backup & sync

Three layers, all optional to the app's core (which works offline from
`localStorage` alone):

1. **Persistent storage** — the app calls `navigator.storage.persist()` so
   the browser doesn't evict your data.
2. **Export / import** (download / upload icons in the header). Export
   downloads `{ version, progress, applied, hidden, events,
   checkins, updatedAt }`. Import **merges** the file into your current
   progress — it never deletes anything, and importing the same file twice
   is a no-op. Older exports (including ones with an embedded `disciplines`
   catalogue or a `pinned` list, which are ignored) still import.
3. **Automatic server backup** — when served by the app's own Node server
   (Docker / `pnpm run start` / dev), progress is mirrored to
   `GET`/`PUT /api/state`:
   - Changes are pushed 2s after the last edit. Offline edits stay in
     `localStorage` (`dirty`) and are retried when the network returns,
     when the tab becomes visible, and on the next load.
   - The **server merges** each push with its copy and returns the result,
     so several devices can edit safely: per skill, the most recent
     status/applied change wins; event histories are unioned; per day, the
     latest check-in toggle wins; `hidden` comes from the most
     recently edited snapshot.
   - The header icon shows the state: ✓ backed up · ⬆ pending · ✕ error ·
     unlinked = no backup server (static hosting) — the app still works.
   - Stored in `$DATA_DIR/state.json` (default `./data`, `/data` in Docker),
     written atomically, with daily snapshots in `$DATA_DIR/snapshots/`
     (last 14 kept). To roll back, stop the container and copy a snapshot
     over `state.json`.
   - **Security**: requests must come from the app's own origin
     (`Sec-Fetch-Site` / `Origin` checks); there is no login. Keep the server
     on your LAN or behind Tailscale rather than the public internet.

## Deploying

### Docker

```bash
pnpm run docker:build && pnpm run docker:run      # http://localhost:3000
```

The image is multi-stage, pnpm-based, runs as `node`, and listens on
`0.0.0.0:3000`. The server backup lives in the `/data` volume
(`DATA_DIR`); `docker compose up -d prod` mounts the named volume
`skill-tracker-data` there so it survives rebuilds. With plain
`docker run`, add `-v skill-tracker-data:/data`. Multi-arch builds (`linux/amd64,linux/arm64`) are published
to GHCR by `.github/workflows/docker.yml` on tags and pushes to `main`.

## Tech stack

React Router 7 (SSR) · React 19 · TypeScript · Tailwind CSS 4 · recharts ·
pixelarticons glyphs · Vite 8 · pnpm

## Data source

See `NOTICE.md` for attribution and licensing (CC BY-SA 4.0 upstream content).
