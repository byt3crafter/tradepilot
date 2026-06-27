import React from 'react';
import { useAccount } from '../../context/AccountContext';
import { usePlaybook } from '../../context/PlaybookContext';
import { useView } from '../../context/ViewContext';
import { useTrade } from '../../context/TradeContext';
import { Panel, Button } from '../ui';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';

// ── Step definitions ─────────────────────────────────────────────────────────

interface Step {
  key: 'accounts' | 'playbooks' | 'trades';
  num: number;
  label: string;
  description: string;
  cta: string;
  view: string;
  subView?: string;
}

const STEPS: Step[] = [
  {
    key:         'accounts',
    num:         1,
    label:       'BROKER ACCOUNT',
    description: 'Add your first broker or prop firm account. Required before logging any trades or tracking objectives.',
    cta:         'ADD ACCOUNT',
    view:        'settings',
    subView:     'accounts',
  },
  {
    key:         'playbooks',
    num:         2,
    label:       'STRATEGY PLAYBOOK',
    description: 'Document your trading setups to measure their individual edge and performance over time.',
    cta:         'ADD PLAYBOOK',
    view:        'playbooks',
  },
  {
    key:         'trades',
    num:         3,
    label:       'FIRST TRADE',
    description: 'Import from your broker (CSV/HTML) or add trades manually. The fastest path to analytics is an import.',
    cta:         'GO TO JOURNAL',
    view:        'journal',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

const GettingStartedGuide: React.FC = () => {
  const { accounts }     = useAccount();
  const { playbooks }    = usePlaybook();
  const { navigateTo }   = useView();
  const { closedTrades } = useTrade();

  const completed: Record<Step['key'], boolean> = {
    accounts: accounts.length > 0,
    playbooks: playbooks.length > 0,
    trades:   closedTrades.length > 0,
  };

  const allDone = Object.values(completed).every(Boolean);

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-4">

      {/* ── Terminal header panel ── */}
      <Panel label="GETTING STARTED">
        <p className="text-jtp-md text-jtp-textMuted leading-relaxed">
          {allDone
            ? 'Setup complete. Your first trades are being analysed — head to Analytics to review your edge.'
            : 'Complete these three steps in order to unlock your full trading analytics dashboard.'}
        </p>
      </Panel>

      {/* ── Step panels ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STEPS.map((step, idx) => {
          const isDone   = completed[step.key];
          const prevKey  = idx > 0 ? STEPS[idx - 1].key : null;
          const isLocked = prevKey ? !completed[prevKey] : false;

          // Amber accent for pending, green for complete, dimmed for locked
          const accentColor = isDone
            ? 'rgba(61,220,132,0.55)'    // jtp-profit at 55%
            : 'rgba(232,162,61,0.55)';   // jtp-amber at 55%

          return (
            <section
              key={step.key}
              className={[
                'bg-jtp-panel border border-jtp-border rounded-[2px] flex flex-col overflow-hidden transition-opacity duration-200',
                isLocked ? 'opacity-40' : '',
              ].filter(Boolean).join(' ')}
              style={{ borderTop: `2px solid ${accentColor}` }}
              aria-disabled={isLocked}
            >
              {/* Step header */}
              <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-[9px] border-b border-jtp-border">
                <span className="jtp-label tracking-[0.12em] flex items-center gap-[6px]">
                  <span
                    style={{ color: isDone ? '#3ddc84' : '#e8a23d' }}
                    aria-hidden="true"
                  >
                    {isDone ? '✓' : `0${step.num}`}
                  </span>
                  {step.label}
                </span>
                {isDone && (
                  <CheckCircleIcon
                    className="w-4 h-4 flex-shrink-0 text-jtp-profit"
                    aria-label="Step complete"
                  />
                )}
              </div>

              {/* Body */}
              <div className="p-4 flex flex-col flex-1 gap-4">
                <p className="text-jtp-md text-jtp-textMuted flex-1 leading-relaxed">
                  {step.description}
                </p>
                <Button
                  variant={isDone ? 'secondary' : 'primary'}
                  onClick={() => (navigateTo as any)(step.view, step.subView)}
                  disabled={isDone || isLocked}
                  className="w-full"
                >
                  {isDone ? 'COMPLETED' : step.cta}
                </Button>
              </div>
            </section>
          );
        })}
      </div>

    </div>
  );
};

export default GettingStartedGuide;
