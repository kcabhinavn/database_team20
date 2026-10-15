import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CatalogDocument } from './CatalogDocument';

const doc = {
  vehicle_id: 'abc',
  features: ['wifi', 'child_seat'],
  inspection_records: [
    { passed: false, inspected_at: '2026-01-02T00:00:00+00:00', inspector: 'Ben' },
    { passed: true, inspected_at: '2026-05-01T00:00:00+00:00', inspector: 'Ann' },
  ],
  registration_city: 'San Francisco',
};

describe('<CatalogDocument>', () => {
  it('shows string lists as chips', () => {
    render(<CatalogDocument doc={doc} />);
    const features = screen.getByRole('list', { name: 'Features' });
    expect(within(features).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Wifi', 'Child seat']);
  });

  it('shows object lists as a table, newest first, with labelled results', () => {
    render(<CatalogDocument doc={doc} />);
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Passed');
    expect(rows[0]).toHaveTextContent('01 May 2026');
    expect(rows[1]).toHaveTextContent('Failed');
  });

  it('lists fields it does not know under Other attributes and hides the id', () => {
    render(<CatalogDocument doc={doc} />);
    expect(screen.getByText('Registration city')).toBeInTheDocument();
    expect(screen.getByText('San Francisco')).toBeInTheDocument();
    expect(screen.queryByText('abc')).not.toBeInTheDocument();
  });
});
