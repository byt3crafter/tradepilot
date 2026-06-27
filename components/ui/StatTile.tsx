/**
 * StatTile — a single key metric display for the Operator Console.
 *
 * Renders a large, high-contrast monospace number with a descriptor label above
 * and an optional delta / secondary value below.
 *
 * Design rules:
 *   - label:      uppercase mono, low-contrast (jtp-textDim)
 *   - value:      bold JetBrains Mono at jtp-4xl (28px), high contrast
 *   - delta:      smaller mono, colored by sign (profit/loss)
 *   - subValue:   smaller mono in jtp-textFaint, for auxiliary info
 *
 * Usage:
 *   <StatTile label="NET P&L" value="+$4,320" valueColor="text-jtp-profit" />
 *   <StatTile label="WIN RATE" value="63%" delta="+4%" positive />
 *   <StatTile label="NET R" value="+12.4R" valueColor="text-jtp-profit" subValue="47 trades" />
 */
import React from 'react';

interface StatTileProps {
  /** Uppercase descriptor above the value */
  label: string;
  /** The primary large numeric or text value */
  value: string;
  /** Secondary value rendered below the primary, in smaller mono */
  subValue?: string;
  /** Optional prefix for subValue, e.g. "from" or "vs" */
  subLabel?: string;
  /** Change/delta string, e.g. "+4%" or "-2.1R" */
  delta?: string;
  /** When defined, drives delta color: true = profit green, false = loss red */
  positive?: boolean;
  /** Tailwind text-color class for the primary value, e.g. 'text-jtp-profit' */
  valueColor?: string;
  className?: string;
}

const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  subValue,
  subLabel,
  delta,
  positive,
  valueColor = 'text-jtp-text',
  className = '',
}) => {
  const deltaColor =
    positive === undefined
      ? 'text-jtp-textDim'
      : positive
        ? 'text-jtp-profit'
        : 'text-jtp-loss';

  // CVD-safe: pair colour with a directional glyph so red/green-blind users
  // can read direction from shape, not colour alone.
  const deltaGlyph =
    positive === undefined ? '' : positive ? '▲ ' : '▼ ';

  return (
    <div
      className={`bg-jtp-panel border border-jtp-border rounded-[2px] px-4 py-[15px] flex flex-col ${className}`}
      style={{ borderLeft: '2px solid rgba(232,162,61,0.6)' }}
    >
      {/* Label */}
      <div className="jtp-label mb-[7px]">{label}</div>

      {/* Primary value — large mono */}
      <div
        className={`font-mono font-bold text-jtp-4xl leading-none tracking-tight ${valueColor}`}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </div>

      {/* Delta + sub */}
      {(delta !== undefined || subValue !== undefined) && (
        <div className="flex items-baseline gap-[6px] mt-[7px]">
          {delta !== undefined && (
            <span
              className={`font-mono text-jtp-xs font-semibold ${deltaColor}`}
              aria-label={`${positive === true ? 'up' : positive === false ? 'down' : ''} ${delta}`}
            >
              {deltaGlyph}{delta}
            </span>
          )}
          {subValue !== undefined && (
            <span className="font-mono text-jtp-xs text-jtp-textFaint">
              {subLabel ? `${subLabel} ` : ''}
              {subValue}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatTile;
