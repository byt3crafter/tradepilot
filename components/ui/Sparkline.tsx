/**
 * Sparkline — tiny inline trend chart for embedding in cards and table cells.
 *
 * Renders a minimal SVG polyline — no axes, no labels, just the shape of the trend.
 * Automatically selects profit/loss color if `autoColor` is true and the last
 * value is higher/lower than the first.
 *
 * Usage:
 *   <Sparkline data={pnlSeries} />                       — default blue, 80×28
 *   <Sparkline data={equity} autoColor width={60} />     — green if up, red if down
 *   <Sparkline data={rSeries} color="#d9a23b" height={20} strokeWidth={1} />
 */
import React, { useMemo } from 'react';

interface SparklineProps {
  /** Array of numeric data points, ordered oldest → newest */
  data: number[];
  width?: number;
  height?: number;
  /** Stroke color. Overridden by autoColor if set. */
  color?: string;
  strokeWidth?: number;
  /** Auto-pick profit green / loss red based on first vs last value */
  autoColor?: boolean;
  className?: string;
}

const PROFIT_COLOR = '#4cc38a';
const LOSS_COLOR   = '#e5635f';
const DEFAULT_COLOR = '#e8a23d';

const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 80,
  height = 28,
  color,
  strokeWidth = 1.5,
  autoColor = false,
  className = '',
}) => {
  const resolvedColor = useMemo(() => {
    if (!autoColor || data.length < 2) return color ?? DEFAULT_COLOR;
    const delta = data[data.length - 1] - data[0];
    return delta >= 0 ? PROFIT_COLOR : LOSS_COLOR;
  }, [data, color, autoColor]);

  const path = useMemo(() => {
    if (data.length < 2) return '';
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const xStep = (width - strokeWidth * 2) / (data.length - 1);
    const pad = strokeWidth + 1;
    const innerH = height - pad * 2;

    return data
      .map((v, i) => {
        const x = strokeWidth + i * xStep;
        const y = pad + innerH - ((v - min) / range) * innerH;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [data, width, height, strokeWidth]);

  if (data.length < 2) return null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`flex-shrink-0 ${className}`}
      aria-hidden="true"
    >
      <path
        d={path}
        fill="none"
        stroke={resolvedColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default Sparkline;
