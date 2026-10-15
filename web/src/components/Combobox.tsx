import { useQuery } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import styles from './Combobox.module.css';

export interface ComboOption {
  id: string;
  label: string;
  /** Muted text on the right, e.g. a balance or a vehicle class. */
  meta?: string;
  disabled?: boolean;
}

interface ComboboxProps {
  label: string;
  hideLabel?: boolean;
  /** Stable key for the option cache, e.g. 'riders'. */
  queryKey: string;
  loadOptions: (search: string) => Promise<ComboOption[]>;
  value: ComboOption | null;
  onChange: (option: ComboOption) => void;
  placeholder?: string;
  error?: string | null;
  helper?: string;
  className?: string;
}

/**
 * Async combobox (ARIA 1.2 pattern): type to search on the server (300 ms
 * debounce), arrow keys to move, Enter to pick, Escape to close.
 */
export function Combobox({
  label,
  hideLabel,
  queryKey,
  loadOptions,
  value,
  onChange,
  placeholder = 'Search…',
  error,
  helper,
  className,
}: ComboboxProps) {
  const id = useId();
  const listId = `${id}-list`;
  const messageId = `${id}-message`;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [active, setActive] = useState(0);
  const wrapper = useRef<HTMLDivElement>(null);
  const search = useDebouncedValue(text.trim(), 300);

  const options = useQuery({
    queryKey: ['combobox', queryKey, search],
    queryFn: () => loadOptions(search),
    enabled: open,
    staleTime: 30_000,
  });
  const items = options.data ?? [];

  useEffect(() => setActive(0), [search]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const choose = (option: ComboOption | undefined) => {
    if (!option || option.disabled) return;
    onChange(option);
    setText('');
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      if (open && items.length) {
        event.preventDefault();
        choose(items[active]);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
      setText('');
    }
  };

  const message = error ?? helper;
  return (
    <div className={[styles.combo, className ?? ''].join(' ')} ref={wrapper}>
      <label htmlFor={id} className={hideLabel ? 'visually-hidden' : styles.label}>
        {label}
      </label>
      <div className={[styles.control, error ? styles.invalid : ''].join(' ')}>
        <svg className={styles.searchIcon} viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && items[active] ? `${listId}-${active}` : undefined}
          aria-describedby={message ? messageId : undefined}
          aria-invalid={error ? true : undefined}
          className={styles.input}
          autoComplete="off"
          value={open ? text : value ? value.label : ''}
          placeholder={value ? value.label : placeholder}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {value && !open ? <span className={styles.meta}>{value.meta}</span> : null}
        <span className={styles.caret} aria-hidden="true">
          {'▾'}
        </span>
      </div>
      {open ? (
        <ul id={listId} role="listbox" className={styles.list} aria-label={label}>
          {options.isLoading ? <li className={styles.note}>Searching…</li> : null}
          {options.isError ? <li className={styles.note}>Could not load options.</li> : null}
          {options.isSuccess && items.length === 0 ? <li className={styles.note}>No matches.</li> : null}
          {items.map((option, index) => (
            <li
              key={option.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={value?.id === option.id}
              aria-disabled={option.disabled || undefined}
              className={[
                styles.option,
                index === active ? styles.active : '',
                option.disabled ? styles.disabled : '',
              ].join(' ')}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(option)}
            >
              <span>{option.label}</span>
              {option.meta ? <span className={styles.optionMeta}>{option.meta}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {message ? (
        <p id={messageId} className={error ? styles.error : styles.helper}>
          {error ? `⚠ ${error}` : helper}
        </p>
      ) : null}
    </div>
  );
}
