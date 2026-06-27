import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAccount } from '../context/AccountContext';
import { useTrade } from '../context/TradeContext';
import { usePlaybook } from '../context/PlaybookContext';
import Spinner from './Spinner';
import { Trade, TradeResult } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import LiveTradeRow from './trades/LiveTradeRow.tsx';
import PendingOrderRow from './trades/PendingOrderRow';
import CloseTradeModal from './trades/CloseTradeModal';
import TradeFormModal from './trades/TradeFormModal';
import { useUI } from '../context/UIContext';
import { TrashIcon } from './icons/TrashIcon';
import { ImportIcon } from './icons/ImportIcon';
import ImportTradesModal from './accounts/ImportTradesModal';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Checkbox from './ui/Checkbox';
import JtpHistoryRow from './journal/JtpHistoryRow';
import CalendarHeatmap from './journal/CalendarHeatmap';
import TradeDetail from './journal/TradeDetail';
import { Tabs, SegmentedControl, Panel, EmptyState, StatTile } from './ui';

type TradeView = 'live' | 'pending' | 'history' | 'calendar';
type AddTradeStep = 'closed' | 'form';
type DateFilter = 'all-time' | 'today' | 'yesterday' | 'this-week' | 'this-month' | 'custom-range';
type ResultFilter = 'all' | 'win' | 'loss';

// Helper: resolve setup/playbook name from a trade
const resolveSetupName = (
  trade: Trade,
  playbooks: ReturnType<typeof usePlaybook>['playbooks']
): string => {
  if (!trade.playbookId) return '—';
  const pb = playbooks.find(p => p.id === trade.playbookId);
  if (!pb) return '—';
  if (trade.playbookSetupId) {
    const setup = pb.setups?.find(s => s.id === trade.playbookSetupId);
    if (setup) return setup.name;
  }
  return pb.name;
};

const fmtPL = (v: number) =>
  v > 0 ? `▲ +$${v.toFixed(2)}` : v < 0 ? `▼ -$${Math.abs(v).toFixed(2)}` : `$0.00`;

// ─── History column headers ───────────────────────────────────────────────────
const HISTORY_COLS: Array<{ label: string; align?: string; className?: string }> = [
  { label: '',          className: 'w-8' },
  { label: 'DATE',      className: 'min-w-[90px]' },
  { label: 'ASSET',     className: 'min-w-[80px]' },
  { label: 'DIR',       className: 'min-w-[70px]' },
  { label: 'SETUP',     className: 'min-w-[100px]' },
  { label: 'ENTRY → EXIT', className: 'min-w-[160px]' },
  { label: 'SIZE',      align: 'right', className: 'min-w-[70px]' },
  { label: 'PLAN R',   align: 'right', className: 'min-w-[70px]' },
  { label: 'REAL R',   align: 'right', className: 'min-w-[70px]' },
  { label: 'RESULT',   className: 'min-w-[64px]' },
  { label: 'NET P&L',  align: 'right', className: 'min-w-[80px]' },
  { label: 'ADH',      align: 'center', className: 'min-w-[50px]' },
  { label: 'MISTAKES', className: 'min-w-[100px]' },
  { label: '',          className: 'w-10' },
];

