// Pure-logic tests for storage merging and activity rules.
// Run with `pnpm test` (node --test; Node ≥ 22.18 strips TS types natively).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyStorage,
  mergeStorage,
  normalizeStorage,
} from "../app/lib/storage.ts";
import {
  dayKey,
  dayLevel,
  skillActivityDays,
  streakDays,
} from "../app/lib/activity.ts";

const at = (iso) => new Date(iso).toISOString();
const state = (over = {}) => ({ ...emptyStorage(), ...over });
const status = (id, from, to, when) => ({
  kind: "status",
  id,
  from,
  to,
  at: at(when),
});

test("merge keeps both sides' changes to different skills", () => {
  const a = state({
    progress: { x: "done" },
    events: [status("x", "untouched", "done", "2026-10-01T10:00Z")],
  });
  const b = state({
    progress: { y: "learning" },
    events: [status("y", "untouched", "learning", "2026-10-02T10:00Z")],
  });
  const m = mergeStorage(a, b);
  assert.deepEqual(m.progress, { x: "done", y: "learning" });
  assert.equal(m.events.length, 2);
});

test("merge: the newer status event wins for the same skill", () => {
  const a = state({
    progress: { x: "done" },
    events: [status("x", "learning", "done", "2026-10-03T10:00Z")],
  });
  const b = state({
    progress: { x: "skipped" },
    events: [status("x", "learning", "skipped", "2026-10-01T10:00Z")],
  });
  assert.equal(mergeStorage(a, b).progress.x, "done");
  assert.equal(mergeStorage(b, a).progress.x, "done");
});

test("merge: a later 'untouched' clears the skill", () => {
  const a = state({
    events: [status("x", "done", "untouched", "2026-10-05T10:00Z")],
  });
  const b = state({
    progress: { x: "done" },
    events: [status("x", "learning", "done", "2026-10-04T10:00Z")],
  });
  assert.equal(mergeStorage(a, b).progress.x, undefined);
});

test("merge: a check-in switched off later stays off", () => {
  const a = state({
    checkins: { "2026-10-01": { on: false, at: at("2026-10-02T09:00Z") } },
  });
  const b = state({
    checkins: { "2026-10-01": { on: true, at: at("2026-10-01T09:00Z") } },
  });
  assert.equal(mergeStorage(a, b).checkins["2026-10-01"].on, false);
  assert.equal(mergeStorage(b, a).checkins["2026-10-01"].on, false);
});

test("merge de-duplicates events and is idempotent", () => {
  const ev = status("x", "untouched", "done", "2026-10-01T10:00Z");
  const a = state({ progress: { x: "done" }, events: [ev] });
  const b = state({ progress: { x: "done" }, events: [{ ...ev }] });
  const m = mergeStorage(a, b);
  assert.equal(m.events.length, 1);
  assert.deepEqual(mergeStorage(m, m), m);
  assert.deepEqual(mergeStorage(m, b), m);
});

test("merge: hidden comes from the newer snapshot", () => {
  const a = state({ hidden: ["a"], updatedAt: at("2026-10-01T00:00Z") });
  const b = state({ hidden: ["b"], updatedAt: at("2026-10-02T00:00Z") });
  assert.deepEqual(mergeStorage(a, b).hidden, ["b"]);
  assert.equal(mergeStorage(a, b).updatedAt, at("2026-10-02T00:00Z"));
});

test("normalizeStorage drops malformed and far-future check-ins", () => {
  const future = new Date();
  future.setDate(future.getDate() + 5);
  const n = normalizeStorage({
    checkins: {
      "2026-10-01": { on: true, at: at("2026-10-01T09:00Z") },
      "not-a-day": { on: true, at: at("2026-10-01T09:00Z") },
      "2026-10-02": { on: "yes", at: at("2026-10-01T09:00Z") },
      "2026-10-03": { on: true, at: "garbage" },
      [dayKey(future)]: { on: true, at: new Date().toISOString() },
    },
  });
  assert.deepEqual(Object.keys(n.checkins), ["2026-10-01"]);
});

test("normalizeStorage defaults checkins for old data", () => {
  assert.deepEqual(normalizeStorage({ progress: {} }).checkins, {});
});

test("skillActivityDays: distinct days per skill, a burst counts once", () => {
  const today = new Date(2026, 9, 11, 12); // Oct 11; 30d window starts Sep 12
  const events = [
    status("x", "untouched", "learning", new Date(2026, 9, 10, 9)),
    status("x", "learning", "done", new Date(2026, 9, 10, 10)),
    status("y", "untouched", "learning", new Date(2026, 9, 5, 9)),
    status("y", "learning", "done", new Date(2026, 9, 8, 9)),
    status("z", "untouched", "done", new Date(2026, 8, 11, 9)), // outside
    status("z", "done", "learning", new Date(2026, 8, 12, 9)), // boundary: in
    { kind: "applied", id: "w", from: true, to: false, at: at("2026-10-10") },
    status("v", "learning", "untouched", new Date(2026, 9, 10, 9)),
  ];
  const m = skillActivityDays(events, 30, today);
  assert.equal(m.get("x").days.size, 1); // both same-day events collapse
  assert.equal(m.get("x").lastAt, at(new Date(2026, 9, 10, 10)));
  assert.equal(m.get("y").days.size, 2);
  assert.equal(m.get("z").days.size, 1); // only the Sep 12 event counts
  assert.equal(m.has("w"), false); // un-applying is not learning activity
  assert.equal(m.has("v"), false); // clearing back to untouched is not either
});

test("dayLevel boundaries", () => {
  assert.equal(dayLevel(0, false), 0);
  assert.equal(dayLevel(0, true), 1);
  assert.equal(dayLevel(1, false), 2);
  assert.equal(dayLevel(1, true), 2);
  assert.equal(dayLevel(2, false), 3);
  assert.equal(dayLevel(3, false), 3);
  assert.equal(dayLevel(4, false), 4);
  assert.equal(dayLevel(12, true), 4);
});

test("streak: today empty but yesterday active keeps it alive", () => {
  const today = new Date(2026, 9, 11, 12);
  const checkins = {
    "2026-10-09": { on: true, at: at("2026-10-09T12:00Z") },
    "2026-10-10": { on: true, at: at("2026-10-10T12:00Z") },
  };
  const s = streakDays([], today, undefined, checkins);
  assert.equal(s.current, 2);
  assert.equal(s.longest, 2);
});

test("streak: a missed day breaks it; events and check-ins both count", () => {
  const today = new Date(2026, 9, 11, 12);
  const events = [
    status("x", "untouched", "learning", new Date(2026, 9, 11, 9)),
  ];
  const checkins = {
    "2026-10-08": { on: true, at: at("2026-10-08T12:00Z") },
    "2026-10-10": { on: true, at: at("2026-10-10T12:00Z") },
    "2026-10-07": { on: false, at: at("2026-10-07T12:00Z") },
  };
  const s = streakDays(events, today, undefined, checkins);
  assert.equal(s.current, 2); // Oct 10 (check-in) + Oct 11 (event); Oct 9 missed
  assert.equal(s.longest, 2);
});

test("streak: two missed days resets current to 0", () => {
  const today = new Date(2026, 9, 11, 12);
  const checkins = { "2026-10-09": { on: true, at: at("2026-10-09T12:00Z") } };
  assert.equal(streakDays([], today, undefined, checkins).current, 0);
});
