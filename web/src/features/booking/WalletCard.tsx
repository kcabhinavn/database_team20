import type { BookingResult } from '@/api/types';
import { Card } from '@/components/Card';
import { formatMoney } from '@/lib/format';
import styles from './WalletCard.module.css';

/** Balance now, or before → after for the last booking (both read by the API). */
export function WalletCard({ balance, result }: { balance: number | null; result: BookingResult | null }) {
  if (!result || result.balance_before === null || result.balance_after === null) {
    return (
      <Card title="Wallet">
        <p className={styles.label}>Current balance</p>
        <p className={styles.amount}>{formatMoney(balance)}</p>
        <p className={styles.note}>The fare is taken from this wallet when the trip is booked.</p>
      </Card>
    );
  }
  const change = result.balance_after - result.balance_before;
  const charged = Math.abs(change) >= 0.005;
  return (
    <Card title="Wallet">
      <p className={styles.label}>Balance before</p>
      <p className={styles.amount}>{formatMoney(result.balance_before)}</p>
      <p className={[styles.change, charged ? styles.charged : ''].join(' ')}>
        <span aria-hidden="true">{'↓'}</span> {charged ? `${formatMoney(change, { sign: true })} trip fare` : 'No change'}
      </p>
      <p className={styles.label}>Balance after</p>
      <p className={[styles.amount, styles.after].join(' ')}>{formatMoney(result.balance_after)}</p>
      <p className={styles.note}>
        {charged ? 'Both values come from the API response.' : 'Unchanged: nothing was charged.'}
      </p>
    </Card>
  );
}
