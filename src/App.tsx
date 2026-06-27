import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { StoreProvider, useStore } from "./store/store";
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

  if (loading) return <AppLoading />;
  if (!profile || !currentUser) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function AppRoutes() {
  const { loading } = useAuth();
  if (loading) return <AppLoading />;

  return (
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
          <Route path="/ajustes" element={<Ajustes />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/hoy" replace />} />
    </Routes>
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
