import { useEffect, useMemo, useRef, useState } from 'react';
import { useCreateBooking } from '@/api/bookings';
import { errorMessage } from '@/api/client';
import { useRider } from '@/api/riders';
import type { BookingResult } from '@/api/types';
import { useVehicle } from '@/api/vehicles';
import { Alert } from '@/components/Alert';
import { Button, ButtonLink } from '@/components/Button';
import type { ComboOption } from '@/components/Combobox';
import { EmptyState, ErrorState, Skeleton } from '@/components/StateView';
import { useActor } from '@/context/ActorContext';
import { usePageTitle } from '@/context/PageTitleContext';
import { useUrlState } from '@/hooks/useUrlState';
import { TripStatusCard } from '../trips/TripStatusCard';
import page from '../page.module.css';
import { BookingForm, type BookingInput } from './BookingForm';
import { BookingResultPanel } from './BookingResultPanel';
import { WalletCard } from './WalletCard';

/** Workflow 1: book a trip as the acting rider (sp_atomic_booking). */
export default function BookTripPage() {
  usePageTitle('Book a trip');
  const { role, riderId, setRole } = useActor();
  const rider = useRider(role === 'rider' ? riderId : null);
  const url = useUrlState();
  const presetVehicle = useVehicle(url.get('vehicle'));
  const booking = useCreateBooking();
  const [result, setResult] = useState<BookingResult | null>(null);
  const fareRef = useRef<HTMLInputElement>(null);

  // A different rider starts with a clean slate.
  const resetBooking = booking.reset;
  useEffect(() => {
    setResult(null);
    resetBooking();
  }, [riderId, resetBooking]);

  const initialVehicle = useMemo<ComboOption | null>(
    () =>
      presetVehicle.data
        ? {
            id: presetVehicle.data.id,
            label: presetVehicle.data.license_plate,
            meta: `${presetVehicle.data.vehicle_class}${presetVehicle.data.is_active ? '' : ' · out of service'}`,
          }
        : null,
    [presetVehicle.data],
  );

  if (role !== 'rider') {
    return (
      <EmptyState title="Trips are booked by riders" action={<Button variant="primary" onClick={() => setRole('rider')}>Switch to Rider</Button>}>
        Switch "View as" to Rider, then pick who you are acting as.
      </EmptyState>
    );
  }
  if (!riderId || (rider.isPending && !rider.data)) return <Skeleton lines={8} label="Loading rider" />;
  if (!rider.data) return <ErrorState error={rider.error} title="Could not load the rider" onRetry={() => void rider.refetch()} />;

  const submit = ({ vehicleId, fare }: BookingInput) => {
    setResult(null);
    booking.mutate({ rider_id: riderId, vehicle_id: vehicleId, fare_amount: fare }, { onSuccess: setResult });
  };

  const activeTrip = rider.data.active_trip;
  return (
    <div className={page.page}>
      <div className={page.twoCol}>
        <BookingForm
          riderName={rider.data.name}
          initialVehicle={initialVehicle}
          submitting={booking.isPending}
          onSubmit={submit}
          fareRef={fareRef}
        />
        <WalletCard balance={rider.data.wallet_balance} result={result} />
      </div>
      <div aria-live="polite" className={page.liveRegion}>
        {result ? <BookingResultPanel result={result} onChangeFare={() => fareRef.current?.focus()} /> : null}
        {booking.isError ? (
          <Alert
            tone="danger"
            title="Couldn't book the trip"
            actions={<ButtonLink size="sm" to="/trips">Check My trips</ButtonLink>}
            details={errorMessage(booking.error)}
          >
            The server didn't answer properly, so we don't know whether the booking went through. Check My trips before
            trying again.
          </Alert>
        ) : null}
      </div>
      {activeTrip ? <TripStatusCard trip={activeTrip} title="Your active trip" showLink /> : null}
    </div>
  );
}
