// Manejo de suscripción a notificaciones push (Web Push API)
import { supabase } from "./supabase";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

/** ¿El navegador soporta push? */
export function pushSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Estado actual del permiso de notificaciones */
export function notificationPermission(): NotificationPermission {
  if (!("Notification" in window)) return "denied";
  return Notification.permission;
}

/** ¿Ya hay una suscripción activa en este dispositivo? */
export async function isSubscribed(): Promise<boolean> {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/**
 * Activa las notificaciones push en este dispositivo para el usuario actual.
 * Devuelve null si todo salió bien, o un mensaje de error.
 */
export async function subscribeToPush(userUuid: string): Promise<string | null> {
  if (!pushSupported()) return "Este dispositivo no soporta notificaciones push.";
  if (!VAPID_PUBLIC_KEY) return "Falta configurar la clave VAPID pública.";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return "Permiso de notificaciones denegado. Activalo desde la configuración del navegador.";
  }

  const reg = await navigator.serviceWorker.ready;

  // Reusar suscripción existente o crear una nueva
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });
  }

  const json = sub.toJSON();
  const endpoint = json.endpoint!;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;

  // upsert por endpoint (un dispositivo = un endpoint único)
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userUuid,
      endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: "endpoint" }
  );

  if (error) return "No se pudo guardar la suscripción: " + error.message;
  return null;
}

/** Desactiva las notificaciones push en este dispositivo */
export async function unsubscribeFromPush(): Promise<string | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return null;

  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return null;
}
