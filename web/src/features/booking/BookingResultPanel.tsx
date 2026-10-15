import { Link } from 'react-router-dom';
import type { BookingResult } from '@/api/types';
import { Alert } from '@/components/Alert';
import { Amount, Badge } from '@/components/Badge';
import { Button, ButtonLink } from '@/components/Button';
import { Card } from '@/components/Card';
import { describeBooking } from '@/lib/bookingMessages';
import { formatDateTime, formatMoney } from '@/lib/format';
import styles from './BookingResultPanel.module.css';

interface BookingResultPanelProps {
  result: BookingResult;
  onChangeFare: () => void;
}

/** What happened, in words first, then the proof from the database. */
export function BookingResultPanel({ result, onChangeFare }: BookingResultPanelProps) {
  const message = describeBooking(result);
  const actions =
    result.reason === 'ACTIVE_TRIP_EXISTS' && result.active_trip_id ? (
      <ButtonLink size="sm" to={`/trips/${result.active_trip_id}`}>
        View active trip
      </ButtonLink>
    ) : result.reason === 'INSUFFICIENT_BALANCE' || result.reason === 'INVALID_FARE' ? (
      <Button size="sm" onClick={onChangeFare}>
        Change fare
      </Button>
    ) : result.trip ? (
      <ButtonLink size="sm" to={`/trips/${result.trip.id}`}>
        View trip
      </ButtonLink>
    ) : undefined;

  return (
    <div className={styles.panel}>
      <Alert tone={message.tone} title={message.title} actions={actions} details={`sp_atomic_booking returned p_status = ${result.message}`}>
        {message.body}
      </Alert>
      {result.audit_entry ? (
        <Card title="Proof from the database" subtitle="The new wallet_audit_logs row, written by the trigger in the same transaction">
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className="visually-hidden">New audit entry</caption>
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">Type</th>
                  <th scope="col" className={styles.right}>
                    Amount
                  </th>
                  <th scope="col" className={styles.right}>
                    Balance after
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className={styles.new}>
                  <td>
                    {formatDateTime(result.audit_entry.timestamp)} <Badge tone="brand" solid>New</Badge>
                  </td>
                  <td>
                    <Badge tone={result.audit_entry.action_type === 'DEBIT' ? 'danger' : 'success'}>{result.audit_entry.action_type}</Badge>
                  </td>
                  <td className={styles.right}>
                    <Amount value={result.audit_entry.amount_changed} />
                  </td>
                  <td className={`${styles.right} num`}>{formatMoney(result.audit_entry.balance_after)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className={styles.code}>
            <code>
              p_status = {result.message} {'·'} p_trip_id = {result.trip?.id ?? 'NULL'}
            </code>
          </p>
          {result.trip ? (
            <p className={styles.note}>
              Trip <Link to={`/trips/${result.trip.id}`}>{result.trip.id.slice(0, 8)}</Link> was created as REQUESTED.
            </p>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
