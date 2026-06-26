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
  profit:  'bg-[rgba(76,195,138,.14)]  text-jtp-profit',
  loss:    'bg-[rgba(229,99,95,.14)]   text-jtp-loss',
  warning: 'bg-[rgba(217,162,59,.14)]  text-jtp-warning',
  info:    'bg-[rgba(91,141,239,.14)]  text-jtp-blue',
  neutral: 'bg-[rgba(255,255,255,.06)] text-jtp-textMuted',
  success: 'bg-[rgba(76,195,138,.14)]  text-jtp-profit',
};

const SIZE_STYLES: Record<BadgeSize, string> = {
  xs: 'text-[9.5px] px-[6px]  py-[1.5px]',
  sm: 'text-[10px]  px-[7px]  py-[2px]',
  md: 'text-[11px]  px-[9px]  py-[3px]',
};

const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'sm',
  children,
  className = '',
}) => (
  <span
    className={[
      'inline-flex items-center font-mono font-semibold rounded-jtp-sm',
      'tracking-[0.2px] whitespace-nowrap select-none',
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
