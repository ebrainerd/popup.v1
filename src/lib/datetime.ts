/**
 * Helpers for `<input type="datetime-local">` wall clocks <-> UTC ISO, with an
 * explicit IANA timezone (so sellers are not silently bound to the browser TZ
 * or to UTC on the server).
 *
 * Never call `isoToZonedInput` / `plusHoursInTimeZone` during RSC/SSR for
 * user-facing inputs without a known timezone — Vercel runs in UTC and would
 * paint the wrong wall clock (e.g. 10am PDT → 5pm).
 */

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Best-effort IANA zone from the runtime (browser). Falls back to UTC. */
export function detectBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Offset of `timeZone` at instant `date`: (wall-as-UTC ms) - (actual UTC ms). */
function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const map = Object.fromEntries(
    parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]),
  );
  const asWallUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return asWallUtc - date.getTime();
}

/** UTC ISO → `YYYY-MM-DDTHH:mm` wall clock in `timeZone`. */
export function isoToZonedInput(iso?: string | null, timeZone = "UTC"): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const map = Object.fromEntries(
    parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]),
  );
  // en-CA yields YYYY-MM-DD; hourCycle h23 avoids 24:00 edge cases in some engines
  const hour = map.hour === "24" ? "00" : map.hour;
  return `${map.year}-${map.month}-${map.day}T${hour}:${map.minute}`;
}

/**
 * `YYYY-MM-DDTHH:mm` wall clock in `timeZone` → UTC ISO.
 * Uses a two-pass offset correction so DST transitions stay stable.
 */
export function zonedInputToIso(local: string, timeZone = "UTC"): string {
  if (!local) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) return "";
  const [, ys, ms, ds, hs, mins] = match;
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  const h = Number(hs);
  const min = Number(mins);
  if ([y, m, d, h, min].some((n) => Number.isNaN(n))) return "";

  const wallAsUtc = Date.UTC(y, m - 1, d, h, min, 0);
  let utcMs = wallAsUtc - timeZoneOffsetMs(new Date(wallAsUtc), timeZone);
  // Second pass: offset at the corrected instant (DST boundaries).
  utcMs = wallAsUtc - timeZoneOffsetMs(new Date(utcMs), timeZone);
  const result = new Date(utcMs);
  return Number.isNaN(result.getTime()) ? "" : result.toISOString();
}

/** Wall clock "now" in `timeZone`. */
export function nowInTimeZone(timeZone: string): string {
  return isoToZonedInput(new Date().toISOString(), timeZone);
}

/** Wall clock for `now + h` hours in `timeZone`. */
export function plusHoursInTimeZone(h: number, timeZone: string): string {
  return isoToZonedInput(new Date(Date.now() + h * 3_600_000).toISOString(), timeZone);
}

/** @deprecated Prefer isoToZonedInput with an explicit zone. Uses runtime local TZ. */
export function isoToLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** @deprecated Prefer zonedInputToIso with an explicit zone. Uses runtime local TZ. */
export function localInputToIso(local: string): string {
  if (!local) return "";
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

/** @deprecated Prefer plusHoursInTimeZone. */
export function plusHoursLocal(h: number): string {
  return isoToLocalInput(new Date(Date.now() + h * 3_600_000).toISOString());
}
