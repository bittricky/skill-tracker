/**
 * fetchContentResources.mjs
 *
 * roadmap.sh keeps one markdown file per node under
 * `src/data/roadmaps/<slug>/content/<topic-slug>@<nodeId>.md`. At the pinned
 * commit these end with a resource list of the form:
 *
 *     - [@article@Some Title](https://example.com)
 *     - [@video@Some Video](https://youtube.com/…)
 *
 * We list the directory once (GitHub contents API, cached), fetch each file
 * (raw.githubusercontent.com, cached), and return `Map<nodeId, Resource[]>`.
 *
 * Newer upstream commits stripped these lists, which is why the sync stays
 * pinned to the commit recorded in `disciplines.upstream.json`.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

// Directory listings hit the REST API (60 req/h anonymous). Set GITHUB_TOKEN
// to lift the limit; raw file fetches are not rate-limited the same way.
const HEADERS = {
  "User-Agent": "skill-tracker-sync",
  ...(process.env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : {}),
};
const RESOURCE_RE = /^\s*[-*]\s*\[@([a-zA-Z.]+)@([^\]]*)\]\(([^)\s]+)\)/;
/** Filenames look like `what-is-http@nXRjahYSDqfEqY26yfLEt.md`. */
const FILENAME_RE = /^(.*)@([A-Za-z0-9_-]+)\.md$/;

async function cachedText(cachePath, fetcher) {
  if (existsSync(cachePath)) return readFile(cachePath, "utf8");
  const body = await fetcher();
  await mkdir(dirname(cachePath), { recursive: true });
  await writeFile(cachePath, body, "utf8");
  return body;
}

async function fetchOk(url, init) {
  const res = await fetch(url, { headers: HEADERS, ...init });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} ${url}`);
  return res;
}

/** Parse the `- [@kind@Label](url)` lines out of a content markdown file. */
export function parseResourcesFromMarkdown(md) {
  const out = [];
  for (const line of md.split("\n")) {
    const m = RESOURCE_RE.exec(line);
    if (!m) continue;
    out.push({ kind: m[1], label: m[2].trim(), url: m[3].trim() });
  }
  return out;
}

/** Parse `<topic-slug>@<nodeId>.md` into its parts; null when not matching. */
export function parseContentFilename(name) {
  const m = FILENAME_RE.exec(name);
  if (!m) return null;
  return { slug: m[1], nodeId: m[2] };
}

/**
 * List the content directory of an upstream roadmap at a commit. Returns
 * `[{ name, slug, nodeId, downloadUrl }]`. Cached as JSON.
 */
export async function listContentFiles({
  repo,
  commit,
  contentSlug,
  cacheDir,
}) {
  const dir = `src/data/roadmaps/${contentSlug}/content`;
  const cachePath = join(cacheDir, commit, `${dir}.listing.json`);
  const raw = await cachedText(cachePath, async () => {
    const url = `https://api.github.com/repos/${repo}/contents/${dir}?ref=${commit}`;
    process.stdout.write(`  list ${url}\n`);
    const res = await fetchOk(url, {
      headers: { ...HEADERS, Accept: "application/vnd.github+json" },
    });
    return res.text();
  });
  const listing = JSON.parse(raw);
  if (!Array.isArray(listing)) return [];
  return listing
    .filter((f) => f.type === "file" && f.name.endsWith(".md"))
    .map((f) => {
      const parsed = parseContentFilename(f.name);
      return parsed
        ? {
            name: f.name,
            slug: parsed.slug,
            nodeId: parsed.nodeId,
            downloadUrl:
              f.download_url ??
              `https://raw.githubusercontent.com/${repo}/${commit}/${dir}/${f.name}`,
          }
        : null;
    })
    .filter(Boolean);
}

/**
 * Fetch every content file for a roadmap and return
 * `{ byNodeId: Map<nodeId, { slug, title, resources }>, files }`.
 * `title` is the first `# Heading` in the file (falls back to slug).
 */
export async function fetchContentResources({
  repo,
  commit,
  contentSlug,
  cacheDir,
  concurrency = 8,
}) {
  const files = await listContentFiles({ repo, commit, contentSlug, cacheDir });
  const byNodeId = new Map();
  let fetched = 0;

  const queue = [...files];
  async function worker() {
    while (queue.length) {
      const f = queue.shift();
      const cachePath = join(
        cacheDir,
        commit,
        "src/data/roadmaps",
        contentSlug,
        "content",
        f.name,
      );
      let md;
      try {
        md = await cachedText(cachePath, async () => {
          fetched++;
          return (await fetchOk(f.downloadUrl)).text();
        });
      } catch (err) {
        console.warn(`  ! ${contentSlug}/${f.name}: ${err.message}`);
        continue;
      }
      const titleMatch = /^#\s+(.+)$/m.exec(md);
      byNodeId.set(f.nodeId, {
        slug: f.slug,
        title: titleMatch ? titleMatch[1].trim() : f.slug,
        resources: parseResourcesFromMarkdown(md),
      });
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  if (fetched)
    process.stdout.write(
      `  fetched ${fetched} content files for ${contentSlug}\n`,
    );
  return { byNodeId, files };
}
