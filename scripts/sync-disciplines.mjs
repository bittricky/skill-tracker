#!/usr/bin/env node
/**
 * sync-disciplines.mjs
 *
 * Produces `app/data/disciplines.generated.json`. Pipeline:
 *
 *   1. Load `disciplines.upstream.json` (pinned repo/commit + include list).
 *   2. For each include entry:
 *        - `fetchFromUpstream: true`  → fetch the React Flow JSON at
 *          `upstreamPath` and transform (topic → section, subtopic → skill).
 *        - `source: "custom"`         → load the hand-authored file at
 *          `customPath` (sections of `{ nodeId, label? }`).
 *        - otherwise                  → carry the discipline forward from the
 *          previously generated payload.
 *   3. Fetch per-node content markdown for every discipline (cached) and fill
 *      empty `resources[]` / missing labels by `upstreamNodeId`.
 *   4. Linking fixes (dedupe, bidirectional `sources[]`, section ids, home).
 *   5. Hand overrides: `disciplines.overrides.json` (drop/unlink/move/rename/
 *      merge) and `resources.overrides.json` (extra links).
 *   6. Normalize resources (kinds, labels, dedupe) and remap orphan prereqs.
 *
 * Side outputs:
 *   - `app/data/remap.log.json`     — prereq rewrites + override log.
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
import { fetchContentResources } from "./transform/fetchContentResources.mjs";
import { normalizeResources } from "./transform/normalizeResources.mjs";
import {
  applyDisciplineOverrides,
  applyResourceOverrides,
} from "./transform/applyOverrides.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DATA_DIR = join(ROOT, "app", "data");
const CONFIG_PATH = join(DATA_DIR, "disciplines.upstream.json");
const GENERATED_INPUT = join(DATA_DIR, "disciplines.generated.json");
const OUTPUT_PATH = join(DATA_DIR, "disciplines.generated.json");
const DISCIPLINE_OVERRIDES_PATH = join(DATA_DIR, "disciplines.overrides.json");
const RESOURCE_OVERRIDES_PATH = join(DATA_DIR, "resources.overrides.json");
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

async function readJSONIfExists(path, fallback) {
  if (!existsSync(path)) return fallback;
  const parsed = await readJSON(path);
  delete parsed.$comment;
  return parsed;
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
  if (existsSync(GENERATED_INPUT)) {
    try {
      const st = await stat(GENERATED_INPUT);
      if (st.size > 0) return await readJSON(GENERATED_INPUT);
    } catch {
      /* fallthrough */
    }
  }
  return { generatedAt: null, disciplines: [] };
}

