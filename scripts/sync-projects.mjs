#!/usr/bin/env node
/**
 * sync-projects.mjs
 *
 * Produces `app/data/projects.generated.json` by walking the roadmap.sh
 * project catalogue (markdown files with YAML frontmatter) at
 * `src/data/projects/*.md` in the upstream repo, parsing each one's
 * frontmatter, and keeping only those whose `roadmapIds` intersect with
 * the disciplines we include in `app/data/disciplines.upstream.json`.
 *
 * Output project shape (sorted by title):
 *   { id, title, description, difficulty, nature, roadmapIds, skills, url }
 *
 * Network:
 *   1 call to the GitHub contents API (directory listing) + 1 raw fetch
 *   per project file (raw.githubusercontent.com is not API-rate-limited).
 *
 * License: upstream is CC BY-SA 4.0. See NOTICE.md.
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DATA_DIR = join(ROOT, "app", "data");
const CONFIG_PATH = join(DATA_DIR, "disciplines.upstream.json");
const OUTPUT_PATH = join(DATA_DIR, "projects.generated.json");

// kamranahmedse was renamed to nilbuild on GitHub; raw.githubusercontent.com
// serves from the current canonical owner only.
const REPO = "nilbuild/developer-roadmap";
const BRANCH = "master";

const HEADERS = { "User-Agent": "skill-tracker-sync" };

async function fetchJson(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} ${url}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} ${url}`);
  return res.text();
}

/**
 * Minimal YAML frontmatter parser — supports scalar values, single-level
 * lists (`- 'x'`), and skips nested objects (e.g. the `seo` block). Good
 * enough for roadmap.sh's stable project frontmatter shape.
 */
function parseFrontmatter(md) {
  const m = /^---\n([\s\S]*?)\n---/.exec(md);
  if (!m) return {};
  const lines = m[1].split("\n");
  const out = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const km = /^([a-zA-Z0-9_]+):\s*(.*)$/.exec(line);
    if (!km) {
      i++;
      continue;
    }
    const key = km[1];
    let value = km[2];

    if (value === "") {
      // Either a list (next lines are `  - item`) or a nested object.
      const list = [];
      let j = i + 1;
      while (j < lines.length && /^\s{2,}-\s*/.test(lines[j])) {
        const item = lines[j]
          .replace(/^\s+-\s*/, "")
          .replace(/^['"]|['"]$/g, "");
        list.push(item);
        j++;
      }
      if (list.length > 0) {
        out[key] = list;
        i = j;
        continue;
      }
      // Nested object (e.g. seo:) — skip indented lines.
      while (j < lines.length && /^\s{2,}/.test(lines[j])) j++;
      i = j;
      continue;
    }

    value = value.replace(/^['"]|['"]$/g, "");
    if (value === "true") out[key] = true;
    else if (value === "false") out[key] = false;
    else if (/^-?\d+$/.test(value)) out[key] = Number(value);
    else out[key] = value;
    i++;
  }
  return out;
}

async function main() {
  const config = JSON.parse(await readFile(CONFIG_PATH, "utf8"));
  const disciplineIds = new Set(config.include.map((d) => d.id));

  console.log(`→ syncing roadmap.sh projects (${REPO}@${BRANCH})`);

  const listingUrl = `https://api.github.com/repos/${REPO}/contents/src/data/projects?ref=${BRANCH}`;
  const listing = await fetchJson(listingUrl);
  const mdFiles = listing.filter(
    (f) => f.type === "file" && f.name.endsWith(".md"),
  );
  console.log(`  found ${mdFiles.length} project files`);

  const projects = [];
  let kept = 0;
  let skipped = 0;
  for (const f of mdFiles) {
    const slug = f.name.replace(/\.md$/, "");
    let raw;
    try {
      raw = await fetchText(f.download_url);
    } catch (err) {
      console.warn(`  ! ${slug}: ${err.message}`);
      continue;
    }
    const fm = parseFrontmatter(raw);
    if (!fm.title || !Array.isArray(fm.roadmapIds)) {
      skipped++;
      continue;
    }
    const matched = fm.roadmapIds.filter((id) => disciplineIds.has(id));
    if (matched.length === 0) {
      skipped++;
      continue;
    }
    kept++;
    projects.push({
      id: slug,
      title: String(fm.title),
      description: String(fm.description ?? ""),
      difficulty:
        typeof fm.difficulty === "string" && fm.difficulty.length > 0
          ? fm.difficulty.toLowerCase()
          : "beginner",
      nature: typeof fm.nature === "string" ? fm.nature : null,
      roadmapIds: matched,
      skills: Array.isArray(fm.skills) ? fm.skills : [],
      url: `https://roadmap.sh/projects/${slug}`,
    });
  }

  projects.sort((a, b) => a.title.localeCompare(b.title));

  console.log(`  kept ${kept}, skipped ${skipped}`);

  const out = {
    generatedAt: new Date().toISOString(),
    upstreamRepo: REPO,
    upstreamBranch: BRANCH,
    projects,
  };

  await writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`✓ wrote ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
