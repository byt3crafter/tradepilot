import React from 'react';

// ─── Section card wrapper ────────────────────────────────────────────────────

const BotCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel overflow-hidden">
    <div className="px-5 py-4 border-b border-jtp-border">
      <h2 className="text-jtp-lg font-semibold text-jtp-text tracking-tight">{title}</h2>
    </div>
    <div className="px-5 py-4">{children}</div>
  </div>
);

// ─── Status pill ─────────────────────────────────────────────────────────────

const StatusPill: React.FC<{ label: string; color: 'neutral' | 'profit' | 'loss' }> = ({ label, color }) => {
  const colorMap = {
    neutral: 'bg-jtp-active text-jtp-textDim border-jtp-border',
    profit:  'bg-[rgba(74,193,128,0.12)] text-jtp-profit border-[rgba(74,193,128,0.2)]',
    loss:    'bg-[rgba(229,99,95,0.12)] text-jtp-loss border-[rgba(229,99,95,0.2)]',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-jtp-xs font-medium border ${colorMap[color]}`}>
      {label}
    </span>
  );
};

// ─── Placeholder field row ────────────────────────────────────────────────────

const FieldRow: React.FC<{ label: string; placeholder: string }> = ({ label, placeholder }) => (
  <div className="flex items-center justify-between py-3 border-b border-jtp-borderSubtle last:border-b-0">
    <span className="text-jtp-sm text-jtp-textMuted">{label}</span>
    <span className="text-jtp-sm text-jtp-textDim font-mono">{placeholder}</span>
  </div>
);

// ─── Disabled toggle ─────────────────────────────────────────────────────────

const DisabledToggle: React.FC<{ labelOff: string; labelOn: string }> = ({ labelOff, labelOn }) => (
  <div className="flex items-center gap-3 opacity-50 cursor-not-allowed select-none">
    <span className="text-jtp-sm text-jtp-textDim">{labelOff}</span>
    <div
      className="relative w-9 h-5 rounded-full bg-jtp-active border border-jtp-border flex items-center"
      aria-disabled="true"
      role="switch"
      aria-checked={false}
    >
      <span className="absolute left-0.5 w-4 h-4 rounded-full bg-jtp-textDim transition-transform" />
    </div>
    <span className="text-jtp-sm text-jtp-textDim">{labelOn}</span>
  </div>
);

// ─── Main BotPage ─────────────────────────────────────────────────────────────

const BotPage: React.FC = () => {
  return (
    <div className="p-5 md:p-6 space-y-5 animate-jtp-fade-in max-w-3xl">

      {/* Page header note */}
      <div className="flex items-start gap-3 bg-jtp-active border border-jtp-borderStrong rounded-jtp-panel px-4 py-3">
        <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-jtp-blue text-white">
          BETA
        </span>
        <p className="text-jtp-sm text-jtp-textMuted leading-relaxed">
          Your AI trading bot — auto-sync + strategy automation. Currently in development.
        </p>
      </div>

      {/* Broker Connection */}
      <BotCard title="Broker Connection">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-jtp-sm text-jtp-text font-medium">cTrader</p>
            <p className="text-jtp-xs text-jtp-textDim mt-0.5">
              cTrader API credentials required — coming soon
            </p>
          </div>
          <button
            disabled
            className="flex items-center gap-2 px-4 py-2 rounded-jtp-xl text-jtp-sm font-medium bg-jtp-active border border-jtp-border text-jtp-textDim cursor-not-allowed opacity-50"
            aria-disabled="true"
          >
            Connect cTrader
          </button>
        </div>
      </BotCard>

      {/* Strategies */}
      <BotCard title="Strategies">
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
          <svg
            viewBox="0 0 48 48"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="w-10 h-10 text-jtp-textDim mb-1"
          >
            <rect x="8" y="8" width="32" height="32" rx="4" />
            <path d="M16 28l6-8 6 6 6-10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-jtp-sm text-jtp-textMuted font-medium">No strategies yet</p>
          <p className="text-jtp-xs text-jtp-textDim">
            Strategy configuration will be available once broker connection is set up.
          </p>
        </div>
      </BotCard>

      {/* Bot Status */}
      <BotCard title="Bot Status">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <StatusPill label="Inactive" color="neutral" />
            <span className="text-jtp-sm text-jtp-textDim">Bot is not running</span>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-jtp-xs text-jtp-textDim">Mode</span>
            <DisabledToggle labelOff="Paper" labelOn="Live" />
          </div>
        </div>
      </BotCard>

      {/* Risk Limits */}
      <BotCard title="Risk Limits">
        <p className="text-jtp-xs text-jtp-textDim mb-3">
          These limits will apply to all automated trades. Configuration will be enabled once connected.
        </p>
        <div className="divide-y divide-jtp-borderSubtle">
          <FieldRow label="Max risk per trade" placeholder="— %" />
          <FieldRow label="Max daily loss" placeholder="— %" />
          <FieldRow label="Max trades per day" placeholder="—" />
        </div>
      </BotCard>

    </div>
  );
};

export default BotPage;
