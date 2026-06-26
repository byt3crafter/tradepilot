/**
 * Skeleton — pulsing loading placeholder.
 *
 * Variants:
 *   block   — a single rectangular placeholder (default). Pass className for size.
 *   text    — a paragraph of placeholder lines. Pass `lines` to control count.
 *   stat    — a StatTile-shaped placeholder with label + large value blocks.
 *   panel   — a full Panel-shaped placeholder (header bar + body rows).
 *
 * Usage:
 *   <Skeleton className="h-8 w-32" />                      — single block
 *   <Skeleton variant="text" lines={3} />                  — 3 text lines
 *   <Skeleton variant="stat" />                            — stat tile shape
 *   <Skeleton variant="panel" className="h-48" />          — panel shape
 */
import React from 'react';

interface SkeletonProps {
  variant?: 'block' | 'text' | 'stat' | 'panel';
  lines?: number;
  className?: string;
}

/** Base pulsing block */
const Block: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`bg-jtp-raised animate-pulse rounded-jtp-sm ${className}`}
    aria-hidden="true"
  />
);

const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'block',
  lines = 3,
  className = '',
}) => {
  if (variant === 'text') {
    return (
      <div className={`flex flex-col gap-[8px] ${className}`} aria-busy="true">
        {Array.from({ length: lines }).map((_, i) => (
          <Block
            key={i}
            className={`h-[14px] ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
          />
        ))}
      </div>
    );
  }

  if (variant === 'stat') {
    return (
      <div
        className={`bg-jtp-panel border border-jtp-border rounded-jtp-panel px-4 py-[15px] ${className}`}
        aria-busy="true"
      >
        <Block className="h-[10px] w-24 mb-[8px]" />
        <Block className="h-[28px] w-28" />
        <Block className="h-[10px] w-16 mt-[8px]" />
      </div>
    );
  }

  if (variant === 'panel') {
    return (
      <div
        className={`bg-jtp-panel border border-jtp-border rounded-jtp-panel overflow-hidden ${className}`}
        aria-busy="true"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-[10px] border-b border-jtp-border">
          <Block className="h-[10px] w-20" />
        </div>
        {/* Body rows */}
        <div className="p-4 flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Block key={i} className={`h-[14px] ${i % 3 === 2 ? 'w-2/3' : 'w-full'}`} />
          ))}
        </div>
      </div>
    );
  }

  // Default: block
  return <Block className={className} aria-busy="true" />;
};

export default Skeleton;
