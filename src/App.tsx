import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useNavigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { StoreProvider, useStore } from "./store/store";
import { reRegisterPushForUser } from "./lib/native";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Hoy } from "./pages/Hoy";
import { Agenda } from "./pages/Agenda";
import { Reuniones } from "./pages/Reuniones";
import { Tareas } from "./pages/Tareas";
import { Notas } from "./pages/Notas";
import { Chat } from "./pages/Chat";
import { Habitos } from "./pages/Habitos";
import { Metas } from "./pages/Metas";
import { Bandeja } from "./pages/Bandeja";
import { Ajustes } from "./pages/Ajustes";
import { Papelera } from "./pages/Papelera";

function AppLoading() {
  return (
    <div
      className="min-h-screen grid place-items-center"
      style={{ background: "var(--bg)" }}
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="grid place-items-center rounded-2xl font-serif text-3xl animate-pulse"
          style={{
            width: 64,
            height: 64,
            background: "var(--color-marino-600)",
            color: "var(--color-dorado)",
            border: "1px solid var(--border-strong)",
          }}
        >
          S
        </div>
        <p className="uppercase-label text-[var(--text-faint)]">Cargando…</p>
      </div>
    </div>
  );
}

function Protected() {
  const { profile, loading } = useAuth();
  const { currentUser } = useStore();

  // Al confirmar sesion, reintenta el registro FCM para que el token del
  // dispositivo quede ligado al usuario (setupPush inicial puede haber corrido
  // antes de que la sesion estuviera lista).
  useEffect(() => {
    if (profile?.id) reRegisterPushForUser();
  }, [profile?.id]);

  if (loading) return <AppLoading />;
  if (!profile || !currentUser) return <Navigate to="/login" replace />;
  return <Outlet />;
}

// Puente entre native.ts y react-router: al recibir "sbs-navigate" navega
// dentro del SPA sin recarga.
function NativeNavBridge() {
  const nav = useNavigate();
  useEffect(() => {
    const onNav = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === "string") nav(detail);
    };
    window.addEventListener("sbs-navigate", onNav);
    return () => window.removeEventListener("sbs-navigate", onNav);
  }, [nav]);
  return null;
}

function AppRoutes() {
  const { loading } = useAuth();
  if (loading) return <AppLoading />;

  return (
    <>
      <NativeNavBridge />
      <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected />}>
        <Route element={<Layout />}>
          <Route path="/hoy" element={<Hoy />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/reuniones" element={<Reuniones />} />
          <Route path="/tareas" element={<Tareas />} />
          <Route path="/notas" element={<Notas />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/habitos" element={<Habitos />} />
          <Route path="/metas" element={<Metas />} />
          <Route path="/bandeja" element={<Bandeja />} />
          <Route path="/papelera" element={<Papelera />} />
          <Route path="/ajustes" element={<Ajustes />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/hoy" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </StoreProvider>
    </AuthProvider>
  );
}