/** Hand-authored discipline file → our Discipline shape (labels filled later). */
function disciplineFromCustom(custom, entry) {
  const seen = new Set();
  return {
    id: entry.id,
    label: entry.label ?? custom.label,
    kind: entry.kind ?? custom.kind,
    color: entry.color ?? custom.color,
    description: custom.description,
    upstreamId: custom.upstreamId ?? entry.id,
    prerequisiteDisciplineIds: custom.prerequisiteDisciplineIds,
    sections: (custom.sections ?? []).map((sec, sIdx) => ({
      id: `${entry.id}:sec:${sec.id}`,
      label: sec.label,
      description: sec.description,
      order: sIdx,
      resources: sec.resources,
      items: (sec.items ?? [])
        .filter((it) => {
          const key = it.nodeId ?? it.id;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((it, i) => ({
          id: `${entry.id}:${it.nodeId ?? it.id}`,
          label: it.label ?? null, // filled from content title
          resources: it.resources ?? [],
          sources: [entry.id],
          prerequisites: it.prerequisites ?? [],
          related: [],
          primary: true,
          homeDisciplineId: entry.id,
          upstreamNodeId: it.nodeId,
          order: i,
        })),
    })),
  };
}

function upgradeDiscipline(rm, config) {
  const sections = (rm.sections ?? []).map((sec, i) => ({
    id: sec.id,
    label: sec.label,
    description: sec.description,
    order: typeof sec.order === "number" ? sec.order : i,
    resources: sec.resources,
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
        order: item.order,
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
    resources: rm.resources,
    sections,
  };
}

/**
 * Fill empty resources / missing labels from the content map. Only touches
 * primary rows (references read from their home at runtime).
 */
function fillFromContent(discipline, content, stats) {
  for (const sec of discipline.sections) {
    for (const item of sec.items) {
      if (!item.primary || !item.upstreamNodeId) continue;
      const c = content.get(item.upstreamNodeId);
      if (!c) {
        if (!item.label) item.label = item.upstreamNodeId;
        continue;
      }
      if (!item.label) item.label = c.title;
      if (item.resources.length === 0 && c.resources.length > 0) {
        item.resources = c.resources;
        stats.filled++;
      }
    }
  }
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
  const fetched = [];
  const custom = [];

  for (const entry of include) {
    if (removedSet.has(entry.id)) continue;

    if (entry.fetchFromUpstream) {
      const raw = await fetchCached(commit, entry.upstreamPath, repo);
      disciplines.push(
        upgradeDiscipline(transformUpstreamRoadmap(raw, entry), config),
      );
      fetched.push(entry.id);
      continue;
    }

    if (entry.source === "custom") {
      const file = await readJSON(join(ROOT, entry.customPath));
      disciplines.push(
        upgradeDiscipline(disciplineFromCustom(file, entry), config),
      );
      custom.push(entry.id);
      continue;
    }

    const prev = priorById.get(entry.id);
    if (!prev) {
      console.warn(
        `  ! skipping ${entry.id}: not in prior payload and no source`,
      );
      continue;
    }
    disciplines.push(
      upgradeDiscipline(
        {
          ...prev,
          label: entry.label ?? prev.label,
          kind: entry.kind ?? prev.kind,
          color: entry.color ?? prev.color,
        },
        config,
      ),
    );
  }

  for (const prev of prior.disciplines ?? []) {
    if (!wantedIds.has(prev.id) && !removedSet.has(prev.id)) {
      console.warn(`  ! dropping ${prev.id}: no longer in include[]`);
    }
  }

  console.log(
    `  carried forward: ${disciplines.length - fetched.length - custom.length}`,
  );
  console.log(`  fetched from upstream: ${fetched.join(", ") || "(none)"}`);
  console.log(`  custom: ${custom.join(", ") || "(none)"}`);
  console.log(`  removed: ${[...removedSet].join(", ") || "(none)"}`);

  // Per-node content (resources + titles) for every discipline that has an
  // upstream content folder. 404s are tolerated (hand-authored stubs).
  console.log(`→ loading upstream content markdown`);
  const contentByDiscipline = new Map();
  const fillStats = { filled: 0 };
  for (const entry of include) {
    if (removedSet.has(entry.id) || entry.noContent) continue;
    const contentSlug = entry.contentSlug ?? entry.upstreamId ?? entry.id;
    try {
      const { byNodeId } = await fetchContentResources({
        repo,
        commit,
        contentSlug,
        cacheDir: CACHE_DIR,
      });
      if (byNodeId.size) contentByDiscipline.set(entry.id, byNodeId);
    } catch (err) {
      console.warn(
        `  ! no content for ${entry.id} (${contentSlug}): ${err.message}`,
      );
    }
  }
  for (const d of disciplines) {
    const content = contentByDiscipline.get(d.id);
    if (content) fillFromContent(d, content, fillStats);
    else
      for (const s of d.sections)
        for (const it of s.items)
          it.label ??= it.upstreamNodeId ?? "(untitled)";
  }
  console.log(`  filled ${fillStats.filled} empty resource lists from content`);

  // Linking fixes: dedupe within-discipline, recompute sources, normalize
  // section ids, fix homeDisciplineId.
  let fixed = applyLinkingFixes(disciplines);

  // Hand overrides.
  const disciplineOverrides = await readJSONIfExists(
    DISCIPLINE_OVERRIDES_PATH,
    {},
  );
  const resourceOverrides = await readJSONIfExists(RESOURCE_OVERRIDES_PATH, {});
  const ov = applyDisciplineOverrides(
    fixed,
    disciplineOverrides,
    contentByDiscipline,
  );
  fixed = applyLinkingFixes(ov.disciplines); // sources[] changed by drop/unlink
  const rv = applyResourceOverrides(fixed, resourceOverrides);
  console.log(
    `  overrides: ${ov.log.dropped.length} dropped, ${ov.log.unlinked.length} unlinked, ${ov.log.moved.length} moved, ${ov.log.renamed.length} renamed, ${ov.log.merged.length} merged, ${ov.log.missing.length} missing`,
  );
  console.log(
    `  resource overrides: ${rv.log.applied.skills} skills, ${rv.log.applied.sections} sections, ${rv.log.applied.disciplines} disciplines, ${rv.log.missing.length} unmatched`,
  );
  for (const m of ov.log.missing)
    console.warn(`  ! override target missing: ${JSON.stringify(m)}`);
  for (const m of rv.log.missing)
    console.warn(`  ! resource override target missing: ${m}`);

  normalizeResources(rv.disciplines);

  // Remap orphan prereqs.
  const { disciplines: remapped, log } = remapPrereqs(rv.disciplines, {
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
    JSON.stringify(
      { prereqs: log, overrides: ov.log, resourceOverrides: rv.log },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  console.log(`✓ wrote ${OUTPUT_PATH}`);
  console.log(`✓ wrote ${REMAP_LOG_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
