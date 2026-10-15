import { Link } from 'react-router-dom';
import { errorMessage } from '@/api/client';
import { useAdvanceTrip } from '@/api/trips';
import type { TripItem } from '@/api/types';
import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Stepper } from '@/components/Stepper';
import { formatDateTime, formatMoney } from '@/lib/format';
import { advanceLabel, TRIP_STATUS_LABEL, TRIP_STEPS } from '@/lib/statuses';
import styles from './TripStatusCard.module.css';

interface TripStatusCardProps {
  trip: TripItem;
  title?: string;
  showLink?: boolean;
}

/**
 * Trip progress with the demo control that moves it one step
 * (fn_advance_trip_status). Completing a trip frees the rider to book again.
 */
export function TripStatusCard({ trip, title = 'Trip status', showLink = false }: TripStatusCardProps) {
  const advance = useAdvanceTrip();
  const steps = TRIP_STEPS.map((s) => ({ key: s, label: TRIP_STATUS_LABEL[s] }));
  return (
    <Card
      title={title}
      subtitle={`${trip.vehicle.license_plate} · ${formatMoney(trip.fare_amount)} · booked ${formatDateTime(trip.created_at)}`}
      actions={showLink ? <Link to={`/trips/${trip.id}`}>Trip details {'›'}</Link> : undefined}
    >
      <Stepper steps={steps} current={TRIP_STEPS.indexOf(trip.status)} label="Trip progress" />
      {trip.next_status ? (
        <div className={styles.controls}>
          <Button
            loading={advance.isPending}
            onClick={() => advance.mutate({ id: trip.id, status: trip.next_status! })}
          >
            {advanceLabel(trip.next_status)}
          </Button>
          <span className={styles.note}>Demo control: in a real product the driver does this.</span>
        </div>
      ) : (
        <p className={styles.note}>This trip is finished.</p>
      )}
      {advance.isError ? (
        <Alert tone="danger" title="The status was not changed" compact>
          {errorMessage(advance.error)}
        </Alert>
      ) : null}
    </Card>
  );
}
