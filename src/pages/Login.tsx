import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { USERS, USER_LIST } from "../data/users";
import type { UserId } from "../data/types";

type Step = "pick" | "login" | "register";

export function Login() {
  const { signIn, signUp, profile } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState<Step>("pick");
  const [sel, setSel] = useState<UserId | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Si ya hay sesión activa, redirige
  if (profile) {
    nav("/hoy", { replace: true });
    return null;
  }

  function pickUser(id: UserId) {
    setSel(id);
    setEmail("");
    setPassword("");
    setErr("");
    setStep("login");
  }

  function goBack() {
    setStep("pick");
    setSel(null);
    setErr("");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true);
    setErr("");
    const error = await signIn(email.trim(), password);
    setBusy(false);
    if (error) {
      setErr(translateError(error));
    } else {
      nav("/hoy", { replace: true });
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    // Validar que el email empiece con el slug correcto
    const local = email.split("@")[0].toLowerCase();
    if (sel && local !== sel) {
      setErr(`El email debe empezar con "${sel}@..." para este perfil.`);
      return;
    }
    setBusy(true);
    setErr("");
    const error = await signUp(email.trim(), password);
    setBusy(false);
    if (error) {
      setErr(translateError(error));
    } else {
      setErr("");
      setStep("login");
      setPassword("");
    }
  }

  const u = sel ? USERS[sel] : null;

  return (
    <div className="min-h-full grid place-items-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid place-items-center rounded-2xl font-serif text-4xl mx-auto mb-6"
          style={{
            width: 72,
            height: 72,
            background: "var(--color-marino-600)",
            color: "var(--color-dorado)",
            border: "1px solid var(--border-strong)",
          }}
        >
          S
        </motion.div>
        <h1 className="font-serif text-3xl mb-1">S.B.S. Legal</h1>
        <p className="text-[var(--text-dim)] mb-1">
          Un segundo cerebro para la firma
        </p>
        <div className="gold-rule mx-auto max-w-[140px] my-6" />

        <AnimatePresence mode="wait">
          {/* ── Paso 1: elegir quién entra ── */}
          {step === "pick" && (
            <motion.div
              key="pick"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="uppercase-label text-[var(--text-faint)] mb-4">
                ¿Quién entra?
              </p>
              <div className="grid grid-cols-3 gap-3">
                {USER_LIST.map((u, i) => (
                  <motion.button
                    key={u.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    onClick={() => pickUser(u.id)}
                    className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--border)] p-5 transition-all hover:border-[var(--border-strong)]"
                  >
                    <span
                      className="grid place-items-center rounded-full font-semibold"
                      style={{
                        width: 56,
                        height: 56,
                        background: u.color,
                        color: "#0A1828",
                        fontSize: 20,
                      }}
                    >
                      {u.initials}
                    </span>
                    <span className="text-sm font-medium">{u.name}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Paso 2: login ── */}
          {(step === "login" || step === "register") && u && (
            <motion.div
              key="form"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="flex flex-col items-center"
            >
              {/* Avatar */}
              <span
                className="grid place-items-center rounded-full font-semibold mb-3"
                style={{
                  width: 64,
                  height: 64,
                  background: u.color,
                  color: "#0A1828",
                  fontSize: 22,
                }}
              >
                {u.initials}
              </span>
              <p className="font-serif text-xl mb-1">
                {step === "register"
                  ? `Registrar a ${u.name}`
                  : `Hola, ${u.name}`}
              </p>
              {step === "register" && (
                <p className="text-xs text-[var(--text-dim)] mb-4">
                  El email debe ser{" "}
                  <span className="text-[var(--color-dorado)]">
                    {u.id}@...
                  </span>
                </p>
              )}

              <form
                onSubmit={step === "register" ? handleRegister : handleLogin}
                className="w-full space-y-3 mt-4"
              >
                {/* Email */}
                <label className="block text-left">
                  <span className="uppercase-label text-[var(--text-faint)]">
                    Correo electrónico
                  </span>
                  <input
                    type="email"
                    autoComplete="email"
                    autoFocus
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={`${u.id}@ejemplo.com`}
                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm outline-none focus:border-[var(--color-dorado)] transition-colors"
                  />
                </label>

                {/* Password */}
                <label className="block text-left">
                  <span className="uppercase-label text-[var(--text-faint)]">
                    Contraseña
                  </span>
                  <div className="relative mt-1">
                    <input
                      type={show ? "text" : "password"}
                      autoComplete={
                        step === "register"
                          ? "new-password"
                          : "current-password"
                      }
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 pr-11 text-sm outline-none focus:border-[var(--color-dorado)] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShow((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] hover:text-[var(--text-dim)]"
                    >
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                {err && (
                  <p className="text-xs text-[var(--color-rojo)] text-left">
                    {err}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy || !email || !password}
                  className="w-full rounded-xl py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
                  style={{ background: "var(--color-dorado)", color: "#0A1828" }}
                >
                  {busy && <Loader2 size={16} className="animate-spin" />}
                  {step === "register" ? "Crear cuenta" : "Entrar"}
                </button>
              </form>

              {/* Toggle login ↔ register */}
              <div className="flex items-center gap-4 mt-5">
                <button
                  onClick={goBack}
                  className="flex items-center gap-1.5 uppercase-label text-[var(--text-faint)] hover:text-[var(--color-dorado)]"
                >
                  <ArrowLeft size={13} /> Cambiar
                </button>
                <span className="text-[var(--border-strong)]">|</span>
                <button
                  onClick={() =>
                    setStep((s) => (s === "login" ? "register" : "login"))
                  }
                  className="uppercase-label text-[var(--text-faint)] hover:text-[var(--color-dorado)]"
                >
                  {step === "login" ? "Primera vez →" : "Ya tengo cuenta"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-xs text-[var(--text-faint)] mt-10">
          Sello · S.B.S. · MMXXV
        </p>
      </div>
    </div>
  );
}

function translateError(msg: string): string {
  if (msg.includes("Invalid login credentials"))
    return "Correo o contraseña incorrectos.";
  if (msg.includes("Email not confirmed"))
    return "Confirmá tu correo antes de entrar (revisá tu bandeja).";
  if (msg.includes("User already registered"))
    return "Este correo ya tiene una cuenta. Usá 'Ya tengo cuenta'.";
  if (msg.includes("Password should be"))
    return "La contraseña debe tener al menos 6 caracteres.";
  return msg;
}
