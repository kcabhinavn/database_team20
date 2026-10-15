import type { BookingResult } from '@/api/types';
import type { AlertTone } from '@/components/Alert';
import { formatMoney, shortId } from './format';

export interface BookingMessage {
  tone: AlertTone;
  title: string;
  body: string;
}

const NOTHING_CHARGED = 'Nothing was charged.';

/**
 * Plain-language text for every sp_atomic_booking outcome (style guide,
 * "Messages"). Always says whether money moved; the raw p_status is shown
 * separately as technical details.
 */
export function describeBooking(result: BookingResult): BookingMessage {
  const fare = formatMoney(result.fare_amount);
  switch (result.reason) {
    case null: {
      const trip = result.trip;
      return {
        tone: 'success',
        title: `Trip booked: ${fare} paid from your wallet`,
        body: trip
          ? `Trip ${shortId(trip.id)} is REQUESTED with vehicle ${trip.vehicle.license_plate}.`
          : 'The trip is REQUESTED.',
      };
    }
    case 'INSUFFICIENT_BALANCE':
      return {
        tone: 'danger',
        title: 'Not enough money in your wallet',
        body: `This trip costs ${fare} but your balance is ${formatMoney(result.balance_before)}. ${NOTHING_CHARGED}`,
      };
    case 'ACTIVE_TRIP_EXISTS':
      return {
        tone: 'danger',
        title: 'You already have a trip in progress',
        body: `A rider can have only one requested or in-transit trip at a time, so this booking was not made. ${NOTHING_CHARGED} Finish the current trip first.`,
      };
    case 'VEHICLE_INACTIVE':
      return {
        tone: 'danger',
        title: 'This vehicle is out of service',
        body: `It is not active right now. Choose another vehicle and try again. ${NOTHING_CHARGED}`,
      };
    case 'NOT_FOUND':
      return {
        tone: 'danger',
        title: "We couldn't find that rider or vehicle",
        body: `It may have been removed. Refresh the page and try again. ${NOTHING_CHARGED}`,
      };
    case 'INVALID_FARE':
      return { tone: 'danger', title: 'Enter a fare greater than $0.00', body: NOTHING_CHARGED };
    case 'CONCURRENT_UPDATE':
      return {
        tone: 'warning',
        title: 'Your wallet changed at the same moment',
        body: `Another update happened at the same time. ${NOTHING_CHARGED} Please try again.`,
      };
    default:
      return { tone: 'danger', title: 'The booking was not made', body: NOTHING_CHARGED };
  }
}

/** Client-side check before calling the API (the procedure re-validates). */
export function validateFare(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return 'Enter the fare.';
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return 'Use numbers only, for example 24.50.';
  const value = Number(trimmed);
  if (!(value > 0)) return 'Enter an amount greater than $0.00.';
  if (value > 99_999_999.99) return 'That amount is too large.';
  return null;
}
