import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
  Bell,
  BellOff,
} from "lucide-react";
import { useStore } from "../store/store";
import { useAuth } from "../contexts/AuthContext";
import { SectionTitle, Card, Avatar } from "../components/ui";
import { USERS } from "../data/users";
import {
  pushSupported,
  isSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
  notificationPermission,
} from "../lib/push";

export function Ajustes() {
  const { currentUser, theme, toggleTheme } = useStore();
  const { changePassword, session } = useAuth();
  const u = currentUser ? USERS[currentUser] : null;

  if (!u) return null;

  return (
    <div>
      <SectionTitle kicker="Ajustes">
        Tu <span className="italic text-[var(--color-dorado)]">cuenta</span>
      </SectionTitle>

      {/* Perfil */}
      <Card className="p-5 mb-4">
        <div className="flex items-center gap-3">
          <Avatar id={u.id} size={44} />
          <div>
            <div className="font-serif text-xl">
              {u.name} {u.lastName}
            </div>
            <div className="uppercase-label text-[var(--text-faint)]">
              {session?.user.email ?? ""}
            </div>
            <div className="uppercase-label text-[var(--text-faint)]">
              Firma Legal S.B.S.
            </div>
          </div>
        </div>
      </Card>

      {/* Contraseña */}
      <Card className="p-5 mb-4">
        <div className="flex items-start gap-3 mb-4">
          <span
            className="grid place-items-center rounded-lg shrink-0"
            style={{
              width: 36,
              height: 36,
              background: "var(--color-verde)1a",
              color: "var(--color-verde)",
              border: "1px solid var(--color-verde)55",
            }}
          >
            <ShieldCheck size={18} />
          </span>
          <div>
            <div className="font-medium">Seguridad</div>
            <p className="text-sm text-[var(--text-dim)] italic mt-0.5">
              Tu cuenta está protegida con email y contraseña de Supabase Auth.
            </p>
          </div>
        </div>
        <PasswordManager onSave={changePassword} />
      </Card>

      {/* Notificaciones push */}
      <Card className="p-5 mb-4">
        <PushToggle userUuid={session?.user.id ?? null} />
      </Card>

      {/* Apariencia */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-medium">Apariencia</div>
            <p className="text-sm text-[var(--text-dim)] italic mt-0.5">
              Tema actual:{" "}
              <span className="text-[var(--text)]">{theme}</span>
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm hover:border-[var(--border-strong)]"
          >
            Cambiar tema
          </button>
        </div>
      </Card>
    </div>
  );
}

function PushToggle({ userUuid }: { userUuid: string | null }) {
  const [supported] = useState(pushSupported());
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!supported) {
      setChecking(false);
      return;
    }
    isSubscribed()
      .then(setActive)
      .finally(() => setChecking(false));
  }, [supported]);

  async function toggle() {
    if (!userUuid) return;
    setBusy(true);
    setMsg(null);
    if (active) {
      const err = await unsubscribeFromPush();
      setBusy(false);
      if (err) {
        setMsg({ ok: false, text: err });
      } else {
        setActive(false);
        setMsg({ ok: true, text: "Notificaciones desactivadas en este dispositivo." });
      }
    } else {
      const err = await subscribeToPush(userUuid);
      setBusy(false);
      if (err) {
        setMsg({ ok: false, text: err });
      } else {
        setActive(true);
        setMsg({ ok: true, text: "¡Listo! Vas a recibir notificaciones en este dispositivo." });
      }
    }
  }

  const denied = notificationPermission() === "denied";

  return (
    <div>
      <div className="flex items-start gap-3 mb-4">
        <span
          className="grid place-items-center rounded-lg shrink-0"
          style={{
            width: 36,
            height: 36,
            background: "var(--color-dorado)1a",
            color: "var(--color-dorado)",
            border: "1px solid var(--color-dorado)55",
          }}
        >
          {active ? <Bell size={18} /> : <BellOff size={18} />}
        </span>
        <div className="flex-1">
          <div className="font-medium">Notificaciones push</div>
          <p className="text-sm text-[var(--text-dim)] italic mt-0.5">
            Recibí recordatorios de eventos, reuniones, tareas y mensajes del
            chat directamente en este dispositivo.
          </p>
        </div>
      </div>

      {!supported ? (
        <p className="text-xs text-[var(--text-faint)]">
          Este navegador no soporta notificaciones push. Asegurate de abrir la
          app instalada en la pantalla de inicio.
        </p>
      ) : denied && !active ? (
        <p className="text-xs text-[var(--color-rojo)]">
          Bloqueaste las notificaciones. Activalas desde la configuración del
          navegador (candado en la barra de direcciones → Notificaciones).
        </p>
      ) : (
        <button
          onClick={toggle}
          disabled={busy || checking || !userUuid}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-40"
          style={
            active
              ? {
                  background: "transparent",
                  color: "var(--text-dim)",
                  border: "1px solid var(--border)",
                }
              : { background: "var(--color-dorado)", color: "#0A1828" }
          }
        >
          {(busy || checking) && <Loader2 size={14} className="animate-spin" />}
          {!busy && !checking &&
            (active ? <BellOff size={14} /> : <Bell size={14} />)}
          {active ? "Desactivar en este dispositivo" : "Activar notificaciones"}
        </button>
      )}

      {msg && (
        <p
          className={`text-xs mt-3 ${
            msg.ok ? "text-[var(--color-verde)]" : "text-[var(--color-rojo)]"
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}

function PasswordManager({
  onSave,
}: {
  onSave: (pwd: string) => Promise<string | null>;
}) {
  const [open, setOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function reset() {
    setOpen(false);
    setPwd("");
    setConfirm("");
    setMsg(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (pwd.length < 6) {
      setMsg({ ok: false, text: "Mínimo 6 caracteres." });
      return;
    }
    if (pwd !== confirm) {
      setMsg({ ok: false, text: "Las contraseñas no coinciden." });
      return;
    }
    setBusy(true);
    const err = await onSave(pwd);
    setBusy(false);
    if (err) {
      setMsg({ ok: false, text: err });
    } else {
      setMsg({ ok: true, text: "Contraseña actualizada correctamente." });
      setPwd("");
      setConfirm("");
      setTimeout(reset, 2000);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
        style={{ background: "var(--color-dorado)", color: "#0A1828" }}
      >
        <KeyRound size={14} /> Cambiar contraseña
      </button>
    );
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <label className="block">
        <span className="uppercase-label text-[var(--text-faint)]">
          Nueva contraseña
        </span>
        <div className="relative mt-1">
          <input
            type={show ? "text" : "password"}
            autoFocus
            required
            minLength={6}
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 pr-10 text-sm outline-none focus:border-[var(--color-dorado)]"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]"
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </label>

      <label className="block">
        <span className="uppercase-label text-[var(--text-faint)]">
          Confirmar contraseña
        </span>
        <input
          type={show ? "text" : "password"}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="••••••••"
          className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-dorado)]"
        />
      </label>

      {msg && (
        <p
          className={`text-xs ${
            msg.ok ? "text-[var(--color-verde)]" : "text-[var(--color-rojo)]"
          }`}
        >
          {msg.text}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !pwd || !confirm}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-40"
          style={{ background: "var(--color-dorado)", color: "#0A1828" }}
        >
          {busy && <Loader2 size={14} className="animate-spin" />}
          Guardar
        </button>
        <button
          type="button"
          onClick={reset}
          className="uppercase-label text-[var(--text-faint)] px-3"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
