import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useView } from '../context/ViewContext';
import api from '../services/api';
import { PmWallet, PmPosition, QuantVerdict } from '../types';
import QuantTerminal from '../components/quant/QuantTerminal';
import AiQuantPanel from '../components/quant/AiQuantPanel';
import WhatWorksPanel from '../components/quant/WhatWorksPanel';
import QuantArbPanel from '../components/quant/QuantArbPanel';
import QuantSignalsPanel from '../components/quant/QuantSignalsPanel';
import PolymarketTradePanel, { TradePrefill } from '../components/trade/PolymarketTradePanel';
import {
  Panel,
  StatTile,
  Badge,
  SegmentedControl,
  EmptyState,
  Skeleton,
  Button,
} from '../components/ui';
import type { Segment } from '../components/ui';

type QuantMode = 'signals' | 'leaderboard' | 'terminal' | 'trade' | 'learning' | 'arbitrage';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const truncateAddress = (addr: string) =>
  addr && addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;

const fmtMoney = (n: number) => {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
};

const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
const fmtNum = (n: number) => n.toLocaleString('en-US');
const profileUrl = (addr: string) => `https://polymarket.com/profile/${addr}`;
const isAddress = (s: string) => /^0x[a-fA-F0-9]{40}$/.test(s.trim());

// edge value (per-share, e.g. 0.049) → "4.9¢"
const fmtCents = (edgePerShare: number) => `${(edgePerShare * 100).toFixed(1)}¢`;
const edgeClass = (n: number) =>
  n > 0 ? 'text-jtp-profit' : n < 0 ? 'text-jtp-loss' : 'text-jtp-textMuted';

// Relative time from an ISO date string
const fmtRelTime = (iso: string | undefined): string => {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff)) return '—';
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
};

// ROI% label + color class (roiPct is already a percent number, e.g. 12.5 = 12.5%)
const fmtRoiLabel = (pct: number | undefined): string => {
  if (pct === undefined || pct === null || pct === 0) return '—';
  const glyph = pct > 0 ? '▲' : '▼';
  return `${glyph} ${Math.abs(pct).toFixed(1)}%`;
};
const roiColor = (pct: number | undefined): string => {
  if (pct === undefined || pct === null || pct === 0) return 'text-jtp-textDim';
  return pct > 0 ? 'text-jtp-profit' : 'text-jtp-loss';
};

// ─── Spinner ──────────────────────────────────────────────────────────────────

