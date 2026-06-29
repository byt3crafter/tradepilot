"use client";
/**
 * QuantAutoBotPanel — autonomous Polymarket bot dashboard.
 *
 * Sections:
 *  1. Honesty banner (real money)
 *  2. Trade/Auto mode toggle + BOT LIVE indicator
 *  3. Bot wallet card (address, balances, fund note, withdraw)
 *  4. Safety / limits card (editable limits, KILL SWITCH)
 *  5. Live stats (StatTiles)
 *  6. Live trades table
 *
 * Polls status + trades every 20 s.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { AutobotStatus, AutobotTrade } from '../../types';
import {
  Panel,
  StatTile,
  Badge,
  SegmentedControl,
  EmptyState,
  Skeleton,
  Button,
} from '../ui';
import type { Segment } from '../ui';
import DataTable from '../ui/DataTable';
import type { TableColumn } from '../ui/DataTable';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtUsd = (n: number, decimals = 2) => {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(decimals)}`;
};

const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const fmtTimestamp = () => {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

const pnlColor = (v: number | null | undefined) => {
  if (v === null || v === undefined || v === 0) return 'text-jtp-textMuted';
  return v > 0 ? 'text-[#3ddc84]' : 'text-[#ff5b52]';
};

const MODE_SEGS: Segment<'off' | 'auto'>[] = [
  { value: 'off',  label: 'Manual (off)' },
  { value: 'auto', label: 'AUTO — bot trades' },
];

const STATUS_VARIANT: Record<AutobotTrade['status'], 'neutral' | 'info' | 'profit' | 'loss' | 'warning'> = {
  pending:  'neutral',
  placed:   'info',
  filled:   'warning',
  failed:   'loss',
  resolved: 'profit',
};

const SIGNAL_LABELS: Record<string, string> = {
  arb:  'ARB',
  ai:   'AI',
  copy: 'COPY',
};

// ─── Small inline spinner ──────────────────────────────────────────────────────

const Spin: React.FC = () => (
  <svg
    className="animate-spin w-3.5 h-3.5 text-jtp-textDim inline"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

// ─── Copy button ───────────────────────────────────────────────────────────────

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => { /* ignore */ });
  };
  return (
    <button
      type="button"
      onClick={copy}
      title="Copy address"
      className="ml-1.5 font-mono text-jtp-2xs text-jtp-textDim hover:text-jtp-amber transition-colors px-1.5 py-0.5 border border-jtp-borderStrong rounded-[2px] select-none"
      aria-label="Copy wallet address"
    >
      {copied ? 'COPIED' : 'COPY'}
    </button>
  );
};

// ─── Withdraw modal ────────────────────────────────────────────────────────────

