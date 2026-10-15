import styles from './charts.module.css';

export interface HBarItem {
  label: string;
  value: number;
  /** Text printed after the bar (defaults to the value). */
  display?: string;
}

interface HBarChartProps {
  items: HBarItem[];
  label: string;
  /** 'series' = one colour (nominal data); 'ordinal' = light→dark ramp in item order (e.g. 1★→5★). */
  palette?: 'series' | 'ordinal';
  /** Ordinal step (1..5) for each item, lightest first. */
  ordinalSteps?: number[];
}

/** Horizontal bars with the value always printed, so colour is never needed to read it. */
export function HBarChart({ items, label, palette = 'series', ordinalSteps }: HBarChartProps) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className={styles.hbars} aria-label={label}>
      {items.map((item, index) => {
        const pct = (item.value / max) * 100;
        const colour = palette === 'ordinal' ? styles[`ordinal${ordinalSteps?.[index] ?? 3}`] : styles.series1;
        const text = item.display ?? item.value.toLocaleString('en-US');
        return (
          <li key={item.label} className={styles.hrow} title={`${item.label}: ${text}`}>
            <span className={styles.hlabel}>{item.label}</span>
            <span className={styles.htrack}>
              <span className={`${styles.hbar} ${colour}`} style={{ width: `${Math.max(pct, item.value > 0 ? 1 : 0)}%` }} />
            </span>
            <span className={styles.hvalue}>{text}</span>
          </li>
        );
      })}
    </ul>
  );
}
