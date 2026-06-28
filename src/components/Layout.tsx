import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Home,
  Calendar,
  Users,
  CheckSquare,
  StickyNote,
  MessageCircle,
  Flame,
  Target,
  Search,
  Sun,
  Moon,
  Contrast,
  LogOut,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  Bell,
  Trash2,
} from "lucide-react";
import { useStore } from "../store/store";
import { USERS } from "../data/users";
import { QuickCapture } from "./QuickCapture";
import { CommandSearch } from "./CommandSearch";
import { NotifBell } from "./NotifBell";
import { useState } from "react";

const NAV = [
  { to: "/hoy", label: "Hoy", icon: Home, n: "01" },
  { to: "/agenda", label: "Agenda", icon: Calendar, n: "02" },
  { to: "/notas", label: "Notas", icon: StickyNote, n: "03" },
  { to: "/tareas", label: "Tareas", icon: CheckSquare, n: "04" },
  { to: "/habitos", label: "Hábitos", icon: Flame, n: "05" },
  { to: "/metas", label: "Metas", icon: Target, n: "06" },
  { to: "/reuniones", label: "Reuniones", icon: Users, n: "07" },
  { to: "/chat", label: "Chat", icon: MessageCircle, n: "08" },
];

function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="grid place-items-center rounded-xl font-serif text-2xl shrink-0"
        style={{
          width: 44,
          height: 44,
          background: "var(--color-marino-600)",
          color: "var(--color-dorado)",
          border: "1px solid var(--border-strong)",
        }}
      >
        S
      </div>
      {!collapsed && (
        <div className="leading-none">
          <div className="font-serif text-lg italic">S.B.S. Legal</div>
          <div className="uppercase-label text-[var(--text-faint)] mt-1">
            Cronograma
          </div>
        </div>
      )}
    </div>
  );
}

