/**
 * Badge — status indicator and tag component.
 *
 * Variants (matched to JTP trading semantics):
 *   profit   — green  (positive outcome, goal reached)
 *   loss     — red    (negative outcome, limit breached)
 *   warning  — amber  (caution, approaching limit, headroom)
 *   info     — blue   (informational, in-progress, on-track)
 *   neutral  — gray   (default, inactive, not started)
 *   success  — alias for profit in non-P&L contexts
 *
 * Sizes:
 *   xs  — micro (status bar, dense table cells)
 *   sm  — default (cards, panel headers)
 *   md  — larger (prominent status, standalone badges)
 *
 * Usage:
 *   <Badge variant="profit">Passed</Badge>
 *   <Badge variant="warning" size="xs">Safe</Badge>
 *   <Badge variant="info">On Track</Badge>
 */
import React from 'react';

export type BadgeVariant = 'profit' | 'loss' | 'warning' | 'info' | 'neutral' | 'success';
export type BadgeSize = 'xs' | 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  profit:  'bg-[rgba(61,220,132,.12)]  text-[#3ddc84] border border-[rgba(61,220,132,.35)]',
  loss:    'bg-[rgba(255,91,82,.12)]   text-[#ff5b52] border border-[rgba(255,91,82,.35)]',
  warning: 'bg-[rgba(232,162,61,.12)]  text-[#e8a23d] border border-[rgba(232,162,61,.35)]',
  info:    'bg-[rgba(232,162,61,.12)]  text-[#e8a23d] border border-[rgba(232,162,61,.35)]',
  neutral: 'bg-[rgba(255,255,255,.05)] text-jtp-textMuted border border-jtp-borderStrong',
  success: 'bg-[rgba(61,220,132,.12)]  text-[#3ddc84] border border-[rgba(61,220,132,.35)]',
};

const SIZE_STYLES: Record<BadgeSize, string> = {
  xs: 'text-[9px]    px-[5px] py-[1px]   tracking-[0.15em]',
  sm: 'text-[9.5px]  px-[6px] py-[1.5px] tracking-[0.12em]',
  md: 'text-[10.5px] px-[8px] py-[2.5px] tracking-[0.10em]',
};

const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'sm',
  children,
  className = '',
}) => (
  <span
    className={[
      'inline-flex items-center font-mono font-semibold rounded-none',
      'whitespace-nowrap select-none',
      VARIANT_STYLES[variant],
      SIZE_STYLES[size],
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {children}
  </span>
);

export default Badge;
