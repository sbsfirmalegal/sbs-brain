import type { CapacitorConfig } from "@capacitor/cli";

// IMPORTANTE: server.url apunta a la web ya desplegada en Vercel.
// Confirmar la URL exacta antes de compilar el APK. Si el proyecto usa un
// dominio custom, reemplazarla aqui. El APK cargara siempre esta URL.
const PROD_URL = "https://sbs-brain.vercel.app";

const config: CapacitorConfig = {
  appId: "com.cronograma.sbs",
  appName: "SBS Cronograma",
  webDir: "dist",
  server: {
    url: PROD_URL,
    androidScheme: "https",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#13284E",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    StatusBar: {
      overlaysWebView: false,
      style: "DARK",
      backgroundColor: "#13284E",
    },
  },
};

export default config;
