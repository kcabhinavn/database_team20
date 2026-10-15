import { Link, useParams } from 'react-router-dom';
import { useTrip } from '@/api/trips';
import type { TripDetail } from '@/api/types';
import { TripStatusBadge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { ChipList } from '@/components/Chip';
import { Stars } from '@/components/Stars';
import { EmptyState, QueryState } from '@/components/StateView';
import { useActor } from '@/context/ActorContext';
import { usePageTitle } from '@/context/PageTitleContext';
import { formatDateTime, formatMoney, shortId } from '@/lib/format';
import page from '../page.module.css';
import { TripStatusCard } from './TripStatusCard';

function TripFacts({ trip, isOps }: { trip: TripDetail; isOps: boolean }) {
  return (
    <Card title="Trip">
      <dl className={page.defs}>
        <dt>Status</dt>
        <dd>
          <TripStatusBadge status={trip.status} />
        </dd>
        <dt>Rider</dt>
        <dd>{isOps ? <Link to={`/riders/${trip.rider.id}`}>{trip.rider.name}</Link> : trip.rider.name}</dd>
        <dt>Vehicle</dt>
        <dd>
          {isOps ? <Link to={`/vehicles/${trip.vehicle.id}`}>{trip.vehicle.license_plate}</Link> : trip.vehicle.license_plate}{' '}
          <span className="muted">{trip.vehicle.vehicle_class}</span>
        </dd>
        <dt>Fare</dt>
        <dd className="num">{formatMoney(trip.fare_amount)}</dd>
        <dt>Booked</dt>
        <dd>{formatDateTime(trip.created_at)}</dd>
        <dt>Trip ID</dt>
        <dd className={page.mono}>{trip.id}</dd>
      </dl>
    </Card>
  );
}

function TripReview({ trip }: { trip: TripDetail }) {
  const review = trip.review;
  return (
    <Card title="Review" subtitle="TripReviews (MongoDB)">
      {review ? (
        <div className={page.stack}>
          <div className={page.headerRow}>
            <Stars rating={review.rating} size={18} />
            <span className={page.strong}>{review.rating} / 5</span>
            <span className={page.meta}>{formatDateTime(review.created_at)}</span>
          </div>
          <ChipList items={review.tags} label="Feedback tags" />
          {review.comment ? <p>{`“${review.comment}”`}</p> : null}
        </div>
      ) : (
        <EmptyState title="No review for this trip">Riders review a trip after it is completed.</EmptyState>
      )}
    </Card>
  );
}

export default function TripDetailPage() {
  const { tripId } = useParams();
  const { role } = useActor();
  const trip = useTrip(tripId);
  usePageTitle(trip.data ? `Trip ${shortId(trip.data.id)}` : 'Trip', {
    label: role === 'rider' ? 'My trips' : 'Trips',
    to: '/trips',
  });

  return (
    <QueryState query={trip} errorTitle="Could not load this trip">
      {(data) => (
        <div className={page.twoCol}>
          <div className={page.stack}>
            <TripFacts trip={data} isOps={role === 'ops'} />
            <TripReview trip={data} />
          </div>
          <TripStatusCard trip={data} />
        </div>
      )}
    </QueryState>
  );
}
