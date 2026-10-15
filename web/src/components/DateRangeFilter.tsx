import { matchPreset, presetRange, RANGE_PRESETS, type DateRange } from '@/lib/dates';
import { Chip } from './Chip';
import styles from './DateRangeFilter.module.css';

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

/** Preset chips (7/30/90 days, All) plus custom from/to dates (UTC, inclusive). */
export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const preset = matchPreset(value);
  return (
    <fieldset className={styles.range}>
      <legend className="visually-hidden">Date range</legend>
      <div className={styles.chips}>
        {RANGE_PRESETS.map((p) => (
          <Chip key={p.value} selected={preset === p.value} onClick={() => onChange(presetRange(p.value))}>
            {p.label}
          </Chip>
        ))}
      </div>
      <label className={styles.date}>
        <span className="visually-hidden">From</span>
        <input
          type="date"
          value={value.from ?? ''}
          max={value.to ?? undefined}
          onChange={(e) => onChange({ ...value, from: e.target.value || null })}
          aria-label="From date"
        />
      </label>
      <span aria-hidden="true">{'–'}</span>
      <label className={styles.date}>
        <span className="visually-hidden">To</span>
        <input
          type="date"
          value={value.to ?? ''}
          min={value.from ?? undefined}
          onChange={(e) => onChange({ ...value, to: e.target.value || null })}
          aria-label="To date"
        />
      </label>
    </fieldset>
  );
}
