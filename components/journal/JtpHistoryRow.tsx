import React, { useState, useMemo } from 'react';
import { Trade, Direction } from '../../types';
import { usePlaybook } from '../../context/PlaybookContext';
import { useAssets } from '../../context/AssetContext';
import { usePriceFormatter } from '../../hooks/usePriceFormatter';
import { useTrade } from '../../context/TradeContext';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { DropdownMenu, DropdownMenuItem } from '../ui/DropdownMenu';
import Button from '../ui/Button';
import Spinner from '../Spinner';
import AiAnalysisDisplay from '../trades/AiAnalysisDisplay';
import JournalEntry from './JournalEntry';
import JournalForm from './JournalForm';
import Modal from '../ui/Modal';
import Checkbox from '../ui/Checkbox';

interface JtpHistoryRowProps {
  trade: Trade;
  onEdit: () => void;
  isSelected: boolean;
  onSelect: (tradeId: string) => void;
}

// Total columns: checkbox(1) + DATE(2) + ASSET(3) + DIR(4) + SETUP(5) + ENTRY→EXIT(6)
//                + SIZE(7) + PLAN R(8) + REAL R(9) + NET P&L(10) + ADH(11) + MISTAKES(12) + ACTIONS(13)
const TOTAL_COLS = 13;

const fmtPL = (v: number) => `${v >= 0 ? '+' : '-'}$${Math.abs(v).toFixed(2)}`;

const calculateDuration = (start?: string | null, end?: string | null): string => {
  if (!start || !end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 0) return '—';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  return parts.length ? parts.join(' ') : '<1m';
};

