import type { ReactNode } from 'react';
import styles from './Chip.module.css';

/** A selectable quick filter (aria-pressed shows the state). */
export function Chip({ selected, onClick, children }: { selected?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className={[styles.chip, styles.button, selected ? styles.selected : ''].join(' ')}
      aria-pressed={selected ?? false}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** Static tags, features, etc. */
export function ChipList({ items, label }: { items: string[]; label: string }) {
  if (!items.length) return <p className="muted">None</p>;
  return (
    <ul className={styles.list} aria-label={label}>
      {items.map((item) => (
        <li key={item} className={styles.chip}>
          {item}
        </li>
      ))}
    </ul>
  );
}
