import type { CatalogDocument as CatalogDoc } from '@/api/types';
import { Badge } from '@/components/Badge';
import { ChipList } from '@/components/Chip';
import { formatDay, humanize } from '@/lib/format';
import styles from './CatalogDocument.module.css';

/**
 * Renders a schema-flexible VehicleMetadata document readably without knowing
 * its fields in advance: string lists → chips, lists of objects → a small
 * table (newest first when they carry a date), scalars → label/value rows.
 * New fields therefore show up automatically.
 */
const HIDDEN_KEYS = new Set(['vehicle_id', '_id']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T|$)/;

type Scalar = string | number | boolean | null;

function isScalar(value: unknown): value is Scalar {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function ScalarValue({ name, value }: { name: string; value: unknown }) {
  if (typeof value === 'boolean') {
    if (name === 'passed') return <Badge tone={value ? 'success' : 'danger'}>{value ? 'Passed' : 'Failed'}</Badge>;
    return <Badge tone={value ? 'success' : 'neutral'}>{value ? 'Yes' : 'No'}</Badge>;
  }
  if (typeof value === 'string' && ISO_DATE.test(value)) return <>{formatDay(value)}</>;
  if (value === null || value === undefined || value === '') return <span className="muted">{'—'}</span>;
  if (isScalar(value)) return <>{String(value)}</>;
  return <code>{JSON.stringify(value)}</code>;
}

function ObjectTable({ name, rows }: { name: string; rows: Record<string, unknown>[] }) {
  const columns = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const dateKey = columns.find((c) => rows.some((r) => typeof r[c] === 'string' && ISO_DATE.test(r[c] as string)));
  const sorted = dateKey
    ? [...rows].sort((a, b) => String(b[dateKey] ?? '').localeCompare(String(a[dateKey] ?? '')))
    : rows;
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <caption className="visually-hidden">
          {humanize(name)}
          {dateKey ? ', newest first' : ''}
        </caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col">
                {humanize(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c}>
                  <ScalarValue name={c} value={row[c]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CatalogDocument({ doc }: { doc: CatalogDoc }) {
  const entries = Object.entries(doc).filter(([key]) => !HIDDEN_KEYS.has(key));
  const lists = entries.filter(([, v]) => Array.isArray(v));
  const others = entries.filter(([, v]) => !Array.isArray(v));
  return (
    <div className={styles.doc}>
      {lists.map(([key, value]) => {
        const items = value as unknown[];
        return (
          <section key={key} className={styles.section}>
            <h3 className={styles.heading}>
              {humanize(key)} <span className={styles.count}>({items.length})</span>
            </h3>
            {items.every((i) => typeof i === 'string') ? (
              <ChipList items={(items as string[]).map(humanize)} label={humanize(key)} />
            ) : items.every(isRecord) ? (
              items.length ? <ObjectTable name={key} rows={items as Record<string, unknown>[]} /> : <p className="muted">None</p>
            ) : (
              <ChipList items={items.map((i) => (isScalar(i) ? String(i) : JSON.stringify(i)))} label={humanize(key)} />
            )}
          </section>
        );
      })}
      <section className={styles.section}>
        <h3 className={styles.heading}>Other attributes</h3>
        {others.length ? (
          <dl className={styles.defs}>
            {others.map(([key, value]) => (
              <div key={key} className={styles.defRow}>
                <dt>{humanize(key)}</dt>
                <dd>
                  {isRecord(value) ? (
                    <dl className={styles.defs}>
                      {Object.entries(value).map(([k, v]) => (
                        <div key={k} className={styles.defRow}>
                          <dt>{humanize(k)}</dt>
                          <dd>
                            <ScalarValue name={k} value={v} />
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <ScalarValue name={key} value={value} />
                  )}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="muted">None. Any extra fields in the document appear here.</p>
        )}
      </section>
    </div>
  );
}
