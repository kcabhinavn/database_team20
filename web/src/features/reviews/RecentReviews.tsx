import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReviews } from '@/api/reviews';
import { Card } from '@/components/Card';
import { ChipList } from '@/components/Chip';
import { SelectInput } from '@/components/Field';
import { Pagination } from '@/components/Pagination';
import { Stars } from '@/components/Stars';
import { QueryState, Skeleton } from '@/components/StateView';
import { formatDateTime, shortId } from '@/lib/format';
import styles from './ReviewsPage.module.css';

const RATINGS = [
  { value: '', label: 'All ratings' },
  ...[5, 4, 3, 2, 1].map((r) => ({ value: String(r), label: `${r} star${r === 1 ? '' : 's'}` })),
];
const PAGE_SIZE = 10;

export function RecentReviews({ vehicleId }: { vehicleId: string | null }) {
  const [rating, setRating] = useState('');
  const [page, setPage] = useState(1);
  const reviews = useReviews({
    vehicle_id: vehicleId,
    rating: rating ? Number(rating) : null,
    page,
    page_size: PAGE_SIZE,
  });

  return (
    <Card
      title="Recent reviews"
      subtitle="Newest first"
      actions={
        <SelectInput
          label="Rating"
          hideLabel
          options={RATINGS}
          value={rating}
          onChange={(e) => {
            setRating(e.target.value);
            setPage(1);
          }}
        />
      }
    >
      <QueryState
        query={reviews}
        isEmpty={(d) => d.items.length === 0}
        empty={{ title: 'No reviews match' }}
        loading={<Skeleton lines={8} label="Loading reviews" />}
      >
        {(data) => (
          <>
            <ul className={styles.reviews}>
              {data.items.map((r) => (
                <li key={r.id} className={styles.review}>
                  <div className={styles.reviewHead}>
                    <Stars rating={r.rating} />
                    <ChipList items={r.tags} label="Feedback tags" />
                  </div>
                  {r.comment ? <p className={styles.comment}>{`“${r.comment}”`}</p> : null}
                  <p className={styles.reviewMeta}>
                    Trip <Link to={`/trips/${r.trip_id}`}>{shortId(r.trip_id)}</Link>
                    {r.license_plate ? ` · ${r.license_plate}` : ''} {'·'} {formatDateTime(r.created_at)}
                  </p>
                </li>
              ))}
            </ul>
            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} noun="reviews" onPageChange={setPage} />
          </>
        )}
      </QueryState>
    </Card>
  );
}
