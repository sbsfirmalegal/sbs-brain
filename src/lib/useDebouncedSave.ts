import { useEffect, useRef } from "react";

/** Persiste `value` en el store 600 ms después de que el usuario deja de escribir.
 *  Usa valueRef en el flush de desmontaje para capturar siempre el valor actual,
 *  no el del primer render (bug del closure con deps vacías). */
export function useDebouncedSave(value: string, initial: string, save: (v: string) => void) {
  const saveRef = useRef(save);
  saveRef.current = save;
  const lastSaved = useRef(initial);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (value === lastSaved.current) return;
    const t = setTimeout(() => {
      lastSaved.current = value;
      saveRef.current(value);
    }, 600);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    return () => {
      if (valueRef.current !== lastSaved.current) {
        saveRef.current(valueRef.current);
      }
    };
  }, []);
}
