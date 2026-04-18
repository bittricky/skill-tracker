# Skill Tracker

A personal, offline-first skill progression tracker built on top of the
[roadmap.sh](https://roadmap.sh) roadmaps.


### Canonical skills & the "Tracked in" relationship

Many skills appear in several roadmaps (e.g. "Closures" is in JavaScript,
Frontend, and Full-Stack). The build script:

1. **Normalizes by label** to collapse duplicates to a single canonical id.
2. **Assigns a home roadmap**, preferring `language`/`framework`/`tech`/`foundation` roadmaps over
   `role` roadmaps. A skill's home is where it is *tracked* — its resources
   are sourced only from the home's markdown, so role roadmaps don't
   duplicate resource lists.
3. **Marks each row as `primary` or a reference.** In a role roadmap, rows
   that live elsewhere appear with a small *"Tracked in: React"* link instead
   of a curated resource list. Progress still syncs because the id is
   canonical.
4. **Merges `sources`** so each skill records every roadmap it appears in
   (shown as `×N` badges and an "Appears in: …" footer).

### Prerequisites

During the graph walk in `buildPrereqs` (`scripts/build-roadmaps.mjs`), for
every skill node we walk incoming edges **backward**, passing transparently
through layout nodes (`section`, `vertical`, `horizontal`, labels, …) to find
the real upstream *skill* node. Those upstream labels are then resolved to
canonical ids and unioned across every roadmap that references the skill.

The result is a `prerequisites: string[]` on every `Skill` — ~300 real
topic-to-topic edges across the full dataset. This powers the "Builds on:"
UI and forms the seed for a future skill-tree graph view.

### Generated shape

```ts
interface Skill {
  id: string;                // canonical; stable across roadmaps
  label: string;
  resources: Resource[];     // populated only from the home roadmap
  sources: string[];         // every roadmap id that references this skill
  prerequisites: string[];   // canonical ids this skill builds on
  primary: boolean;          // true only in the home roadmap's view
  homeRoadmapId: string;
}

interface Roadmap {
  id: string;
  label: string;
  color: string;
  kind: "role" | "foundation" | "language" | "framework" | "tech";
  sections: { id: string; label: string; items: Skill[] }[];
}
```

## Progress persistence

State is a single `Record<skillId, "learning" | "done" | "skipped">` kept in
`localStorage` under a versioned key (`app/lib/storage.ts`). The
`useProgress` hook in `app/hooks/useProgress.ts` loads on mount and writes
through on every status change, so the app is fully offline-capable.

## Project structure

```
app/
  components/          UI: Sidebar, MainContent, SectionBlock, TopicRow, …
  data/
    index.ts           Typed exports + canonical lookups (SKILL_HOME_BY_ID, …)
    roadmaps.generated.json   (gitignored — generated at build)
  hooks/
    useProgress.ts     localStorage-backed progress hook
    useTheme.ts        Theme state management (dark/light mode)
  lib/
    progress.ts        roadmap / section / global stat calculators
    storage.ts         localStorage wrapper + status cycle
    theme.ts           Theme utilities (get/set/apply/toggle)
  routes/home.tsx      App shell, wires Sidebar + MainContent
scripts/
  build-roadmaps.mjs   Flattens roadmaps-source -> generated JSON
roadmaps-source/       git submodule (roadmap.sh content)
```

## Getting started

### Prerequisites

- **Node.js 22+** (required by Vite 8 / Rolldown which use `node:util`'s
  `styleText` export). Use `nvm use 22` or install Node 22+.

### Install & run

```bash
npm install
npm run dev
```

Open http://localhost:5173.

`npm run build` regenerates the data bundle and produces a production build
in `build/`.

### Scripts

| Command             | Purpose                                              |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | React Router dev server with HMR                     |
| `npm run build`     | `build:data` + production build                      |
| `npm run start`     | Serve the production build                           |
| `npm run typecheck` | React Router type generation + `tsc`                 |

## UI & Theming

The app features a minimal, modern design with two themes:

- **Dark mode** (default): Dark backgrounds (`#0f0f0f`) with **purple accents** (`#a855f7`)
- **Light mode**: Light backgrounds (`#fafafa`) with **red accents** (`#dc2626`)

Theme preference is persisted in `localStorage` and applied before the React app renders to prevent flash of unstyled content (FOUC). The theme toggle is located next to the search bar in the main content header.

## Tech stack

- **React Router 7** (framework mode, SSR-capable)
- **React 19** + **TypeScript**
- **Tailwind CSS 4** via `@tailwindcss/vite`
- **FontAwesome** for icons
- **Vite 8** / **Rolldown** for bundling
- **localStorage** for progress persistence and theme (no backend)

