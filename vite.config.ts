import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: { port: 5180, strictPort: false },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      // Registro manual (ver src/main.tsx): dentro del APK nativo el Service
      // Worker NO se registra, porque su precache agresivo (skipWaiting +
      // clients.claim) sirve el bundle JS viejo en el WebView remoto durante
      // 1-2 reaperturas de la app cada vez que se hace un deploy nuevo.
      injectRegister: false,
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
      },
      includeAssets: ["favicon.svg", "icon-192.svg", "icon-512.svg"],
      manifest: {
        name: "SBS Cronograma",
        short_name: "SBS",
        description: "Segundo cerebro de Firma Legal S.B.S",
        theme_color: "#13284E",
        background_color: "#0A1828",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icon-192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any maskable" },
          { src: "icon-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any maskable" },
        ],
      },
    }),
  ],
});
