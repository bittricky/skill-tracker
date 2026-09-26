# Skill Tracker

> This is more of a legibility tool than a learning platform.

A personal, offline-first, installable skill progression tracker built on
top of data collected and organized from [roadmap.sh](https://roadmap.sh)
roadmaps.

Progress is stored locally in the browser. No accounts, no mandatory server.
Optional GitHub Gist sync (your token, your data) covers cross-device use.

## Features

- **Discipline catalogue** grouped by kind: Role, Foundation, Language,
  Framework, Tech — 47 disciplines, ~3.7k unique skills.
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
- **Pinned skills** — star up to three skills in the browser; they appear as
  "Active Tracks" on the dashboard.
- **Skill matrix radar** (dashboard) plots done / applied / active per
  discipline with kind filters.
- **Learning Resources** panel per discipline: your curated links
  (`app/data/resources.overrides.json`) plus every course/book roadmap.sh
  attaches to a skill, grouped by section.
- **Settings modal** (gear icon, top-right) — JSON export / import, reset,
  and optional GitHub Gist sync.
- **Custom catalogues** — export with "include catalogue", edit the JSON to
  define your own disciplines/sections/skills, import it back.
- **Installable PWA** — works offline after first visit when served over
  HTTPS (or `localhost`). Manifest, icons, and a vanilla service worker are
  included.
- **Light/dark theme** with persistent preference.

## Progress persistence

All state is stored client-side under `localStorage`:

| Key                                | Contents                                    |
| ---------------------------------- | ------------------------------------------- |
| `skill-tracker:v2`                 | `{ progress, applied, pinned }`             |
| `skill-tracker:custom-disciplines` | Optional user-authored discipline catalogue |
| `skill-tracker:gist-sync`          | `{ token, gistId, lastSyncedAt }` for sync  |
| `skill-tracker-theme`              | `"light" \| "dark"`                         |

The legacy `skill-tracker:v1` key (progress-only) is auto-migrated on first
load. Skill ids are the persistence key, so the data pipeline never renames
ids — moving a skill between sections keeps your progress.

## Project structure

```
app/
  components/
    browser/               Discipline detail UI (sections, skill rows, depth stepper, learning resources)
    dashboard/             Dashboard UI (active tracks, stat row, skill matrix, header)
    ui/                    Primitives (Panel, Pixel, Mono, ProgressBar, TierTag, Icon, SettingsModal, …)
  data/
    disciplines.generated.json  GENERATED — never hand-edit
    disciplines.upstream.json   Pinned upstream commit + include list
    disciplines.overrides.json  Hand corrections (drop / unlink / move / rename / merge)
    resources.overrides.json    Your curated links (skill / section / discipline level)
    custom/golang.json          Hand-sectioned discipline built from upstream content nodes
    index.ts                    Types + runtime exports (+ custom override loader)
    icons.ts                    Discipline → glyph map
  hooks/                   useProgress, useTheme
  lib/                     storage, progress (stats), depth (tiers), configExport, gistSync, theme
  routes/                  dashboard (/), browser (/browser?discipline=<id>)
  app.css                  Theme tokens (dark + light), fonts, scrollbar
  root.tsx                 Layout, manifest link, SW registration, error boundary
public/                    manifest.webmanifest, sw.js, icons
scripts/
  sync-disciplines.mjs     Upstream → transform → overrides → disciplines.generated.json
  validate-data.mjs        Invariant checks (pnpm run data:check)
  audit-data.mjs           Heuristic report of suspicious placements (pnpm run data:audit)
  transform/               Pure transform steps used by the sync
```

## Getting started

Requires **Node.js 22+** and **pnpm** (pinned via `packageManager`; `corepack enable`
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
| `pnpm run data:check`       | Validate `disciplines.generated.json` invariants                 |
| `pnpm run data:audit`       | Print suspicious placements to extend the overrides file         |
| `pnpm run sync:disciplines` | Regenerate the catalogue from the pinned upstream + overrides    |
| `pnpm run docker:build`     | Build the production image locally                               |
| `pnpm run docker:run`       | Run it on :3000                                                  |

## Data pipeline

```
disciplines.upstream.json ──┐
  fetchFromUpstream entries ─┼─► parseUpstreamRoadmap (React Flow → sections)
  source: "custom" entries ──┤   (edges first, spatial fallback)
  carried-forward entries ───┘
            │
            ▼
  fetchContentResources  ── per-node content/*.md at the pinned commit
            │              fills empty resources[] and missing labels
            ▼
  applyLinkingFixes ─► applyDisciplineOverrides ─► applyLinkingFixes
            │                      (drop / unlink / move / rename / merge)
            ▼
  applyResourceOverrides ─► normalizeResources ─► remapPrereqs
            │
            ▼
  disciplines.generated.json  +  remap.log.json
```

Upstream is pinned to a specific commit because later commits removed the
roadmap JSON files and stripped resource lists from the content markdown.
Directory listings use the GitHub REST API (60 req/h anonymous); set
`GITHUB_TOKEN` if you hit the limit. Everything is cached under `.cache/`.

To fix a misfiled skill, add an entry to `disciplines.overrides.json` and
re-run the sync. To attach your own course/book/article to a topic, add it to
`resources.overrides.json` keyed by skill id, section id or discipline id.

## Import / export / sync

Open the **gear icon** (top-right).

- **Export config** downloads `{ version, progress, applied, pinned }`. Tick
  "include the built-in catalogue" only if you want to fork the disciplines.
- **Import config** validates the payload and reloads. Importing an export
  that contains the bundled catalogue does *not* pin it as a custom override.
- **GitHub Gist sync**: create a fine-grained PAT with only the `gist` scope,
  paste it, **Push** (creates a private gist) / **Pull** on another device.
  The token lives in `localStorage` — don't use it on shared machines.

## Deploying

### Docker

```bash
pnpm run docker:build && pnpm run docker:run      # http://localhost:3000
```

The image is multi-stage, pnpm-based, runs as `node`, and listens on
`0.0.0.0:3000`. Multi-arch builds (`linux/amd64,linux/arm64`) are published
to GHCR by `.github/workflows/docker.yml` on tags and pushes to `main`.

## Tech stack

React Router 7 (SSR) · React 19 · TypeScript · Tailwind CSS 4 · recharts ·
pixelarticons glyphs · Vite 8 · pnpm

## Data source

See `NOTICE.md` for attribution and licensing (CC BY-SA 4.0 upstream content).
