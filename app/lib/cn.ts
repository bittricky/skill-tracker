export type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | ClassValue[]
  | Record<string, boolean | null | undefined>;

/** Tiny clsx: joins truthy strings, arrays, and `{ class: cond }` maps. */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const v of inputs) {
    if (!v) continue;
    if (typeof v === "string" || typeof v === "number") out.push(String(v));
    else if (Array.isArray(v)) {
      const s = cn(...v);
      if (s) out.push(s);
    } else for (const [k, on] of Object.entries(v)) if (on) out.push(k);
  }
  return out.join(" ");
}
