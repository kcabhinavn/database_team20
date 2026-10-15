import { useMemo, useRef, useState, type PointerEvent } from 'react';
import type { TrendPoint } from '@/api/types';
import { useElementWidth } from '@/hooks/useElementWidth';
import { eachDay } from '@/lib/dates';
import { formatDay, formatDayShort, formatMoney } from '@/lib/format';
import { bandIndex, niceScale, roundedTopBar } from './scale';
import styles from './charts.module.css';

interface TrendChartProps {
  points: TrendPoint[];
  dateFrom: string;
  dateTo: string;
  height?: number;
}

const PAD = { left: 56, right: 12, top: 12, bottom: 28 };

/**
 * Daily revenue (bars) and its 7-day moving average (line). Both are in $,
 * so they share one y-axis. Hover/touch shows a crosshair and a tooltip.
 */
export function TrendChart({ points, dateFrom, dateTo, height = 280 }: TrendChartProps) {
  const box = useRef<HTMLDivElement>(null);
  const width = useElementWidth(box, 600);
  const [hover, setHover] = useState<number | null>(null);

  const days = useMemo(() => eachDay(dateFrom, dateTo), [dateFrom, dateTo]);
  const byDay = useMemo(() => new Map(points.map((p) => [p.day, p])), [points]);
  const scale = useMemo(
    () => niceScale(Math.max(0, ...points.map((p) => Math.max(p.daily_total, p.moving_avg_7day)))),
    [points],
  );

  const innerW = Math.max(10, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const band = innerW / Math.max(1, days.length);
  const barW = Math.max(2, Math.min(18, band * 0.62));
  const y = (v: number) => PAD.top + innerH - (innerH * v) / scale.max;
  const xCenter = (i: number) => PAD.left + band * i + band / 2;

  const linePoints = days
    .map((d, i) => {
      const p = byDay.get(d);
      return p ? `${xCenter(i).toFixed(1)},${y(p.moving_avg_7day).toFixed(1)}` : null;
    })
    .filter(Boolean);
  const linePath = linePoints.length ? `M${linePoints.join(' L')}` : '';
  const labelEvery = Math.max(1, Math.ceil(days.length / 6));

  const onMove = (event: PointerEvent<SVGRectElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setHover(bandIndex(event.clientX - rect.left + PAD.left, PAD.left, band, days.length));
  };

  const hoverDay = hover === null ? null : days[hover];
  const hoverPoint = hoverDay ? byDay.get(hoverDay) : undefined;
  const tooltipLeft = hover === null ? 0 : Math.min(Math.max(xCenter(hover) - 90, 0), Math.max(0, width - 180));

  return (
    <div className={styles.chart}>
      <ul className={styles.legend} aria-label="Legend">
        <li>
          <span className={`${styles.swatch} ${styles.swatchBar}`} aria-hidden="true" />
          Daily revenue
        </li>
        <li>
          <span className={`${styles.swatch} ${styles.swatchLine}`} aria-hidden="true" />
          7-day moving average
        </li>
      </ul>
      <div className={styles.plot} ref={box}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Daily revenue and 7-day moving average from ${formatDay(dateFrom)} to ${formatDay(dateTo)}. Use "View as table" for the values.`}
        >
          {scale.ticks.map((t) => (
            <g key={t}>
              <line className={t === 0 ? styles.axis : styles.grid} x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
              <text className={styles.tick} x={PAD.left - 8} y={y(t) + 4} textAnchor="end">
                {formatMoney(t, { whole: true })}
              </text>
            </g>
          ))}
          {days.map((d, i) =>
            i % labelEvery === 0 ? (
              <text key={d} className={styles.tick} x={xCenter(i)} y={height - 8} textAnchor="middle">
                {formatDayShort(d)}
              </text>
            ) : null,
          )}
          {days.map((d, i) => {
            const p = byDay.get(d);
            if (!p || p.daily_total <= 0) return null;
            return (
              <path
                key={d}
                className={[styles.bar, hover === i ? styles.barActive : ''].join(' ')}
                d={roundedTopBar(xCenter(i) - barW / 2, y(p.daily_total), barW, y(0) - y(p.daily_total))}
              />
            );
          })}
          {linePath ? (
            <>
              <path className={styles.lineHalo} d={linePath} />
              <path className={styles.line} d={linePath} />
            </>
          ) : null}
          {hover !== null ? (
            <>
              <line className={styles.crosshair} x1={xCenter(hover)} x2={xCenter(hover)} y1={PAD.top} y2={PAD.top + innerH} />
              {hoverPoint ? <circle className={styles.marker} cx={xCenter(hover)} cy={y(hoverPoint.moving_avg_7day)} r={4.5} /> : null}
            </>
          ) : null}
          <rect
            className={styles.hit}
            x={PAD.left}
            y={PAD.top}
            width={innerW}
            height={innerH}
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
        {hoverDay ? (
          <div className={styles.tooltip} style={{ left: tooltipLeft }} role="status">
            <p className={styles.tooltipTitle}>{formatDay(hoverDay)}</p>
            {hoverPoint ? (
              <dl>
                <dt>Daily revenue</dt>
                <dd>{formatMoney(hoverPoint.daily_total)}</dd>
                <dt>7-day moving avg</dt>
                <dd>{formatMoney(hoverPoint.moving_avg_7day)}</dd>
              </dl>
            ) : (
              <p className={styles.tooltipNote}>No completed trips</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
