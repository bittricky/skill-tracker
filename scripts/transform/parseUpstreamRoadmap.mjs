/**
 * parseUpstreamRoadmap.mjs
 *
 * Turns a developer-roadmap React Flow JSON (`{ nodes, edges }`) into our
 * `Discipline` shape: `{ id, label, kind, sections[{ id, label, items[{ ... }] }] }`.
 *
 * Strategy (see .agents/skills/roadmap-section-assignment/SKILL.md):
 *   - `topic` nodes become sections (id tail = the topic node id, which is
 *     what the legacy import used, so hand overrides keep resolving). The
 *     topic itself is the first item so the header is trackable too.
 *   - `subtopic` nodes are grouped into vertical *stacks* (same x, touching
 *     vertically). A whole stack is assigned to one topic, trying in order:
 *       1. edge    — a direct topic↔subtopic edge on any member (majority vote)
 *       2. chain   — BFS over subtopic↔subtopic edges (depth ≤ 3) into a
 *                    stack already placed by (1)
 *       3. spatial — nearest topic by box-to-box distance, preferring topics
 *                    in the same horizontal band (± ROW_BAND px)
 *   - Every item carries `_assign: "topic" | "edge" | "chain" | "spatial"`;
 *     the sync strips it from the catalogue and summarises it in the log.
 *   - `title`, `paragraph`, `button`, `vertical`, `horizontal`, `section`,
 *     `label`, `legend`, … are decorative and ignored. Label nodes are NOT used
 *     as sub-headers; fix sub-groupings in `disciplines.overrides.json`.
 *
 * Resources are left empty here; `fetchContentResources` fills them from the
 * per-node `content/*.md` files.
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
  "legend",
  "linksgroup",
  "checklist",
  "resourceButton",
  "todo",
  "todo-checkbox",
]);

/** Stack detection: members share x within this many px … */
const STACK_X_TOLERANCE = 8;
/** … and the vertical gap to the previous member is at most this. */
const STACK_MAX_GAP = 12;
/** Edge-chain BFS depth. */
const CHAIN_DEPTH = 3;
/** Spatial fallback: prefer topics whose y lies within the stack's y-range ± this. */
const ROW_BAND = 400;
/**
 * Stacks sit beside their topic (same row), so vertical separation is a
 * stronger "not mine" signal than horizontal. dy is scaled by this factor.
 */
const Y_WEIGHT = 2;

function box(n) {
  const pos = n.positionAbsolute ?? n.position ?? { x: 0, y: 0 };
  const w = n.width ?? n.style?.width ?? 0;
  const h = n.height ?? n.style?.height ?? 0;
  return { x: pos.x, y: pos.y, w, h, x2: pos.x + w, y2: pos.y + h };
}

function unionBox(boxes) {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const x2 = Math.max(...boxes.map((b) => b.x2));
  const y2 = Math.max(...boxes.map((b) => b.y2));
  return { x, y, x2, y2, w: x2 - x, h: y2 - y };
}

/** Box-to-box distance (0 when overlapping), vertical gap weighted. */
function boxDist(a, b) {
  const dx = Math.max(0, a.x - b.x2, b.x - a.x2);
  const dy = Math.max(0, a.y - b.y2, b.y - a.y2);
  return Math.hypot(dx, dy * Y_WEIGHT);
}

