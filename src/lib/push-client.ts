"use client";

/** Request browser push permission and persist subscription (shared by reminder CTAs). */
export async function ensureBrowserPushSubscription(): Promise<boolean> {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (
    !vapidKey ||
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const padding = "=".repeat((4 - (vapidKey.length % 4)) % 4);
      const b64 = (vapidKey + padding).replace(/-/g, "+").replace(/_/g, "/");
      const raw = atob(b64);
      const key = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) key[i] = raw.charCodeAt(i);

      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key,
      });
    }

    const json = sub.toJSON();
    const { savePushSubscription } = await import("@/app/notifications/actions");
    const res = await savePushSubscription({
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
    });
    return res.ok;
  } catch {
    return false;
  }
}
