import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, SmilePlus } from "lucide-react";
import { useStore } from "../store/store";
import { USERS } from "../data/users";
import { Avatar } from "../components/ui";
import type { ChatMessage } from "../data/types";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const EMOJIS = ["👍", "✅", "❤️", "😂", "🔥", "👀"];

function msgDateLabel(iso: string): string {
  const d = parseISO(iso);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return `Ayer ${format(d, "HH:mm")}`;
  return format(d, "d MMM · HH:mm", { locale: es });
}

function groupByDay(messages: ChatMessage[]) {
  const groups: { label: string; items: ChatMessage[] }[] = [];
  messages.forEach((m) => {
    const d = parseISO(m.createdAt);
    const label = isToday(d)
      ? "Hoy"
      : isYesterday(d)
      ? "Ayer"
      : format(d, "EEEE d 'de' MMMM", { locale: es });
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(m);
    else groups.push({ label, items: [m] });
  });
  return groups;
}

export function Chat() {
  const { data, currentUser, sendMessage, reactMessage, hasMoreMessages, loadMoreMessages } = useStore();
  const [text, setText] = useState("");
  const [emojiFor, setEmojiFor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = data.messages ?? [];
  const groups = groupByDay(messages);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleLoadMore() {
    const scroller = scrollRef.current;
    const prevScrollHeight = scroller?.scrollHeight ?? 0;
    setLoadingMore(true);
    await loadMoreMessages();
    setLoadingMore(false);
    // Mantener posición de scroll al insertar mensajes arriba
    if (scroller) {
      scroller.scrollTop = scroller.scrollHeight - prevScrollHeight;
    }
  }

  function submit() {
    const t = text.trim();
    if (!t) return;
    sendMessage(t);
    setText("");
    inputRef.current?.focus();
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-h-[800px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <div>
          <div className="uppercase-label text-[var(--text-faint)] mb-0.5">
            Canal
          </div>
          <h2 className="font-serif text-xl">
            Firma Legal{" "}
            <span className="italic text-[var(--color-dorado)]">S.B.S.</span>
          </h2>
        </div>
        <div className="flex -space-x-2">
          {(["nelson", "estela", "fatima"] as const).map((id) => (
            <Avatar key={id} id={id} size={32} ring />
          ))}
        </div>
      </div>

      {/* Mensajes */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Botón para cargar mensajes anteriores */}
        {hasMoreMessages && (
          <div className="flex justify-center py-2">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="uppercase-label text-[var(--text-faint)] hover:text-[var(--color-dorado)] disabled:opacity-40 px-3 py-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--color-dorado)] transition-colors"
            >
              {loadingMore ? "Cargando…" : "Ver mensajes anteriores"}
            </button>
          </div>
        )}

        {groups.map((g) => (
          <div key={g.label}>
            {/* Separador de día */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-[var(--border)]" />
              <span className="uppercase-label text-[var(--text-faint)] whitespace-nowrap">
                {g.label}
              </span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>

            <div className="space-y-1">
              {g.items.map((m, i) => {
                const prev = i > 0 ? g.items[i - 1] : null;
                const isMe = m.author === currentUser;
                const sameSender = prev?.author === m.author;

                return (
                  <MessageBubble
                    key={m.id}
                    msg={m}
                    isMe={isMe}
                    sameSender={sameSender}
                    showEmojiPicker={emojiFor === m.id}
                    onToggleEmoji={() =>
                      setEmojiFor((e) => (e === m.id ? null : m.id))
                    }
                    onReact={(emoji) => {
                      reactMessage(m.id, emoji);
                      setEmojiFor(null);
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="grid place-items-center h-full text-center">
            <div>
              <div className="text-4xl mb-3">💬</div>
              <p className="font-serif text-xl text-[var(--text-dim)]">
                Inicio del canal
              </p>
              <p className="text-sm text-[var(--text-faint)] mt-1">
                Este es el espacio compartido de la firma.
              </p>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--border)] px-4 py-3">
        <div className="flex items-end gap-3">
          {currentUser && <Avatar id={currentUser} size={32} />}
          <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 flex items-end gap-3 focus-within:border-[var(--border-strong)] transition-colors">
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Escribí un mensaje… (Enter para enviar)"
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none text-sm leading-relaxed"
              style={{ maxHeight: 120 }}
            />
            <button
              onClick={submit}
              disabled={!text.trim()}
              className="shrink-0 rounded-lg p-2 disabled:opacity-30 transition-opacity"
              style={{ background: "var(--color-dorado)", color: "#0A1828" }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
        <p className="text-[10px] text-[var(--text-faint)] text-center mt-2">
          Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  );
}

function MessageBubble({
  msg,
  isMe,
  sameSender,
  showEmojiPicker,
  onToggleEmoji,
  onReact,
}: {
  msg: ChatMessage;
  isMe: boolean;
  sameSender: boolean;
  showEmojiPicker: boolean;
  onToggleEmoji: () => void;
  onReact: (e: string) => void;
}) {
  const u = USERS[msg.author];
  const reactions = Object.entries(msg.reactions ?? {}).filter(([, v]) => v);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""} ${
        sameSender ? "mt-0.5" : "mt-3"
      }`}
    >
      {/* Avatar — solo si cambia de sender */}
      <div className="shrink-0 w-8">
        {!sameSender && <Avatar id={msg.author} size={30} />}
      </div>

      <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[75%]`}>
        {/* Nombre — solo si cambia de sender */}
        {!sameSender && !isMe && (
          <span
            className="uppercase-label mb-1 ml-1"
            style={{ color: u.color }}
          >
            {u.name}
          </span>
        )}

        <div className="relative flex items-end gap-1">
          {/* Botón emoji (aparece al hover) */}
          <button
            onClick={onToggleEmoji}
            className={`opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-faint)] hover:text-[var(--color-dorado)] p-1 ${
              isMe ? "order-first" : "order-last"
            }`}
          >
            <SmilePlus size={14} />
          </button>

          {/* Burbuja */}
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              isMe
                ? "rounded-br-sm"
                : "rounded-bl-sm"
            }`}
            style={
              isMe
                ? {
                    background: "var(--color-marino-600)",
                    color: "var(--color-crema)",
                    border: "1px solid var(--border-strong)",
                  }
                : {
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                  }
            }
          >
            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
          </div>
        </div>

        {/* Hora */}
        <span className="text-[10px] text-[var(--text-faint)] tnum mt-0.5 mx-1">
          {msgDateLabel(msg.createdAt)}
        </span>

        {/* Reacciones */}
        {reactions.length > 0 && (
          <div className="flex gap-1 mt-1 mx-1 flex-wrap">
            {reactions.map(([uid, emoji]) => (
              <span
                key={uid}
                title={USERS[uid as keyof typeof USERS]?.name}
                className="text-sm rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5"
              >
                {emoji}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Picker de emojis */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute z-20 flex gap-1 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-2 shadow-xl"
          >
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => onReact(e)}
                className="text-lg hover:scale-125 transition-transform"
              >
                {e}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