// ─── Main component ───────────────────────────────────────────────────────────
const TradeJournal: React.FC = () => {
  const { activeAccount, objectivesProgress, smartLimitsProgress, isLoading: isAccountLoading } =
    useAccount();
  const { liveTrades, pendingTrades, closedTrades, isLoading: isTradeLoading, bulkDeleteTrades } =
    useTrade();
  const { playbooks } = usePlaybook();
  const { isTrialExpired } = useAuth();
  const { showUpgradeModal } = useSubscription();
  const { isAddTradeModalOpenRequest, clearAddTradeModalRequest } = useUI();

  // ── Detail view state ──────────────────────────────────────────────────────
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [detailInitialEdit, setDetailInitialEdit] = useState(false);

  // ── Modal / step state ─────────────────────────────────────────────────────
  const [addTradeStep, setAddTradeStep] = useState<AddTradeStep>('closed');
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [closingTrade, setClosingTrade] = useState<Trade | null>(null);

  // ── View + filter state ────────────────────────────────────────────────────
  const [currentView, setCurrentView] = useState<TradeView>('history');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all-time');
  const [customStartDate, setCustomStartDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  // ── History toolbar state ─────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSetup, setFilterSetup] = useState('all');
  const [filterResult, setFilterResult] = useState<ResultFilter>('all');

  // ── Bulk action state ──────────────────────────────────────────────────────
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // ── Limits ─────────────────────────────────────────────────────────────────
  const dailyLossRule = objectivesProgress?.find(obj => obj.key === 'maxDailyLoss');
  const isObjectiveBlocked = dailyLossRule?.status === 'Failed';
  const isSmartLimitBlocked = smartLimitsProgress?.isTradeCreationBlocked ?? false;
  const blockReason = isObjectiveBlocked
    ? 'Daily loss limit reached.'
    : smartLimitsProgress?.blockReason;

  // ── Date-filtered closed trades ────────────────────────────────────────────
  const filteredClosedTrades = useMemo(() => {
    if (dateFilter === 'all-time') return closedTrades;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(startOfWeek.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return closedTrades.filter(trade => {
      if (!trade.exitDate) return false;
      const exitDate = new Date(trade.exitDate);
      const exitDay = new Date(exitDate.getFullYear(), exitDate.getMonth(), exitDate.getDate());
      switch (dateFilter) {
        case 'today':
          return exitDay.getTime() === today.getTime();
        case 'yesterday':
          return exitDay.getTime() === yesterday.getTime();
        case 'this-week':
          return exitDate >= startOfWeek && exitDate <= now;
        case 'this-month':
          return (
            exitDate.getFullYear() === startOfMonth.getFullYear() &&
            exitDate.getMonth() === startOfMonth.getMonth()
          );
        case 'custom-range': {
          if (!customStartDate || !customEndDate) return true;
          const start = new Date(`${customStartDate}T00:00:00.000Z`);
          const end = new Date(`${customEndDate}T23:59:59.999Z`);
          return exitDate >= start && exitDate <= end;
        }
        default:
          return true;
      }
    });
  }, [closedTrades, dateFilter, customStartDate, customEndDate]);

  // ── Toolbar-filtered trades (search + setup + result) ─────────────────────
  const displayedTrades = useMemo(() => {
    let trades = filteredClosedTrades;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      trades = trades.filter(t => {
        if (t.asset.toLowerCase().includes(q)) return true;
        const name = resolveSetupName(t, playbooks).toLowerCase();
        if (name.includes(q)) return true;
        if ((t.mistakeTags ?? []).some(m => m.toLowerCase().includes(q))) return true;
        return false;
      });
    }
    if (filterSetup !== 'all') {
      trades = trades.filter(t => resolveSetupName(t, playbooks) === filterSetup);
    }
    if (filterResult === 'win') {
      trades = trades.filter(t => t.result === TradeResult.Win);
    } else if (filterResult === 'loss') {
      trades = trades.filter(t => t.result === TradeResult.Loss);
    }
    return trades;
  }, [filteredClosedTrades, searchQuery, filterSetup, filterResult, playbooks]);

  // ── Setup dropdown options ─────────────────────────────────────────────────
  const setupOptions = useMemo(() => {
    const names = new Set<string>();
    closedTrades.forEach(t => {
      const name = resolveSetupName(t, playbooks);
      if (name !== '—') names.add(name);
    });
    return Array.from(names).sort();
  }, [closedTrades, playbooks]);

  // ── Summary footer ─────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const wins = displayedTrades.filter(t => t.result === TradeResult.Win).length;
    const losses = displayedTrades.filter(t => t.result === TradeResult.Loss).length;
    const total = displayedTrades.length;
    const winRate =
      wins + losses > 0 ? `${((wins / (wins + losses)) * 100).toFixed(0)}%` : '—';
    const avgR =
      total > 0
        ? displayedTrades.reduce((s, t) => s + (t.realisedR ?? 0), 0) / total
        : null;
    const netPL = displayedTrades.reduce((s, t) => s + ((t.profitLoss ?? 0) - (t.commission ?? 0) - (t.swap ?? 0)), 0);
    return { total, winRate, avgR, netPL };
  }, [displayedTrades]);

  // ── Clear selection + detail on view/filter/account change ────────────────
  useEffect(() => {
    setSelectedTradeIds([]);
    setSelectedTrade(null);
  }, [currentView, dateFilter, customStartDate, customEndDate, activeAccount]);

  // ── Log-trade modal ────────────────────────────────────────────────────────
  const handleOpenAddTrade = useCallback(() => {
    if (isTrialExpired) {
      showUpgradeModal();
      return;
    }
    setEditingTrade(null);
    setAddTradeStep('form');
  }, [isTrialExpired, showUpgradeModal]);

  useEffect(() => {
    if (isAddTradeModalOpenRequest) {
      handleOpenAddTrade();
      clearAddTradeModalRequest();
    }
  }, [isAddTradeModalOpenRequest, clearAddTradeModalRequest, handleOpenAddTrade]);

  const handleOpenEditTrade = (trade: Trade) => {
    setEditingTrade(trade);
    setAddTradeStep('form');
  };

  const handleOpenTradeDetail = (trade: Trade, startInEditMode = false) => {
    setSelectedTrade(trade);
    setDetailInitialEdit(startInEditMode);
  };

  const handleCloseTradeDetail = () => {
    setSelectedTrade(null);
    setDetailInitialEdit(false);
  };

  const handleOpenCloseTrade = (trade: Trade) => {
    setClosingTrade(trade);
  };

  const closeModals = () => {
    setAddTradeStep('closed');
    setEditingTrade(null);
    setClosingTrade(null);
    setIsDeleteConfirmOpen(false);
  };

  // ── Bulk handlers ──────────────────────────────────────────────────────────
  const isAllSelected =
    displayedTrades.length > 0 && selectedTradeIds.length === displayedTrades.length;
  const isPartiallySelected = selectedTradeIds.length > 0 && !isAllSelected;

  const handleToggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedTradeIds(e.target.checked ? displayedTrades.map(t => t.id) : []);
  };

  const handleToggleSelect = (tradeId: string) => {
    setSelectedTradeIds(prev =>
      prev.includes(tradeId) ? prev.filter(id => id !== tradeId) : [...prev, tradeId]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedTradeIds.length === 0) return;
    try {
      await bulkDeleteTrades(selectedTradeIds);
      setSelectedTradeIds([]);
      setIsDeleteConfirmOpen(false);
    } catch (err: any) {
      console.error('Bulk delete error:', err);
      alert(`Failed to delete trades: ${err?.response?.data?.message || err?.message || 'Unknown error'}`);
    }
  };

  // ── Loading / no-account guard ─────────────────────────────────────────────
  const isLoading = isAccountLoading || isTradeLoading;

  // ── Render live/pending/calendar view content ──────────────────────────────
  const renderLivePendingContent = () => {
    if (isLoading) {
      return (
        <tr>
          <td colSpan={8} className="text-center p-8 text-jtp-textMuted">
            <Spinner />
          </td>
        </tr>
      );
    }
    if (!activeAccount) return null;

    if (currentView === 'live') {
      if (liveTrades.length === 0) {
        return (
          <tr>
            <td colSpan={8} className="text-center p-8 text-jtp-textMuted text-jtp-sm">
              No live trades in the market.
            </td>
          </tr>
        );
      }
      return liveTrades.map(t => (
        <LiveTradeRow
          key={t.id}
          trade={t}
          onEdit={() => handleOpenEditTrade(t)}
          onClose={() => handleOpenCloseTrade(t)}
        />
      ));
    }

    if (currentView === 'pending') {
      if (pendingTrades.length === 0) {
        return (
          <tr>
            <td colSpan={8} className="text-center p-8 text-jtp-textMuted text-jtp-sm">
              No pending orders.
            </td>
          </tr>
        );
      }
      return pendingTrades.map(t => (
        <PendingOrderRow key={t.id} trade={t} onEdit={() => handleOpenEditTrade(t)} />
      ));
    }

    return null;
  };

  // ── History table ──────────────────────────────────────────────────────────
  const renderHistoryContent = () => {
    if (isLoading) {
      return (
        <tr>
          <td colSpan={HISTORY_COLS.length} className="text-center p-8 text-jtp-textMuted">
            <Spinner />
          </td>
        </tr>
      );
    }
    if (!activeAccount) {
      return (
        <tr>
          <td colSpan={HISTORY_COLS.length} className="text-center p-16 text-jtp-textMuted">
            <p className="text-jtp-xl font-semibold text-jtp-text mb-2">
              Welcome to your Trade Journal
            </p>
            <p className="text-jtp-sm">Create or select a broker account to get started.</p>
          </td>
        </tr>
      );
    }
    if (displayedTrades.length === 0) {
      const isFiltered = searchQuery || filterSetup !== 'all' || filterResult !== 'all';
      if (isFiltered) {
        return (
          <tr>
            <td colSpan={HISTORY_COLS.length} className="text-center p-8 text-jtp-textMuted text-jtp-sm">
              No trades match your filters.
            </td>
          </tr>
        );
      }
      return (
        <tr>
          <td colSpan={HISTORY_COLS.length}>
            <EmptyState
              title="No trades yet"
              description="Import from your broker or add a trade manually."
              action={
                <div className="flex items-center justify-center gap-3">
                  <Button
                    onClick={() => setIsImportModalOpen(true)}
                    className="w-auto flex items-center gap-2"
                  >
                    <ImportIcon className="w-4 h-4" />
                    Import trades
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleOpenAddTrade}
                    className="w-auto"
                  >
                    Add manually
                  </Button>
                </div>
              }
            />
          </td>
        </tr>
      );
    }
    return displayedTrades.map(trade => (
      <JtpHistoryRow
        key={trade.id}
        trade={trade}
        onViewDetail={handleOpenTradeDetail}
        isSelected={selectedTradeIds.includes(trade.id)}
        onSelect={handleToggleSelect}
      />
    ));
  };

  return (
    <>
      {/* Sub-tab bar — escapes the parent px-5 py-[18px] padding */}
      <div className="-mx-5 -mt-[18px] bg-jtp-shell px-5 overflow-x-auto no-scrollbar">
        <Tabs
          tabs={[
            { id: 'live',     label: 'Live',     badge: liveTrades.length },
            { id: 'pending',  label: 'Pending',  badge: pendingTrades.length },
            { id: 'history',  label: 'History',  badge: filteredClosedTrades.length },
            { id: 'calendar', label: 'Calendar' },
          ]}
          active={currentView}
          onChange={(id) => setCurrentView(id as TradeView)}
        />
      </div>

      {/* Smart limit / objective warning banner */}
      {(isObjectiveBlocked || isSmartLimitBlocked) && blockReason && (
        <div className="mt-4 px-3 py-2 bg-jtp-warning/10 border border-jtp-warning/30 rounded-jtp-xl text-jtp-xs text-jtp-warning">
          Warning: {blockReason}
        </div>
      )}

      {/* ── TRADE DETAIL FULL VIEW ───────────────────────────────────────── */}
      {selectedTrade && (
        <div className="mt-4">
          <TradeDetail
            trade={selectedTrade}
            initialEditMode={detailInitialEdit}
            onBack={handleCloseTradeDetail}
          />
        </div>
      )}

      {/* ── HISTORY VIEW ─────────────────────────────────────────────────── */}
      {currentView === 'history' && !selectedTrade && (
        <>
          {/* ── Summary strip ──────────────────────────────────────────────── */}
          {activeAccount && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <StatTile
                label="NET P&L"
                value={fmtPL(summary.netPL)}
                valueColor={
                  summary.netPL > 0
                    ? 'text-jtp-profit'
                    : summary.netPL < 0
                    ? 'text-jtp-loss'
                    : 'text-jtp-text'
                }
                subValue={`${summary.total} trade${summary.total !== 1 ? 's' : ''}`}
              />
              <StatTile
                label="WIN RATE"
                value={summary.winRate}
                subValue="closed"
              />
              <StatTile
                label="TRADES"
                value={String(summary.total)}
                subValue={
                  dateFilter === 'all-time'
                    ? 'all time'
                    : dateFilter === 'custom-range'
                    ? 'custom range'
                    : dateFilter.replace(/-/g, ' ')
                }
              />
              <StatTile
                label="AVG R"
                value={
                  summary.avgR != null
                    ? summary.avgR > 0
                      ? `▲ +${summary.avgR.toFixed(2)} R`
                      : summary.avgR < 0
                      ? `▼ ${summary.avgR.toFixed(2)} R`
                      : `${summary.avgR.toFixed(2)} R`
                    : '—'
                }
                valueColor={
                  summary.avgR != null && summary.avgR > 0
                    ? 'text-jtp-profit'
                    : summary.avgR != null && summary.avgR < 0
                    ? 'text-jtp-loss'
                    : 'text-jtp-text'
                }
              />
            </div>
          )}

          {/* ── Filter bar ─────────────────────────────────────────────────── */}
          <div className={`bg-jtp-control border border-jtp-border rounded-[2px] px-3 py-2 flex items-center gap-2.5 flex-wrap ${activeAccount ? 'mt-3' : 'mt-4'}`}>
            {/* Search */}
            <div className="flex items-center gap-2 px-[9px] py-[5px] bg-jtp-raised border border-jtp-borderStrong rounded-[2px] min-w-[200px] flex-1 max-w-[300px]">
              <span className="text-jtp-textDim text-jtp-lg">⌕</span>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search asset, setup, mistake…"
                className="bg-transparent border-none outline-none text-jtp-text text-jtp-base-minus flex-1 placeholder:text-jtp-textFaint"
              />
            </div>

            {/* Setup filter */}
            <select
              value={filterSetup}
              onChange={e => setFilterSetup(e.target.value)}
              className="px-[10px] py-[7px] bg-jtp-control border border-jtp-borderStrong rounded-jtp-xl text-jtp-textSoft text-jtp-base-minus cursor-pointer outline-none"
            >
              <option value="all">All setups</option>
              {setupOptions.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            {/* Result filter */}
            <SegmentedControl
              segments={[
                { value: 'all',  label: 'All' },
                { value: 'win',  label: 'Wins' },
                { value: 'loss', label: 'Losses' },
              ]}
              value={filterResult}
              onChange={(v) => setFilterResult(v as ResultFilter)}
            />

            <div className="flex-1" />

            {/* Date filter */}
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value as DateFilter)}
              className="px-[10px] py-[7px] bg-jtp-control border border-jtp-borderStrong rounded-jtp-xl text-jtp-textMuted text-jtp-base-minus cursor-pointer outline-none"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this-week">This Week</option>
              <option value="this-month">This Month</option>
              <option value="all-time">All Time</option>
              <option value="custom-range">Custom Range</option>
            </select>

            {/* Placeholder Columns button */}
            <button
              className="flex items-center gap-1.5 px-[11px] py-[7px] bg-jtp-control border border-jtp-borderStrong rounded-jtp-xl text-jtp-textMuted text-jtp-base-minus cursor-pointer hover:border-jtp-borderHover transition-colors"
              title="Column visibility (coming soon)"
            >
              ▦ Columns
            </button>

            {/* Import button */}
            <button
              onClick={() => setIsImportModalOpen(true)}
              disabled={!activeAccount}
              className="flex items-center gap-1.5 px-[11px] py-[7px] bg-jtp-control border border-jtp-borderStrong rounded-jtp-xl text-jtp-textMuted text-jtp-base-minus cursor-pointer hover:border-jtp-borderHover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ImportIcon className="w-3.5 h-3.5" />
              Import
            </button>
          </div>

          {/* Custom date range inputs */}
          {dateFilter === 'custom-range' && (
            <div className="flex items-center gap-3 pt-2">
              <div>
                <label className="block text-jtp-xs text-jtp-textFaint mb-1">From</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  className="bg-jtp-control border border-jtp-borderStrong rounded-jtp-xl px-3 py-1.5 text-jtp-base-minus text-jtp-text outline-none focus:border-jtp-blue"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div>
                <label className="block text-jtp-xs text-jtp-textFaint mb-1">To</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  className="bg-jtp-control border border-jtp-borderStrong rounded-jtp-xl px-3 py-1.5 text-jtp-base-minus text-jtp-text outline-none focus:border-jtp-blue"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>
          )}

          {/* Bulk selection action bar */}
          {selectedTradeIds.length > 0 && (
            <div className="mt-3 flex items-center justify-between px-3 py-2 bg-jtp-blue/10 border border-jtp-blue/20 rounded-jtp-xl">
              <span className="text-jtp-sm font-semibold text-jtp-text">
                {selectedTradeIds.length} trade{selectedTradeIds.length !== 1 ? 's' : ''} selected
              </span>
              <Button
                onClick={() => setIsDeleteConfirmOpen(true)}
                variant="danger"
                className="w-auto flex items-center gap-2 px-3 py-1.5 text-sm"
              >
                <TrashIcon className="w-4 h-4" />
                Delete Selected
              </Button>
            </div>
          )}

          {/* History table */}
          <Panel label="TRADE LOG" noPadding className="mt-3.5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-jtp-base">
                <thead>
                  <tr className="bg-jtp-raised border-b border-jtp-borderStrong">
                    {/* Checkbox select-all */}
                    <th className="px-3 w-8">
                      <Checkbox
                        id="select-all"
                        onChange={handleToggleSelectAll}
                        checked={isAllSelected}
                        indeterminate={isPartiallySelected}
                        disabled={displayedTrades.length === 0}
                      />
                    </th>
                    {HISTORY_COLS.slice(1).map(col => (
                      <th
                        key={col.label}
                        className={`px-3 py-[9px] jtp-label font-medium whitespace-nowrap ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        } ${col.className ?? ''}`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>{renderHistoryContent()}</tbody>
                {/* Footer summary — 14 cols total (checkbox + 13 from HISTORY_COLS.slice(1)) */}
                {!isLoading && activeAccount && displayedTrades.length > 0 && (
                  <tfoot>
                    <tr className="bg-jtp-raised border-t border-jtp-borderStrong">
                      {/* DATE + ASSET + DIR + SETUP + ENTRY→EXIT + SIZE = cols 1-6, summary label */}
                      <td colSpan={7} className="px-3 py-[11px] text-jtp-xs text-jtp-textDim">
                        {summary.total} trade{summary.total !== 1 ? 's' : ''} · win rate{' '}
                        {summary.winRate}
                      </td>
                      {/* PLAN R label */}
                      <td className="px-3 py-[11px] text-right text-jtp-xs text-jtp-textFaint">
                        AVG R
                      </td>
                      {/* REAL R value */}
                      <td
                        className={`px-3 py-[11px] text-right font-mono font-semibold text-jtp-base-minus tabular-nums ${
                          summary.avgR != null && summary.avgR > 0
                            ? 'text-jtp-profit'
                            : summary.avgR != null && summary.avgR < 0
                            ? 'text-jtp-loss'
                            : 'text-jtp-textDim'
                        }`}
                      >
                        {summary.avgR != null
                          ? summary.avgR > 0
                            ? `▲ +${summary.avgR.toFixed(2)} R`
                            : summary.avgR < 0
                            ? `▼ ${summary.avgR.toFixed(2)} R`
                            : `${summary.avgR.toFixed(2)} R`
                          : '—'}
                      </td>
                      {/* RESULT — blank */}
                      <td />
                      {/* NET P&L total */}
                      <td
                        className={`px-3 py-[11px] text-right font-mono font-semibold text-jtp-base-minus tabular-nums ${
                          summary.netPL > 0
                            ? 'text-jtp-profit'
                            : summary.netPL < 0
                            ? 'text-jtp-loss'
                            : 'text-jtp-textDim'
                        }`}
                      >
                        {fmtPL(summary.netPL)}
                      </td>
                      {/* ADH + MISTAKES + ACTIONS */}
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Panel>
        </>
      )}

      {/* ── CALENDAR VIEW ────────────────────────────────────────────────── */}
      {currentView === 'calendar' && !selectedTrade && <CalendarHeatmap closedTrades={closedTrades} />}

      {/* ── LIVE / PENDING VIEW ──────────────────────────────────────────── */}
      {(currentView === 'live' || currentView === 'pending') && !selectedTrade && (
        <>
          {!activeAccount && !isLoading && (
            <Panel label={currentView === 'live' ? 'LIVE TRADES' : 'PENDING ORDERS'} className="mt-4">
              <EmptyState
                title="No account selected"
                description="Create or select a broker account to get started."
              />
            </Panel>
          )}
          {(activeAccount || isLoading) && (
            <Panel
              label={currentView === 'live' ? 'LIVE TRADES' : 'PENDING ORDERS'}
              noPadding
              className="mt-4"
            >
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-jtp-base-minus">
                  <thead>
                    <tr className="bg-jtp-raised border-b border-jtp-borderStrong">
                      {(currentView === 'live'
                        ? ['', 'DATE', 'ASSET', 'DIRECTION', 'ENTRY PRICE', 'RISK %', 'SL / TP', 'ACTIONS']
                        : ['', 'DATE CREATED', 'ASSET', 'DIRECTION', 'ENTRY PRICE', 'RISK %', 'PLAYBOOK', 'ACTIONS']
                      ).map(h => (
                        <th
                          key={h}
                          className="px-3 py-[9px] text-left jtp-label font-medium whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>{renderLivePendingContent()}</tbody>
                </table>
              </div>
            </Panel>
          )}
        </>
      )}

      {/* ── MODALS ───────────────────────────────────────────────────────── */}
      {addTradeStep === 'form' && (
        <TradeFormModal
          isOpen
          onClose={closeModals}
          tradeToEdit={editingTrade}
          onSuccess={closeModals}
        />
      )}

      {closingTrade && (
        <CloseTradeModal tradeToClose={closingTrade} onClose={closeModals} />
      )}

      {isDeleteConfirmOpen && (
        <Modal title="Confirm Deletion" onClose={closeModals} size="md">
          <div className="text-center">
            <p className="text-jtp-textMuted text-jtp-sm">
              Are you sure you want to permanently delete{' '}
              {selectedTradeIds.length} trade{selectedTradeIds.length !== 1 ? 's' : ''}?
            </p>
            <p className="text-jtp-xs text-jtp-loss mt-2">This action cannot be undone.</p>
            <div className="mt-6 flex justify-center gap-4">
              <Button onClick={closeModals} variant="secondary" className="w-auto">
                Cancel
              </Button>
              <Button onClick={handleDeleteSelected} variant="danger" className="w-auto">
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {isImportModalOpen && activeAccount && (
        <ImportTradesModal
          account={activeAccount}
          onClose={() => setIsImportModalOpen(false)}
        />
      )}
    </>
  );
};

export default TradeJournal;
