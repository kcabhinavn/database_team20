import type { ReviewSummary } from '@/api/types';
import { HBarChart } from '@/components/charts/HBarChart';
import { Stars } from '@/components/Stars';
import { formatNumber, formatRating } from '@/lib/format';
import styles from './ReviewSummaryWidgets.module.css';

/** The three outputs of the Workflow 4 $facet, shared by Reviews and Vehicle detail. */
export function AverageRating({ summary }: { summary: ReviewSummary }) {
  if (summary.overall_average === null) return <p className="muted">No reviews yet.</p>;
  return (
    <div className={styles.average}>
      <p className={styles.hero}>{formatRating(summary.overall_average)}</p>
      <Stars rating={summary.overall_average} size={22} />
      <p className="muted">
        out of 5 {'·'} from {formatNumber(summary.total)} {summary.total === 1 ? 'review' : 'reviews'}
      </p>
    </div>
  );
}

export function RatingDistribution({ summary }: { summary: ReviewSummary }) {
  const total = Math.max(1, summary.total);
  const rows = [...summary.rating_distribution].sort((a, b) => b.rating - a.rating);
  return (
    <HBarChart
      label="Number of reviews per star rating"
      palette="ordinal"
      ordinalSteps={rows.map((r) => r.rating)}
      items={rows.map((r) => ({
        label: `${r.rating} ★`,
        value: r.count,
        display: `${formatNumber(r.count)} (${Math.round((r.count / total) * 100)}%)`,
      }))}
    />
  );
}

export function TopTags({ summary }: { summary: ReviewSummary }) {
  if (!summary.top_tags.length) return <p className="muted">No tags yet.</p>;
  return (
    <HBarChart
      label="Most common feedback tags"
      items={summary.top_tags.map((t) => ({ label: t.tag, value: t.count, display: formatNumber(t.count) }))}
    />
  );
}
