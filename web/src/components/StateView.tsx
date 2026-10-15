import type { ReactNode } from 'react';
import { errorMessage } from '@/api/client';
import { Alert } from './Alert';
import { Button } from './Button';
import styles from './StateView.module.css';

export function Skeleton({ lines = 5, label = 'Loading' }: { lines?: number; label?: string }) {
  return (
    <div className={styles.skeleton} role="status" aria-label={label}>
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className={styles.bar} style={{ width: `${90 - ((i * 17) % 35)}%` }} />
      ))}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.empty} role="status">
      <svg className={styles.emptyIcon} viewBox="0 0 48 36" aria-hidden="true">
        <rect x="1" y="1" width="46" height="34" rx="6" fill="none" stroke="currentColor" strokeDasharray="4 3" />
        <path d="M14 22h20M18 15h12" stroke="currentColor" strokeLinecap="round" />
      </svg>
      <p className={styles.emptyTitle}>{title}</p>
      {children ? <p className={styles.emptyText}>{children}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'Could not load this' }: { error: unknown; onRetry?: () => void; title?: string }) {
  return (
    <Alert
      tone="danger"
      title={title}
      actions={onRetry ? <Button size="sm" onClick={onRetry}>Retry</Button> : undefined}
      details={error instanceof Error ? `${error.name}: ${error.message}` : undefined}
    >
      {errorMessage(error)}
    </Alert>
  );
}

interface QueryStateProps<T> {
  query: { data: T | undefined; isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown };
  isEmpty?: (data: T) => boolean;
  empty?: { title: string; text?: ReactNode; action?: ReactNode };
  loading?: ReactNode;
  errorTitle?: string;
  children: (data: T) => ReactNode;
}

/**
 * Loading / error / empty / data for one region. While a refetch fails, the
 * last good data stays on screen with the error above it.
 */
export function QueryState<T>({ query, isEmpty, empty, loading, errorTitle, children }: QueryStateProps<T>) {
  const { data, isPending, isError, error, refetch } = query;
  if (isPending && data === undefined) return <>{loading ?? <Skeleton />}</>;
  if (data === undefined) {
    return isError ? <ErrorState error={error} title={errorTitle} onRetry={() => void refetch()} /> : null;
  }
  return (
    <>
      {isError ? <ErrorState error={error} title={errorTitle ?? 'Could not refresh this'} onRetry={() => void refetch()} /> : null}
      {isEmpty?.(data) && empty ? (
        <EmptyState title={empty.title} action={empty.action}>
          {empty.text}
        </EmptyState>
      ) : (
        children(data)
      )}
    </>
  );
}
