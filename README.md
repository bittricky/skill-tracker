# Skill Tracker

A personal, offline-first skill progression tracker built on top of data collected and organized from
[roadmap.sh](https://roadmap.sh) roadmaps.

Progress is stored locally in the browser — no accounts, no sync, no server.

## Features

- Track skills across multiple **disciplines** (Role, Foundation, Language, Framework, Tech)
- Cross-discipline skill linking (e.g., "Closures" appears in JavaScript, Frontend, etc.)
- Light/dark theme with persistent preference
- Offline-capable with localStorage persistence

## Progress persistence

Progress is stored in `localStorage` as a map of skill IDs to status
(`"learning" | "done" | "skipped"`). The app works offline — no backend required.

## Project structure

```
app/
  components/        React components (Sidebar, MainContent, etc.)
  data/              Discipline data and type definitions
                       - disciplines.generated.json  (generated)
                       - disciplines.upstream.json   (config: pinned commit + includes)
                       - remap.log.json              (last sync's prereq remap log)
  hooks/             useProgress, useTheme
  lib/               Utilities (progress, storage, theme)
  routes/            Page routes
scripts/
  sync-disciplines.mjs   Pull upstream + transform + write disciplines.generated.json
  transform/             Pure helpers (parse upstream, linking fixes, prereq remap)
```

## Getting started

### Prerequisites

- **Node.js 22+**

### Install & run

```bash
npm install
npm run dev
```

Open http://localhost:5173.

`npm run build` produces a production build
in `build/`.

### Scripts

| Command             | Purpose                                              |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | React Router dev server with HMR                     |
| `npm run build`     | Production build                      |
| `npm run start`     | Serve the production build                           |
| `npm run typecheck` | React Router type generation + `tsc`                 |
| `npm run sync:disciplines` | Refresh `app/data/disciplines.generated.json` from pinned upstream |

## UI & Theming

- **Dark mode** (default): Dark backgrounds with **purple accents**
- **Light mode**: Light backgrounds with **red accents**

Theme preference is persisted in `localStorage`. Toggle is next to the search bar.

## Tech stack

- React Router 7 + React 19 + TypeScript
- Tailwind CSS 4
- FontAwesome icons
- Vite 8

## Data source

Discipline content is derived from
[`kamranahmedse/developer-roadmap`](https://github.com/kamranahmedse/developer-roadmap)
(CC BY-SA 4.0). The upstream commit is pinned in
`app/data/disciplines.upstream.json` and refreshed via `npm run sync:disciplines`.
See `NOTICE.md` for attribution and licensing.

-----

AI tools are useful, but leaning on them too heavily creates a real risk: being deskilled quietly without realizing it and side effects go undocumented. This tracker exists to confront these concerns and build genuine foundational knowledge so I'm not dependent on tools I don't fully understand.

The approach is intentionally recursive. AI helped scaffold this project first. My aim is to understand the concepts deeply enough to go back and rebuild it myself.

Progress is measured in comprehension, not just completion. If you find this useful, feel free to clone it or use it for your own pursuits.

@author Mitul Patel
