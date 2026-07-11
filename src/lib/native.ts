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

// Cache del token FCM en memoria + sessionStorage. Necesario porque el evento
// "registration" de Capacitor solo dispara una vez (la primera llamada a
// register() con el token fresco); si el usuario aun no tenia sesion Supabase
// en ese momento, el token se guarda aca y se flushea cuando llega el login.
let cachedFcmToken: string | null = null;

function readCachedToken(): string | null {
  if (cachedFcmToken) return cachedFcmToken;
  try {
    const t = sessionStorage.getItem("fcm_token");
    if (t) cachedFcmToken = t;
    return cachedFcmToken;
  } catch {
    return null;
  }
}

function writeCachedToken(t: string) {
  cachedFcmToken = t;
  try {
    sessionStorage.setItem("fcm_token", t);
  } catch {
    /* ignore */
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

  // 2. Listeners PRIMERO (orden critico: register() dispara "registration" casi
  //    instantaneamente, si el listener no esta atado a tiempo se pierde el token)
  await PushNotifications.removeAllListeners();

  PushNotifications.addListener("registration", async (token: Token) => {
    writeCachedToken(token.value);
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

  // 3. Ahora si, disparar el registro. Los listeners ya estan atados; si el
  //    token viene fresco disparara "registration" y lo cacheara + guardara.
  await PushNotifications.register();
}

/** Reintentar registro cuando el usuario se loguea despues de arrancar.
 *  Si ya tenemos el token en cache (porque llego antes del login), lo
 *  guardamos directo en Supabase sin depender de que register() lo dispare
 *  otra vez (Capacitor no siempre lo hace cuando el token esta cacheado). */
export async function reRegisterPushForUser() {
  if (!isNative()) return;
  const cached = readCachedToken();
  if (cached) {
    await saveDeviceToken(cached);
    return;
  }
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
