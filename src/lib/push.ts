/** Browser-side Web Push subscription.
 *
 *  Area watches personalised the in-app feed but reached no phone, so a flood
 *  report about the street you were about to sign on only existed if you
 *  happened to open the app that week.
 *
 *  Everything here degrades quietly. Push is unsupported on some browsers,
 *  blocked by the user on others, and switched off entirely when the server has
 *  no VAPID keys. None of those is an error worth showing as one.
 */

import { api } from "@/lib/api";

export type PushState =
  | "unsupported" // the browser has no Push API (older iOS Safari, etc.)
  | "disabled" // no VAPID key configured server-side
  | "denied" // the user said no; only they can undo this, in browser settings
  | "off"
  | "on";

/** The VAPID key arrives base64url-encoded; PushManager wants raw bytes.
 *
 *  Backed by an explicit ArrayBuffer because `applicationServerKey` requires
 *  one: a plain Uint8Array can be backed by a SharedArrayBuffer, which the DOM
 *  type rejects.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalised);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function currentState(): Promise<PushState> {
  if (!isSupported()) return "unsupported";

  const config = await api.pushConfig().catch(() => null);
  if (!config?.enabled || !config.public_key) return "disabled";

  if (Notification.permission === "denied") return "denied";

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  return existing ? "on" : "off";
}

/** Ask permission, subscribe, and register the endpoint with the API. */
export async function enable(): Promise<PushState> {
  if (!isSupported()) return "unsupported";

  const config = await api.pushConfig();
  if (!config.enabled || !config.public_key) return "disabled";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return permission === "denied" ? "denied" : "off";
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    // Required by every browser: a push that isn't shown to the user is not
    // allowed, which is also the behaviour we want.
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(config.public_key),
  });

  await api.pushSubscribe(subscription.toJSON() as never);
  return "on";
}

export async function disable(): Promise<PushState> {
  if (!isSupported()) return "unsupported";

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return "off";

  // Tell the server first. If the order were reversed and the unsubscribe
  // request failed, the server would keep pushing to an endpoint the browser
  // has already torn down — and the user would have no way to stop it from
  // inside the app.
  await api.pushUnsubscribe(subscription.toJSON() as never).catch(() => undefined);
  await subscription.unsubscribe();
  return "off";
}
