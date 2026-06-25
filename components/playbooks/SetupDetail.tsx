import React, { useMemo } from 'react';
import { Playbook, PlaybookSetup, Trade } from '../../types';
import { SetupItem, computeStats } from './SetupsList';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(r: number): string {
  const sign = r >= 0 ? '+' : '−';
  return `${sign}${Math.abs(r).toFixed(2)}R`;
}

function fmtNet(n: number): string {
  const sign = n >= 0 ? '+' : '−';
  return `${sign}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Try to read a TARGET R:R from riskSettings (field name is not yet standardised)
function extractRR(setup: PlaybookSetup | null): string {
  if (!setup) return '—';
  const rs = setup.riskSettings;
  if (!rs) return '—';
  const val =
    rs.rr ??
    rs.targetRR ??
    rs.riskReward ??
    rs.rrRatio ??
    rs.ratio ??
    null;
  if (val == null) return '—';
  const n = parseFloat(String(val));
  if (isNaN(n)) return String(val);
  return `${n.toFixed(1)} : 1`;
}

// Join checklist items as a readable sentence / list
function joinItems(items: Array<{ text: string }>): string {
  if (!items || items.length === 0) return '';
  return items.map(c => c.text).join('\n');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard: React.FC<{ label: string; value: string; color?: string }> = ({
  label,
  value,
  color = 'text-jtp-text',
}) => (
  <div className="bg-jtp-raised border border-jtp-border rounded-jtp-panel px-4 py-[13px]">
    <div className="text-jtp-xs uppercase tracking-[0.5px] text-jtp-textDim mb-[5px]">
      {label}
    </div>
    <div className={`font-mono font-semibold text-jtp-2xl leading-none ${color}`}>{value}</div>
  </div>
);

const TextBlock: React.FC<{ label: string; content: string }> = ({ label, content }) => {
  const isEmpty = !content.trim();
  return (
    <div>
      <div className="text-jtp-xs uppercase tracking-[0.5px] text-jtp-textDim mb-[8px]">
        {label}
      </div>
      {isEmpty ? (
        <p className="text-jtp-sm text-jtp-textFaint italic">Not defined yet</p>
      ) : (
        <div className="space-y-1">
          {content.split('\n').filter(Boolean).map((line, i) => (
            <div key={i} className="flex gap-2 text-jtp-base text-jtp-textNote leading-snug">
              <span className="text-jtp-textFaint shrink-0 mt-[2px] text-jtp-xs">·</span>
              <span>{line}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

interface SetupDetailProps {
  item: SetupItem;
  closedTrades: Trade[];
}

const SetupDetail: React.FC<SetupDetailProps> = ({ item, closedTrades }) => {
  const trades = useMemo(() => {
    if (item.setup !== null) {
      return closedTrades.filter(t => t.playbookSetupId === item.setup!.id);
    }
    return closedTrades.filter(t => t.playbookId === item.playbook.id && !t.playbookSetupId);
  }, [item, closedTrades]);

  const stats = useMemo(() => computeStats(trades), [trades]);

  const setup = item.setup;
  const playbook = item.playbook;

  const entryText = setup ? joinItems(setup.entryCriteria) : '';
  const exitText = setup ? joinItems(setup.exitRules) : '';
  const invalidText = setup
    ? joinItems([...setup.riskManagement, ...setup.confirmationFilters])
    : '';

  const tags = [
    ...playbook.tradingStyles,
    ...playbook.instruments,
    ...playbook.timeframes,
  ];

  const rrStr = extractRR(setup);

  const winPct = stats.tradeCount > 0 ? Math.round(stats.winRate * 100) : 0;
  const plColor = stats.netPL > 0 ? 'text-jtp-profit' : stats.netPL < 0 ? 'text-jtp-loss' : 'text-jtp-textMuted';
  const rColor = stats.avgR > 0 ? 'text-jtp-profit' : stats.avgR < 0 ? 'text-jtp-loss' : 'text-jtp-textMuted';
  const wrColor = stats.winRate >= 0.5 ? 'text-jtp-profit' : stats.tradeCount > 0 ? 'text-jtp-loss' : 'text-jtp-textMuted';

  return (
    <div className="flex flex-col gap-5 px-6 py-5 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-jtp-xl text-jtp-text leading-tight">{item.name}</h2>
          {playbook.coreIdea && (
            <p className="text-jtp-sm text-jtp-textMuted mt-1 leading-snug">{playbook.coreIdea}</p>
          )}
          {!playbook.coreIdea && !setup && (
            <p className="text-jtp-sm text-jtp-textFaint italic mt-1">No description</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-jtp-xs uppercase tracking-[0.5px] text-jtp-textDim">Target R:R</div>
          <div className="font-mono font-semibold text-jtp-lg text-jtp-textSoft mt-0.5">{rrStr}</div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard
          label="Trades"
          value={stats.tradeCount > 0 ? String(stats.tradeCount) : '—'}
        />
        <StatCard
          label="Win Rate"
          value={stats.tradeCount > 0 ? `${winPct}%` : '—'}
          color={wrColor}
        />
        <StatCard
          label="Expectancy"
          value={stats.tradeCount > 0 ? fmtR(stats.expectancy) : '—'}
          color={rColor}
        />
        <StatCard
          label="Net P&L"
          value={stats.tradeCount > 0 ? fmtNet(stats.netPL) : '—'}
          color={plColor}
        />
      </div>

      {/* Separator */}
      <div className="border-t border-jtp-border" />

      {/* Entry / Exit / Invalidation */}
      <TextBlock label="Entry" content={entryText} />
      <TextBlock label="Exit" content={exitText} />
      <TextBlock label="Invalidation" content={invalidText} />

      {/* Tags */}
      {tags.length > 0 && (
        <div>
          <div className="text-jtp-xs uppercase tracking-[0.5px] text-jtp-textDim mb-[8px]">
            Tags
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tags.map(tag => (
              <span
                key={tag}
                className="text-jtp-xs px-2.5 py-[3px] rounded-jtp-md bg-jtp-blue/10 text-jtp-blue font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SetupDetail;
