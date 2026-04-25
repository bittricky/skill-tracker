#!/usr/bin/env node
/**
 * sync-disciplines.mjs
 *
 * Produces `app/data/disciplines.generated.json` from:
 *   1. The prior committed payload (`app/data/roadmaps.generated.json` — legacy
 *      name kept to preserve git history until the rename lands), carrying
 *      forward every included discipline except those listed in `removed[]`.
 *   2. Any `include[]` entry flagged `fetchFromUpstream: true`, fetched from
 *      `https://raw.githubusercontent.com/<repo>/<commit>/<upstreamPath>` and
 *      transformed from upstream React Flow node format into our `Section[]`.
 *
 * Then applies:
 *   - Linking fixes: dedupe within-discipline, recompute `sources[]` from
 *     actual membership, normalize section ids, fix `homeDisciplineId`, drop
 *     orphan prereqs only after attempting remap.
 *   - Prereq remap: a skill id is `<disciplineId>:<upstreamNodeId>`; when a
 *     prereq references an id we no longer materialize, find any kept skill
 *     that shares the same `upstreamNodeId` suffix and rewrite the prereq to
 *     that canonical id.
 *   - New optional schema fields: `Section.order`, `Skill.upstreamNodeId`,
 *     `Skill.related`, `Discipline.prerequisiteDisciplineIds`, `Discipline.upstreamId`.
 *
 * Side outputs:
 *   - `app/data/remap.log.json`     — every rewritten / dropped prereq edge.
 *   - `.cache/upstream/<commit>/…`  — cached raw upstream files.
 *
 * License: the upstream repository is CC BY-SA 4.0. See NOTICE.md.
 */

import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { transformUpstreamRoadmap } from "./transform/parseUpstreamRoadmap.mjs";
import { applyLinkingFixes } from "./transform/applyLinkingFixes.mjs";
import { remapPrereqs } from "./transform/remapPrereqs.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DATA_DIR = join(ROOT, "app", "data");
const CONFIG_PATH = join(DATA_DIR, "disciplines.upstream.json");
const LEGACY_INPUT = join(DATA_DIR, "roadmaps.generated.json");
const GENERATED_INPUT = join(DATA_DIR, "disciplines.generated.json");
const OUTPUT_PATH = join(DATA_DIR, "disciplines.generated.json");
const REMAP_LOG_PATH = join(DATA_DIR, "remap.log.json");
const CACHE_DIR = join(ROOT, ".cache", "upstream");

const DEFAULT_COLORS = {
  role: "#34d399",
  foundation: "#f97316",
  language: "#a78bfa",
  framework: "#38bdf8",
  tech: "#22d3ee",
};

async function readJSON(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function fetchCached(commit, upstreamPath, repo) {
  const cached = join(CACHE_DIR, commit, upstreamPath);
  if (existsSync(cached)) {
    return JSON.parse(await readFile(cached, "utf8"));
  }
  const url = `https://raw.githubusercontent.com/${repo}/${commit}/${upstreamPath}`;
  process.stdout.write(`  fetch ${url}\n`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`fetch failed: ${res.status} ${url}`);
  }
  const body = await res.text();
  await mkdir(dirname(cached), { recursive: true });
  await writeFile(cached, body, "utf8");
  return JSON.parse(body);
}

async function loadPriorPayload() {
  // Prefer an already-generated payload if present (future re-syncs); fall
  // back to the legacy `roadmaps.generated.json` for the initial migration.
  if (existsSync(GENERATED_INPUT)) {
    try {
      const st = await stat(GENERATED_INPUT);
      if (st.size > 0) return await readJSON(GENERATED_INPUT);
    } catch {
      /* fallthrough */
    }
  }
  if (existsSync(LEGACY_INPUT)) {
    const legacy = await readJSON(LEGACY_INPUT);
    // Legacy shape: { generatedAt, roadmaps: [...] }
    return { generatedAt: legacy.generatedAt, disciplines: legacy.roadmaps };
  }
  return { generatedAt: null, disciplines: [] };
}

