import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { pageWindow, Pagination } from './Pagination';

describe('pageWindow', () => {
  it('shows every page when there are few', () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });
  it('keeps first, last and neighbours with gaps', () => {
    expect(pageWindow(1, 2000)).toEqual([1, 2, 'gap', 2000]);
    expect(pageWindow(50, 2000)).toEqual([1, 'gap', 49, 50, 51, 'gap', 2000]);
    expect(pageWindow(2000, 2000)).toEqual([1, 'gap', 1999, 2000]);
  });
});

describe('<Pagination>', () => {
  it('describes the slice and moves between pages', async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} pageSize={25} total={50000} noun="trips" onPageChange={onPageChange} />);
    expect(screen.getByText(/Showing 1–25 of 50,000 trips/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page');
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('handles an empty result', () => {
    render(<Pagination page={1} pageSize={25} total={0} onPageChange={() => {}} />);
    expect(screen.getByText(/Showing 0–0 of 0 rows/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });
});
