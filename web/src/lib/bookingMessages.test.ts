import { describe, expect, it } from 'vitest';
import type { BookingReason, BookingResult } from '@/api/types';
import { describeBooking, validateFare } from './bookingMessages';

function result(reason: BookingReason | null, extra: Partial<BookingResult> = {}): BookingResult {
  return {
    status: reason ? 'ROLLED_BACK' : 'COMMITTED',
    reason,
    message: reason ? `ROLLED_BACK: ${reason}` : 'COMMITTED',
    fare_amount: 24.5,
    trip: null,
    balance_before: 100,
    balance_after: reason ? 100 : 75.5,
    audit_entry: null,
    active_trip_id: null,
    ...extra,
  };
}

describe('describeBooking', () => {
  it('names the fare on success', () => {
    const m = describeBooking(result(null));
    expect(m.tone).toBe('success');
    expect(m.title).toBe('Trip booked: $24.50 paid from your wallet');
  });

  it.each<[BookingReason, string]>([
    ['INSUFFICIENT_BALANCE', 'Not enough money in your wallet'],
    ['ACTIVE_TRIP_EXISTS', 'You already have a trip in progress'],
    ['VEHICLE_INACTIVE', 'This vehicle is out of service'],
    ['NOT_FOUND', "We couldn't find that rider or vehicle"],
    ['INVALID_FARE', 'Enter a fare greater than $0.00'],
    ['CONCURRENT_UPDATE', 'Your wallet changed at the same moment'],
    ['BOOKING_FAILED', 'The booking was not made'],
  ])('explains %s in plain words and says nothing was charged', (reason, title) => {
    const m = describeBooking(result(reason));
    expect(m.title).toBe(title);
    expect(m.body).toContain('Nothing was charged.');
    expect(m.tone).not.toBe('success');
  });

  it('quotes the fare and the balance when money is short', () => {
    expect(describeBooking(result('INSUFFICIENT_BALANCE', { fare_amount: 9000 })).body).toContain(
      'This trip costs $9,000.00 but your balance is $100.00.',
    );
  });
});

describe('validateFare', () => {
  it('accepts positive amounts', () => {
    expect(validateFare('24.50')).toBeNull();
    expect(validateFare(' 10 ')).toBeNull();
  });
  it.each([
    ['', 'Enter the fare.'],
    ['abc', 'Use numbers only, for example 24.50.'],
    ['-5', 'Use numbers only, for example 24.50.'],
    ['0', 'Enter an amount greater than $0.00.'],
    ['0.00', 'Enter an amount greater than $0.00.'],
    ['100000000', 'That amount is too large.'],
  ])('rejects %j', (input, message) => {
    expect(validateFare(input)).toBe(message);
  });
});