function upgradeDiscipline(rm, config) {
  // Upgrade a legacy discipline object to the new shape (additive only).
  const sections = (rm.sections ?? []).map((sec, i) => ({
    id: sec.id,
    label: sec.label,
    description: sec.description,
    order: typeof sec.order === "number" ? sec.order : i,
    items: (sec.items ?? []).map((item) => {
      const upstreamNodeId =
        item.upstreamNodeId ??
        (typeof item.id === "string" && item.id.includes(":")
          ? item.id.slice(item.id.lastIndexOf(":") + 1)
          : undefined);
      const homeDisciplineId =
        item.homeDisciplineId ?? item.homeRoadmapId ?? rm.id;
      return {
        id: item.id,
        label: item.label,
        resources: item.resources ?? [],
        sources: Array.isArray(item.sources) ? [...item.sources] : [rm.id],
        prerequisites: Array.isArray(item.prerequisites)
          ? [...item.prerequisites]
          : [],
        related: Array.isArray(item.related) ? [...item.related] : [],
        primary: item.primary !== false,
        homeDisciplineId,
        upstreamNodeId,
      };
    }),
  }));
  const kind = rm.kind ?? "tech";
  return {
    id: rm.id,
    label: rm.label,
    color: rm.color ?? DEFAULT_COLORS[kind] ?? "#22d3ee",
    kind,
    description: rm.description,
    prerequisiteDisciplineIds:
      config.prerequisiteDisciplineIds?.[rm.id] ?? rm.prerequisiteDisciplineIds,
    upstreamId: rm.upstreamId ?? rm.id,
    sections,
  };
}

async function main() {
  const config = await readJSON(CONFIG_PATH);
  const { repo, commit, include = [], removed = [] } = config;

  console.log(`→ syncing disciplines (pinned ${repo}@${commit.slice(0, 7)})`);

  const prior = await loadPriorPayload();
  const priorById = new Map(prior.disciplines.map((d) => [d.id, d]));

  const removedSet = new Set(removed);
  const wantedIds = new Set(include.map((x) => x.id));

  const disciplines = [];
  const fetchedFromUpstream = [];

  for (const entry of include) {
    if (removedSet.has(entry.id)) continue;

    if (entry.fetchFromUpstream) {
      const raw = await fetchCached(commit, entry.upstreamPath, repo);
      const transformed = transformUpstreamRoadmap(raw, entry);
      disciplines.push(upgradeDiscipline(transformed, config));
      fetchedFromUpstream.push(entry.id);
      continue;
    }

    const prev = priorById.get(entry.id);
    if (!prev) {
      console.warn(
        `  ! skipping ${entry.id}: not in prior payload and not fetched from upstream`,
      );
      continue;
    }
    // Carry forward, but honor config overrides for label/kind.
    const merged = {
      ...prev,
      label: entry.label ?? prev.label,
      kind: entry.kind ?? prev.kind,
      color: entry.color ?? prev.color,
    };
    disciplines.push(upgradeDiscipline(merged, config));
  }

  // Warn about disciplines in prior but dropped from config (sanity check).
  for (const prev of prior.disciplines ?? []) {
    if (!wantedIds.has(prev.id) && !removedSet.has(prev.id)) {
      console.warn(`  ! dropping ${prev.id}: no longer in include[]`);
    }
  }

  console.log(`  carried forward: ${disciplines.length - fetchedFromUpstream.length}`);
  console.log(`  fetched from upstream: ${fetchedFromUpstream.join(", ") || "(none)"}`);
  console.log(`  removed: ${[...removedSet].join(", ") || "(none)"}`);

  // Linking fixes: dedupe within-discipline, recompute sources, normalize
  // section ids, fix homeDisciplineId.
  const fixed = applyLinkingFixes(disciplines);

  // Remap orphan prereqs (e.g. left behind by removing full-stack).
  const { disciplines: remapped, log } = remapPrereqs(fixed, {
    priorDisciplines: prior.disciplines ?? [],
    removedIds: removedSet,
  });

  console.log(
    `  prereq remap: ${log.rewritten.length} rewritten, ${log.dropped.length} dropped, ${log.kept} kept`,
  );

  const out = {
    generatedAt: new Date().toISOString(),
    upstreamCommit: commit,
    upstreamRepo: repo,
    disciplines: remapped,
  };

  await writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
  await writeFile(
    REMAP_LOG_PATH,
    JSON.stringify(log, null, 2) + "\n",
    "utf8",
  );

  console.log(`✓ wrote ${OUTPUT_PATH}`);
  console.log(`✓ wrote ${REMAP_LOG_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
