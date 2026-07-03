import { useEffect, useRef } from "react";
import { Bold, Italic, Underline, List, ListOrdered } from "lucide-react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}

/** Editor de texto enriquecido basado en contentEditable + execCommand.
 *  El div nunca se controla por dangerouslySetInnerHTML: el valor se sincroniza
 *  al DOM vía ref solo cuando cambia "desde afuera" (cambio de nota), para no
 *  perder el cursor mientras el usuario escribe. */
export function RichTextEditor({ value, onChange, readOnly, placeholder }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  function exec(cmd: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    onChange(ref.current?.innerHTML ?? "");
  }

  function handleInput() {
    const el = ref.current;
    if (!el) return;
    if (el.innerHTML === "<br>") el.innerHTML = "";
    onChange(el.innerHTML);
  }

  return (
    <div>
      {!readOnly && (
        <div className="flex items-center gap-1 mb-2 pb-2 border-b border-[var(--border)]">
          <select
            onChange={(e) => {
              if (e.target.value) exec("formatBlock", e.target.value);
              e.target.value = "";
            }}
            defaultValue=""
            title="Estilo de párrafo"
            className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-1 text-xs mr-1"
          >
            <option value="" disabled>
              Estilo
            </option>
            <option value="p">Normal</option>
            <option value="h2">Título</option>
            <option value="h3">Subtítulo</option>
          </select>
          <ToolbarBtn onClick={() => exec("bold")} title="Negrita">
            <Bold size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => exec("italic")} title="Itálica">
            <Italic size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => exec("underline")} title="Subrayado">
            <Underline size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => exec("insertUnorderedList")} title="Lista">
            <List size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => exec("insertOrderedList")} title="Lista numerada">
            <ListOrdered size={14} />
          </ToolbarBtn>
        </div>
      )}
      <div
        ref={ref}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
        className="rte outline-none leading-relaxed text-[var(--text-dim)] min-h-[180px]"
      />
    </div>
  );
}

function ToolbarBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="w-7 h-7 grid place-items-center rounded-md text-[var(--text-dim)] hover:text-[var(--color-dorado)] hover:bg-[var(--surface-2)]"
    >
      {children}
    </button>
  );
}