export function Layout() {
  const {
    currentUser,
    logout,
    theme,
    toggleTheme,
    sidebarCollapsed,
    toggleSidebar,
  } = useStore();
  const nav = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const u = currentUser ? USERS[currentUser] : null;
  const sw = sidebarCollapsed ? 80 : 256;

  const ThemeIcon =
    theme === "claro" ? Sun : theme === "medio" ? Contrast : Moon;

  return (
    <div className="flex h-full">
      {/* Sidebar desktop */}
      <aside
        className="hidden md:flex shrink-0 flex-col border-r border-[var(--border)] py-6 transition-[width] duration-200"
        style={{ width: sw, paddingLeft: 20, paddingRight: 20 }}
      >
        <div className="flex items-center justify-between">
          <Logo collapsed={sidebarCollapsed} />
          {!sidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              title="Colapsar sidebar"
              className="text-[var(--text-faint)] hover:text-[var(--color-dorado)] p-1"
            >
              <PanelLeftClose size={16} />
            </button>
          )}
        </div>
        {sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            title="Expandir sidebar"
            className="mt-4 text-[var(--text-faint)] hover:text-[var(--color-dorado)] mx-auto p-1"
          >
            <PanelLeftOpen size={16} />
          </button>
        )}

        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={sidebarCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors ${
                  isActive
                    ? "bg-[var(--surface)] text-[var(--color-dorado)] border border-[var(--border)]"
                    : "text-[var(--text-dim)] hover:text-[var(--text)] border border-transparent"
                } ${sidebarCollapsed ? "justify-center" : ""}`
              }
            >
              {!sidebarCollapsed && (
                <span className="uppercase-label text-[var(--text-faint)] tnum">
                  {item.n}
                </span>
              )}
              <item.icon size={18} />
              {!sidebarCollapsed && (
                <span className="font-medium">{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-2">
          <NavLink
            to="/papelera"
            title="Papelera"
            className={({ isActive }) =>
              `flex items-center gap-2 uppercase-label ${
                isActive
                  ? "text-[var(--color-dorado)]"
                  : "text-[var(--text-dim)] hover:text-[var(--color-dorado)]"
              } ${sidebarCollapsed ? "justify-center" : ""}`
            }
          >
            <Trash2 size={15} />
            {!sidebarCollapsed && "Papelera"}
          </NavLink>
          <NavLink
            to="/ajustes"
            title="Ajustes"
            className={({ isActive }) =>
              `flex items-center gap-2 uppercase-label ${
                isActive
                  ? "text-[var(--color-dorado)]"
                  : "text-[var(--text-dim)] hover:text-[var(--color-dorado)]"
              } ${sidebarCollapsed ? "justify-center" : ""}`
            }
          >
            <Settings size={15} />
            {!sidebarCollapsed && "Ajustes"}
          </NavLink>

          <button
            onClick={toggleTheme}
            title={`Tema ${theme}`}
            className={`flex items-center gap-2 uppercase-label text-[var(--text-dim)] hover:text-[var(--color-dorado)] ${
              sidebarCollapsed ? "justify-center" : ""
            }`}
          >
            <ThemeIcon size={15} />
            {!sidebarCollapsed && `Tema ${theme}`}
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-8 py-4 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex-1 flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text-faint)] hover:border-[var(--border-strong)] transition-colors"
          >
            <Search size={17} />
            <span className="text-sm">Buscar notas, tareas o folios…</span>
            <kbd className="ml-auto text-[10px] rounded border border-[var(--border)] px-1.5 py-0.5">
              Ctrl K
            </kbd>
          </button>
          <NotifBell />
          {u && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  logout();
                  nav("/login");
                }}
                title="Salir"
                className="text-[var(--text-faint)] hover:text-[var(--color-rojo)] p-2"
              >
                <LogOut size={17} />
              </button>
              <span
                className="grid place-items-center rounded-full font-semibold"
                style={{
                  width: 34,
                  height: 34,
                  background: u.color,
                  color: "#0A1828",
                  fontSize: 12,
                }}
              >
                {u.initials}
              </span>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-10 pb-28 md:pb-10">
          <div className="mx-auto max-w-5xl animate-fadein">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Bottom nav móvil */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 flex justify-around border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur py-2">
        {NAV.slice(0, 4).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1 ${
                isActive ? "text-[var(--color-dorado)]" : "text-[var(--text-faint)]"
              }`
            }
          >
            <item.icon size={20} />
            <span className="text-[10px]">{item.label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => setMoreOpen((o) => !o)}
          className="flex flex-col items-center gap-1 px-3 py-1 text-[var(--text-faint)]"
        >
          <Menu size={20} />
          <span className="text-[10px]">Más</span>
        </button>
      </nav>

      {/* Panel "Más" móvil */}
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 flex flex-col justify-end"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="rounded-t-2xl border-t border-[var(--border)] bg-[var(--surface)] p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-[var(--border-strong)] mx-auto mb-4" />
            <div className="grid grid-cols-4 gap-3 mb-4">
              {NAV.slice(4).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1.5 rounded-xl py-3 ${
                      isActive
                        ? "bg-[var(--surface-2)] text-[var(--color-dorado)]"
                        : "text-[var(--text-dim)]"
                    }`
                  }
                >
                  <item.icon size={22} />
                  <span className="text-[11px]">{item.label}</span>
                </NavLink>
              ))}
              <NavLink
                to="/bandeja"
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1.5 rounded-xl py-3 ${
                    isActive
                      ? "bg-[var(--surface-2)] text-[var(--color-dorado)]"
                      : "text-[var(--text-dim)]"
                  }`
                }
              >
                <Bell size={22} />
                <span className="text-[11px]">Bandeja</span>
              </NavLink>
              <NavLink
                to="/papelera"
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1.5 rounded-xl py-3 ${
                    isActive
                      ? "bg-[var(--surface-2)] text-[var(--color-dorado)]"
                      : "text-[var(--text-dim)]"
                  }`
                }
              >
                <Trash2 size={22} />
                <span className="text-[11px]">Papelera</span>
              </NavLink>
              <NavLink
                to="/ajustes"
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1.5 rounded-xl py-3 ${
                    isActive
                      ? "bg-[var(--surface-2)] text-[var(--color-dorado)]"
                      : "text-[var(--text-dim)]"
                  }`
                }
              >
                <Settings size={22} />
                <span className="text-[11px]">Ajustes</span>
              </NavLink>
            </div>
            <button
              onClick={() => { toggleTheme(); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text-dim)] hover:bg-[var(--surface-2)]"
            >
              <ThemeIcon size={18} />
              <span className="text-sm">Tema: {theme}</span>
            </button>
            <button
              onClick={() => { logout(); nav("/login"); setMoreOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text-dim)] hover:bg-[var(--surface-2)]"
            >
              <LogOut size={18} />
              <span className="text-sm">Cerrar sesión</span>
            </button>
          </div>
        </div>
      )}

      <QuickCapture />
      <CommandSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
