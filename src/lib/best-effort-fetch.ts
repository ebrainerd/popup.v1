/**
 * Fire-and-forget POST for shop open side-effects (opening reminders, auction
 * auto-queue). Swallows network failures — Mobile Safari reports these as
 * `TypeError: Load failed` when the tab backgrounds, navigates away, or the
 * radio blips. Callers should treat `false` as "try again later / rely on cron".
 */
export async function bestEffortPost(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "POST",
      // Helps the request finish when the user navigates away mid-open.
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}
