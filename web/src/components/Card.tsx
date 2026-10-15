import type { ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Accessible name for the region when the title is not plain text. */
  label?: string;
}

/** The basic container. Each card owns its own data and loading/empty/error state. */
export function Card({ title, subtitle, actions, children, className, label }: CardProps) {
  return (
    <section className={[styles.card, className ?? ''].join(' ')} aria-label={label}>
      {title || actions ? (
        <header className={styles.header}>
          <div className={styles.headings}>
            {title ? <h2 className={styles.title}>{title}</h2> : null}
            {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
          </div>
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

interface StatCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  loading?: boolean;
}

export function StatCard({ label, value, sub, loading }: StatCardProps) {
  return (
    <div className={styles.stat} aria-busy={loading || undefined}>
      <p className={styles.statLabel}>{label}</p>
      {loading ? (
        <span className={styles.statSkeleton} aria-hidden="true" />
      ) : (
        <p className={styles.statValue}>{value}</p>
      )}
      {sub ? <p className={styles.statSub}>{sub}</p> : null}
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className={styles.statGrid}>{children}</div>;
}
