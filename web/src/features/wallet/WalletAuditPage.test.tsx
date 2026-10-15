import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { RiderDetail, WalletAudit } from '@/api/types';
import { mockFetch, renderPage } from '@/test/render';
import WalletAuditPage from './WalletAuditPage';

const rider: RiderDetail = { id: 'r1', name: 'Dora Audit', wallet_balance: 69.75, active_trip: null, recent_trips: [], audit_entries: 4 };

const audit: WalletAudit = {
  items: [
    { id: 'a1', timestamp: '2026-06-01T10:00:00Z', action_type: 'CREDIT', amount_changed: 50, balance_after: 50, running_balance: 50, matches: true },
    { id: 'a2', timestamp: '2026-06-02T10:00:00Z', action_type: 'DEBIT', amount_changed: -10.5, balance_after: 39.5, running_balance: 39.5, matches: true },
    { id: 'a3', timestamp: '2026-06-03T10:00:00Z', action_type: 'CREDIT', amount_changed: 30.25, balance_after: 69.75, running_balance: 69.75, matches: true },
  ],
  page: 1,
  page_size: 25,
  total: 3,
  rider: { id: 'r1', name: 'Dora Audit', wallet_balance: 69.75 },
  date_from: null,
  date_to: null,
  order: 'asc',
  summary: { entries: 3, opening_balance: 0, credits_total: 80.25, credits_count: 2, debits_total: -10.5, debits_count: 1, closing_balance: 69.75 },
};

describe('Wallet audit', () => {
  it('shows the summary and a running balance that matches every recorded balance', async () => {
    const calls = mockFetch((url) => {
      if (url.pathname === '/api/riders/r1') return { body: rider };
      if (url.pathname === '/api/riders/r1/wallet-audit') return { body: audit };
      return undefined;
    });
    renderPage(<WalletAuditPage />, { route: '/wallet?from=2026-06-01', path: '/wallet', role: 'rider', riderId: 'r1' });

    const table = await screen.findByRole('table', { name: 'Wallet audit entries for Dora Audit' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent('−$10.50');
    expect(within(table).getAllByLabelText('Matches the recorded balance')).toHaveLength(3);
    expect(screen.getByText('+$80.25')).toBeInTheDocument();
    expect(screen.getByText('current wallet: $69.75')).toBeInTheDocument();
    expect(screen.getByText('Read-only')).toBeInTheDocument();

    const request = calls.find((c) => c.url.pathname.endsWith('/wallet-audit'));
    expect(request?.url.searchParams.get('from')).toBe('2026-06-01');
    expect(request?.url.searchParams.get('order')).toBe('asc');
  });

  it('asks the ops manager to choose a rider first', () => {
    mockFetch(() => undefined);
    renderPage(<WalletAuditPage />, { route: '/wallet', path: '/wallet', role: 'ops' });
    expect(screen.getByText('Choose a rider')).toBeInTheDocument();
  });
});
