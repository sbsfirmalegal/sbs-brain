// Bootstrap Capacitor - se activa solo cuando la app corre como APK Android.
// En web (navegador), Capacitor.isNativePlatform() = false y este archivo es no-op.
//
// Responsabilidades:
//  1. StatusBar.setOverlaysWebView(false)  -> arregla el bug de Android 15+ que
//     dibujaba la barra de estado ENCIMA de la topbar sticky de la app.
//  2. Push notifications: pedir permiso -> registrar token FCM ->
//     upsert en tabla device_tokens del usuario -> reaccionar cuando
//     el usuario toca una notificacion (deep-link a una ruta).
//  3. Deep-link: si el payload de FCM trae { ruta: "/tareas" } (por ejemplo),
//     al tocar la notificacion se dispara un CustomEvent "sbs-navigate" que
//     escucha <NativeNavBridge/> dentro del BrowserRouter para navegar sin
//     recargar la web.

import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import {
  PushNotifications,
  type Token,
  type PushNotificationSchema,
  type ActionPerformed,
} from "@capacitor/push-notifications";
import { App as CapApp } from "@capacitor/app";
import { supabase } from "./supabase";

export const isNative = () => Capacitor.isNativePlatform();

/** Dispara el evento que <NativeNavBridge/> escucha para navegar dentro del SPA */
function navigateInSpa(ruta: string) {
  if (!ruta || typeof ruta !== "string") return;
  const target = ruta.startsWith("/") ? ruta : `/${ruta}`;
  window.dispatchEvent(new CustomEvent("sbs-navigate", { detail: target }));
}

/** Sincroniza color/estilo de la barra de estado con el tema actual de la app */
async function syncStatusBarWithTheme() {
  if (!isNative()) return;
  try {
    const isDark = document.documentElement.classList.contains("theme-oscuro");
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({
      color: isDark ? "#0A1828" : "#13284E",
    });
  } catch {
    // algunos dispositivos ignoran esto sin mayor problema
  }
}

/** Guarda el token FCM del dispositivo en Supabase, ligado al usuario actual */
async function saveDeviceToken(fcmToken: string) {
  const { data: sess } = await supabase.auth.getSession();
  const userId = sess.session?.user?.id;
  if (!userId) return;

  const { error } = await supabase.from("device_tokens").upsert(
    {
      user_id: userId,
      token: fcmToken,
      platform: "android",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "token" }
  );
  if (error) {
    console.warn("[native] no se pudo guardar device token:", error.message);
  }
}

/** Configura permisos y listeners de push. Idempotente. */
async function setupPush() {
  if (!isNative()) return;

  // 1. Pedir permiso (Android 13+ POST_NOTIFICATIONS runtime)
  let permStatus = await PushNotifications.checkPermissions();
  if (permStatus.receive === "prompt" || permStatus.receive === "prompt-with-rationale") {
    permStatus = await PushNotifications.requestPermissions();
  }
  if (permStatus.receive !== "granted") {
    console.warn("[native] permiso de notificaciones denegado");
    return;
  }

  // 2. Registrar con FCM
  await PushNotifications.register();

  // 3. Listeners (se registran una sola vez, PushNotifications los acumula si se llama otra vez)
  await PushNotifications.removeAllListeners();

  PushNotifications.addListener("registration", async (token: Token) => {
    await saveDeviceToken(token.value);
  });

  PushNotifications.addListener("registrationError", (err) => {
    console.error("[native] registrationError:", err);
  });

  PushNotifications.addListener(
    "pushNotificationReceived",
    (n: PushNotificationSchema) => {
      // En foreground el sistema NO muestra la notificacion; aca podriamos
      // enseñar un toast in-app. De momento lo dejo como log; los datos siguen
      // llegando al store via Realtime asi que la UI se actualiza igual.
      console.log("[native] push foreground:", n.title, n.body);
    }
  );

  PushNotifications.addListener(
    "pushNotificationActionPerformed",
    (action: ActionPerformed) => {
      const ruta = (action.notification?.data?.ruta ??
        action.notification?.data?.route) as string | undefined;
      if (ruta) navigateInSpa(ruta);
    }
  );
}

/** Reintentar registro cuando el usuario se loguea despues de arrancar */
export async function reRegisterPushForUser() {
  if (!isNative()) return;
  try {
    await PushNotifications.register();
  } catch (e) {
    console.warn("[native] re-register fallo:", e);
  }
}

/** Punto de entrada unico, llamado desde main.tsx */
export async function initNative() {
  if (!isNative()) return;

  // Barra de estado NO overlay (evita que tape la topbar en Android 15+)
  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await syncStatusBarWithTheme();
  } catch (e) {
    console.warn("[native] StatusBar setup fallo:", e);
  }

  // Reajustar la barra si el tema cambia en runtime
  const themeObserver = new MutationObserver(() => syncStatusBarWithTheme());
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  // Deep-link cuando la app se abre desde background por tap en notificacion
  CapApp.addListener("appUrlOpen", (data) => {
    const url = data.url || "";
    const m = url.match(/[?&]ruta=([^&]+)/);
    if (m) navigateInSpa(decodeURIComponent(m[1]));
  });

  // Push
  await setupPush();

  // Ocultar splash despues de que la app este montada
  try {
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch {
    /* ignore */
  }
}
