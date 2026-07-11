import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initNative, isNative } from "./lib/native";

// Bootstrap Capacitor cuando la app corre como APK Android.
// En web es no-op (Capacitor.isNativePlatform() === false).
initNative();

// El Service Worker de la PWA (precache agresivo + skipWaiting) solo tiene
// sentido en el navegador (offline/instalable). Dentro del APK nativo NO se
// registra: server.url ya carga siempre la version en vivo de Vercel, y el
// SW terminaba sirviendo el bundle JS viejo durante 1-2 reaperturas despues
// de cada deploy. injectRegister:false en vite.config.ts saca el registro
// automatico; aca lo hacemos a mano, condicionado.
if (!isNative()) {
  import("virtual:pwa-register").then(({ registerSW }) => {
    registerSW({ immediate: true });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
