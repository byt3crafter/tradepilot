import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useView } from '../context/ViewContext';
import api from '../services/api';
import { PmWallet, PmPosition, QuantVerdict } from '../types';
import QuantTerminal from '../components/quant/QuantTerminal';
import AiQuantPanel from '../components/quant/AiQuantPanel';
import PolymarketTradePanel, { TradePrefill } from '../components/trade/PolymarketTradePanel';
import {
  Panel,
  StatTile,
  DataTable,
  Badge,
  SegmentedControl,
  EmptyState,
  Skeleton,
  Button,
} from '../components/ui';
import type { TableColumn, Segment } from '../components/ui';

type QuantMode = 'leaderboard' | 'terminal' | 'trade';

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
  { value: 'leaderboard', label: 'Leaderboard' },
  { value: 'terminal',    label: 'Terminal' },
  { value: 'trade',       label: 'Trade' },
];

// ─── ChatGPT connection status (connect lives in Settings → AI) ───────────────

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
        // leave as not-connected; surfaced via the prompt below
      } finally {
        if (active) setStatusLoading(false);
      }
    })();
    return () => { active = false; };
  }, [getToken]);

  const goToSettings = () => navigateTo('settings', 'ai');

  if (statusLoading) return null;

  // Connected + verdict permitted: quiet "ready" chip.
  if (connected && verdictAllowed) {
    return (
      <div className="flex items-center gap-2 text-jtp-md text-jtp-textMuted">
        <Badge variant="profit" size="xs">AI Verdict ready</Badge>
        <span>
          Run an AI Verdict on any wallet below.{' '}
          <button type="button" onClick={goToSettings} className="text-jtp-blue hover:underline font-medium">
            Manage in Settings → AI
          </button>
        </span>
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
          ChatGPT/Codex is connected, but{' '}
          <span className="text-jtp-text font-medium">AI Verdict</span> is turned off. Enable it to
          run verdicts.
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
        Connect ChatGPT/Codex in{' '}
        <span className="text-jtp-text font-medium">Settings → AI</span> to enable verdicts.
      </p>
    </Panel>
  );
};

// ─── AI Verdict section (inside WalletCard) ───────────────────────────────────

const VERDICT_VARIANT: Record<QuantVerdict['verdict'], 'profit' | 'warning' | 'loss'> = {
  COPY: 'profit',
  WATCH: 'warning',
  AVOID: 'loss',
};

