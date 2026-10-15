import type { ReactNode } from 'react';
import styles from './Alert.module.css';

export type AlertTone = 'success' | 'danger' | 'warning' | 'info';

const GLYPH: Record<AlertTone, string> = { success: '✓', danger: '✕', warning: '!', info: 'i' };

interface AlertProps {
  tone: AlertTone;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  /** Raw technical text, collapsed by default. */
  details?: string;
  compact?: boolean;
}

export function Alert({ tone, title, children, actions, details, compact }: AlertProps) {
  return (
    <div
      className={[styles.alert, styles[tone], compact ? styles.compact : ''].join(' ')}
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
    >
      <span className={styles.icon} aria-hidden="true">
        {GLYPH[tone]}
      </span>
      <div className={styles.body}>
        <p className={styles.title}>{title}</p>
        {children ? <div className={styles.text}>{children}</div> : null}
        {actions ? <div className={styles.actions}>{actions}</div> : null}
        {details ? (
          <details className={styles.details}>
            <summary>Technical details</summary>
            <code>{details}</code>
          </details>
        ) : null}
      </div>
    </div>
  );
}
