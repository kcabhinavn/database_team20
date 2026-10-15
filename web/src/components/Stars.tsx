/** Rating as stars, with the number for screen readers. */
export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  const full = Math.round(Math.max(0, Math.min(5, rating)));
  return (
    <span style={{ fontSize: size, letterSpacing: 1, color: 'var(--rs-color-warning)' }} aria-label={`${rating} out of 5`} role="img">
      {'★'.repeat(full)}
      <span style={{ color: 'var(--rs-color-border-strong)' }}>{'★'.repeat(5 - full)}</span>
    </span>
  );
}
