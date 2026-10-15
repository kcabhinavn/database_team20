import { describe, expect, it } from 'vitest';
import { mockFetch } from '@/test/render';
import { createBooking } from './bookings';
import { ApiError, buildQuery, request } from './client';

describe('buildQuery', () => {
  it('skips empty values', () => {
    expect(buildQuery({ a: 1, b: '', c: null, d: undefined, e: false, f: 'x y' })).toBe('?a=1&e=false&f=x+y');
    expect(buildQuery({})).toBe('');
  });
});

describe('request', () => {
  it('turns the API error shape into an ApiError', async () => {
    mockFetch(() => ({ status: 404, body: { error: { code: 'NOT_FOUND', message: 'Trip x not found' } } }));
    const error = await request('/trips/x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, code: 'NOT_FOUND', message: 'Trip x not found' });
  });

  it('reports network failures in plain words', async () => {
    globalThis.fetch = (() => Promise.reject(new TypeError('Failed to fetch'))) as typeof fetch;
    await expect(request('/health')).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
  });
});

describe('createBooking', () => {
  it('resolves (not rejects) with a rolled-back booking, so the UI can explain it', async () => {
    const body = {
      status: 'ROLLED_BACK',
      reason: 'ACTIVE_TRIP_EXISTS',
      message: 'ROLLED_BACK: rider already has an active trip',
      fare_amount: 5,
      trip: null,
      balance_before: 90,
      balance_after: 90,
      audit_entry: null,
      active_trip_id: 't1',
    };
    const calls = mockFetch(() => ({ status: 409, body }));
    await expect(createBooking({ rider_id: 'r', vehicle_id: 'v', fare_amount: '5' })).resolves.toEqual(body);
    expect(calls[0].init?.method).toBe('POST');
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ rider_id: 'r', vehicle_id: 'v', fare_amount: '5' });
  });

  it('still rejects for validation errors', async () => {
    mockFetch(() => ({ status: 422, body: { error: { code: 'VALIDATION_ERROR', message: 'bad' } } }));
    await expect(createBooking({ rider_id: 'r', vehicle_id: 'v', fare_amount: 'x' })).rejects.toBeInstanceOf(ApiError);
  });
});
