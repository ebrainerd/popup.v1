"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { savePushSubscription, deletePushSubscription } from "@/app/notifications/actions";
import { Button } from "@/components/ui/button";

type State = "default" | "enabled" | "denied" | "working";

const noop = () => () => {};

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Lets a logged-in user enable web-push notifications for shops they follow.
 * Hidden entirely when the browser doesn't support push or VAPID isn't set up.
 */
export function NotifyButton() {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const [state, setState] = useState<State>("default");

  // Capability check runs only on the client; false during SSR/hydration.
  const supported = useSyncExternalStore(
    noop,
    () =>
      Boolean(vapidKey) && "serviceWorker" in navigator && "PushManager" in window,
    () => false,
  );

  useEffect(() => {
    if (!supported) return;
    let active = true;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!active) return;
        if (Notification.permission === "denied") setState("denied");
        else setState(sub ? "enabled" : "default");
      })
      .catch(() => {
        if (active) setState("default");
      });
    return () => {
      active = false;
    };
  }, [supported]);

  if (!supported) return null;

  async function enable() {
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "default");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey!) as BufferSource,
      });
      const json = sub.toJSON();
      const res = await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      });
      setState(res.ok ? "enabled" : "default");
    } catch {
      setState("default");
    }
  }

  async function disable() {
    setState("working");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("default");
    } catch {
      setState("enabled");
    }
  }

  if (state === "denied") {
    return (
      <Button variant="outline" size="sm" disabled title="Enable notifications in your browser settings">
        <BellOff className="size-4" /> Notifications blocked
      </Button>
    );
  }

  if (state === "enabled") {
    return (
      <Button variant="outline" size="sm" onClick={disable} disabled={state !== "enabled"}>
        <BellRing className="size-4 text-primary" /> Notifications on
      </Button>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={enable} disabled={state === "working"}>
      <Bell className="size-4" />
      {state === "working" ? "…" : "Notify me"}
    </Button>
  );
}
