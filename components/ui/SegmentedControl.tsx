/**
 * SegmentedControl — compact inline toggle between 2–4 labelled options.
 *
 * Primary use cases:
 *   - $/R toggle on equity curve and stat tiles
 *   - Timeframe selectors (1D / 1W / 1M / ALL)
 *   - Mode toggles (Live / Paper / All)
 *
 * The active segment gets a jtp-blue fill; inactive segments are dimmed.
 * Rendered in monospace for a console/terminal feel.
 *
 * Usage:
 *   <SegmentedControl
 *     segments={[{ value: '$', label: '$' }, { value: 'R', label: 'R' }]}
 *     value={mode}
 *     onChange={setMode}
 *   />
 */
import React from 'react';

export interface Segment<T extends string = string> {
  value: T;
  label: string;
  title?: string; // tooltip / aria-label
}

interface SegmentedControlProps<T extends string = string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'xs' | 'sm';
}

function SegmentedControl<T extends string = string>({
  segments,
  value,
  onChange,
  className = '',
  size = 'sm',
}: SegmentedControlProps<T>) {
  const padClass = size === 'xs' ? 'px-[8px] py-[4px]' : 'px-[10px] py-[5px]';
  const textClass = size === 'xs' ? 'text-jtp-xs' : 'text-jtp-xs-plus';

  return (
    <div
      className={`flex bg-jtp-control border border-jtp-borderStrong rounded-jtp-md overflow-hidden ${className}`}
      role="group"
    >
      {segments.map((seg) => {
        const isActive = seg.value === value;
        return (
          <button
            key={seg.value}
            type="button"
            onClick={() => onChange(seg.value)}
            aria-pressed={isActive}
            title={seg.title}
            className={[
              `${padClass} ${textClass} font-mono font-medium tracking-wide`,
              'transition-colors duration-120 whitespace-nowrap',
              isActive
                ? 'bg-jtp-blue text-[#08090b]'
                : 'text-jtp-textDim/60 hover:text-jtp-textDim',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
