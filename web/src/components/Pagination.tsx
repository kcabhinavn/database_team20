import { formatNumber } from '@/lib/format';
import styles from './Pagination.module.css';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizes?: number[];
  noun?: string;
}

/** Page numbers to show: first, last, and a window around the current page. */
export function pageWindow(page: number, pages: number): (number | 'gap')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out: (number | 'gap')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pages - 1, page + 1);
  if (start > 2) out.push('gap');
  for (let p = start; p <= end; p += 1) out.push(p);
  if (end < pages - 1) out.push('gap');
  out.push(pages);
  return out;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizes = [10, 25, 50, 100],
  noun = 'rows',
}: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return (
    <nav className={styles.bar} aria-label="Pagination">
      <p className={styles.info}>
        Showing {formatNumber(first)}–{formatNumber(last)} of {formatNumber(total)} {noun}
        {onPageSizeChange ? (
          <label className={styles.size}>
            <span className="visually-hidden">Rows per page</span>
            <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
              {pageSizes.map((s) => (
                <option key={s} value={s}>
                  {s} per page
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </p>
      <ul className={styles.pages}>
        <li>
          <button
            type="button"
            className={styles.page}
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            {'‹'}
          </button>
        </li>
        {pageWindow(page, pages).map((p, i) =>
          p === 'gap' ? (
            <li key={`gap-${i}`} className={styles.gap} aria-hidden="true">
              {'…'}
            </li>
          ) : (
            <li key={p}>
              <button
                type="button"
                className={[styles.page, p === page ? styles.current : ''].join(' ')}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Page ${p}`}
                onClick={() => onPageChange(p)}
              >
                {formatNumber(p)}
              </button>
            </li>
          ),
        )}
        <li>
          <button
            type="button"
            className={styles.page}
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pages}
            aria-label="Next page"
          >
            {'›'}
          </button>
        </li>
      </ul>
    </nav>
  );
}
