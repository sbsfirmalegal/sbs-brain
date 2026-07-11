import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initNative } from "./lib/native";

// Bootstrap Capacitor cuando la app corre como APK Android.
// En web es no-op (Capacitor.isNativePlatform() === false).
initNative();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
