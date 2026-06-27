import { useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  format,
  isSameMonth,
  isToday,
  isSameDay,
  isSameWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  /** Día actualmente seleccionado en la vista principal */
  selected: Date;
  /** Si true, resalta toda la semana del selected (vista semana). Si false, solo el día */
  highlightWeek?: boolean;
  onSelectDate: (date: Date) => void;
  /** Fechas con eventos (ISO yyyy-mm-dd), para mostrar punto debajo del día */
  datesWithEvents?: Set<string>;
}

export function MiniCalendar({
  selected,
  highlightWeek = false,
  onSelectDate,
  datesWithEvents,
}: Props) {
  const [month, setMonth] = useState(selected);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setMonth(addMonths(month, -1))}
          className="rounded p-1 text-[var(--text-faint)] hover:text-[var(--text)]"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => {
            setMonth(new Date());
            onSelectDate(new Date());
          }}
          className="font-serif capitalize text-sm hover:text-[var(--color-dorado)] transition-colors"
        >
          {format(month, "MMMM yyyy", { locale: es })}
        </button>
        <button
          onClick={() => setMonth(addMonths(month, 1))}
          className="rounded p-1 text-[var(--text-faint)] hover:text-[var(--text)]"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Header días */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
          <div
            key={d}
            className="text-center text-[10px] uppercase tracking-wider text-[var(--text-faint)]"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const inMonth = isSameMonth(day, month);
          const today = isToday(day);
          const isSelected = highlightWeek
            ? isSameWeek(day, selected, { weekStartsOn: 1 })
            : isSameDay(day, selected);
          const dateKey = format(day, "yyyy-MM-dd");
          const hasEvents = datesWithEvents?.has(dateKey);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={`relative aspect-square grid place-items-center text-xs tnum rounded-md transition-colors ${
                !inMonth ? "text-[var(--text-faint)] opacity-50" : "text-[var(--text-dim)]"
              } ${
                isSelected && !today
                  ? "bg-[var(--color-dorado)]/15 text-[var(--text)]"
                  : "hover:bg-[var(--surface-2)]"
              }`}
            >
              <span
                className={
                  today
                    ? "grid place-items-center rounded-full w-6 h-6 font-semibold"
                    : ""
                }
                style={
                  today
                    ? { background: "var(--color-dorado)", color: "#0A1828" }
                    : {}
                }
              >
                {format(day, "d")}
              </span>
              {hasEvents && !today && (
                <span
                  className="absolute bottom-0.5 rounded-full"
                  style={{
                    width: 3,
                    height: 3,
                    background: "var(--color-dorado)",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
