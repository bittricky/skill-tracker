/**
 * parseUpstreamRoadmap.mjs
 *
 * Turns a developer-roadmap React Flow JSON (`{ nodes, edges }`) into our
 * `Discipline` shape: `{ id, label, kind, sections[{ id, label, items[{ ... }] }] }`.
 *
 * Strategy:
 *   - `topic` nodes become sections.
 *   - Each `subtopic` is attached to the nearest `topic` by spatial distance
 *     (x/y of the node's top-left). This matches roadmap.sh's visual grouping
 *     without needing their renderer.
 *   - `topic` nodes themselves are also surfaced as the first item in their
 *     own section so the header topic is trackable too.
 *   - `title`, `paragraph`, `button`, `vertical`, `horizontal`, `section`
 *     (decorative background), and `label` nodes are ignored for items but
 *     `label` nodes near a cluster of subtopics are used to name sections
 *     where possible. Otherwise the topic label is the section label.
 *
 * Resources are left empty here; the per-node `content/*.md` files carry the
 * canonical resource lists upstream and a future pass can fetch + parse them.
 * The row still links out to roadmap.sh via `SKILL_HOME_BY_ID` in the UI.
 */

const TOPIC_TYPES = new Set(["topic"]);
const SUBTOPIC_TYPES = new Set(["subtopic"]);
const IGNORED_TYPES = new Set([
  "title",
  "paragraph",
  "button",
  "vertical",
  "horizontal",
  "section",
  "label",
  "linksgroup",
  "checklist",
  "resourceButton",
  "todo",
  "todo-checkbox",
]);

function nodeCenter(n) {
  const pos = n.positionAbsolute ?? n.position ?? { x: 0, y: 0 };
  const w = n.width ?? n.style?.width ?? 0;
  const h = n.height ?? n.style?.height ?? 0;
  return { x: pos.x + w / 2, y: pos.y + h / 2 };
}

function dist2(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function slugify(label, fallback) {
  const s = String(label ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || fallback;
}

export function transformUpstreamRoadmap(raw, entry) {
  const nodes = Array.isArray(raw?.nodes) ? raw.nodes : [];

  const topics = [];
  const subtopics = [];

  for (const n of nodes) {
    const t = n.type;
    if (TOPIC_TYPES.has(t)) topics.push(n);
    else if (SUBTOPIC_TYPES.has(t)) subtopics.push(n);
    else if (!IGNORED_TYPES.has(t)) {
      // Unknown type — treat as subtopic only if it has a label we can render.
      if (n?.data?.label) subtopics.push(n);
    }
  }

  if (topics.length === 0) {
    // Flat roadmap (e.g. html/css-style single-section upstreams). Dump all
    // subtopics into one synthetic section so the content is still usable.
    return {
      id: entry.id,
      label: entry.label,
      kind: entry.kind,
      color: entry.color,
      upstreamId: entry.id,
      sections: [
        {
          id: `${entry.id}:sec:default`,
          label: entry.label,
          order: 0,
          items: subtopics.map((n, i) => itemFromNode(entry.id, n, i)),
        },
      ],
    };
  }

  // Sort topics by (y, x) so sections appear in visual reading order.
  topics.sort((a, b) => {
    const ca = nodeCenter(a);
    const cb = nodeCenter(b);
    if (ca.y !== cb.y) return ca.y - cb.y;
    return ca.x - cb.x;
  });

  const sections = topics.map((topic, idx) => {
    const label = String(topic?.data?.label ?? `Section ${idx + 1}`).trim();
    return {
      id: `${entry.id}:sec:${slugify(label, topic.id)}`,
      label,
      order: idx,
      items: [itemFromNode(entry.id, topic, 0)],
      _center: nodeCenter(topic),
      _topicId: topic.id,
    };
  });

  // Assign each subtopic to its nearest topic by center distance.
  for (const sub of subtopics) {
    const c = nodeCenter(sub);
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < sections.length; i++) {
      const d = dist2(c, sections[i]._center);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    sections[best].items.push(itemFromNode(entry.id, sub, sections[best].items.length));
  }

  for (const s of sections) {
    delete s._center;
    delete s._topicId;
  }

  return {
    id: entry.id,
    label: entry.label,
    kind: entry.kind,
    color: entry.color,
    upstreamId: entry.id,
    sections,
  };
}

function itemFromNode(disciplineId, n, order) {
  const label = String(n?.data?.label ?? "").trim() || "(untitled)";
  return {
    id: `${disciplineId}:${n.id}`,
    label,
    resources: [],
    sources: [disciplineId],
    prerequisites: [],
    related: [],
    primary: true,
    homeDisciplineId: disciplineId,
    upstreamNodeId: n.id,
    order,
  };
}
