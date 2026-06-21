/**
 * Helpers for `<input type="datetime-local">` <-> ISO conversion.
 *
 * A datetime-local value is a *wall-clock* string with no timezone. Sending it
 * raw to the server (which runs in UTC) makes `new Date(value)` interpret it as
 * UTC, shifting every time by the user's offset — the bug that made shops show
 * "Ended" immediately. Converting on the client (where `new Date` uses the
 * browser's timezone) preserves the user's intended instant.
 */

/** ISO timestamp -> value for a datetime-local input, in the browser's local time. */
export function isoToLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

/** datetime-local value -> real UTC ISO string (interpreted in the browser's tz). */
export function localInputToIso(local: string): string {
  if (!local) return "";
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}
