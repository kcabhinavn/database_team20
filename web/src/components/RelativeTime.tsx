import { useNow } from '@/hooks/useNow';
import { formatDateTime, formatRelative } from '@/lib/format';

/** "8 s ago", updated every second; the exact time is in the tooltip. */
export function RelativeTime({ iso, intervalMs = 1000 }: { iso: string | number | null | undefined; intervalMs?: number }) {
  const now = useNow(intervalMs);
  if (iso === null || iso === undefined) return <span>{'—'}</span>;
  const text = typeof iso === 'number' ? new Date(iso).toISOString() : iso;
  return (
    <time dateTime={text} title={formatDateTime(text)}>
      {formatRelative(text, now)}
    </time>
  );
}
