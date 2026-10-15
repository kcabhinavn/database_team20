import type { KeyboardEvent, ReactNode } from 'react';
import styles from './DataTable.module.css';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  /** Shown as "↓"/"↑" next to the header for the server's sort order. */
  sorted?: 'asc' | 'desc';
  width?: string;
}

interface DataTableProps<T> {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  rowLabel?: (row: T) => string;
  highlightKey?: string | null;
  busy?: boolean;
}

/**
 * Server-paged table. Whole rows are clickable (and keyboard-focusable with
 * Enter); below 640 px every row turns into a card using the column headers.
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  onRowClick,
  rowLabel,
  highlightKey,
  busy,
}: DataTableProps<T>) {
  const onKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (onRowClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onRowClick(row);
    }
  };
  return (
    <div className={styles.wrap} aria-busy={busy || undefined}>
      <table className={[styles.table, busy ? styles.busy : ''].join(' ')}>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                style={{ width: c.width, textAlign: c.align ?? 'left' }}
                aria-sort={c.sorted === 'asc' ? 'ascending' : c.sorted === 'desc' ? 'descending' : undefined}
              >
                {c.header}
                {c.sorted ? <span aria-hidden="true">{c.sorted === 'desc' ? ' ↓' : ' ↑'}</span> : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row);
            return (
              <tr
                key={key}
                className={[onRowClick ? styles.clickable : '', highlightKey === key ? styles.highlight : ''].join(' ')}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => onKeyDown(e, row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                aria-label={onRowClick && rowLabel ? rowLabel(row) : undefined}
                aria-current={highlightKey === key ? 'true' : undefined}
              >
                {columns.map((c) => (
                  <td key={c.key} data-label={c.header} style={{ textAlign: c.align ?? 'left' }}>
                    <span className={styles.cell}>{c.render(row)}</span>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