const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={`animate-spin text-jtp-textDim ${className ?? 'w-4 h-4'}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

// ─── Mode segments ────────────────────────────────────────────────────────────

const MODE_SEGMENTS: Segment<QuantMode>[] = [
  { value: 'signals',     label: 'Signals' },
  { value: 'leaderboard', label: 'Leaderboard' },
  { value: 'terminal',    label: 'Terminal' },
  { value: 'trade',       label: 'Trade' },
  { value: 'learning',    label: 'What Works' },
  { value: 'arbitrage',   label: 'Arbitrage' },
];

// ─── ChatGPT connection status ─────────────────────────────────────────────────

const ConnectChatGPT: React.FC = () => {
  const { getToken } = useAuth();
  const { navigateTo } = useView();

  const [statusLoading, setStatusLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [verdictAllowed, setVerdictAllowed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = await getToken();
        const s = await api.chatgptStatus(token);
        if (!active) return;
        setConnected(!!s.connected);
        setVerdictAllowed(!!s.permissions?.verdict);
      } catch {
        // leave as not-connected; surfaced below
      } finally {
        if (active) setStatusLoading(false);
      }
    })();
    return () => { active = false; };
  }, [getToken]);

  const goToSettings = () => navigateTo('settings', 'ai');

  if (statusLoading) return null;

  // Connected + verdict permitted: compact status chip.
  if (connected && verdictAllowed) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="profit" size="xs">AI Verdict ready</Badge>
        <button
          type="button"
          onClick={goToSettings}
          className="text-jtp-xs text-jtp-blue hover:underline font-mono"
        >
          Manage in Settings → AI
        </button>
      </div>
    );
  }

  // Connected but verdict permission is off.
  if (connected && !verdictAllowed) {
    return (
      <Panel label="AI VERDICT" actions={
        <Button variant="secondary" onClick={goToSettings}>Settings → AI</Button>
      }>
        <p className="text-jtp-md text-jtp-textMuted">
          ChatGPT connected but{' '}
          <span className="text-jtp-text font-medium">AI Verdict</span> is off. Enable it in settings.
        </p>
      </Panel>
    );
  }

  // Not connected.
  return (
    <Panel label="AI VERDICT" actions={
      <Button variant="primary" onClick={goToSettings}>Connect in Settings → AI</Button>
    }>
      <p className="text-jtp-md text-jtp-textMuted">
        Connect ChatGPT in{' '}
        <span className="text-jtp-text font-medium">Settings → AI</span> to enable verdicts.
      </p>
    </Panel>
  );
};

// ─── AI Verdict section ───────────────────────────────────────────────────────

const VERDICT_VARIANT: Record<QuantVerdict['verdict'], 'profit' | 'warning' | 'loss'> = {
  COPY: 'profit',
  WATCH: 'warning',
  AVOID: 'loss',
};

/**
 * AiVerdictSection — renders the run/re-run verdict UI.
 *
 * @param inPanel when true, omits the outer border-t / bg-jtp-bg chrome that
 *   was designed for rendering inside WalletCard. Use inPanel when placing
 *   inside a Panel with noPadding.
 */
const AiVerdictSection: React.FC<{ address: string; inPanel?: boolean }> = ({
  address,
  inPanel = false,
}) => {
  const { getToken } = useAuth();
  const { navigateTo } = useView();
  const [loading, setLoading] = useState(false);
  const [verdict, setVerdict] = useState<QuantVerdict | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsConnect, setNeedsConnect] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNeedsConnect(false);
    setVerdict(null);
    try {
      const token = await getToken();
      const v = await api.quantVerdict(address, token);
      setVerdict(v);
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.includes('CHATGPT_NOT_CONNECTED')) {
        setNeedsConnect(true);
      } else if (msg.includes('≥15 closed')) {
        setError('Not enough closed positions for a verdict.');
      } else {
        setError(msg || 'Could not generate a verdict. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [address, getToken]);

  const outerCls = inPanel
    ? 'px-4 py-4'
    : 'px-5 py-4 border-t border-jtp-border bg-jtp-bg';

  return (
    <div className={`${outerCls} space-y-3`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          {!inPanel && (
            <h3 className="text-jtp-lg font-semibold text-jtp-text">AI Verdict</h3>
          )}
          <p className="text-jtp-md text-jtp-textDim mt-0.5">
            Is the edge <span className="italic">copyable</span> — or speed, insider, or luck?
          </p>
        </div>
        <Button variant="secondary" onClick={run} isLoading={loading}>
          {loading ? 'Analyzing…' : verdict ? 'Re-run' : 'Run AI Verdict'}
        </Button>
      </div>

      {needsConnect && (
        <p className="text-jtp-md text-jtp-warning">
          <button
            type="button"
            onClick={() => navigateTo('settings', 'ai')}
            className="hover:underline font-medium"
          >
            Connect ChatGPT / Codex in Settings → AI
          </button>{' '}
          to run verdicts.
        </p>
      )}

      {error && (
        <p role="alert" className="text-jtp-md text-jtp-loss">{error}</p>
      )}

      {verdict && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={VERDICT_VARIANT[verdict.verdict]} size="sm">
              {verdict.verdict}
            </Badge>
            <Badge variant="neutral" size="xs">{verdict.edgeType}</Badge>
            <span className="text-jtp-md text-jtp-textMuted flex items-center gap-1">
              Copyable:{' '}
              <span className={verdict.copyable ? 'text-jtp-profit font-semibold' : 'text-jtp-loss font-semibold'}>
                {verdict.copyable ? '✓' : '✗'}
              </span>
            </span>
            <span className="text-jtp-md text-jtp-textDim">
              Confidence:{' '}
              <span className="text-jtp-textMuted font-medium capitalize">{verdict.confidence}</span>
            </span>
          </div>
          <p className="text-jtp-lg text-jtp-textMuted leading-relaxed">{verdict.summary}</p>
        </div>
      )}
    </div>
  );
};

// ─── Market focus chip ────────────────────────────────────────────────────────

const FocusChip: React.FC<{ label: string }> = ({ label }) =>
  label ? (
    <Badge variant="neutral" size="xs">{label}</Badge>
  ) : (
    <span className="text-jtp-textDim text-jtp-xs">—</span>
  );

// ─── Wallet open positions ─────────────────────────────────────────────────────

/**
 * WalletPositions — lists open positions for a given wallet address.
 *
 * @param inPanel when true, uses compact panel-body padding instead of the
 *   WalletCard-style border-t / bg-jtp-bg wrapper.
 */
const WalletPositions: React.FC<{
  address: string;
  onTrade: (p: PmPosition) => void;
  inPanel?: boolean;
}> = ({ address, onTrade, inPanel = false }) => {
  const { getToken } = useAuth();
  const [positions, setPositions] = useState<PmPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const token = await getToken();
        const data = await api.quantWalletPositions(address, token);
        if (!active) return;
        setPositions(Array.isArray(data) ? data.filter((p) => p && p.tokenId) : []);
      } catch (e: any) {
        if (active) setError(e?.message || 'Could not load positions.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [address, getToken]);

  const outerCls = inPanel
    ? 'px-3 py-3'
    : 'px-5 py-4 border-t border-jtp-border bg-jtp-bg';

  if (loading) {
    return (
      <div className={`${outerCls} flex items-center gap-2 text-jtp-textDim`}>
        <Spinner />
        <span className="text-jtp-md">Loading positions…</span>
      </div>
    );
  }

  if (error || positions.length === 0) {
    return (
      <div className={outerCls}>
        <p className="text-jtp-md text-jtp-textDim">
          {error ?? 'No open positions to mirror for this wallet.'}
        </p>
      </div>
    );
  }

  return (
    <div className={`${outerCls} space-y-2`}>
      {!inPanel && (
        <div className="flex items-center justify-between">
          <h3 className="text-jtp-lg font-semibold text-jtp-text">Open positions</h3>
          <span className="text-jtp-md text-jtp-textDim">Mirror a position into the Trade panel</span>
        </div>
      )}
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {positions.map((p, i) => (
          <div
            key={`${p.tokenId}-${i}`}
            className="flex items-center justify-between gap-2 rounded-[2px] border border-jtp-borderSubtle bg-jtp-panel px-2.5 py-2"
          >
            <div className="min-w-0">
              <div className="text-jtp-base-minus text-jtp-text truncate">{p.title || 'Untitled market'}</div>
              <div className="font-mono text-jtp-xs text-jtp-textDim truncate">
                {p.outcome || '—'}
                {typeof p.curPrice === 'number' ? ` · ${(p.curPrice * 100).toFixed(0)}¢` : ''}
                {typeof p.size === 'number' ? ` · ${fmtNum(Math.round(p.size))} sh` : ''}
              </div>
            </div>
            <Button
              variant="primary"
              className="flex-shrink-0 !px-2.5 !py-1 !text-jtp-xs"
              onClick={() => onTrade(p)}
            >
              Trade
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Edge leaderboard — compact vertical list (no horizontal scroll) ──────────

type RankedWallet = PmWallet & { _rank: number };

/** Portal popover rendered next to the hovered row (escapes overflow-y-auto clip) */
const WalletPopover: React.FC<{ wallet: RankedWallet; anchorRect: DOMRect }> = ({
  wallet,
  anchorRect,
}) => {
  const POPOVER_W = 264;
  const POPOVER_MAX_H = 340;
  const GAP = 8;

  // Prefer right of the row; flip left if viewport would clip
  let left = anchorRect.right + GAP;
  if (left + POPOVER_W > window.innerWidth - 8) {
    left = anchorRect.left - POPOVER_W - GAP;
  }
  left = Math.max(8, left);

  // Align top with row; shift up if it would overflow bottom
  let top = anchorRect.top;
  if (top + POPOVER_MAX_H > window.innerHeight - 8) {
    top = window.innerHeight - POPOVER_MAX_H - 8;
  }
  top = Math.max(8, top);

  const hasInvested = wallet.invested !== undefined && wallet.invested !== null && wallet.invested !== 0;
  const hasRoi = wallet.roiPct !== undefined && wallet.roiPct !== null && wallet.roiPct !== 0;

  type PopoverRow = [string, React.ReactNode];
  const rows: PopoverRow[] = [
    ['EDGE (95% LCB)', <span className={edgeClass(wallet.edgeLcb)}>{fmtCents(wallet.edgeLcb)}</span>],
    ['MEAN', <span className={edgeClass(wallet.meanEdge)}>{fmtCents(wallet.meanEdge)}</span>],
    ['$ EDGE', <span className={edgeClass(wallet.dollarEdge)}>{fmtCents(wallet.dollarEdge)}</span>],
    ['WIN%', `${(wallet.winRate * 100).toFixed(1)}%`],
    ['CLOSED · N_EFF', `${fmtNum(wallet.nClosed)} · ${fmtNum(wallet.nEff)}`],
    ['VOLUME', fmtMoney(wallet.volume)],
    ['DEPLOYED', hasInvested ? fmtMoney(wallet.invested!) : '—'],
    ['P&L', wallet.pnl === undefined || wallet.pnl === null
      ? '—'
      : <span className={!wallet.pnl ? 'text-jtp-textMuted' : wallet.pnl > 0 ? 'text-jtp-profit' : 'text-jtp-loss'}>{`${wallet.pnl >= 0 ? '+' : ''}${fmtMoney(wallet.pnl)}`}</span>],
    ['ROI', <span className={roiColor(wallet.roiPct)}>{fmtRoiLabel(wallet.roiPct)}</span>],
    ['FOCUS', wallet.marketFocus
      ? <Badge variant="neutral" size="xs">{wallet.marketFocus}</Badge>
      : <span className="text-jtp-textDim">—</span>],
    ['LAST', fmtRelTime(wallet.lastScanned)],
  ];

  return createPortal(
    <div
      className="fixed pointer-events-none z-[200]"
      style={{ left, top, width: POPOVER_W }}
    >
      <div
        className="bg-jtp-panel border border-jtp-border rounded-[2px] shadow-xl animate-jtp-fade-in overflow-hidden"
        style={{ borderTop: '2px solid rgba(232,162,61,0.7)' }}
      >
        {/* Mini header */}
        <div className="px-3 py-2 border-b border-jtp-border">
          <div className="font-mono text-jtp-xs font-semibold text-jtp-text truncate">
            {wallet.pseudonym || 'anon'}
          </div>
          <div className="font-mono text-jtp-2xs text-jtp-textDim truncate">
            {truncateAddress(wallet.address)}
          </div>
        </div>
        {/* Stats grid */}
        <div className="px-3 py-2 space-y-[5px]">
          {rows.map(([label, val]) => (
            <div key={label} className="flex items-center justify-between gap-3 min-w-0">
              <span className="font-mono text-jtp-2xs text-jtp-textDim uppercase tracking-wider whitespace-nowrap flex-shrink-0">
                {label}
              </span>
              <span className="font-mono text-jtp-xs text-jtp-text text-right min-w-0">
                {val}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
};

/** Dense vertical leaderboard list — no horizontal scroll, fits 220px column */
const EdgeLeaderboardList: React.FC<{
  wallets: RankedWallet[];
  selectedAddress: string | null;
  onSelect: (w: PmWallet) => void;
}> = ({ wallets, selectedAddress, onSelect }) => {
  const [hovered, setHovered] = useState<{ wallet: RankedWallet; rect: DOMRect } | null>(null);
  // Clear popover when list scrolls (rect would be stale)
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => setHovered(null);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div ref={listRef} className="overflow-y-auto max-h-[520px]">
      {wallets.map((w) => {
        const isSelected = w.address === selectedAddress;
        return (
          <button
            key={w.address}
            type="button"
            className={[
              'w-full text-left flex items-center gap-2 px-2.5 py-[7px]',
              'border-b border-jtp-borderSubtle transition-colors',
              'border-l-2',
              isSelected
                ? 'bg-jtp-active border-l-jtp-amber'
                : 'border-l-transparent hover:bg-jtp-active',
            ].join(' ')}
            onClick={() => onSelect(w)}
            onMouseEnter={(e) => setHovered({ wallet: w, rect: e.currentTarget.getBoundingClientRect() })}
            onMouseLeave={() => setHovered(null)}
            onFocus={(e) => setHovered({ wallet: w, rect: e.currentTarget.getBoundingClientRect() })}
            onBlur={() => setHovered(null)}
          >
            {/* Rank */}
            <span className="font-mono text-jtp-2xs text-jtp-textDim w-4 text-right flex-shrink-0 leading-none">
              {w._rank}
            </span>
            {/* Identity */}
            <div className="flex-1 min-w-0 leading-tight">
              <div className={`text-jtp-xs font-medium truncate ${isSelected ? 'text-jtp-amber' : 'text-jtp-text'}`}>
                {w.pseudonym || 'anon'}
              </div>
              <div className="font-mono text-jtp-2xs text-jtp-textDim truncate">
                {truncateAddress(w.address)}
              </div>
            </div>
            {/* ROI% */}
            <span className={`font-mono text-jtp-2xs font-semibold flex-shrink-0 text-right leading-none ${roiColor(w.roiPct)}`}>
              {fmtRoiLabel(w.roiPct)}
            </span>
          </button>
        );
      })}
      {hovered && <WalletPopover wallet={hovered.wallet} anchorRect={hovered.rect} />}
    </div>
  );
};

// ─── Wallet detail (center column component) ──────────────────────────────────

const WalletDetailCenter: React.FC<{
  wallet: PmWallet;
  onTrade: (p: PmPosition) => void;
}> = ({ wallet, onTrade }) => (
  <>
    {/* ── Identity + edge StatTiles ── */}
    <Panel
      label="WALLET DETAIL"
      actions={
        <a
          href={profileUrl(wallet.address)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-jtp-xs font-mono font-medium text-jtp-blue hover:underline"
        >
          Polymarket ↗
        </a>
      }
    >
      {/* Avatar + name + address header */}
      <div className="flex items-center gap-3 mb-4">
        {wallet.profileImage ? (
          <img
            src={wallet.profileImage}
            alt=""
            className="w-9 h-9 rounded-full bg-jtp-active object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-jtp-active flex-shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-jtp-lg font-semibold text-jtp-text truncate">
            {wallet.pseudonym || 'Unknown wallet'}
          </div>
          <div className="font-mono text-jtp-xs text-jtp-textDim truncate">
            {truncateAddress(wallet.address)}
          </div>
        </div>
        {!wallet.qualified && (
          <Badge variant="warning" size="xs">Unqualified · n&lt;15</Badge>
        )}
      </div>

      {/* Edge readouts as StatTiles */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        <StatTile
          label="EDGE (95% LCB)"
          value={fmtCents(wallet.edgeLcb)}
          valueColor={edgeClass(wallet.edgeLcb)}
        />
        <StatTile
          label="MEAN EDGE"
          value={fmtCents(wallet.meanEdge)}
          valueColor={edgeClass(wallet.meanEdge)}
        />
        <StatTile
          label="$ EDGE"
          value={fmtCents(wallet.dollarEdge)}
          valueColor={edgeClass(wallet.dollarEdge)}
        />
        <StatTile
          label="WIN RATE"
          value={fmtPct(wallet.winRate)}
          subValue="win rate ≠ edge"
        />
        <StatTile
          label="VOLUME"
          value={fmtMoney(wallet.volume)}
          valueColor="text-jtp-textMuted"
        />
        <StatTile
          label="CLOSED / N_EFF"
          value={fmtNum(wallet.nClosed)}
          subValue={`n_eff ${fmtNum(wallet.nEff)}`}
        />
        <StatTile
          label="DEPLOYED"
          value={wallet.invested && wallet.invested !== 0 ? fmtMoney(wallet.invested) : '—'}
          valueColor="text-jtp-textMuted"
          subValue="capital deployed"
        />
        <StatTile
          label="ROI"
          value={fmtRoiLabel(wallet.roiPct)}
          valueColor={roiColor(wallet.roiPct)}
          positive={
            wallet.roiPct === undefined || wallet.roiPct === null || wallet.roiPct === 0
              ? undefined
              : wallet.roiPct > 0
          }
        />
        <StatTile
          label="P&L"
          value={
            wallet.pnl === undefined || wallet.pnl === null
              ? '—'
              : `${wallet.pnl >= 0 ? '+' : ''}${fmtMoney(wallet.pnl)}`
          }
          valueColor={
            !wallet.pnl ? 'text-jtp-textMuted' : wallet.pnl > 0 ? 'text-jtp-profit' : 'text-jtp-loss'
          }
          subValue="net money made"
        />
      </div>

      {/* Market focus */}
      {wallet.marketFocus && (
        <div className="mt-4 flex items-center gap-2">
          <span className="jtp-label">MARKET FOCUS</span>
          <FocusChip label={wallet.marketFocus} />
        </div>
      )}

      {/* Provisional notice */}
      {!wallet.qualified && (
        <p className="text-jtp-xs text-jtp-textMuted mt-4">
          Not enough closed positions yet (n&lt;15) for a statistically meaningful edge. Treat this
          score as provisional.
        </p>
      )}
    </Panel>

    {/* ── AI Verdict ── */}
    <Panel label="AI VERDICT" noPadding>
      <AiVerdictSection key={wallet.address} address={wallet.address} inPanel />
    </Panel>

    {/* ── Open positions (mirror into Trade) ── */}
    <Panel label="OPEN POSITIONS" noPadding>
      <WalletPositions address={wallet.address} onTrade={onTrade} inPanel />
    </Panel>
  </>
);

// ─── Main QuantPage ───────────────────────────────────────────────────────────

const QuantPage: React.FC = () => {
  const { getToken } = useAuth();

  const [mode, setModeRaw] = useState<QuantMode>(() => {
    try { return (localStorage.getItem('jtp.quantMode') as QuantMode) || 'signals'; } catch { return 'signals'; }
  });
  const setMode = (m: QuantMode) => {
    setModeRaw(m);
    try { localStorage.setItem('jtp.quantMode', m); } catch { /* ignore */ }
  };
  const [stats, setStats] = useState<{ total: number; scanned: number; qualified: number } | null>(null);
  const [leaderboard, setLeaderboard] = useState<PmWallet[]>([]);
  const [loading, setLoading] = useState(true);

  const [scanInput, setScanInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<PmWallet | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Trade panel prefill (set when "Trade" is clicked on a wallet position).
  const [tradePrefill, setTradePrefill] = useState<TradePrefill | null>(null);

  const handleTradePosition = useCallback((p: PmPosition) => {
    setTradePrefill({
      tokenId: p.tokenId,
      price: typeof p.curPrice === 'number' ? p.curPrice : undefined,
      side: 'BUY',
      title: p.title,
      outcome: p.outcome,
    });
    setMode('trade');
  }, []);

  const handleArbTrade = useCallback((prefill: TradePrefill) => {
    setTradePrefill(prefill);
    setMode('trade');
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const [board, s] = await Promise.all([
        api.quantLeaderboard(50, token),
        api.quantStats(token),
      ]);
      setLeaderboard(board);
      setStats(s);
    } catch {
      // keep prior state; surfaced via empty states
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const handleScan = useCallback(
    async (addrArg?: string) => {
      const address = (addrArg ?? scanInput).trim();
      setScanError(null);
      if (!isAddress(address)) {
        setScanError('Enter a valid Polymarket wallet address (0x followed by 40 hex characters).');
        return;
      }
      setScanning(true);
      setScanResult(null);
      try {
        const token = await getToken();
        const wallet = await api.quantScan(address, token);
        setScanResult(wallet);
        load();
      } catch (e: any) {
        setScanError(e?.message || 'Could not scan that wallet. Please try again.');
      } finally {
        setScanning(false);
      }
    },
    [scanInput, getToken, load],
  );

  const handleRowClick = (wallet: PmWallet) => {
    setScanInput(wallet.address);
    setScanResult(wallet);
    setScanError(null);
  };

  // Pre-process leaderboard with rank field
  const rankedLeaderboard: RankedWallet[] = leaderboard.map((w, i) => ({ ...w, _rank: i + 1 }));

  return (
    <div className="flex flex-col gap-4 animate-jtp-fade-in">

      {/* ── Mode toggle ── */}
      <SegmentedControl
        segments={MODE_SEGMENTS}
        value={mode}
        onChange={setMode}
      />

      {mode === 'signals' ? (
        /* ── Signals — the "what to buy now" board ── */
        <QuantSignalsPanel onTrade={handleArbTrade} />

      ) : mode === 'terminal' ? (
        /* ── Terminal — dense existing dashboard, harmonised tokens ── */
        <QuantTerminal />

      ) : mode === 'trade' ? (
        /* ── Trade — three-column canvas handled inside PolymarketTradePanel ── */
        <>
          <div>
            <h1 className="text-jtp-2xl font-semibold text-jtp-text tracking-tight">
              Trade — Polymarket (non-custodial)
            </h1>
            <p className="text-jtp-lg text-jtp-textMuted mt-1.5 max-w-3xl">
              Connect your own Polygon wallet and place orders on Polymarket directly. You sign every
              action — JTradePilot never holds your keys or funds. Mirror a position from any scanned
              wallet, or paste a token id manually.
            </p>
          </div>
          <PolymarketTradePanel prefill={tradePrefill} />
        </>

      ) : mode === 'learning' ? (
        /* ── What Works — predictions vs outcomes transparency view ── */
        <WhatWorksPanel />

      ) : mode === 'arbitrage' ? (
        /* ── Arbitrage — live scanner of cross-market + settlement-lag arbs ── */
        <>
          <div>
            <h1 className="text-jtp-2xl font-semibold text-jtp-text tracking-tight">
              Arbitrage Scanner
            </h1>
            <p className="text-jtp-lg text-jtp-textMuted mt-1.5 max-w-3xl">
              Live scan for real arb opportunities on Polymarket — settlement-lag edges and
              cross-market NegRisk mismatches. Arbs are rare and often close within seconds.
              Click <span className="text-jtp-text font-medium">Trade</span> to prefill the
              trade ticket and execute manually.
            </p>
          </div>
          <QuantArbPanel onTrade={handleArbTrade} />
        </>

      ) : (
        /* ── Leaderboard — three-column canvas ── */
        <>
          {/* Header KPI StatTiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {loading && !stats ? (
              <>
                <Skeleton variant="stat" />
                <Skeleton variant="stat" />
                <Skeleton variant="stat" />
              </>
            ) : (
              <>
                <StatTile
                  label="TRACKED"
                  value={stats ? fmtNum(stats.total) : '—'}
                />
                <StatTile
                  label="SCANNED"
                  value={stats ? fmtNum(stats.scanned) : '—'}
                />
                <StatTile
                  label="QUALIFIED"
                  value={stats ? fmtNum(stats.qualified) : '—'}
                  subValue="≥15 closed"
                />
              </>
            )}
          </div>

          {/* ── Three-column canvas (stacks on mobile) ── */}
          <div className="flex flex-col lg:flex-row gap-3 lg:items-start">

            {/* LEFT — scan box + edge leaderboard */}
            <aside className="w-full lg:w-[220px] lg:flex-shrink-0 flex flex-col gap-3">

              {/* Compact scan input */}
              <Panel label="SCAN WALLET">
                <form
                  className="flex flex-col gap-2"
                  onSubmit={(e) => { e.preventDefault(); handleScan(); }}
                >
                  <input
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder="0x… address"
                    spellCheck={false}
                    autoComplete="off"
                    className="w-full bg-jtp-bg border border-jtp-borderStrong rounded-[2px] px-2.5 py-1.5 text-jtp-xs font-mono text-jtp-text placeholder:text-jtp-textDim focus:outline-none focus:border-jtp-borderFocus transition-colors"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={scanning}
                    className="w-full"
                  >
                    {scanning ? 'Scanning…' : 'Scan'}
                  </Button>
                </form>
                {scanError && (
                  <p role="alert" className="text-jtp-xs text-jtp-loss mt-2">{scanError}</p>
                )}
              </Panel>

              {/* Edge leaderboard — compact vertical list, no horizontal scroll */}
              <Panel
                label="EDGE LEADERBOARD"
                noPadding
                actions={
                  <span className="font-mono text-jtp-2xs text-jtp-textDim">by LCB</span>
                }
              >
                {loading ? (
                  <div className="flex items-center gap-2 py-8 px-3 text-jtp-textDim">
                    <Spinner className="w-3 h-3" />
                    <span className="text-jtp-xs">Loading…</span>
                  </div>
                ) : leaderboard.length === 0 ? (
                  <div className="px-3 py-6">
                    <p className="text-jtp-xs text-jtp-textDim text-center">
                      No qualified wallets yet. Scan an address above.
                    </p>
                  </div>
                ) : (
                  <EdgeLeaderboardList
                    wallets={rankedLeaderboard}
                    selectedAddress={scanResult?.address ?? null}
                    onSelect={handleRowClick}
                  />
                )}
              </Panel>
            </aside>

            {/* CENTER — selected wallet detail (StatTiles + AI verdict + positions) */}
            <main className="flex-1 min-w-0 flex flex-col gap-3">
              {scanResult ? (
                <WalletDetailCenter wallet={scanResult} onTrade={handleTradePosition} />
              ) : (
                <Panel label="QUANT — POLYMARKET EDGE INTELLIGENCE">
                  <p className="text-jtp-lg text-jtp-textMuted leading-relaxed">
                    We rank wallets by{' '}
                    <span className="text-jtp-text font-medium">realized edge per trade</span> — how
                    much they beat the market's implied price — using the 95% lower bound, with
                    correlated bets clustered. Win rate and raw PnL are noise; this surfaces the
                    rare{' '}
                    <span className="text-jtp-text font-medium italic">copyable</span> edge and
                    buries luck and insurance-sellers.
                  </p>
                  <div className="mt-4">
                    <EmptyState
                      title="No wallet selected"
                      description="Click a row in the leaderboard, or scan a Polymarket address on the left."
                    />
                  </div>
                </Panel>
              )}
            </main>

            {/* RIGHT — AI opportunities + strategy builder */}
            <aside className="w-full lg:w-[280px] lg:flex-shrink-0 flex flex-col gap-3">
              <ConnectChatGPT />
              <AiQuantPanel />
            </aside>

          </div>
        </>
      )}
    </div>
  );
};

export default QuantPage;
