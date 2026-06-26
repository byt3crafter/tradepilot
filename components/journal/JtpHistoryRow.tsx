import React, { useMemo } from 'react';
import { Trade, Direction, TradeResult } from '../../types';
import { usePlaybook } from '../../context/PlaybookContext';
import { useAssets } from '../../context/AssetContext';
import { usePriceFormatter } from '../../hooks/usePriceFormatter';
import { useTrade } from '../../context/TradeContext';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { DropdownMenu, DropdownMenuItem } from '../ui/DropdownMenu';
import Checkbox from '../ui/Checkbox';
import Badge from '../ui/Badge';

interface JtpHistoryRowProps {
  trade: Trade;
  onViewDetail: (trade: Trade, startInEditMode?: boolean) => void;
  isSelected: boolean;
  onSelect: (tradeId: string) => void;
}

const fmtPL = (v: number) => `${v >= 0 ? '+' : '-'}$${Math.abs(v).toFixed(2)}`;

const JtpHistoryRow: React.FC<JtpHistoryRowProps> = ({ trade, onViewDetail, isSelected, onSelect }) => {
  const { deleteTrade } = useTrade();
  const { playbooks } = usePlaybook();
  const { findSpec } = useAssets();
  const { formatPrice } = usePriceFormatter(trade.asset);

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
  const netPL = (trade.profitLoss ?? 0) - (trade.commission ?? 0) - (trade.swap ?? 0);
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
    onViewDetail(trade, false);
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

        {/* RESULT */}
        <td className="px-3">
          {trade.result ? (
            <Badge
              variant={
                trade.result === TradeResult.Win
                  ? 'profit'
                  : trade.result === TradeResult.Loss
                  ? 'loss'
                  : 'neutral'
              }
              size="xs"
            >
              {trade.result === TradeResult.Win
                ? 'WIN'
                : trade.result === TradeResult.Loss
                ? 'LOSS'
                : 'BE'}
            </Badge>
          ) : (
            <span className="font-mono text-jtp-textFaint text-jtp-xs">—</span>
          )}
        </td>

        {/* NET P&L */}
        <td className="px-3 text-right">
          <span className={`font-mono font-medium text-jtp-base-minus ${netPLColor}`}>
            {fmtPL(netPL)}
          </span>
        </td>

        {/* ADH */}
        <td className="px-3 text-center">
          {trade.adherence === true ? (
            <span className="font-mono text-jtp-profit text-jtp-xs font-semibold">&#10003;</span>
          ) : trade.adherence === false ? (
            <span className="font-mono text-jtp-loss text-jtp-xs font-semibold">&#10007;</span>
          ) : (
            <span className="font-mono text-jtp-textFaint text-jtp-xs">—</span>
          )}
        </td>

        {/* MISTAKES */}
        <td className="px-3 py-2">
          {mistakeTags.length > 0 ? (
            <div className="flex gap-1 flex-wrap">
              {mistakeTags.map((m, i) => (
                <Badge key={i} variant="loss" size="xs">{m}</Badge>
              ))}
            </div>
          ) : (
            <span className="text-jtp-xs text-jtp-textFaint">—</span>
          )}
        </td>

        {/* ACTIONS */}
        <td className="px-3" data-dropdown-menu>
          <DropdownMenu>
            <DropdownMenuItem onSelect={() => onViewDetail(trade, true)}>
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

    </>
  );
};

export default JtpHistoryRow;
