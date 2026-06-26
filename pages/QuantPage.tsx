import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useView } from '../context/ViewContext';
import api from '../services/api';
import { PmWallet, QuantVerdict } from '../types';
import QuantTerminal from '../components/quant/QuantTerminal';
import AiQuantPanel from '../components/quant/AiQuantPanel';

type QuantMode = 'leaderboard' | 'terminal';

// ─── Mode toggle (segmented control) ────────────────────────────────────────────

const ModeToggle: React.FC<{ mode: QuantMode; onChange: (m: QuantMode) => void }> = ({
  mode,
  onChange,
}) => (
  <div className="inline-flex items-center gap-1 p-1 bg-jtp-control border border-jtp-borderStrong rounded-jtp-xl">
    {(['leaderboard', 'terminal'] as const).map((m) => (
      <button
        key={m}
        type="button"
        onClick={() => onChange(m)}
        className={`px-4 py-1.5 rounded-jtp-lg text-jtp-xs font-semibold uppercase tracking-wide transition-colors ${
          mode === m
            ? 'bg-jtp-active text-jtp-text border border-jtp-borderFocus'
            : 'text-jtp-textDim hover:text-jtp-textMuted border border-transparent'
        }`}
      >
        {m === 'leaderboard' ? 'Leaderboard' : 'Terminal'}
      </button>
    ))}
  </div>
);

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
const edgeClass = (n: number) => (n > 0 ? 'text-jtp-profit' : n < 0 ? 'text-jtp-loss' : 'text-jtp-textMuted');

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

// ─── ChatGPT connection status line (connect lives in Settings → AI) ────────────

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
    return () => {
      active = false;
    };
  }, [getToken]);

  const goToSettings = () => navigateTo('settings', 'ai');

  if (statusLoading) return null;

  // Connected + verdict permitted: a quiet "ready" status; verdicts work on each wallet.
  if (connected && verdictAllowed) {
    return (
      <div className="flex items-center gap-2 text-jtp-xs text-jtp-textMuted">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium bg-[rgba(34,197,94,0.12)] text-jtp-profit border border-[rgba(34,197,94,0.25)]">
          AI Verdict ready ✓
        </span>
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
      <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-jtp-xs text-jtp-textMuted">
          ChatGPT/Codex is connected, but <span className="text-jtp-text font-medium">AI Verdict</span> is
          turned off. Enable it to run verdicts.
        </p>
        <button
          type="button"
          onClick={goToSettings}
          className="px-4 py-2 rounded-jtp-xl text-jtp-xs font-semibold bg-jtp-active border border-jtp-border text-jtp-text hover:bg-jtp-hover transition-colors whitespace-nowrap"
        >
          Settings → AI
        </button>
      </div>
    );
  }

  // Not connected.
  return (
    <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
      <p className="text-jtp-xs text-jtp-textMuted">
        Connect ChatGPT/Codex in <span className="text-jtp-text font-medium">Settings → AI</span> to
        enable verdicts.
      </p>
      <button
        type="button"
        onClick={goToSettings}
        className="px-5 py-2.5 rounded-jtp-xl text-jtp-sm font-semibold bg-jtp-blue text-white hover:bg-jtp-blueHover transition-colors whitespace-nowrap"
      >
        Connect in Settings → AI
      </button>
    </div>
  );
};

// ─── AI Verdict badge + display ─────────────────────────────────────────────────