function slugify(label, fallback) {
  const s = String(label ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || fallback;
}

/**
 * Group subtopics into vertical stacks: bucket by x (within tolerance), sort
 * each bucket by y, split where the gap to the previous node exceeds
 * STACK_MAX_GAP.
 */
export function detectStacks(subtopics) {
  const withBox = subtopics
    .map((n) => ({ n, b: box(n) }))
    .sort((p, q) => p.b.x - q.b.x || p.b.y - q.b.y);

  const columns = [];
  for (const item of withBox) {
    const col = columns.find(
      (c) => Math.abs(c.x - item.b.x) <= STACK_X_TOLERANCE,
    );
    if (col) col.items.push(item);
    else columns.push({ x: item.b.x, items: [item] });
  }

  const stacks = [];
  for (const col of columns) {
    col.items.sort((p, q) => p.b.y - q.b.y);
    let cur = null;
    for (const item of col.items) {
      const gap = cur ? item.b.y - cur.last.y2 : Infinity;
      if (cur && gap <= STACK_MAX_GAP) {
        cur.members.push(item);
        cur.last = item.b;
      } else {
        cur = { members: [item], last: item.b };
        stacks.push(cur);
      }
    }
  }

  return stacks.map((s) => ({
    nodes: s.members.map((m) => m.n),
    bbox: unionBox(s.members.map((m) => m.b)),
  }));
}

export function transformUpstreamRoadmap(raw, entry) {
  const nodes = Array.isArray(raw?.nodes) ? raw.nodes : [];
  const edges = Array.isArray(raw?.edges) ? raw.edges : [];

  const topics = [];
  const subtopics = [];

  for (const n of nodes) {
    const t = n.type;
    // Link buttons / external jump nodes are navigation, not skills.
    if (n?.data?.href) continue;
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
          items: subtopics.map((n, i) => itemFromNode(entry.id, n, i, "topic")),
        },
      ],
    };
  }

  const topicIds = new Set(topics.map((t) => t.id));
  const subIds = new Set(subtopics.map((s) => s.id));
  const topicBox = new Map(topics.map((t) => [t.id, box(t)]));

  // Edge indexes.
  const topicEdgesForSub = new Map(); // subId -> topicId[]
  const subAdjacency = new Map(); // subId -> Set<subId>
  const addAdj = (a, b) => {
    if (!subAdjacency.has(a)) subAdjacency.set(a, new Set());
    subAdjacency.get(a).add(b);
  };
  for (const e of edges) {
    const s = e.source;
    const t = e.target;
    if (topicIds.has(s) && subIds.has(t))
      topicEdgesForSub.set(t, [...(topicEdgesForSub.get(t) ?? []), s]);
    else if (topicIds.has(t) && subIds.has(s))
      topicEdgesForSub.set(s, [...(topicEdgesForSub.get(s) ?? []), t]);
    else if (subIds.has(s) && subIds.has(t)) {
      addAdj(s, t);
      addAdj(t, s);
    }
  }

  const stacks = detectStacks(subtopics);
  const stackOfSub = new Map();
  stacks.forEach((st, i) => st.nodes.forEach((n) => stackOfSub.set(n.id, i)));
  const assigned = new Array(stacks.length).fill(null); // { topicId, how }

  const nearestTopic = (bbox, candidates) => {
    let best = null;
    let bestD = Infinity;
    for (const tid of candidates) {
      const d = boxDist(bbox, topicBox.get(tid));
      if (d < bestD) {
        bestD = d;
        best = tid;
      }
    }
    return best;
  };

  // Pass 1: direct edges (majority vote, tie → nearest).
  stacks.forEach((st, i) => {
    const votes = new Map();
    for (const n of st.nodes)
      for (const tid of topicEdgesForSub.get(n.id) ?? [])
        votes.set(tid, (votes.get(tid) ?? 0) + 1);
    if (votes.size === 0) return;
    const max = Math.max(...votes.values());
    const tied = [...votes].filter(([, v]) => v === max).map(([k]) => k);
    const topicId = tied.length === 1 ? tied[0] : nearestTopic(st.bbox, tied);
    assigned[i] = { topicId, how: "edge" };
  });

  // Pass 2: edge chains into an already-placed stack (BFS, depth ≤ CHAIN_DEPTH).
  stacks.forEach((st, i) => {
    if (assigned[i]) return;
    const seen = new Set(st.nodes.map((n) => n.id));
    let frontier = [...seen];
    for (let depth = 0; depth < CHAIN_DEPTH && frontier.length; depth++) {
      const next = [];
      for (const id of frontier) {
        for (const nb of subAdjacency.get(id) ?? []) {
          if (seen.has(nb)) continue;
          seen.add(nb);
          const j = stackOfSub.get(nb);
          if (j !== undefined && assigned[j]?.how === "edge") {
            assigned[i] = { topicId: assigned[j].topicId, how: "chain" };
            return;
          }
          next.push(nb);
        }
      }
      frontier = next;
    }
  });

  // Pass 3: spatial fallback within the row band, else global nearest.
  const allTopicIds = [...topicIds];
  stacks.forEach((st, i) => {
    if (assigned[i]) return;
    const inBand = allTopicIds.filter((tid) => {
      const tb = topicBox.get(tid);
      return tb.y2 >= st.bbox.y - ROW_BAND && tb.y <= st.bbox.y2 + ROW_BAND;
    });
    const topicId = nearestTopic(st.bbox, inBand.length ? inBand : allTopicIds);
    assigned[i] = { topicId, how: "spatial" };
  });

  // Sections in visual reading order (y, then x).
  topics.sort((a, b) => {
    const ba = topicBox.get(a.id);
    const bb = topicBox.get(b.id);
    return ba.y - bb.y || ba.x - bb.x;
  });

  const stacksByTopic = new Map();
  stacks.forEach((st, i) => {
    const { topicId, how } = assigned[i];
    if (!stacksByTopic.has(topicId)) stacksByTopic.set(topicId, []);
    stacksByTopic.get(topicId).push({ ...st, how });
  });

  const sections = topics.map((topic, idx) => {
    const label = String(topic?.data?.label ?? `Section ${idx + 1}`).trim();
    const items = [itemFromNode(entry.id, topic, 0, "topic")];
    const owned = (stacksByTopic.get(topic.id) ?? []).sort(
      (a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x,
    );
    for (const st of owned)
      for (const n of st.nodes)
        items.push(itemFromNode(entry.id, n, items.length, st.how));
    return {
      id: `${entry.id}:sec:${topic.id}`,
      label,
      order: idx,
      items,
    };
  });

  return {
    id: entry.id,
    label: entry.label,
    kind: entry.kind,
    color: entry.color,
    upstreamId: entry.id,
    sections,
  };
}

function itemFromNode(disciplineId, n, order, how) {
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
    _assign: how,
  };
}
