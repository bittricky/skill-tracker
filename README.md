# Skill Tracker

> This is more of a legibility tool than a learning platform.

A personal, offline-first, installable skill progression tracker built on
top of data collected and organized from [roadmap.sh](https://roadmap.sh)
roadmaps.

Progress is stored locally in the browser. No accounts, no mandatory server.
Optional GitHub Gist sync (your token, your data) covers cross-device use.

## Features

- **Discipline catalogue** grouped by kind: Role, Foundation, Language,
  Framework, Tech.
- **Cross-discipline skill linking** — e.g. `Closures` appears in JavaScript,
  Frontend, etc., and navigating to its home discipline preserves context.
- **Two-axis progress model**:
  - _Status_ (`learning | done | skipped`) tracks what you've studied.
  - _Applied_ flag tracks what you've actually used in practice.
- **Depth tiers** — per-discipline rollup of status + applied, shown as a
  three-step stepper: **Exploring → Practicing → Fluent**. Thresholds:
  - Practicing: ≥40% done & ≥40% applied.
  - Fluent: ≥80% done & ≥60% applied.
- **Skill matrix radar** (dashboard) plots depth per discipline with
  category filter pills so you can focus on Foundations, Languages, etc.
- **projects** (`sync:projects`) — each discipline gets a list
  of hands-on builds. Completing a project toggles a
  per-project done flag AND contributes to the discipline's Applied count,
  which drives the depth tier.
- **Settings modal** (gear icon, top-right) — JSON export / import of your
  config, reset, and optional GitHub Gist sync.
- **Custom catalogues** — edit the exported JSON to define your own
  disciplines/sections/skills (design, music, research, …) and import it
  back. The app reads the override from `localStorage` on next load.
- **Installable PWA** — works fully offline after first visit. Manifest,
  icons, and a vanilla service worker are included.
- **Light/dark theme** with persistent preference and an auto-adapting
  loader spinner.

## Progress persistence

All state is stored client-side under `localStorage`:

| Key                                  | Contents                                         |
| ------------------------------------ | ------------------------------------------------ |
| `skill-tracker:v2`                   | `{ progress, applied, projectsDone }`            |
| `skill-tracker:custom-disciplines`   | Optional user-authored discipline catalogue      |
| `skill-tracker:gist-sync`            | `{ token, gistId, lastSyncedAt }` for sync       |
| `skill-tracker-theme`                | `"light" \| "dark"`                              |

The legacy `skill-tracker:v1` key (progress-only) is auto-migrated on first
load and left in place.

## Project structure

```
app/
  components/
    browser/               Discipline detail UI (projects, depth stepper)
    dashboard/             Dashboard UI (skill matrix, stat row)
    ui/                    Reusable primitives (Tooltip, Loader)
    SettingsModal.tsx      Export/import/reset + Gist sync UI
    SettingsButton.tsx     Gear icon in the top-right
    AppShell / AppSidebar  Layout + sidebar nav with per-discipline progress
    …
  data/                    Discipline + project data and types
    disciplines.generated.json  (generated, large)
    disciplines.upstream.json   (config: pinned commit + includes)
    projects.generated.json     (generated from roadmap.sh projects)
    index.ts                    Runtime exports (+ custom override loader)
  hooks/                   useProgress, useTheme
  lib/                     Utilities
    storage.ts             localStorage shape + v1→v2 migration
    progress.ts            stats (section / discipline / global)
    depth.ts               depth tier calculation
    configExport.ts        export / import / validate / reset
    gistSync.ts            GitHub Gist push/pull helpers
    sidebarGroups.ts       Grouping logic for the sidebar
  routes/                  Page routes (dashboard, browser)
  app.css                  Theme tokens, scrollbar skin, loader keyframes
  root.tsx                 Layout + manifest link + SW registration
public/
  manifest.webmanifest     PWA manifest
  sw.js                    Service worker (runtime caching)
  icon.svg                 Themed skill-graph icon
  icon-maskable.svg        Maskable variant for Android adaptive icons
scripts/
  sync-disciplines.mjs     Pull upstream + transform → disciplines.generated.json
  sync-projects.mjs        Pull roadmap.sh projects → projects.generated.json
  transform/               Pure helpers used by sync-disciplines
```

## Getting started

### Prerequisites

- **Node.js 22+**

### Install & run

```bash
pnpm install
pnpm run dev
```

Open http://localhost:5173.

`pnpm run build` produces a production build
in `build/`.

### Scripts

| Command                      | Purpose                                                                    |
| ---------------------------- | -------------------------------------------------------------------------- |
| `pnpm run dev`                | React Router dev server with HMR                                           |
| `pnpm run build`              | Production build                                                           |
| `pnpm run start`              | Serve the production build                                                 |
| `pnpm run typecheck`          | React Router type generation + `tsc`                                       |
| `pnpm run sync:disciplines`   | Refresh `app/data/disciplines.generated.json` from pinned upstream         |
| `pnpm run sync:projects`      | Refresh `app/data/projects.generated.json` from roadmap.sh project catalog |

### Installing as an app (PWA)

The service worker is **only registered from the production build** to
avoid fighting HMR in dev. To try the install flow:

```bash
pnpm run build
pnpm run start
```

Then in Chrome / Edge / Android, use the browser's "Install app" action.
On iOS: Safari → Share → Add to Home Screen. After first visit, the app
works offline (navigations fall back to the cached shell).

The SW uses:

- **Navigations** → network-first, fall back to cached shell or a built-in
  offline page.
- **Same-origin static assets** → stale-while-revalidate (plays nicely with
  React Router's hashed chunk filenames).
- **Cross-origin** (Google Fonts) → stale-while-revalidate with safe
  handling for opaque responses.

Bump `CACHE_VERSION` in `public/sw.js` when you want to invalidate the
cache for all users.

## UI & Theming

- **Dark mode** (default): dark backgrounds with **purple accents**.
- **Light mode**: light backgrounds with **red accents**.

Theme preference is persisted in `localStorage`. The theme toggle and
settings gear live in the top-right of every page. The PWA `theme-color`
meta tags swap automatically with the user's OS preference.

## Import / export / sync

Open the **gear icon** (top-right) to access the settings modal.

### JSON export / import

- **Export config** downloads a single JSON document:

  ```json
  {
    "version": 1,
    "exportedAt": "…",
    "source": "skill-tracker",
    "disciplines": { "disciplines": [ … ] },
    "progress":     { "<skillId>": "done" },
    "applied":      { "<skillId>": true },
    "projectsDone": { "<projectId>": true }
  }
  ```

  Each top-level field is independent. You can hand-edit and re-import
  only the pieces you want.

- **Import config** validates the payload, writes it to `localStorage`,
  then reloads the page so the data module picks up any catalogue
  override.

### Custom catalogues (repurpose for any domain)

Edit the `disciplines` block of an exported JSON to define your own
roles, sections, and skills (e.g. for design, music, research, etc.),
then re-import. A minimal shape:

```json
{
  "version": 1,
  "disciplines": {
    "disciplines": [
      {
        "id": "visual",
        "label": "Visual Design",
        "kind": "role",
        "color": "#f97316",
        "sections": [
          {
            "id": "fundamentals",
            "label": "Fundamentals",
            "items": [
              { "id": "visual:color-theory", "label": "Color Theory" },
              { "id": "visual:typography",  "label": "Typography"   }
            ]
          }
        ]
      }
    ]
  }
}
```

Skill `id`s must be globally unique. Use `"Revert to built-in"` in the
settings modal to drop the override and go back to the bundled catalogue.

### GitHub Gist sync (optional)

For cross-device use without a backend:

1. Create a Personal Access Token at
   [github.com/settings/tokens](https://github.com/settings/tokens?type=beta)
   with only the `gist` scope.
2. Open settings → paste the token → **Connect**.
3. **Push to gist** creates a private gist on first use (file:
   `skill-tracker-config.json`), or updates the existing one.
4. On another device, connect with the same token and paste the gist id
   shown after the first push, then **Pull from gist**.

The token is kept in `localStorage` under `skill-tracker:gist-sync` —
fine for a personal device, don't use it on shared machines. **Disconnect**
clears it.

## Tech stack

- React Router 7 + React 19 + TypeScript
- Tailwind CSS 4
- FontAwesome icons
- Vite 8

## Data source

See `NOTICE.md` for attribution and licensing.

-----


@author Mitul Patel
