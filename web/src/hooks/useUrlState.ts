import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebouncedValue } from './useDebouncedValue';

type Updates = Record<string, string | number | boolean | null | undefined>;

/**
 * Filters and paging live in the URL, so back/refresh/sharing keep them.
 * `set({ status: 'COMPLETED', page: null })` changes some keys and drops empty ones.
 */
export function useUrlState() {
  const [params, setParams] = useSearchParams();

  const get = useCallback((key: string): string | null => params.get(key), [params]);

  const getNumber = useCallback(
    (key: string, fallback: number): number => {
      const value = Number(params.get(key));
      return Number.isFinite(value) && value > 0 ? value : fallback;
    },
    [params],
  );

  const set = useCallback(
    (updates: Updates) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(updates)) {
            if (value === null || value === undefined || value === '' || value === false) next.delete(key);
            else next.set(key, String(value));
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return { params, get, getNumber, set };
}

/**
 * A text filter that is typed freely but written to the URL (key) only after
 * 300 ms of quiet; writing it also resets `page`.
 */
export function useDebouncedUrlParam(key: string) {
  const { get, set } = useUrlState();
  const urlValue = get(key) ?? '';
  const [text, setText] = useState(urlValue);
  const debounced = useDebouncedValue(text, 300);
  const latest = useRef({ urlValue, set });
  useEffect(() => {
    latest.current = { urlValue, set };
  });
  useEffect(() => {
    const { urlValue: current, set: update } = latest.current;
    if (debounced !== current) update({ [key]: debounced || null, page: null });
  }, [debounced, key]);
  return { text, setText, value: debounced };
}
