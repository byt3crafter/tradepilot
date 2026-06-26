/**
 * EmptyState — placeholder for sections with no data yet.
 *
 * Use whenever a list, chart, or panel has nothing to show.
 * Keeps the layout from collapsing and signals clearly to the user
 * that data is expected here.
 *
 * Usage:
 *   <EmptyState title="No trades yet" description="Log your first trade to see analytics." />
 *
 *   <EmptyState
 *     icon={<ChartIcon className="w-5 h-5" />}
 *     title="No equity data"
 *     description="Close at least one trade to generate the curve."
 *     action={<Button onClick={handleLogTrade}>Log First Trade</Button>}
 *   />
 */
import React from 'react';

interface EmptyStateProps {
  /** Optional icon rendered in a circular container above the text */
  icon?: React.ReactNode;
  /** Short headline — always shown */
  title: string;
  /** Longer descriptive copy — optional */
  description?: string;
  /** Optional action button or link */
  action?: React.ReactNode;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => (
  <div
    className={`flex flex-col items-center justify-center gap-3 py-12 text-center ${className}`}
  >
    {icon && (
      <div
        aria-hidden="true"
        className="w-10 h-10 rounded-full bg-jtp-raised border border-jtp-border flex items-center justify-center text-jtp-textDim"
      >
        {icon}
      </div>
    )}

    <div>
      <p className="text-jtp-lg font-medium text-jtp-textMuted leading-snug">
        {title}
      </p>
      {description && (
        <p className="text-jtp-md text-jtp-textFaint mt-[5px] max-w-[260px] mx-auto leading-snug">
          {description}
        </p>
      )}
    </div>

    {action && <div className="mt-1">{action}</div>}
  </div>
);

export default EmptyState;
