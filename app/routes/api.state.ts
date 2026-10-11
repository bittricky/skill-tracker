import type { Route } from "./+types/api.state";
import { normalizeStorage } from "~/lib/storage";
import { loadServerState, mergeServerState } from "~/lib/stateStore.server";

const MAX_BODY_BYTES = 5 * 1024 * 1024;
const NO_STORE = { "Cache-Control": "no-store" };

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: NO_STORE });

/**
 * Only the app's own pages may use this endpoint. Browsers send
 * `Sec-Fetch-Site` (and `Origin` on writes); cross-origin reads are already
 * blocked by the absence of CORS headers. Writes without either header are
 * rejected; bare GETs (curl on the LAN) are allowed.
 */
function sameOrigin(request: Request, write: boolean): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin" || (!write && site === "none");
  const origin = request.headers.get("origin");
  if (origin) {
    const host = (
      request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? ""
    )
      .split(",")[0]
      .trim();
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  return !write;
}

export async function loader({ request }: Route.LoaderArgs) {
  if (!sameOrigin(request, false)) return json({ error: "forbidden" }, 403);
  const state = await loadServerState();
  return json({ state, updatedAt: state?.updatedAt ?? null });
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "PUT")
    return new Response(null, {
      status: 405,
      headers: { ...NO_STORE, Allow: "GET, PUT" },
    });
  if (!sameOrigin(request, true)) return json({ error: "forbidden" }, 403);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES)
    return json({ error: "payload too large" }, 413);

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES)
    return json({ error: "payload too large" }, 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }
  const state = await mergeServerState(normalizeStorage(body));
  return json({ state, updatedAt: state.updatedAt ?? null });
}
