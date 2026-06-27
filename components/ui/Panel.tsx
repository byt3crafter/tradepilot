/**
 * Panel — the core Operator Console unit.
 *
 * Every major data section should live in a Panel. It provides:
 *   - A standardised uppercase mono section LABEL (top-left)
 *   - An optional actions slot (top-right) — use SegmentedControl, Tabs, or buttons here
 *   - A dividing border between header and body
 *   - Consistent background, border, and radius from the JTP token system
 *
 * Usage:
 *   <Panel label="EQUITY CURVE" actions={<SegmentedControl .../>}>
 *     <Chart />
 *   </Panel>
 *
 *   <Panel label="RECENT ACTIVITY" noPadding>
 *     <DataTable ... />
 *   </Panel>
 */
import React from 'react';

interface PanelProps {
  /** UPPERCASE section identifier — rendered in mono, tracked, low-contrast */
  label: string;
  /** Optional node rendered in the top-right header corner */
  actions?: React.ReactNode;
  /** Panel body content */
  children: React.ReactNode;
  /** Extra classes applied to the outer container */
  className?: string;
  /** When true, removes the default p-4 padding from the body (e.g. for flush DataTable) */
  noPadding?: boolean;
  /** When true, the body is scrollable (flex-1 overflow-y-auto) — use inside a flex column */
  scrollable?: boolean;
}

const Panel: React.FC<PanelProps> = ({
  label,
  actions,
  children,
  className = '',
  noPadding = false,
  scrollable = false,
}) => (
  <section
    className={`bg-jtp-panel border border-jtp-border rounded-[2px] overflow-hidden flex flex-col ${className}`}
  >
    {/* Console header — amber top-accent + terminal label */}
    <header
      className="flex-shrink-0 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-[9px] border-b border-jtp-border relative"
      style={{ borderTop: '2px solid rgba(232,162,61,0.55)' }}
    >
      <span className="jtp-label select-none tracking-[0.12em]">
        <span style={{ color: '#e8a23d', marginRight: '6px' }}>▸</span>
        {label}
      </span>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
      )}
    </header>

    {/* Body */}
    <div
      className={[
        scrollable ? 'flex-1 overflow-y-auto' : '',
        noPadding ? '' : 'p-4',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  </section>
);

export default Panel;