const AiVerdictSection: React.FC<{ address: string }> = ({ address }) => {
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

  return (
    <div className="px-5 py-4 border-t border-jtp-border bg-jtp-bg space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-jtp-lg font-semibold text-jtp-text">AI Verdict</h3>
          <p className="text-jtp-md text-jtp-textDim mt-0.5">
            Is the edge <span className="italic">copyable</span> (mispricing) — or speed, insider,
            or luck?
          </p>
        </div>
        <Button variant="secondary" onClick={run} isLoading={loading}>
          {loading ? 'Analyzing…' : verdict ? 'Re-run AI Verdict' : 'AI Verdict'}
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

// ─── Wallet metric (scan result) ──────────────────────────────────────────────

const Metric: React.FC<{
  label: string;
  value: React.ReactNode;
  valueClass?: string;
  hint?: string;
}> = ({ label, value, valueClass, hint }) => (
  <div className="flex flex-col gap-1">
    <span className="jtp-label" title={hint}>{label}</span>
    <span className={`font-mono text-jtp-lg font-semibold ${valueClass ?? 'text-jtp-text'}`}>
      {value}
    </span>
  </div>
);

// ─── Wallet open positions (mirror / trade entry) ─────────────────────────────

const WalletPositions: React.FC<{ address: string; onTrade: (p: PmPosition) => void }> = ({
  address,
  onTrade,
}) => {
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

  if (loading) {
    return (
      <div className="px-5 py-4 border-t border-jtp-border bg-jtp-bg flex items-center gap-2 text-jtp-textDim">
        <Spinner />
        <span className="text-jtp-md">Loading open positions…</span>
      </div>
    );
  }

  if (error || positions.length === 0) {
    return (
      <div className="px-5 py-3 border-t border-jtp-border bg-jtp-bg">
        <p className="text-jtp-md text-jtp-textDim">
          {error ?? 'No open positions to mirror for this wallet.'}
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 border-t border-jtp-border bg-jtp-bg space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-jtp-lg font-semibold text-jtp-text">Open positions</h3>
        <span className="text-jtp-md text-jtp-textDim">Mirror a position into the Trade panel</span>
      </div>
      <div className="space-y-1.5 max-h-72 overflow-y-auto">
        {positions.map((p, i) => (
          <div
            key={`${p.tokenId}-${i}`}
            className="flex items-center justify-between gap-3 rounded-jtp-lg border border-jtp-borderSubtle bg-jtp-panel px-3 py-2"
          >
            <div className="min-w-0">
              <div className="text-jtp-lg text-jtp-text truncate">{p.title || 'Untitled market'}</div>
              <div className="text-jtp-md text-jtp-textDim truncate">
                {p.outcome || '—'}
                {typeof p.curPrice === 'number' ? ` · ${(p.curPrice * 100).toFixed(0)}¢` : ''}
                {typeof p.size === 'number' ? ` · ${fmtNum(Math.round(p.size))} sh` : ''}
              </div>
            </div>
            <Button
              variant="primary"
              className="flex-shrink-0 !px-3 !py-1.5 !text-jtp-xs"
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

// ─── Wallet card (scan result + leaderboard expand) ───────────────────────────

const WalletCard: React.FC<{ wallet: PmWallet; onTrade?: (p: PmPosition) => void }> = ({
  wallet,
  onTrade,
}) => (
  <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel overflow-hidden">
    {/* Header: avatar + name + address + Polymarket link */}
    <div className="px-5 py-4 border-b border-jtp-border flex items-center gap-3">
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
        <div className="font-mono text-jtp-md text-jtp-textDim truncate">
          {truncateAddress(wallet.address)}
        </div>
      </div>
      <a
        href={profileUrl(wallet.address)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-jtp-md font-medium text-jtp-blue hover:underline flex-shrink-0"
      >
        Polymarket ↗
      </a>
    </div>

    {/* Headline edge */}
    <div className="px-5 py-5 border-b border-jtp-border flex items-end justify-between gap-4 flex-wrap">
      <div className="flex flex-col gap-1">
        <span className="jtp-label">Realized edge (95% lower bound)</span>
        <span className={`font-mono text-jtp-4xl font-bold leading-none ${edgeClass(wallet.edgeLcb)}`}>
          {fmtCents(wallet.edgeLcb)}
          <span className="text-jtp-lg font-medium text-jtp-textDim ml-1.5">/ share</span>
        </span>
      </div>
      {!wallet.qualified && (
        <Badge variant="warning" size="sm">Unqualified · n&lt;15</Badge>
      )}
    </div>

    {/* Metrics grid */}
    <div className="px-5 py-5 grid grid-cols-2 sm:grid-cols-3 gap-y-5 gap-x-4">
      <Metric
        label="Mean edge"
        value={fmtCents(wallet.meanEdge)}
        valueClass={edgeClass(wallet.meanEdge)}
        hint="Mean realized edge per share (not luck-adjusted)"
      />
      <Metric
        label="$ Edge"
        value={fmtCents(wallet.dollarEdge)}
        valueClass={edgeClass(wallet.dollarEdge)}
        hint="Notional-weighted edge — do they make money at size?"
      />
      <Metric
        label="Closed"
        value={
          <>
            {fmtNum(wallet.nClosed)}
            <span className="text-jtp-md text-jtp-textDim ml-1.5">n_eff {fmtNum(wallet.nEff)}</span>
          </>
        }
        hint="Closed positions scored · effective clustered sample"
      />
      <Metric
        label="Win rate"
        value={<span className="text-jtp-textMuted">{fmtPct(wallet.winRate)}</span>}
        hint="win rate ≠ edge — insurance-sellers win often but bleed"
      />
      <Metric label="Volume" value={fmtMoney(wallet.volume)} valueClass="text-jtp-textMuted" />
      <div className="flex flex-col gap-1">
        <span className="jtp-label">Market focus</span>
        <span className="mt-0.5">
          <FocusChip label={wallet.marketFocus} />
        </span>
      </div>
    </div>

    {!wallet.qualified && (
      <div className="px-5 py-3 border-t border-jtp-border bg-jtp-bg">
        <p className="text-jtp-md text-jtp-textMuted">
          Not enough closed positions yet (n&lt;15) for a statistically meaningful edge. Treat this
          score as provisional.
        </p>
      </div>
    )}

    <AiVerdictSection key={wallet.address} address={wallet.address} />
    {onTrade && <WalletPositions address={wallet.address} onTrade={onTrade} />}
  </div>
);

// ─── Leaderboard DataTable columns ────────────────────────────────────────────

type RankedWallet = PmWallet & { _rank: number };

const buildLeaderboardCols = (
  handleRowClick: (w: PmWallet) => void,
): TableColumn<RankedWallet>[] => [
  {
    key: '_rank',
    header: '#',
    width: '44px',
    mono: true,
    render: (v) => <span className="text-jtp-textDim">{v}</span>,
  },
  {
    key: 'pseudonym',
    header: 'WALLET',
    render: (_v, row) => (
      <div className="flex items-center gap-2.5 min-w-0">
        {row.profileImage ? (
          <img
            src={row.profileImage}
            alt=""
            className="w-6 h-6 rounded-full bg-jtp-active object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-jtp-active flex-shrink-0" />
        )}
        <div className="min-w-0">
          <div className="text-jtp-text font-medium truncate">{row.pseudonym || 'Unknown'}</div>
          <div className="font-mono text-jtp-xs text-jtp-textDim truncate">
            {truncateAddress(row.address)}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: 'edgeLcb',
    header: 'EDGE',
    align: 'right',
    mono: true,
    render: (v) => (
      <span className={`font-bold text-jtp-md ${edgeClass(v)}`}>{fmtCents(v)}</span>
    ),
  },
  {
    key: 'meanEdge',
    header: 'MEAN',
    align: 'right',
    mono: true,
    render: (v) => <span className="text-jtp-textDim">{fmtCents(v)}</span>,
  },
  {
    key: 'nClosed',
    header: 'CLOSED',
    align: 'right',
    mono: true,
    render: (_v, row) => (
      <span className="whitespace-nowrap text-jtp-textMuted">
        {fmtNum(row.nClosed)}
        <span className="text-jtp-xs text-jtp-textDim ml-1">· {fmtNum(row.nEff)}</span>
      </span>
    ),
  },
  {
    key: 'dollarEdge',
    header: '$ EDGE',
    align: 'right',
    mono: true,
    render: (v) => <span className={edgeClass(v)}>{fmtCents(v)}</span>,
  },
  {
    key: 'winRate',
    header: 'WIN%',
    align: 'right',
    mono: true,
    render: (v) => (
      <span className="text-jtp-textDim" title="win rate ≠ edge">{fmtPct(v)}</span>
    ),
  },
  {
    key: 'marketFocus',
    header: 'FOCUS',
    render: (v) => <FocusChip label={v} />,
  },
];

// ─── Main QuantPage ───────────────────────────────────────────────────────────

const QuantPage: React.FC = () => {
  const { getToken } = useAuth();

  const [mode, setMode] = useState<QuantMode>('leaderboard');
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
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
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
      // keep prior state; surfaced via empty states below
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
        // refresh leaderboard/stats so the freshly-scanned wallet appears
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
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Pre-process leaderboard with rank field for DataTable
  const rankedLeaderboard: RankedWallet[] = leaderboard.map((w, i) => ({ ...w, _rank: i + 1 }));
  const leaderboardCols = buildLeaderboardCols(handleRowClick);

  const maxWidth =
    mode === 'terminal' ? 'max-w-7xl' : mode === 'trade' ? 'max-w-2xl' : 'max-w-6xl';

  return (
    <div className={`px-5 py-[18px] pb-10 space-y-5 animate-jtp-fade-in ${maxWidth}`}>

      {/* ── Mode toggle ── */}
      <SegmentedControl
        segments={MODE_SEGMENTS}
        value={mode}
        onChange={setMode}
      />

      {mode === 'terminal' ? (
        <QuantTerminal />
      ) : mode === 'trade' ? (
        <>
          <div>
            <h1 className="text-jtp-2xl font-semibold text-jtp-text tracking-tight">
              Trade — Polymarket (non-custodial)
            </h1>
            <p className="text-jtp-lg text-jtp-textMuted mt-1.5 max-w-2xl">
              Connect your own Polygon wallet and place orders on Polymarket directly. You sign every
              action — JTradePilot never holds your keys or funds. Mirror a position from any scanned
              wallet, or paste a token id manually.
            </p>
          </div>
          <PolymarketTradePanel prefill={tradePrefill} />
        </>
      ) : (
        <>
          {/* ── Header ── */}
          <div>
            <h1 className="text-jtp-2xl font-semibold text-jtp-text tracking-tight">
              Quant — Polymarket Edge Intelligence
            </h1>
            <p className="text-jtp-lg text-jtp-textMuted mt-1.5 max-w-3xl">
              We rank wallets by{' '}
              <span className="text-jtp-text font-medium">realized edge per trade</span> — how much
              they beat the market's implied price — using the 95% lower bound, with correlated bets
              clustered. Win rate and raw PnL are noise; this surfaces the rare{' '}
              <span className="text-jtp-text font-medium italic">copyable</span> edge and buries luck
              and insurance-sellers.
            </p>
          </div>

          {/* ── Stats row ── */}
          <div className="grid grid-cols-3 gap-3">
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

          {/* ── ChatGPT connect (AI Verdict) ── */}
          <ConnectChatGPT />

          {/* ── Scan wallet ── */}
          <Panel label="SCAN WALLET">
            <p className="text-jtp-md text-jtp-textDim mb-4">
              Paste any Polymarket address to compute its statistical edge breakdown.
            </p>
            <form
              className="flex flex-col sm:flex-row gap-2.5"
              onSubmit={(e) => { e.preventDefault(); handleScan(); }}
            >
              <input
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Paste a Polymarket wallet address (0x…)"
                spellCheck={false}
                autoComplete="off"
                className="flex-1 bg-jtp-bg border border-jtp-borderStrong rounded-jtp-xl px-3.5 py-2.5 text-jtp-md font-mono text-jtp-text placeholder:text-jtp-textDim placeholder:font-sans focus:outline-none focus:border-jtp-borderFocus transition-colors"
              />
              <Button
                type="submit"
                variant="primary"
                isLoading={scanning}
              >
                {scanning ? 'Scanning…' : 'Scan'}
              </Button>
            </form>

            {scanError && (
              <p role="alert" className="text-jtp-md text-jtp-loss mt-3">{scanError}</p>
            )}

            {scanResult && (
              <div className="mt-4">
                <WalletCard wallet={scanResult} onTrade={handleTradePosition} />
              </div>
            )}
          </Panel>

          {/* ── AI Opportunities + Strategy Builder ── */}
          <AiQuantPanel />

          {/* ── Edge Leaderboard ── */}
          <Panel
            label="EDGE LEADERBOARD"
            noPadding
            actions={
              <span className="font-mono text-jtp-xs text-jtp-textDim">
                Ranked by realized edge (95% LCB)
              </span>
            }
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-jtp-textDim">
                <Spinner />
                <span className="text-jtp-lg">Loading leaderboard…</span>
              </div>
            ) : leaderboard.length === 0 ? (
              <EmptyState
                title="No qualified wallets yet"
                description="Scan a Polymarket wallet address above. Wallets need ≥15 closed positions to qualify for the edge leaderboard."
              />
            ) : (
              <DataTable
                columns={leaderboardCols}
                data={rankedLeaderboard}
                keyFn={(w) => w.id || w.address}
                onRowClick={(w) => handleRowClick(w)}
              />
            )}
          </Panel>
        </>
      )}
    </div>
  );
};

export default QuantPage;
