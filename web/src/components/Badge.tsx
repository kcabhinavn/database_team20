import type { ReactNode } from 'react';
import type { TripStatus } from '@/api/types';
import { formatMoney } from '@/lib/format';
import { TRIP_STATUS_LABEL, TRIP_STATUS_TONE, type Tone } from '@/lib/statuses';
import styles from './Badge.module.css';

export function Badge({ tone = 'neutral', solid = false, children }: { tone?: Tone; solid?: boolean; children: ReactNode }) {
  return <span className={[styles.badge, styles[tone], solid ? styles.solid : ''].join(' ')}>{children}</span>;
}

export function TripStatusBadge({ status }: { status: TripStatus }) {
  return <Badge tone={TRIP_STATUS_TONE[status]}>{TRIP_STATUS_LABEL[status]}</Badge>;
}

/** A money change: always a sign (+/−) as well as a colour. */
export function Amount({ value, bold }: { value: number; bold?: boolean }) {
  const tone = value > 0 ? styles.positive : value < 0 ? styles.negative : '';
  return <span className={['num', styles.amount, tone, bold ? styles.bold : ''].join(' ')}>{formatMoney(value, { sign: true })}</span>;
}
