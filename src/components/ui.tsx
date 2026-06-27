import type { Priority, UserId, Visibility } from "../data/types";
import { USERS } from "../data/users";
import { Lock, Users, Landmark } from "lucide-react";

export function Avatar({
  id,
  size = 28,
  ring = false,
}: {
  id: UserId;
  size?: number;
  ring?: boolean;
}) {
  const u = USERS[id];
  return (
    <span
      title={`${u.name} ${u.lastName}`}
      className="inline-flex items-center justify-center rounded-full font-semibold shrink-0"
      style={{
        width: size,
        height: size,
        background: u.color,
        color: "#0A1828",
        fontSize: size * 0.38,
        boxShadow: ring ? "0 0 0 2px var(--bg)" : undefined,
      }}
    >
      {u.initials}
    </span>
  );
}

export function AvatarStack({ ids, size = 26 }: { ids: UserId[]; size?: number }) {
  return (
    <div className="flex" style={{ paddingLeft: 6 }}>
      {ids.map((id, i) => (
        <span key={id} style={{ marginLeft: i === 0 ? -6 : -8, zIndex: 10 - i }}>
          <Avatar id={id} size={size} ring />
        </span>
      ))}
    </div>
  );
}

/** Determina el nivel de visibilidad a partir de la lista */
export function visibilityLevel(v: Visibility): "privado" | "compartido" | "todos" {
  if (v.length >= 3) return "todos";
  if (v.length === 1) return "privado";
  return "compartido";
}

export function VisibilityBadge({ v }: { v: Visibility }) {
  const level = visibilityLevel(v);
  const map = {
    privado: {
      icon: <Lock size={11} />,
      label: "Privado",
      style: "text-[var(--text-dim)] border-[var(--border)]",
    },
    compartido: {
      icon: <Users size={11} />,
      label: "Compartido",
      style: "text-[var(--color-dorado)] border-[var(--border-strong)]",
    },
    todos: {
      icon: <Landmark size={11} />,
      label: "Los 3 socios",
      style:
        "text-[var(--color-dorado)] border-[var(--color-dorado-dim)] bg-[var(--color-dorado)]/8",
    },
  }[level];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 uppercase-label ${map.style}`}
    >
      {map.icon}
      {map.label}
    </span>
  );
}

const SEM = {
  rojo: "var(--color-rojo)",
  ambar: "var(--color-ambar)",
  verde: "var(--color-verde)",
};

export function SemaphoreDot({ tone }: { tone: keyof typeof SEM }) {
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{ width: 8, height: 8, background: SEM[tone] }}
    />
  );
}

export function PriorityBadge({ p }: { p: Priority }) {
  const map = {
    alta: { label: "Alta", color: "var(--color-rojo)" },
    media: { label: "Media", color: "var(--color-ambar)" },
    baja: { label: "Baja", color: "var(--text-dim)" },
  }[p];
  return (
    <span
      className="uppercase-label rounded-md border px-1.5 py-0.5"
      style={{ color: map.color, borderColor: map.color + "55" }}
    >
      {map.label}
    </span>
  );
}

export function SectionTitle({
  kicker,
  children,
  count,
}: {
  kicker?: string;
  children: React.ReactNode;
  count?: string | number;
}) {
  return (
    <div className="mb-5">
      {kicker && (
        <div className="uppercase-label text-[var(--text-faint)] mb-1">
          {kicker}
        </div>
      )}
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-serif text-4xl md:text-5xl leading-tight">
          {children}
        </h1>
        {count !== undefined && (
          <span className="uppercase-label text-[var(--text-faint)] tnum whitespace-nowrap">
            {count}
          </span>
        )}
      </div>
      <div className="gold-rule mt-4 max-w-xs" />
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`uppercase-label rounded-lg px-3 py-2 transition-colors border ${
        active
          ? "border-[var(--color-dorado)] text-[var(--color-dorado)] bg-[var(--color-dorado)]/8"
          : "border-transparent text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--border)]"
      }`}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] ${
        onClick ? "cursor-pointer hover:border-[var(--border-strong)] transition-colors" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
