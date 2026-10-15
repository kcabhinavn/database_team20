import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import { QueryState } from './StateView';

type Q = Parameters<typeof QueryState<string[]>>[0]['query'];

function query(partial: Partial<Q>): Q {
  return { data: undefined, isPending: false, isError: false, error: null, refetch: vi.fn(), ...partial };
}

describe('<QueryState>', () => {
  it('shows a skeleton while loading', () => {
    render(<QueryState query={query({ isPending: true })}>{() => <p>data</p>}</QueryState>);
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  });

  it('shows the error with a working Retry', async () => {
    const refetch = vi.fn();
    render(
      <QueryState query={query({ isError: true, error: new ApiError(503, 'POSTGRES_UNAVAILABLE', 'PostgreSQL is not responding.', null), refetch })}>
        {() => <p>data</p>}
      </QueryState>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('PostgreSQL is not responding.');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('shows the empty state with its action', () => {
    render(
      <QueryState query={query({ data: [] })} isEmpty={(d) => d.length === 0} empty={{ title: 'No trips match these filters' }}>
        {() => <p>data</p>}
      </QueryState>,
    );
    expect(screen.getByText('No trips match these filters')).toBeInTheDocument();
  });

  it('keeps the last data on screen when a refresh fails', () => {
    render(
      <QueryState query={query({ data: ['a'], isError: true, error: new Error('offline') })}>
        {(d) => <p>{d.join(',')}</p>}
      </QueryState>,
    );
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('offline');
  });
});
