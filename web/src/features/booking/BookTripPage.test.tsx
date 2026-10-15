import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { BookingResult, RiderDetail, TripItem } from '@/api/types';
import { mockFetch, renderPage } from '@/test/render';
import BookTripPage from './BookTripPage';

const rider: RiderDetail = {
  id: 'r1',
  name: 'Heather Brown',
  wallet_balance: 2299.94,
  active_trip: null,
  recent_trips: [],
  audit_entries: 3,
};

const vehiclePage = {
  items: [{ id: 'v5', license_plate: 'RS00409', vehicle_class: 'POOL', is_active: true, lifetime_trip_count: 124, total_earnings: 16801.83 }],
  page: 1,
  page_size: 10,
  total: 1,
  stats_as_of: null,
};

const trip: TripItem = {
  id: 'f35d765d-1b25-4f4e-b8b1-dcbed8151cd7',
  rider: { id: 'r1', name: 'Heather Brown' },
  vehicle: { id: 'v5', license_plate: 'RS00409', vehicle_class: 'POOL' },
  fare_amount: 24.5,
  status: 'REQUESTED',
  created_at: '2026-10-09T09:12:04Z',
  next_status: 'IN_TRANSIT',
};

const committed: BookingResult = {
  status: 'COMMITTED',
  reason: null,
  message: 'COMMITTED',
  fare_amount: 24.5,
  trip,
  balance_before: 2299.94,
  balance_after: 2275.44,
  audit_entry: { id: 'a1', timestamp: '2026-10-09T09:12:04Z', action_type: 'DEBIT', amount_changed: -24.5, balance_after: 2275.44 },
  active_trip_id: null,
};

const blocked: BookingResult = {
  status: 'ROLLED_BACK',
  reason: 'ACTIVE_TRIP_EXISTS',
  message: 'ROLLED_BACK: rider already has an active trip',
  fare_amount: 24.5,
  trip: null,
  balance_before: 2299.94,
  balance_after: 2299.94,
  audit_entry: null,
  active_trip_id: 'active-trip',
};

function api(booking: { status: number; body: BookingResult }) {
  return mockFetch((url, init) => {
    if (url.pathname === '/api/riders/r1') return { body: rider };
    if (url.pathname === '/api/vehicles') return { body: vehiclePage };
    if (url.pathname === '/api/bookings' && init?.method === 'POST') return booking;
    return undefined;
  });
}

async function fillAndSubmit(fare: string) {
  const user = userEvent.setup();
  await screen.findByDisplayValue('Heather Brown (from View as)');
  await user.click(screen.getByRole('combobox', { name: 'Vehicle' }));
  await user.click(await screen.findByRole('option', { name: /RS00409/ }));
  await user.type(screen.getByRole('textbox', { name: 'Fare' }), fare);
  await user.click(screen.getByRole('button', { name: 'Book trip' }));
  return user;
}

describe('Book a trip', () => {
  it('shows the balance before and after and the audit row written by the trigger', async () => {
    const calls = api({ status: 201, body: committed });
    renderPage(<BookTripPage />, { route: '/book', path: '/book', role: 'rider', riderId: 'r1' });
    await fillAndSubmit('24.50');

    expect(await screen.findByText('Trip booked: $24.50 paid from your wallet')).toBeInTheDocument();
    expect(screen.getByText('Balance before')).toBeInTheDocument();
    expect(screen.getByText('$2,275.44', { selector: 'p' })).toBeInTheDocument();
    const proof = screen.getByRole('table', { name: 'New audit entry' });
    expect(within(proof).getByText('New')).toBeInTheDocument();
    expect(within(proof).getByText('DEBIT')).toBeInTheDocument();
    expect(within(proof).getByText('−$24.50')).toBeInTheDocument();

    const post = calls.find((c) => c.url.pathname === '/api/bookings');
    expect(JSON.parse(String(post?.init?.body))).toEqual({ rider_id: 'r1', vehicle_id: 'v5', fare_amount: '24.50' });
  });

  it('explains a booking blocked by the one-active-trip rule and links to that trip', async () => {
    api({ status: 409, body: blocked });
    renderPage(<BookTripPage />, { route: '/book', path: '/book', role: 'rider', riderId: 'r1' });
    await fillAndSubmit('24.50');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('You already have a trip in progress');
    expect(alert).toHaveTextContent('Nothing was charged.');
    expect(within(alert).getByRole('link', { name: 'View active trip' })).toHaveAttribute('href', '/trips/active-trip');
    expect(screen.getByText('Unchanged: nothing was charged.')).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'New audit entry' })).not.toBeInTheDocument();
  });

  it('checks the fare before calling the API and keeps what was typed', async () => {
    const calls = api({ status: 201, body: committed });
    renderPage(<BookTripPage />, { route: '/book', path: '/book', role: 'rider', riderId: 'r1' });
    await fillAndSubmit('0');

    expect(await screen.findByText(/Enter an amount greater than \$0\.00\./)).toBeInTheDocument();
    expect(calls.some((c) => c.url.pathname === '/api/bookings')).toBe(false);
    expect(screen.getByRole('textbox', { name: 'Fare' })).toHaveValue('0');
  });

  it('asks the ops manager to switch to Rider', () => {
    api({ status: 201, body: committed });
    renderPage(<BookTripPage />, { route: '/book', path: '/book', role: 'ops', riderId: null });
    expect(screen.getByText('Trips are booked by riders')).toBeInTheDocument();
  });
});