const JtpHistoryRow: React.FC<JtpHistoryRowProps> = ({ trade, onEdit, isSelected, onSelect }) => {
  const { deleteTrade, analyzeTrade } = useTrade();
  const { playbooks } = usePlaybook();
  const { findSpec } = useAssets();
  const { formatPrice } = usePriceFormatter(trade.asset);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);

  // Setup name: playbookSetupId → setup.name, else playbookId → playbook.name, else "—"
  const setupName = useMemo(() => {
    if (!trade.playbookId) return '—';
    const playbook = playbooks.find(p => p.id === trade.playbookId);
    if (!playbook) return '—';
    if (trade.playbookSetupId) {
      const setup = playbook.setups?.find(s => s.id === trade.playbookSetupId);
      if (setup) return setup.name;
    }
    return playbook.name;
  }, [trade.playbookId, trade.playbookSetupId, playbooks]);

  // Asset class label
  const assetSpec = findSpec(trade.asset);
  const assetClassLabel = assetSpec?.assetClass
    ? assetSpec.assetClass.charAt(0) + assetSpec.assetClass.slice(1).toLowerCase()
    : '';

  const isBuy = trade.direction === Direction.Buy;
  const netPL = trade.profitLoss ?? 0;
  const planR = trade.planR ?? null;
  const realisedR = trade.realisedR ?? null;
  const mistakeTags = trade.mistakeTags ?? [];

  const netPLColor =
    netPL > 0 ? 'text-jtp-profit' : netPL < 0 ? 'text-jtp-loss' : 'text-jtp-textMuted';
  const realisedRColor =
    realisedR === null
      ? 'text-jtp-textFaint'
      : realisedR > 0
      ? 'text-jtp-profit'
      : realisedR < 0
      ? 'text-jtp-loss'
      : 'text-jtp-textMuted';

  const exitOrEntry = trade.exitDate || trade.entryDate;
  const dateObj = new Date(exitOrEntry);
  const dateStr = dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const entryExit = `${formatPrice(trade.entryPrice)} → ${formatPrice(
    trade.exitPrice ?? trade.entryPrice
  )}`;

  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('.checkbox-cell') || target.closest('[data-dropdown-menu]')) return;
    setIsExpanded(prev => !prev);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this trade?')) {
      try {
        await deleteTrade(trade.id);
      } catch (err) {
        console.error('Failed to delete trade:', err);
        alert('Could not delete the trade. Please try again.');
      }
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      await analyzeTrade(trade.id);
    } catch (err) {
      console.error(err);
      alert('Failed to analyze trade. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const canAnalyze =
    !!(trade.screenshotBeforeUrl && trade.screenshotAfterUrl && !trade.aiAnalysis);

  const toggleSection = (key: string) => {
    setOpenSection(prev => (prev === key ? null : key));
  };

  const formatDateTime = (d?: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleString(undefined, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <>
      <tr
        className={`border-b border-jtp-borderSubtle cursor-pointer transition-colors duration-100
          ${isSelected ? 'bg-jtp-blue/10' : 'hover:bg-jtp-active'}`}
        style={{ height: '43px' }}
        onClick={handleRowClick}
      >
        {/* Checkbox */}
        <td
          className="px-3 w-8 checkbox-cell"
          onClick={e => e.stopPropagation()}
        >
          <Checkbox
            id={`sel-${trade.id}`}
            checked={isSelected}
            onChange={() => onSelect(trade.id)}
          />
        </td>

        {/* DATE */}
        <td className="px-3 whitespace-nowrap">
          <div className="font-mono text-jtp-base-minus text-jtp-textSoft">{dateStr}</div>
          <div className="font-mono text-jtp-xs text-jtp-textFaint">{timeStr}</div>
        </td>

        {/* ASSET */}
        <td className="px-3">
          <div className="font-semibold text-jtp-base-minus text-jtp-text">{trade.asset}</div>
          {assetClassLabel && (
            <div className="text-jtp-xs text-jtp-textFaint">{assetClassLabel}</div>
          )}
        </td>

        {/* DIR */}
        <td className="px-3">
          <span
            className={`inline-flex items-center gap-1 font-medium text-jtp-base-minus
              ${isBuy ? 'text-jtp-profit' : 'text-jtp-loss'}`}
          >
            <span className="text-[9px]">{isBuy ? '▲' : '▼'}</span>
            {isBuy ? 'Long' : 'Short'}
          </span>
        </td>

        {/* SETUP */}
        <td className="px-3 text-jtp-base-minus text-jtp-textSoft">{setupName}</td>

        {/* ENTRY → EXIT */}
        <td className="px-3 font-mono text-jtp-sm text-jtp-textMuted whitespace-nowrap">
          {entryExit}
        </td>

        {/* SIZE */}
        <td className="px-3 font-mono text-jtp-sm text-jtp-textMuted text-right whitespace-nowrap">
          {trade.lotSize != null ? `${trade.lotSize} lot` : '—'}
        </td>

        {/* PLAN R */}
        <td className="px-3 font-mono text-jtp-base-minus text-jtp-textDim text-right">
          {planR != null ? `${planR.toFixed(2)} R` : '—'}
        </td>

        {/* REAL R */}
        <td className="px-3 text-right">
          {realisedR != null ? (
            <span className={`font-mono font-semibold text-jtp-md ${realisedRColor}`}>
              {realisedR >= 0 ? '+' : ''}
              {realisedR.toFixed(2)} R
            </span>
          ) : (
            <span className="font-mono text-jtp-textFaint">—</span>
          )}
        </td>

        {/* NET P&L */}
        <td className="px-3 text-right">
          <span className={`font-mono font-medium text-jtp-base-minus ${netPLColor}`}>
            {fmtPL(netPL)}
          </span>
        </td>

        {/* ADH — no per-trade adherence boolean yet; show "—" until backend provides it */}
        {/* TODO: Replace with actual adherence once Trade type exposes a boolean field */}
        <td className="px-3 text-center">
          <span className="font-mono text-jtp-textFaint text-jtp-xs">—</span>
        </td>

        {/* MISTAKES */}
        <td className="px-3">
          {mistakeTags.length > 0 ? (
            <div className="flex gap-1 flex-wrap">
              {mistakeTags.map((m, i) => (
                <span
                  key={i}
                  className="text-jtp-xs px-1.5 py-0.5 rounded-jtp-md bg-jtp-loss/10 text-jtp-lossSoft whitespace-nowrap"
                >
                  {m}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-jtp-xs text-jtp-textFaint">—</span>
          )}
        </td>

        {/* ACTIONS */}
        <td className="px-3" data-dropdown-menu>
          <DropdownMenu>
            <DropdownMenuItem onSelect={onEdit}>
              <PencilIcon className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={handleDelete}
              className="text-jtp-loss hover:bg-jtp-loss/10"
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenu>
        </td>
      </tr>

      {/* Expanded detail panel */}
      {isExpanded && (
        <tr className="bg-jtp-raised">
          <td />
          <td colSpan={TOTAL_COLS - 1} className="px-4 py-4">
            <div className="relative">
              <Button
                onClick={onEdit}
                variant="link"
                className="absolute top-0 right-0 flex items-center gap-1 text-sm p-0"
              >
                <PencilIcon className="w-4 h-4 mr-1" />
                Edit
              </Button>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-5 text-sm pr-16 mb-4">
                {(
                  [
                    ['ENTRY TIME', formatDateTime(trade.entryDate)],
                    ['EXIT TIME', formatDateTime(trade.exitDate)],
                    ['DURATION', calculateDuration(trade.entryDate, trade.exitDate)],
                    ['ENTRY PRICE', formatPrice(trade.entryPrice)],
                    ['EXIT PRICE', formatPrice(trade.exitPrice)],
                    ['STOP LOSS', formatPrice(trade.stopLoss)],
                    ['TAKE PROFIT', formatPrice(trade.takeProfit)],
                    ['LOT SIZE', trade.lotSize ?? '—'],
                    ['RISK %', `${trade.riskPercentage?.toFixed(2) ?? '—'}%`],
                    ['PLAN R', planR != null ? `${planR.toFixed(2)} R` : '—'],
                    [
                      'REAL R',
                      realisedR != null
                        ? `${realisedR >= 0 ? '+' : ''}${realisedR.toFixed(2)} R`
                        : '—',
                    ],
                    ['NET P&L', fmtPL(netPL)],
                    ['COMMISSION', trade.commission ? `-$${trade.commission.toFixed(2)}` : '—'],
                    ['SWAP', trade.swap ? `-$${trade.swap.toFixed(2)}` : '—'],
                  ] as [string, React.ReactNode][]
                ).map(([label, value]) => (
                  <div key={label}>
                    <div className="text-jtp-xs uppercase tracking-wider text-jtp-textDim font-semibold">
                      {label}
                    </div>
                    <div className="mt-0.5 font-mono text-jtp-textSoft text-jtp-base-minus">
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Screenshots */}
              <div className="border-t border-jtp-border">
                <button
                  type="button"
                  className="w-full flex items-center justify-between py-2"
                  onClick={() => toggleSection('screenshots')}
                >
                  <span className="text-jtp-sm font-semibold text-jtp-blue">Screenshots</span>
                  <ChevronDownIcon
                    className={`w-4 h-4 text-jtp-blue transition-transform ${
                      openSection === 'screenshots' ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openSection === 'screenshots' && (
                  <div className="flex flex-col md:flex-row gap-4 mb-4">
                    {(['Before Entry', 'After Exit'] as const).map((label, i) => {
                      const url = i === 0 ? trade.screenshotBeforeUrl : trade.screenshotAfterUrl;
                      return (
                        <div key={label} className="w-full md:w-1/2">
                          <span className="text-jtp-xs text-jtp-textFaint">{label}</span>
                          {url ? (
                            <img
                              src={url}
                              alt={label}
                              className="mt-1 rounded-jtp-2xl border border-jtp-border"
                            />
                          ) : (
                            <div className="mt-1 h-24 bg-jtp-panel rounded-jtp-2xl flex items-center justify-center text-jtp-xs text-jtp-textFaint">
                              Not provided
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Journal */}
              <div className="border-t border-jtp-border">
                <button
                  type="button"
                  className="w-full flex items-center justify-between py-2"
                  onClick={() => toggleSection('journal')}
                >
                  <span className="text-jtp-sm font-semibold text-jtp-blue">My Journal</span>
                  <ChevronDownIcon
                    className={`w-4 h-4 text-jtp-blue transition-transform ${
                      openSection === 'journal' ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openSection === 'journal' && (
                  <div className="mb-4">
                    {trade.tradeJournal ? (
                      <JournalEntry journal={trade.tradeJournal} />
                    ) : (
                      <div className="flex flex-col items-center justify-center bg-jtp-panel p-4 rounded-jtp-panel">
                        <p className="text-jtp-sm text-jtp-textMuted mb-3">
                          No journal entry yet. What did you learn?
                        </p>
                        <Button
                          onClick={() => setIsJournalModalOpen(true)}
                          className="w-auto flex items-center gap-2"
                        >
                          <PlusIcon className="w-4 h-4" /> Add Journal Entry
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* AI Analysis */}
              <div className="border-t border-jtp-border">
                <button
                  type="button"
                  className="w-full flex items-center justify-between py-2"
                  onClick={() => toggleSection('ai')}
                >
                  <span className="text-jtp-sm font-semibold text-jtp-blue">AI Analysis</span>
                  <ChevronDownIcon
                    className={`w-4 h-4 text-jtp-blue transition-transform ${
                      openSection === 'ai' ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openSection === 'ai' && (
                  <div className="mb-4">
                    {trade.aiAnalysis ? (
                      <AiAnalysisDisplay analysis={trade.aiAnalysis} />
                    ) : canAnalyze ? (
                      <div className="flex flex-col items-center justify-center bg-jtp-panel p-4 rounded-jtp-panel">
                        <p className="text-jtp-sm text-jtp-textMuted mb-3">
                          Ready to analyze trade execution.
                        </p>
                        <Button onClick={handleAnalyze} disabled={isAnalyzing} className="w-auto">
                          {isAnalyzing ? <Spinner /> : 'Analyze with AI'}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center bg-jtp-panel p-4 rounded-jtp-panel">
                        <p className="text-jtp-sm text-jtp-textMuted text-center">
                          Upload "Before" and "After" screenshots to enable AI analysis.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}

      {isJournalModalOpen && (
        <Modal title="Add Journal Entry" onClose={() => setIsJournalModalOpen(false)}>
          <JournalForm trade={trade} onSuccess={() => setIsJournalModalOpen(false)} />
        </Modal>
      )}
    </>
  );
};

export default JtpHistoryRow;