const WithdrawModal: React.FC<{
  onClose: () => void;
  onWithdraw: (to: string) => Promise<void>;
}> = ({ onClose, onWithdraw }) => {
  const [addr, setAddr] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ txHash: string; amount: number } | null>(null);

  const isValid = /^0x[a-fA-F0-9]{40}$/.test(addr.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) { setErr('Enter a valid 0x address.'); return; }
    setBusy(true);
    setErr(null);
    try {
      await onWithdraw(addr.trim());
      onClose();
    } catch (ex: any) {
      setErr(ex?.message || 'Withdraw failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label="Withdraw funds"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-jtp-panel border border-jtp-border rounded-[2px] w-full max-w-sm mx-4 overflow-hidden"
           style={{ borderTop: '2px solid rgba(232,162,61,0.55)' }}>
        <header className="flex items-center justify-between px-4 py-3 border-b border-jtp-border">
          <span className="jtp-label tracking-widest">WITHDRAW ALL USDC.e</span>
          <button type="button" onClick={onClose} aria-label="Close"
                  className="text-jtp-textDim hover:text-jtp-text text-lg leading-none">×</button>
        </header>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <p className="text-jtp-md text-jtp-textMuted">
            Withdraws the full USDC.e balance to the address you specify (on Polygon).
          </p>
          <div>
            <label className="jtp-label block mb-1" htmlFor="withdraw-addr">
              DESTINATION ADDRESS (0x…)
            </label>
            <input
              id="withdraw-addr"
              type="text"
              value={addr}
              onChange={(e) => setAddr(e.target.value)}
              placeholder="0x…"
              spellCheck={false}
              autoComplete="off"
              className="w-full bg-jtp-bg border border-jtp-borderStrong rounded-[2px] px-2.5 py-2 text-jtp-xs font-mono text-jtp-text placeholder:text-jtp-textDim focus:outline-none focus:border-jtp-borderFocus transition-colors"
            />
          </div>
          {err && <p role="alert" className="text-jtp-xs text-[#ff5b52]">{err}</p>}
          {result && (
            <p className="text-jtp-xs text-[#3ddc84] font-mono break-all">
              Sent! tx: {result.txHash} · {fmtUsd(result.amount)}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" onClick={onClose} type="button" className="flex-1">Cancel</Button>
            <Button variant="danger" type="submit" isLoading={busy} disabled={!isValid || busy} className="flex-1">
              Withdraw
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Limits editor ─────────────────────────────────────────────────────────────

interface LimitsState {
  maxTotalUsd: string;
  maxPerTradeUsd: string;
  dailyLossLimitUsd: string;
}

const LimitsEditor: React.FC<{
  limits: AutobotStatus['limits'];
  onSave: (limits: { maxTotalUsd?: number; maxPerTradeUsd?: number; dailyLossLimitUsd?: number }) => Promise<void>;
}> = ({ limits, onSave }) => {
  const [vals, setVals] = useState<LimitsState>({
    maxTotalUsd: String(limits.maxTotalUsd),
    maxPerTradeUsd: String(limits.maxPerTradeUsd),
    dailyLossLimitUsd: String(limits.dailyLossLimitUsd),
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Sync from upstream if limits prop changes
  const prevLimits = useRef(limits);
  useEffect(() => {
    if (
      prevLimits.current.maxTotalUsd !== limits.maxTotalUsd ||
      prevLimits.current.maxPerTradeUsd !== limits.maxPerTradeUsd ||
      prevLimits.current.dailyLossLimitUsd !== limits.dailyLossLimitUsd
    ) {
      prevLimits.current = limits;
      setVals({
        maxTotalUsd: String(limits.maxTotalUsd),
        maxPerTradeUsd: String(limits.maxPerTradeUsd),
        dailyLossLimitUsd: String(limits.dailyLossLimitUsd),
      });
    }
  }, [limits]);

  const handleSave = async () => {
    const maxTotalUsd = parseFloat(vals.maxTotalUsd);
    const maxPerTradeUsd = parseFloat(vals.maxPerTradeUsd);
    const dailyLossLimitUsd = parseFloat(vals.dailyLossLimitUsd);
    if ([maxTotalUsd, maxPerTradeUsd, dailyLossLimitUsd].some(isNaN)) {
      setErr('All limits must be valid numbers.');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await onSave({ maxTotalUsd, maxPerTradeUsd, dailyLossLimitUsd });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (ex: any) {
      setErr(ex?.message || 'Failed to save limits.');
    } finally {
      setSaving(false);
    }
  };

  const field = (
    id: keyof LimitsState,
    label: string,
    helpText: string,
  ) => (
    <div className="flex flex-col gap-1">
      <label className="jtp-label" htmlFor={`limit-${id}`}>{label}</label>
      <div className="flex items-center gap-1">
        <span className="font-mono text-jtp-textDim text-jtp-xs">$</span>
        <input
          id={`limit-${id}`}
          type="number"
          min="0"
          step="any"
          value={vals[id]}
          onChange={(e) => setVals((v) => ({ ...v, [id]: e.target.value }))}
          className="w-full bg-jtp-bg border border-jtp-borderStrong rounded-[2px] px-2.5 py-1.5 text-jtp-xs font-mono text-jtp-text focus:outline-none focus:border-jtp-borderFocus transition-colors"
          aria-describedby={`limit-${id}-help`}
        />
      </div>
      <span id={`limit-${id}-help`} className="text-jtp-2xs text-jtp-textFaint font-mono">{helpText}</span>
    </div>
  );

  return (
    <div className="space-y-3">
      {field('maxPerTradeUsd', 'MAX PER TRADE', 'Maximum USDC.e per single trade')}
      {field('maxTotalUsd', 'MAX TOTAL EXPOSURE', 'Total open exposure cap')}
      {field('dailyLossLimitUsd', 'DAILY LOSS LIMIT', 'Bot pauses if daily loss hits this')}
      {err && <p role="alert" className="text-jtp-xs text-[#ff5b52]">{err}</p>}
      <Button
        variant="secondary"
        onClick={handleSave}
        isLoading={saving}
        className="w-full"
      >
        {saved ? 'Saved' : saving ? 'Saving…' : 'Save Limits'}
      </Button>
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────

const QuantAutoBotPanel: React.FC = () => {
  const { getToken } = useAuth();

  const [status, setStatus] = useState<AutobotStatus | null>(null);
  const [trades, setTrades] = useState<AutobotTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [modeError, setModeError] = useState<string | null>(null);
  const [modeBusy, setModeBusy] = useState(false);
  const [killBusy, setKillBusy] = useState(false);
  const [killErr, setKillErr] = useState<string | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setLoadErr(null);
    try {
      const token = await getToken();
      const [st, tr] = await Promise.all([
        api.autobotStatus(token),
        api.autobotTrades(60, token),
      ]);
      setStatus(st);
      setTrades(Array.isArray(tr) ? tr : []);
      setLastUpdated(fmtTimestamp());
    } catch (ex: any) {
      setLoadErr(ex?.message || 'Could not load bot status.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(() => fetchAll({ silent: true }), 20_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchAll]);

  // ── Mode toggle ────────────────────────────────────────────────────────────

  const handleModeChange = async (newMode: 'off' | 'auto') => {
    if (!status || newMode === status.mode) return;
    setModeBusy(true);
    setModeError(null);
    try {
      const token = await getToken();
      const updated = await api.autobotSetMode(newMode, token);
      setStatus(updated);
    } catch (ex: any) {
      setModeError(ex?.message || 'Failed to change mode.');
    } finally {
      setModeBusy(false);
    }
  };

  // ── Kill ───────────────────────────────────────────────────────────────────

  const handleKill = async () => {
    setKillBusy(true);
    setKillErr(null);
    try {
      const token = await getToken();
      const updated = await api.autobotKill(token);
      setStatus(updated);
    } catch (ex: any) {
      setKillErr(ex?.message || 'Kill failed.');
    } finally {
      setKillBusy(false);
    }
  };

  // ── Limits ─────────────────────────────────────────────────────────────────

  const handleSetLimits = async (limits: { maxTotalUsd?: number; maxPerTradeUsd?: number; dailyLossLimitUsd?: number }) => {
    const token = await getToken();
    const updated = await api.autobotSetLimits(limits, token);
    setStatus(updated);
  };

  // ── Withdraw ───────────────────────────────────────────────────────────────

  const handleWithdraw = async (to: string) => {
    const token = await getToken();
    await api.autobotWithdraw(to, token);
    // Refresh balance after withdraw
    fetchAll({ silent: true });
  };

  // ─── Trades table columns ──────────────────────────────────────────────────

  const tradeCols: TableColumn<AutobotTrade>[] = [
    {
      key: 'createdAt',
      header: 'TIME',
      width: '70px',
      render: (v: string) => (
        <span className="font-mono text-jtp-2xs text-jtp-textDim">{fmtTime(v)}</span>
      ),
    },
    {
      key: 'signalType',
      header: 'SIGNAL',
      width: '56px',
      align: 'center',
      render: (v: string) => (
        <Badge variant="neutral" size="xs">
          {SIGNAL_LABELS[v] ?? v.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'title',
      header: 'MARKET / OUTCOME',
      render: (_v: string, row: AutobotTrade) => (
        <div className="min-w-0">
          <div className="font-mono text-jtp-xs text-jtp-text truncate max-w-[240px]" title={row.title}>
            {row.side} {row.outcome} @ {(row.price * 100).toFixed(0)}¢
          </div>
          <div className="font-mono text-jtp-2xs text-jtp-textDim truncate max-w-[240px]" title={row.title}>
            {row.title}
          </div>
        </div>
      ),
    },
    {
      key: 'sizeUsd',
      header: 'SIZE',
      align: 'right',
      mono: true,
      width: '60px',
      render: (v: number) => (
        <span className="font-mono text-jtp-xs">{fmtUsd(v)}</span>
      ),
    },
    {
      key: 'status',
      header: 'STATUS',
      align: 'center',
      width: '72px',
      render: (v: AutobotTrade['status']) => (
        <Badge variant={STATUS_VARIANT[v] ?? 'neutral'} size="xs">
          {v.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'pnlUsd',
      header: 'P&L',
      align: 'right',
      mono: true,
      width: '68px',
      render: (v: number | null | undefined, row: AutobotTrade) => {
        if (row.status !== 'resolved') {
          return <span className="text-jtp-textFaint font-mono text-jtp-xs">—</span>;
        }
        if (v === null || v === undefined) return <span className="text-jtp-textFaint font-mono text-jtp-xs">—</span>;
        return (
          <span className={`font-mono text-jtp-xs font-semibold ${pnlColor(v)}`}>
            {v >= 0 ? '+' : ''}{fmtUsd(v)}
          </span>
        );
      },
    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading && !status) {
    return (
      <div className="space-y-3">
        <Skeleton variant="block" className="h-14" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} variant="stat" />)}
        </div>
        <Skeleton variant="panel" className="h-24" />
        <Skeleton variant="panel" className="h-24" />
      </div>
    );
  }

  if (loadErr && !status) {
    return (
      <Panel label="AUTO BOT">
        <p role="alert" className="text-jtp-md text-[#ff5b52]">{loadErr}</p>
        <Button variant="secondary" onClick={() => fetchAll()} className="mt-3">Retry</Button>
      </Panel>
    );
  }

  const st = status!;
  const isAuto = st.mode === 'auto';

  return (
    <div className="flex flex-col gap-4 animate-jtp-fade-in">

      {/* ── 1. Honest banner ── */}
      <div
        className="rounded-[2px] border border-[rgba(232,162,61,0.4)] bg-[rgba(232,162,61,0.06)] px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-2"
        role="note"
      >
        <span className="font-mono text-[#e8a23d] text-jtp-xs font-semibold mt-0.5 flex-shrink-0">
          REAL MONEY — READ THIS
        </span>
        <p className="font-mono text-jtp-xs text-jtp-textMuted leading-relaxed">
          The bot trades autonomously from its isolated wallet — your main wallet is never touched,
          and the most you can lose is the balance you send here.
          Hard limits and a kill switch are enforced.
          Live execution is new — start with ~$20.
        </p>
      </div>

      {/* ── 2. Mode toggle ── */}
      <Panel label="BOT MODE">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
          <div className="flex-1">
            <SegmentedControl<'off' | 'auto'>
              segments={MODE_SEGS}
              value={st.mode}
              onChange={handleModeChange}
            />
          </div>
          <div className="flex items-center gap-3">
            {modeBusy && <Spin />}
            {isAuto && (
              <span
                className="flex items-center gap-1.5 font-mono text-jtp-xs font-semibold text-[#3ddc84]"
                aria-live="polite"
              >
                <span
                  className="inline-block w-2 h-2 rounded-full bg-[#3ddc84] animate-pulse"
                  aria-hidden="true"
                />
                BOT LIVE
              </span>
            )}
            {st.killSwitch && (
              <Badge variant="loss" size="sm">KILL SWITCH ON</Badge>
            )}
          </div>
        </div>
        {modeError && (
          <p role="alert" className="mt-2 text-jtp-xs text-[#ff5b52] font-mono">{modeError}</p>
        )}
      </Panel>

      {/* ── Two-column layout for wallet + limits ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── 3. Bot wallet card ── */}
        <Panel
          label="BOT WALLET"
          actions={
            <Button
              variant="secondary"
              onClick={() => setWithdrawOpen(true)}
              className="!px-3 !py-1.5 text-jtp-xs"
            >
              Withdraw
            </Button>
          }
        >
          {/* Address */}
          <div className="mb-4">
            <div className="jtp-label mb-1">ADDRESS (POLYGON)</div>
            <div className="flex items-center flex-wrap gap-1">
              <span
                className="font-mono text-jtp-xs text-jtp-text break-all"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {st.address}
              </span>
              <CopyButton text={st.address} />
            </div>
          </div>

          {/* Balances */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-jtp-bg border border-jtp-border rounded-[2px] px-3 py-3">
              <div className="jtp-label mb-1">USDC.e</div>
              <div
                className="font-mono font-bold text-jtp-2xl text-jtp-text"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {fmtUsd(st.balance.usdce)}
              </div>
            </div>
            <div className="bg-jtp-bg border border-jtp-border rounded-[2px] px-3 py-3">
              <div className="jtp-label mb-1">POL (GAS)</div>
              <div
                className="font-mono font-bold text-jtp-2xl text-jtp-text"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {st.balance.pol.toFixed(3)}
              </div>
            </div>
          </div>

          {/* Fund note */}
          <div className="rounded-[2px] border border-jtp-borderSubtle bg-jtp-bg px-3 py-2.5">
            <p className="font-mono text-jtp-xs text-jtp-textMuted leading-relaxed">
              <span className="text-jtp-text font-semibold">To fund:</span>{' '}
              send <span className="text-jtp-text">USDC.e</span> +
              ~$1 worth of <span className="text-jtp-text">POL</span> for gas on{' '}
              <span className="text-jtp-text">Polygon</span> to the address above.
            </p>
          </div>
        </Panel>

        {/* ── 4. Safety / limits card ── */}
        <Panel label="LIMITS &amp; KILL SWITCH">
          {/* KILL SWITCH — large, prominent */}
          <div className="mb-4">
            <Button
              variant="danger"
              onClick={handleKill}
              isLoading={killBusy}
              disabled={killBusy}
              className="w-full !py-3 text-jtp-base font-bold tracking-widest"
              aria-label="Emergency kill switch — stop all bot activity"
            >
              KILL SWITCH — STOP EVERYTHING NOW
            </Button>
            {st.killSwitch && (
              <p className="mt-1.5 font-mono text-jtp-xs text-[#ff5b52]">
                Kill switch is active. Bot is halted. Change mode to re-enable.
              </p>
            )}
            {killErr && (
              <p role="alert" className="mt-1.5 font-mono text-jtp-xs text-[#ff5b52]">{killErr}</p>
            )}
          </div>

          {/* Editable limits */}
          <LimitsEditor limits={st.limits} onSave={handleSetLimits} />
        </Panel>
      </div>

      {/* ── 5. Live stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatTile
          label="EXPOSURE"
          value={fmtUsd(st.exposureUsd)}
          valueColor="text-jtp-text"
        />
        <StatTile
          label="REALIZED P&amp;L"
          value={
            st.stats.realizedPnlUsd === 0
              ? '$0.00'
              : `${st.stats.realizedPnlUsd >= 0 ? '+' : ''}${fmtUsd(st.stats.realizedPnlUsd)}`
          }
          valueColor={pnlColor(st.stats.realizedPnlUsd)}
        />
        <StatTile
          label="WIN RATE"
          value={st.stats.resolved > 0 ? fmtPct(st.stats.winRate) : '—'}
          subValue={st.stats.resolved > 0 ? `${st.stats.wins}/${st.stats.resolved} resolved` : 'no resolved trades'}
        />
        <StatTile
          label="TRADES"
          value={String(st.stats.trades)}
          subValue={`${st.stats.resolved} resolved`}
        />
        <StatTile
          label="TODAY P&amp;L"
          value={
            st.daily.pnlUsd === 0
              ? '$0.00'
              : `${st.daily.pnlUsd >= 0 ? '+' : ''}${fmtUsd(st.daily.pnlUsd)}`
          }
          valueColor={pnlColor(st.daily.pnlUsd)}
          subValue={`spent ${fmtUsd(st.daily.spentUsd)} today`}
        />
      </div>

      {/* ── 6. Live trades table ── */}
      <Panel
        label="LIVE TRADES"
        noPadding
        actions={
          <span className="font-mono text-jtp-2xs text-jtp-textDim flex items-center gap-1.5">
            {loading ? (
              <>
                <Spin />
                <span>updating…</span>
              </>
            ) : lastUpdated ? (
              <>
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full bg-[#3ddc84]"
                  aria-hidden="true"
                />
                updated {lastUpdated}
              </>
            ) : null}
          </span>
        }
      >
        {trades.length === 0 ? (
          <EmptyState
            title="No trades yet"
            description="Fund the wallet and switch to AUTO to start trading."
          />
        ) : (
          <DataTable<AutobotTrade>
            columns={tradeCols}
            data={trades}
            keyFn={(t) => t.id}
            maxHeight="480px"
            emptyMessage="No trades yet — fund the wallet and switch to AUTO."
          />
        )}
      </Panel>

      {/* ── Withdraw modal ── */}
      {withdrawOpen && (
        <WithdrawModal
          onClose={() => setWithdrawOpen(false)}
          onWithdraw={handleWithdraw}
        />
      )}
    </div>
  );
};

export default QuantAutoBotPanel;
