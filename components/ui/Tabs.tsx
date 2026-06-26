/**
 * Tabs — horizontal tab navigation for switching views within a section.
 *
 * Design: inactive tabs are jtp-textSubtle; active tab shows a 2px jtp-blue
 * bottom-border accent and elevated text color. Sits on the border-b of its
 * container — flush the wrapping element's border with the Tabs bottom line.
 *
 * Usage:
 *   const [tab, setTab] = useState('overview');
 *   <Tabs
 *     tabs={[
 *       { id: 'overview', label: 'Overview' },
 *       { id: 'trades',   label: 'Trades', badge: 47 },
 *       { id: 'notes',    label: 'Notes' },
 *     ]}
 *     active={tab}
 *     onChange={setTab}
 *   />
 *
 * Inside a Panel, pass to the `actions` prop for a tab-switched panel body.
 */
import React from 'react';

export interface Tab {
  id: string;
  label: string;
  /** Optional numeric badge shown after the label in mono */
  badge?: string | number;
  /** Disable this tab */
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

const Tabs: React.FC<TabsProps> = ({ tabs, active, onChange, className = '' }) => (
  <div
    className={`flex items-end border-b border-jtp-border ${className}`}
    role="tablist"
    aria-label="Section tabs"
  >
    {tabs.map((tab) => {
      const isActive = tab.id === active;
      return (
        <button
          key={tab.id}
          role="tab"
          aria-selected={isActive}
          aria-controls={`tabpanel-${tab.id}`}
          disabled={tab.disabled}
          onClick={() => !tab.disabled && onChange(tab.id)}
          className={[
            'relative px-4 py-[10px] text-jtp-md font-medium whitespace-nowrap',
            'transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed',
            isActive ? 'text-jtp-text' : 'text-jtp-textSubtle hover:text-jtp-textMuted',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {tab.label}
          {tab.badge !== undefined && (
            <span className="ml-[5px] font-mono text-jtp-xs text-jtp-textDim">
              {tab.badge}
            </span>
          )}
          {/* Active underline accent */}
          {isActive && (
            <span
              aria-hidden="true"
              className="absolute bottom-0 left-3 right-3 h-[2px] bg-jtp-blue rounded-t-full"
            />
          )}
        </button>
      );
    })}
  </div>
);

export default Tabs;