const verdictStyles: Record<QuantVerdict['verdict'], string> = {
  COPY: 'bg-[rgba(34,197,94,0.12)] text-jtp-profit border-[rgba(34,197,94,0.25)]',
  WATCH: 'bg-[rgba(234,179,8,0.12)] text-jtp-warning border-[rgba(234,179,8,0.25)]',
  AVOID: 'bg-[rgba(239,68,68,0.12)] text-jtp-loss border-[rgba(239,68,68,0.25)]',
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
          <h3 className="text-jtp-sm font-semibold text-jtp-text">AI Verdict</h3>
          <p className="text-jtp-xs text-jtp-textDim mt-0.5">
            Is the edge <span className="italic">copyable</span> (mispricing) — or speed, insider,
            or luck?
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-jtp-xl text-jtp-xs font-semibold bg-jtp-active border border-jtp-border text-jtp-text hover:bg-jtp-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {loading ? <Spinner /> : null}
          {loading ? 'Analyzing…' : verdict ? 'Re-run AI Verdict' : 'AI Verdict'}
        </button>
      </div>

      {needsConnect && (
        <p className="text-jtp-xs text-jtp-warning">
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
        <p role="alert" className="text-jtp-xs text-jtp-loss">
          {error}
        </p>
      )}

      {verdict && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-md text-jtp-xs font-bold border ${verdictStyles[verdict.verdict]}`}
            >
              {verdict.verdict}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-jtp-xs font-medium bg-jtp-active border border-jtp-border text-jtp-textMuted">
              {verdict.edgeType}
            </span>
            <span className="inline-flex items-center gap-1 text-jtp-xs text-jtp-textMuted">
              Copyable:{' '}
              <span className={verdict.copyable ? 'text-jtp-profit font-semibold' : 'text-jtp-loss font-semibold'}>
                {verdict.copyable ? '✓' : '✗'}
              </span>
            </span>
            <span className="inline-flex items-center text-jtp-xs text-jtp-textDim">
              Confidence: <span className="text-jtp-textMuted font-medium ml-1 capitalize">{verdict.confidence}</span>
            </span>
          </div>
          <p className="text-jtp-sm text-jtp-textMuted leading-relaxed">{verdict.summary}</p>
        </div>
      )}
    </div>
  );
};

// ─── Market focus chip ────────────────────────────────────────────────────────

const FocusChip: React.FC<{ label: string }> = ({ label }) =>
  label ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-jtp-xs font-medium bg-jtp-active border border-jtp-border text-jtp-textMuted">
      {label}
    </span>
  ) : (
    <span className="text-jtp-textDim text-jtp-xs">—</span>
  );

// ─── Wallet metric (scan result) ──────────────────────────────────────────────

const Metric: React.FC<{ label: string; value: React.ReactNode; valueClass?: string; hint?: string }> = ({
  label,
  value,
  valueClass,
  hint,
}) => (
  <div className="flex flex-col gap-1">
    <span className="text-jtp-xs text-jtp-textDim uppercase tracking-wide" title={hint}>
      {label}
    </span>
    <span className={`font-mono text-jtp-lg font-semibold ${valueClass ?? 'text-jtp-text'}`}>{value}</span>
  </div>
);

const WalletCard: React.FC<{ wallet: PmWallet }> = ({ wallet }) => (
  <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel overflow-hidden">
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
        <div className="text-jtp-base font-semibold text-jtp-text truncate">
          {wallet.pseudonym || 'Unknown wallet'}
        </div>
        <div className="font-mono text-jtp-xs text-jtp-textDim truncate">
          {truncateAddress(wallet.address)}
        </div>
      </div>
      <a
        href={profileUrl(wallet.address)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-jtp-xs font-medium text-jtp-blue hover:underline flex-shrink-0"
      >
        Polymarket ↗
      </a>
    </div>

    {/* Headline edge */}
    <div className="px-5 py-5 border-b border-jtp-border flex items-end justify-between gap-4 flex-wrap">
      <div className="flex flex-col gap-1">
        <span className="text-jtp-xs text-jtp-textDim uppercase tracking-wide">
          Realized edge (95% lower bound)
        </span>
        <span className={`font-mono text-3xl font-bold leading-none ${edgeClass(wallet.edgeLcb)}`}>
          {fmtCents(wallet.edgeLcb)}
          <span className="text-jtp-sm font-medium text-jtp-textDim ml-1.5">/ share</span>
        </span>
      </div>
      {!wallet.qualified && (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-jtp-xs font-medium bg-[rgba(234,179,8,0.12)] text-jtp-warning border border-[rgba(234,179,8,0.25)]">
          Unqualified · n&lt;15
        </span>
      )}
    </div>

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
            <span className="text-jtp-xs text-jtp-textDim ml-1.5">n_eff {fmtNum(wallet.nEff)}</span>
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
        <span className="text-jtp-xs text-jtp-textDim uppercase tracking-wide">Market focus</span>
        <span className="mt-0.5">
          <FocusChip label={wallet.marketFocus} />
        </span>
      </div>
    </div>

    {!wallet.qualified && (
      <div className="px-5 py-3 border-t border-jtp-border bg-jtp-bg">
        <p className="text-jtp-xs text-jtp-textMuted">
          Not enough closed positions yet (n&lt;15) for a statistically meaningful edge. Treat this
          score as provisional.
        </p>
      </div>
    )}

    <AiVerdictSection key={wallet.address} address={wallet.address} />
  </div>
);

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

  return (
    <div className={`space-y-5 animate-jtp-fade-in ${mode === 'terminal' ? 'max-w-7xl' : 'max-w-6xl'}`}>
      {/* ── Mode toggle ── */}
      <ModeToggle mode={mode} onChange={setMode} />

      {mode === 'terminal' ? (
        <QuantTerminal />
      ) : (
        <>
      {/* ── Header ── */}
      <div>
        <h1 className="text-jtp-2xl font-semibold text-jtp-text tracking-tight">
          Quant — Polymarket Edge Intelligence
        </h1>
        <p className="text-jtp-sm text-jtp-textMuted mt-1.5 max-w-3xl">
          We rank wallets by <span className="text-jtp-text font-medium">realized edge per trade</span> —
          how much they beat the market's implied price — using the 95% lower bound, with correlated
          bets clustered. Win rate and raw PnL are noise; this surfaces the rare{' '}
          <span className="text-jtp-text font-medium italic">copyable</span> edge and buries luck and
          insurance-sellers.
        </p>
        <p className="text-jtp-xs text-jtp-textDim mt-2 font-mono">
          {stats
            ? `${fmtNum(stats.total)} tracked · ${fmtNum(stats.scanned)} scanned · ${fmtNum(
                stats.qualified,
              )} qualified (≥15 closed positions)`
            : loading
              ? 'Loading stats…'
              : '— tracked · — scanned · — qualified'}
        </p>
      </div>

      {/* ── ChatGPT connect (AI Verdict) ── */}
      <ConnectChatGPT />

      {/* ── Scan box ── */}
      <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel overflow-hidden">
        <div className="px-5 py-4 border-b border-jtp-border">
          <h2 className="text-jtp-base font-semibold text-jtp-text tracking-tight">Scan a wallet</h2>
          <p className="text-jtp-xs text-jtp-textDim mt-1">
            Paste any Polymarket address to compute its statistical edge breakdown.
          </p>
        </div>
        <div className="px-5 py-4 space-y-4">
          <form
            className="flex flex-col sm:flex-row gap-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              handleScan();
            }}
          >
            <input
              type="text"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="Paste a Polymarket wallet address (0x…)"
              spellCheck={false}
              autoComplete="off"
              className="flex-1 bg-jtp-bg border border-jtp-borderStrong rounded-jtp-xl px-3.5 py-2.5 text-jtp-sm font-mono text-jtp-text placeholder:text-jtp-textDim placeholder:font-sans focus:outline-none focus:border-jtp-borderFocus transition-colors"
            />
            <button
              type="submit"
              disabled={scanning}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-jtp-xl text-jtp-sm font-semibold bg-jtp-blue text-white hover:bg-jtp-blueHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {scanning ? <Spinner /> : null}
              {scanning ? 'Scanning…' : 'Scan'}
            </button>
          </form>

          {scanError && (
            <p role="alert" className="text-jtp-xs text-jtp-loss">
              {scanError}
            </p>
          )}

          {scanResult && <WalletCard wallet={scanResult} />}
        </div>
      </div>

      {/* ── AI Opportunities + Strategy Builder ── */}
      <AiQuantPanel />

      {/* ── Leaderboard ── */}
      <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel overflow-hidden">
        <div className="px-5 py-4 border-b border-jtp-border flex items-center justify-between">
          <h2 className="text-jtp-base font-semibold text-jtp-text tracking-tight">
            Edge Leaderboard
          </h2>
          <span className="text-jtp-xs text-jtp-textDim font-mono">
            Ranked by realized edge (95% LCB)
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-jtp-textDim">
            <Spinner />
            <span className="text-jtp-sm">Loading leaderboard…</span>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-5">
            <p className="text-jtp-sm text-jtp-textMuted font-medium">No qualified wallets yet</p>
            <p className="text-jtp-xs text-jtp-textDim max-w-sm">
              Scan a Polymarket wallet address above. Wallets need ≥15 closed positions to qualify for
              the edge leaderboard.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-jtp-sm">
              <thead>
                <tr className="text-jtp-xs text-jtp-textDim uppercase tracking-wide border-b border-jtp-border">
                  <th className="text-left font-medium px-5 py-2.5 w-12">#</th>
                  <th className="text-left font-medium px-3 py-2.5">Wallet</th>
                  <th className="text-right font-medium px-3 py-2.5">Edge</th>
                  <th className="text-right font-medium px-3 py-2.5">Mean</th>
                  <th className="text-right font-medium px-3 py-2.5">Closed</th>
                  <th className="text-right font-medium px-3 py-2.5">$ Edge</th>
                  <th className="text-right font-medium px-3 py-2.5" title="win rate ≠ edge">
                    Win%
                  </th>
                  <th className="text-left font-medium px-3 py-2.5 pr-5">Focus</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((w, i) => (
                  <tr
                    key={w.id || w.address}
                    onClick={() => handleRowClick(w)}
                    className="border-b border-jtp-borderSubtle last:border-b-0 hover:bg-jtp-hover cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3 font-mono text-jtp-textDim">{i + 1}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {w.profileImage ? (
                          <img
                            src={w.profileImage}
                            alt=""
                            className="w-6 h-6 rounded-full bg-jtp-active object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-jtp-active flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="text-jtp-text font-medium truncate">
                            {w.pseudonym || 'Unknown'}
                          </div>
                          <div className="font-mono text-jtp-xs text-jtp-textDim truncate">
                            {truncateAddress(w.address)}
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* Edge — headline metric, emphasized */}
                    <td className={`px-3 py-3 text-right font-mono text-jtp-base font-bold ${edgeClass(w.edgeLcb)}`}>
                      {fmtCents(w.edgeLcb)}
                    </td>
                    {/* Mean — dimmer secondary */}
                    <td className="px-3 py-3 text-right font-mono text-jtp-textDim">
                      {fmtCents(w.meanEdge)}
                    </td>
                    {/* Closed (+ n_eff) */}
                    <td className="px-3 py-3 text-right font-mono text-jtp-textMuted whitespace-nowrap">
                      {fmtNum(w.nClosed)}
                      <span className="text-jtp-xs text-jtp-textDim ml-1">· n_eff {fmtNum(w.nEff)}</span>
                    </td>
                    {/* $ Edge */}
                    <td className={`px-3 py-3 text-right font-mono ${edgeClass(w.dollarEdge)}`}>
                      {fmtCents(w.dollarEdge)}
                    </td>
                    {/* Win% — de-emphasized */}
                    <td
                      className="px-3 py-3 text-right font-mono text-jtp-textDim"
                      title="win rate ≠ edge"
                    >
                      {fmtPct(w.winRate)}
                    </td>
                    <td className="px-3 py-3 pr-5">
                      <FocusChip label={w.marketFocus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
};

export default QuantPage;
