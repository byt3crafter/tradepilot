"use client";
/**
 * QuantAutoBotPanel — autonomous Polymarket bot dashboard.
 *
 * Tabs (SegmentedControl at top):
 *  "Performance"  — stat tiles (realized P&L, right/wrong, win rate, drawdown,
 *                   exposure, wallet), equity-curve chart, live trade cards.
 *  "Controls"     — mode toggle, bot wallet card (fund / withdraw), limits & kill switch.
 *
 * Polls /status, /trades and /performance every 8 s.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  AutobotStatus,
  AutobotTrade,
  AutobotPerformance,
  AutobotPerformanceHistoryItem,
  AutobotPerformanceOpenPosition,
  AutobotPerformanceSettled,
} from '../../types';
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
import QuantCopilot from './QuantCopilot';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtUsd = (n: number, decimals = 2) => {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(decimals)}`;
};

const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

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

// ─── Tab segments ──────────────────────────────────────────────────────────────

type BotTab = 'performance' | 'controls';

const BOT_TAB_SEGS: Segment<BotTab>[] = [
  { value: 'performance', label: 'Performance' },
  { value: 'controls',    label: 'Controls' },
];

// ─── Mode segments ─────────────────────────────────────────────────────────────

const MODE_SEGS: Segment<'off' | 'auto'>[] = [
  { value: 'off',  label: 'Manual (off)' },
  { value: 'auto', label: 'AUTO — bot trades' },
];

// ─── Trade status badge variant map ───────────────────────────────────────────

const STATUS_VARIANT: Record<AutobotTrade['status'], 'neutral' | 'info' | 'profit' | 'loss' | 'warning'> = {
  pending:  'neutral',
  placed:   'info',
  filled:   'warning',
  failed:   'loss',
  resolved: 'profit',
  unfilled: 'neutral',
};

const isClearable = (s: AutobotTrade['status']) => s === 'failed' || s === 'unfilled';

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

// ─── Export private key modal ──────────────────────────────────────────────────

interface ExportKeyData {
  address: string;
  privateKey: string;
}

const ExportKeyModal: React.FC<{
  onClose: () => void;
  onExport: () => Promise<ExportKeyData>;
}> = ({ onClose, onExport }) => {
  const [phase, setPhase] = useState<'warn' | 'loading' | 'reveal'>('warn');
  const [keyData, setKeyData] = useState<ExportKeyData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const handleReveal = async () => {
    setPhase('loading');
    setErr(null);
    try {
      const data = await onExport();
      setKeyData(data);
      setPhase('reveal');
    } catch (ex: any) {
      setErr(ex?.message || 'Could not export key.');
      setPhase('warn');
    }
  };

  const handleClose = () => {
    // Clear sensitive data before closing
    setKeyData(null);
    onClose();
  };

  const copyText = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => { /* ignore */ });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-label="Export bot wallet private key"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="bg-jtp-panel border border-jtp-border rounded-[2px] w-full max-w-md mx-4 overflow-hidden"
        style={{ borderTop: '2px solid rgba(255,91,82,0.55)' }}
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-jtp-border">
          <span className="jtp-label tracking-widest text-[#ff5b52]">EXPORT PRIVATE KEY</span>
          <button type="button" onClick={handleClose} aria-label="Close"
                  className="text-jtp-textDim hover:text-jtp-text text-lg leading-none">×</button>
        </header>

        <div className="p-4 space-y-4">
          {/* Warning — always shown */}
          <div className="rounded-[2px] border border-[rgba(255,91,82,0.35)] bg-[rgba(255,91,82,0.08)] px-3 py-3">
            <p className="font-mono text-jtp-xs text-[#ff5b52] leading-relaxed font-semibold">
              &#9888;&#65039; Your private key controls this wallet and its funds. Anyone who sees it can take everything.
              Never share it, never paste it anywhere online. Reveal only on a device you trust.
            </p>
          </div>

          {phase === 'warn' && (
            <>
              {err && <p role="alert" className="font-mono text-jtp-xs text-[#ff5b52]">{err}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 font-mono text-jtp-xs font-semibold px-3 py-2 rounded-[2px] border border-jtp-border text-jtp-textMuted hover:text-jtp-text hover:border-jtp-borderStrong transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReveal}
                  className="flex-1 font-mono text-jtp-xs font-semibold px-3 py-2 rounded-[2px] bg-[rgba(255,91,82,0.12)] text-[#ff5b52] border border-[rgba(255,91,82,0.35)] hover:bg-[rgba(255,91,82,0.20)] transition-colors"
                >
                  Reveal key
                </button>
              </div>
            </>
          )}

          {phase === 'loading' && (
            <div className="flex items-center gap-2 font-mono text-jtp-xs text-jtp-textDim">
              <Spin />
              <span>Fetching key…</span>
            </div>
          )}

          {phase === 'reveal' && keyData && (
            <>
              {/* Address */}
              <div>
                <div className="jtp-label mb-1">ADDRESS</div>
                <div className="flex items-center gap-2 rounded-[2px] border border-jtp-borderStrong bg-jtp-bg px-3 py-2">
                  <span className="font-mono text-jtp-xs text-jtp-text break-all flex-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {keyData.address}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(keyData.address, setCopiedAddr)}
                    className="flex-shrink-0 font-mono text-jtp-2xs text-jtp-textDim hover:text-jtp-amber transition-colors px-1.5 py-0.5 border border-jtp-borderStrong rounded-[2px] select-none"
                    aria-label="Copy address"
                  >
                    {copiedAddr ? 'COPIED' : 'COPY'}
                  </button>
                </div>
              </div>

              {/* Private key */}
              <div>
                <div className="jtp-label mb-1">PRIVATE KEY</div>
                <div className="flex items-start gap-2 rounded-[2px] border border-[rgba(255,91,82,0.35)] bg-jtp-bg px-3 py-2">
                  <span className="font-mono text-jtp-xs text-[#ff5b52] break-all flex-1 select-all leading-relaxed" style={{ fontVariantNumeric: 'tabular-nums', wordBreak: 'break-all' }}>
                    {keyData.privateKey}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(keyData.privateKey, setCopiedKey)}
                    className="flex-shrink-0 font-mono text-jtp-2xs text-jtp-textDim hover:text-jtp-amber transition-colors px-1.5 py-0.5 border border-jtp-borderStrong rounded-[2px] select-none mt-0.5"
                    aria-label="Copy private key"
                  >
                    {copiedKey ? 'COPIED' : 'COPY'}
                  </button>
                </div>
              </div>

              {/* Import instructions */}
              <div className="rounded-[2px] border border-jtp-borderSubtle bg-jtp-bg px-3 py-2.5">
                <p className="jtp-label mb-1">IMPORT INTO PHANTOM / METAMASK</p>
                <p className="font-mono text-jtp-xs text-jtp-textMuted leading-relaxed">
                  <span className="text-jtp-text font-semibold">Phantom:</span>{' '}
                  &#9776; menu &rarr; Add/Connect Wallet &rarr; Import Private Key &rarr; paste this key &rarr; it imports the wallet on Polygon. Your USDC.e + funds will appear.
                </p>
                <p className="font-mono text-jtp-xs text-jtp-textMuted leading-relaxed mt-1.5">
                  <span className="text-jtp-text font-semibold">MetaMask:</span>{' '}
                  Account selector &rarr; Add account or hardware wallet &rarr; Import account &rarr; paste private key &rarr; add the Polygon network if prompted.
                </p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-full font-mono text-jtp-xs font-semibold px-3 py-2 rounded-[2px] border border-jtp-border text-jtp-textMuted hover:text-jtp-text hover:border-jtp-borderStrong transition-colors"
              >
                Done — close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Link Polymarket Account section ──────────────────────────────────────────

interface LinkPolymarketSectionProps {
  status: AutobotStatus;
  onLink: (address: string) => Promise<void>;
  onUnlink: () => Promise<void>;
}

const LinkPolymarketSection: React.FC<LinkPolymarketSectionProps> = ({ status, onLink, onUnlink }) => {
  const [addr, setAddr] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [copiedFunder, setCopiedFunder] = useState(false);

  const isValidAddr = /^0x[a-fA-F0-9]{40}$/.test(addr.trim());

  const handleLink = async () => {
    if (!isValidAddr) { setMsg({ kind: 'err', text: 'Enter a valid 0x Ethereum address (42 characters).' }); return; }
    setBusy(true);
    setMsg(null);
    try {
      await onLink(addr.trim());
      setAddr('');
      setMsg({ kind: 'ok', text: 'Polymarket account linked.' });
    } catch (ex: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setMsg({ kind: 'err', text: ex?.message || 'Failed to link account.' });
    } finally {
      setBusy(false);
    }
  };

  const handleUnlink = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await onUnlink();
      setMsg({ kind: 'ok', text: 'Polymarket account unlinked.' });
    } catch (ex: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setMsg({ kind: 'err', text: ex?.message || 'Failed to unlink.' });
    } finally {
      setBusy(false);
    }
  };

  const copyFunder = () => {
    if (!status.funderAddress) return;
    navigator.clipboard.writeText(status.funderAddress).then(() => {
      setCopiedFunder(true);
      setTimeout(() => setCopiedFunder(false), 1800);
    }).catch(() => { /* ignore */ });
  };

  const truncFunder = (a: string) =>
    a.length > 18 ? `${a.slice(0, 10)}…${a.slice(-8)}` : a;

  if (status.linked && status.funderAddress) {
    return (
      <div
        className="rounded-[2px] border border-[rgba(61,220,132,0.35)] bg-[rgba(61,220,132,0.06)] px-3 py-3 mt-3"
        role="status"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[#3ddc84] font-mono text-jtp-xs font-semibold flex-shrink-0">&#10003; Linked to Polymarket:</span>
            <span
              className="font-mono text-jtp-xs text-[#3ddc84] break-all"
              title={status.funderAddress}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {truncFunder(status.funderAddress)}
            </span>
            <button
              type="button"
              onClick={copyFunder}
              title="Copy Polymarket proxy address"
              className="flex-shrink-0 font-mono text-jtp-2xs text-jtp-textDim hover:text-jtp-amber transition-colors px-1.5 py-0.5 border border-jtp-borderStrong rounded-[2px] select-none"
              aria-label="Copy linked Polymarket address"
            >
              {copiedFunder ? 'COPIED' : 'COPY'}
            </button>
          </div>
          <button
            type="button"
            onClick={handleUnlink}
            disabled={busy}
            className="flex-shrink-0 font-mono text-jtp-2xs font-semibold px-2.5 py-1 rounded-[2px] border border-jtp-borderStrong text-jtp-textMuted hover:text-[#ff5b52] hover:border-[rgba(255,91,82,0.4)] transition-colors disabled:opacity-50"
          >
            {busy ? 'Unlinking…' : 'Unlink'}
          </button>
        </div>
        {msg && (
          <p role="alert" className={`mt-1.5 font-mono text-jtp-xs ${msg.kind === 'ok' ? 'text-[#3ddc84]' : 'text-[#ff5b52]'}`}>
            {msg.text}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className="rounded-[2px] border border-[rgba(232,162,61,0.45)] bg-[rgba(232,162,61,0.06)] px-3 py-3 mt-3 space-y-3"
      role="note"
    >
      <div>
        <p className="jtp-label text-[#e8a23d] mb-1">LINK POLYMARKET ACCOUNT</p>
        <p className="font-mono text-jtp-xs text-jtp-textMuted leading-relaxed">
          To trade live, link your Polymarket account. The bot signs from the wallet above but trades
          from your <span className="text-jtp-text">Polymarket proxy wallet</span> (which holds your deposited USDC.e funds).
        </p>
      </div>

      <ol className="space-y-1.5 pl-0 list-none" aria-label="Setup steps">
        <li className="flex gap-2 font-mono text-jtp-xs text-jtp-textMuted">
          <span className="flex-shrink-0 text-[#e8a23d] font-semibold w-4 text-right">1.</span>
          <span>
            Export this wallet&apos;s private key (button above) and import it into{' '}
            <span className="text-jtp-text">Phantom</span> or{' '}
            <span className="text-jtp-text">MetaMask</span> — OR use your own Polymarket-connected wallet.
          </span>
        </li>
        <li className="flex gap-2 font-mono text-jtp-xs text-jtp-textMuted">
          <span className="flex-shrink-0 text-[#e8a23d] font-semibold w-4 text-right">2.</span>
          <span>
            On{' '}
            <a
              href="https://polymarket.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#e8a23d] underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              polymarket.com
            </a>
            , connect the wallet and <span className="text-jtp-text">deposit USDC</span> — Polymarket creates your proxy/deposit wallet automatically.
          </span>
        </li>
        <li className="flex gap-2 font-mono text-jtp-xs text-jtp-textMuted">
          <span className="flex-shrink-0 text-[#e8a23d] font-semibold w-4 text-right">3.</span>
          <span>
            Copy your Polymarket <span className="text-jtp-text">deposit / account address</span> (the proxy — shown in your Polymarket profile or the CLOB API).
          </span>
        </li>
        <li className="flex gap-2 font-mono text-jtp-xs text-jtp-textMuted">
          <span className="flex-shrink-0 text-[#e8a23d] font-semibold w-4 text-right">4.</span>
          <span>Paste it below and click <span className="text-jtp-text">Link</span>.</span>
        </li>
      </ol>

      <div className="space-y-1.5">
        <label className="jtp-label text-jtp-2xs block" htmlFor="polymarket-funder-addr">
          POLYMARKET PROXY / DEPOSIT ADDRESS
        </label>
        <div className="flex gap-2">
          <input
            id="polymarket-funder-addr"
            type="text"
            value={addr}
            onChange={(e) => { setAddr(e.target.value); setMsg(null); }}
            placeholder="0x… your Polymarket proxy/deposit address"
            spellCheck={false}
            autoComplete="off"
            className="flex-1 min-w-0 bg-jtp-bg border border-[rgba(232,162,61,0.45)] rounded-[2px] px-2.5 py-2 text-jtp-xs font-mono text-jtp-text placeholder:text-jtp-textDim focus:outline-none focus:border-[rgba(232,162,61,0.8)] transition-colors"
          />
          <button
            type="button"
            onClick={handleLink}
            disabled={busy || !addr.trim()}
            className="flex-shrink-0 font-mono text-jtp-xs font-bold uppercase tracking-wider px-3 py-2 rounded-[2px] bg-[rgba(232,162,61,0.14)] text-[#e8a23d] border border-[rgba(232,162,61,0.45)] hover:bg-[rgba(232,162,61,0.24)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? <Spin /> : 'Link'}
          </button>
        </div>
        {msg && (
          <p role="alert" className={`font-mono text-jtp-xs ${msg.kind === 'ok' ? 'text-[#3ddc84]' : 'text-[#ff5b52]'}`}>
            {msg.text}
          </p>
        )}
      </div>
    </div>
  );
};

// ─── Limits editor ─────────────────────────────────────────────────────────────

interface LimitsState {
  maxTotalUsd: string;
  maxPerTradeUsd: string;
  dailyLossLimitUsd: string;
  maxDrawdownUsd: string;
  minEdgePct: string;
  maxSettlementDays: string;
  netDepositsUsd: string;
}

const LimitsEditor: React.FC<{
  limits: AutobotStatus['limits'];
  netDepositsUsd?: number;
  onSave: (limits: { maxTotalUsd?: number; maxPerTradeUsd?: number; dailyLossLimitUsd?: number; maxDrawdownUsd?: number; minEdgePct?: number; orderType?: 'limit' | 'market'; maxSettlementDays?: number; netDepositsUsd?: number }) => Promise<void>;
}> = ({ limits, netDepositsUsd: netDepositsUsdProp, onSave }) => {
  const [vals, setVals] = useState<LimitsState>({
    maxTotalUsd: String(limits.maxTotalUsd),
    maxPerTradeUsd: String(limits.maxPerTradeUsd),
    dailyLossLimitUsd: String(limits.dailyLossLimitUsd),
    maxDrawdownUsd: String(limits.maxDrawdownUsd ?? 0),
    minEdgePct: String(limits.minEdgePct ?? 5),
    maxSettlementDays: String(limits.maxSettlementDays ?? 7),
    netDepositsUsd: netDepositsUsdProp != null ? String(netDepositsUsdProp) : '',
  });
  const [orderType, setOrderType] = useState<'limit' | 'market'>(limits.orderType ?? 'limit');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const prevLimits = useRef(limits);
  useEffect(() => {
    if (
      prevLimits.current.maxTotalUsd !== limits.maxTotalUsd ||
      prevLimits.current.maxPerTradeUsd !== limits.maxPerTradeUsd ||
      prevLimits.current.dailyLossLimitUsd !== limits.dailyLossLimitUsd ||
      prevLimits.current.maxDrawdownUsd !== limits.maxDrawdownUsd ||
      prevLimits.current.minEdgePct !== limits.minEdgePct ||
      prevLimits.current.orderType !== limits.orderType ||
      prevLimits.current.maxSettlementDays !== limits.maxSettlementDays
    ) {
      prevLimits.current = limits;
      setVals((v) => ({
        ...v,
        maxTotalUsd: String(limits.maxTotalUsd),
        maxPerTradeUsd: String(limits.maxPerTradeUsd),
        dailyLossLimitUsd: String(limits.dailyLossLimitUsd),
        maxDrawdownUsd: String(limits.maxDrawdownUsd ?? 0),
        minEdgePct: String(limits.minEdgePct ?? 5),
        maxSettlementDays: String(limits.maxSettlementDays ?? 7),
      }));
      setOrderType(limits.orderType ?? 'limit');
    }
  }, [limits]);

  const prevNetDepositsRef = useRef<number | undefined>(netDepositsUsdProp);
  useEffect(() => {
    if (prevNetDepositsRef.current !== netDepositsUsdProp) {
      prevNetDepositsRef.current = netDepositsUsdProp;
      setVals((v) => ({ ...v, netDepositsUsd: netDepositsUsdProp != null ? String(netDepositsUsdProp) : '' }));
    }
  }, [netDepositsUsdProp]);

  const handleSave = async () => {
    const maxTotalUsd = parseFloat(vals.maxTotalUsd);
    const maxPerTradeUsd = parseFloat(vals.maxPerTradeUsd);
    const dailyLossLimitUsd = parseFloat(vals.dailyLossLimitUsd);
    const maxDrawdownUsdRaw = parseFloat(vals.maxDrawdownUsd);
    const maxDrawdownUsd = !isNaN(maxDrawdownUsdRaw) ? Math.max(0, maxDrawdownUsdRaw) : 0;
    const minEdgePct = parseFloat(vals.minEdgePct);
    const maxSettlementDays = parseInt(vals.maxSettlementDays, 10);
    const netDepositsUsdRaw = parseFloat(vals.netDepositsUsd);
    const netDepositsUsd = !isNaN(netDepositsUsdRaw) && netDepositsUsdRaw >= 0 ? netDepositsUsdRaw : undefined;
    if ([maxTotalUsd, maxPerTradeUsd, dailyLossLimitUsd].some(isNaN)) {
      setErr('All limits must be valid numbers.');
      return;
    }
    if (isNaN(minEdgePct) || minEdgePct < 0 || minEdgePct > 100) {
      setErr('Min edge % must be between 0 and 100.');
      return;
    }
    if (isNaN(maxSettlementDays) || maxSettlementDays < 0) {
      setErr('Max days to settle must be 0 or greater.');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await onSave({ maxTotalUsd, maxPerTradeUsd, dailyLossLimitUsd, maxDrawdownUsd, minEdgePct, orderType, maxSettlementDays, ...(netDepositsUsd !== undefined ? { netDepositsUsd } : {}) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (ex: any) {
      setErr(ex?.message || 'Failed to save limits.');
    } finally {
      setSaving(false);
    }
  };

  const field = (id: keyof LimitsState, label: string, helpText: string) => (
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
      {field('maxDrawdownUsd', 'MAX DRAWDOWN ($, 0 = off)', 'Bot stops automatically if total P&L falls this far below your deposits — your loss floor.')}
      {field('netDepositsUsd', 'TOTAL DEPOSITED', 'What you\'ve put in — used for true P&L.')}

      {/* Min Edge % — separate field since it uses % not $ */}
      <div className="flex flex-col gap-1">
        <label className="jtp-label" htmlFor="limit-minEdgePct">MIN EDGE %</label>
        <div className="flex items-center gap-1">
          <input
            id="limit-minEdgePct"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={vals.minEdgePct}
            onChange={(e) => setVals((v) => ({ ...v, minEdgePct: e.target.value }))}
            className="w-full bg-jtp-bg border border-jtp-borderStrong rounded-[2px] px-2.5 py-1.5 text-jtp-xs font-mono text-jtp-text focus:outline-none focus:border-jtp-borderFocus transition-colors"
            aria-describedby="limit-minEdgePct-help"
          />
          <span className="font-mono text-jtp-textDim text-jtp-xs">%</span>
        </div>
        <span id="limit-minEdgePct-help" className="text-jtp-2xs text-jtp-textFaint font-mono">
          Only take signals with edge &ge; this % (higher = fewer, stronger trades)
        </span>
      </div>

      {/* Order Type toggle */}
      <div className="flex flex-col gap-1">
        <span className="jtp-label">ORDER TYPE</span>
        <div className="flex gap-2" role="group" aria-label="Order type">
          {(['limit', 'market'] as const).map((ot) => (
            <button
              key={ot}
              type="button"
              onClick={() => setOrderType(ot)}
              aria-pressed={orderType === ot}
              className={[
                'flex-1 font-mono text-jtp-xs font-semibold px-3 py-2 rounded-[2px] border transition-colors capitalize',
                orderType === ot
                  ? 'bg-[rgba(232,162,61,0.14)] text-[#e8a23d] border-[rgba(232,162,61,0.45)]'
                  : 'bg-jtp-bg text-jtp-textMuted border-jtp-borderStrong hover:border-jtp-borderFocus hover:text-jtp-text',
              ].join(' ')}
            >
              {ot}
            </button>
          ))}
        </div>
        <span className="text-jtp-2xs text-jtp-textFaint font-mono">
          Limit = fill at the wallet&apos;s price, no spread bleed (may not always fill).
          Market = take liquidity now (pays the spread).
        </span>
      </div>

      {/* Max settlement days */}
      <div className="flex flex-col gap-1">
        <label className="jtp-label" htmlFor="limit-maxSettlementDays">MAX DAYS TO SETTLE (0 = ANY)</label>
        <div className="flex items-center gap-1">
          <input
            id="limit-maxSettlementDays"
            type="number"
            min="0"
            step="1"
            value={vals.maxSettlementDays}
            onChange={(e) => setVals((v) => ({ ...v, maxSettlementDays: e.target.value }))}
            className="w-full bg-jtp-bg border border-jtp-borderStrong rounded-[2px] px-2.5 py-1.5 text-jtp-xs font-mono text-jtp-text focus:outline-none focus:border-jtp-borderFocus transition-colors"
            aria-describedby="limit-maxSettlementDays-help"
          />
          <span className="font-mono text-jtp-textDim text-jtp-xs flex-shrink-0">days</span>
        </div>
        <span id="limit-maxSettlementDays-help" className="text-jtp-2xs text-jtp-textFaint font-mono">
          Bot only trades markets resolving within this many days — keeps it out of weeks-out bets. 0 = allow any.
        </span>
      </div>

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

// ─── BotFundPanel removed ────────────────────────────────────────────────────
// Funding now happens via LINK POLYMARKET ACCOUNT: export key → import to
// Phantom → deposit on polymarket.com → link proxy. The old wallet-connect-to-
// fund path has been removed.


// ─── Trade card helpers ────────────────────────────────────────────────────────

const SIGNAL_BADGE_VARIANT: Record<string, 'neutral' | 'info' | 'profit' | 'loss' | 'warning'> = {
  arb:  'warning',
  ai:   'info',
  copy: 'neutral',
};

const outcomeColor = (outcome: string) => {
  const lc = outcome.toLowerCase();
  if (lc === 'yes') return 'text-[#3ddc84]';
  if (lc === 'no')  return 'text-[#ff5b52]';
  return 'text-jtp-text';
};

interface StatusLabelResult {
  label: string;
  variant: 'neutral' | 'info' | 'profit' | 'loss' | 'warning';
}

const resolvedStatusLabel = (trade: AutobotTrade): StatusLabelResult => {
  if (trade.status === 'resolved') {
    const roi = trade.roiPct ?? 0;
    const pnl = trade.pnlUsd ?? 0;
    if (pnl >= 0) return { label: `WON +${roi.toFixed(1)}%`, variant: 'profit' };
    return { label: `LOST ${Math.abs(roi).toFixed(1)}%`, variant: 'loss' };
  }
  if (trade.status === 'failed')   return { label: 'FAILED',   variant: 'loss' };
  if (trade.status === 'unfilled') return { label: 'UNFILLED', variant: 'neutral' };
  if (trade.status === 'filled')   return { label: 'PLACED',   variant: 'info' };
  if (trade.status === 'placed')   return { label: 'PLACED',   variant: 'info' };
  return { label: 'PENDING', variant: 'neutral' };
};

const fmtRelTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)   return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)   return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)   return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const fmtRelTimeMs = (ms: number) => {
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  if (s < 60)   return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)   return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)   return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

/** Returns "resolves in Xh" / "resolves in Xd" / "resolved" / null */
const fmtResolve = (endDate: number | null | undefined): string | null => {
  if (endDate == null) return null;
  const diff = endDate - Date.now();
  if (diff <= 0) return 'resolved';
  const totalMins = Math.floor(diff / 60_000);
  const hours = Math.floor(totalMins / 60);
  if (hours < 24) return `resolves in ${hours < 1 ? '<1' : hours}h`;
  return `resolves in ${Math.floor(hours / 24)}d`;
};

// ─── TradeCard ─────────────────────────────────────────────────────────────────

interface TradeCardProps {
  trade: AutobotTrade;
  onClear?: () => void;
  clearBusy?: boolean;
  onClose?: () => Promise<void>;
  closeBusy?: boolean;
}

const TradeCard: React.FC<TradeCardProps> = ({ trade, onClear, clearBusy, onClose, closeBusy }) => {
  const { label: statusLabel, variant: statusVariant } = resolvedStatusLabel(trade);
  const sigVariant = SIGNAL_BADGE_VARIANT[trade.signalType] ?? 'neutral';
  const sigLabel   = SIGNAL_LABELS[trade.signalType] ?? trade.signalType.toUpperCase();
  const priceCents = (trade.price * 100).toFixed(0);
  const dim = isClearable(trade.status);

  // Inline confirm state for Close button — auto-reverts to idle after 5 s
  const [closePhase, setClosePhase] = useState<'idle' | 'confirm'>('idle');
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startConfirm = () => {
    setClosePhase('confirm');
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    confirmTimerRef.current = setTimeout(() => setClosePhase('idle'), 5000);
  };

  const cancelConfirm = () => {
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    setClosePhase('idle');
  };

  const doClose = async () => {
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    setClosePhase('idle');
    if (onClose) await onClose();
  };

  // isOpen = a filled/open position that can be manually closed
  const isOpen = trade.status === 'filled' && !!trade.tokenId && !!onClose;

  return (
    <div
      className={[
        'px-4 py-3 border-b border-jtp-borderSubtle last:border-b-0 hover:bg-jtp-hover transition-colors',
        dim ? 'opacity-55' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <span className="flex-shrink-0 mt-[1px]">
            <Badge variant={sigVariant} size="xs">{sigLabel}</Badge>
          </span>
          <p className="font-mono text-jtp-xs leading-snug min-w-0">
            <span className="text-jtp-textMuted font-bold mr-1.5">{trade.side.toUpperCase()}</span>
            <span className={`font-bold mr-2 ${outcomeColor(trade.outcome)}`}>{trade.outcome}</span>
            <span className="text-jtp-text font-normal">{trade.title}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap mt-[1px]">
          <Badge variant={statusVariant} size="xs">{statusLabel}</Badge>

          {/* Close (sell-now) button — only for open/filled positions */}
          {isOpen && (
            closeBusy ? (
              <span className="flex items-center gap-1 font-mono text-jtp-2xs text-jtp-textDim" aria-label="Closing position">
                <Spin /> closing…
              </span>
            ) : closePhase === 'confirm' ? (
              <span className="flex items-center gap-1" role="group" aria-label="Confirm close position">
                <span className="font-mono text-jtp-2xs text-[#ff5b52] font-semibold">Sell?</span>
                <button
                  type="button"
                  onClick={doClose}
                  title="Confirm — sell this position now"
                  aria-label="Confirm sell position"
                  className="flex items-center justify-center w-5 h-5 rounded-[2px] border border-[rgba(61,220,132,0.5)] text-[#3ddc84] hover:bg-[rgba(61,220,132,0.12)] transition-colors font-mono text-jtp-xs leading-none font-bold"
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={cancelConfirm}
                  title="Cancel"
                  aria-label="Cancel sell"
                  className="flex items-center justify-center w-5 h-5 rounded-[2px] border border-jtp-borderStrong text-jtp-textDim hover:text-jtp-text transition-colors font-mono text-jtp-xs leading-none"
                >
                  ✕
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={startConfirm}
                title="Close position — sell at current market price"
                aria-label="Close position"
                className="flex-shrink-0 font-mono text-jtp-2xs font-semibold px-2 py-0.5 rounded-[2px] border border-[rgba(255,91,82,0.4)] text-[#ff5b52] bg-[rgba(255,91,82,0.07)] hover:bg-[rgba(255,91,82,0.15)] transition-colors"
              >
                Close
              </button>
            )
          )}

          {isClearable(trade.status) && onClear && (
            <button
              type="button"
              onClick={onClear}
              disabled={clearBusy}
              title="Dismiss this failed attempt"
              aria-label="Dismiss failed trade attempt"
              className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-[2px] border border-jtp-borderStrong text-jtp-textDim hover:text-[#ff5b52] hover:border-[rgba(255,91,82,0.45)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-mono text-jtp-xs leading-none"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-jtp-2xs pl-[calc(theme(spacing.2)+2.5rem)]">
        <span className="text-jtp-textMuted">@ {priceCents}¢</span>
        <span className="text-jtp-textMuted">{fmtUsd(trade.sizeUsd)}</span>
        {trade.status === 'resolved' && trade.pnlUsd != null && (
          <span
            className={`font-semibold ${pnlColor(trade.pnlUsd)}`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {trade.pnlUsd >= 0 ? '+' : ''}{fmtUsd(trade.pnlUsd)}
          </span>
        )}
        {trade.edgePct != null && (
          <span className="text-[#3ddc84] font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
            +{trade.edgePct.toFixed(1)}%
          </span>
        )}
        {trade.detail && (
          <span className="inline-block px-1.5 py-[1px] rounded-[2px] border border-jtp-borderStrong bg-[rgba(255,255,255,0.04)] text-jtp-textDim">
            {trade.detail}
          </span>
        )}
        <span className="text-jtp-textFaint">{fmtRelTime(trade.createdAt)}</span>
      </div>

      {/* Close disclaimer — shown under open positions */}
      {isOpen && (
        <p className="mt-1 font-mono text-jtp-2xs text-jtp-textFaint italic pl-[calc(theme(spacing.2)+2.5rem)]">
          Closing sells at the current market (mark −5¢ floor) — you may get a little less than holding to settlement.
        </p>
      )}

      {trade.reason && (
        <p className="mt-1 font-mono text-jtp-2xs text-jtp-textFaint italic leading-relaxed line-clamp-2 pl-[calc(theme(spacing.2)+2.5rem)]">
          {trade.reason}
        </p>
      )}

      {trade.status === 'failed' && trade.error && (
        <p className="mt-0.5 font-mono text-jtp-2xs text-[#ff5b52] pl-[calc(theme(spacing.2)+2.5rem)]">
          {trade.error}
        </p>
      )}
    </div>
  );
};

// ─── Filter types & helpers ────────────────────────────────────────────────────

type StatusFilter = 'all' | 'open' | 'won' | 'lost' | 'unfilled';
type StrategyFilter = 'all' | 'copy' | 'ai' | 'arb';

const matchesStatusFilter = (trade: AutobotTrade, f: StatusFilter): boolean => {
  if (f === 'all') return true;
  if (f === 'open') return trade.status === 'filled';
  if (f === 'won') return trade.status === 'resolved' && (trade.pnlUsd ?? 0) > 0;
  if (f === 'lost') return trade.status === 'resolved' && (trade.pnlUsd ?? 0) <= 0;
  if (f === 'unfilled') return trade.status === 'unfilled' || trade.status === 'failed';
  return true;
};

const matchesStrategyFilter = (trade: AutobotTrade, f: StrategyFilter): boolean => {
  if (f === 'all') return true;
  return (trade.signalType ?? '') === f;
};

// ─── Equity curve chart tooltip ────────────────────────────────────────────────

// Mirrors the SimTooltip in WhatWorksPanel; renders cumulative $ P&L (can be negative).
const PerfTooltip: React.FC<any> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const pnl: number = payload[0]?.value ?? 0;
  const sign = pnl >= 0 ? '+' : '';
  const color = pnl >= 0 ? '#3ddc84' : '#ff5b52';
  return (
    <div
      style={{ background: '#0d0f12', border: '1px solid #1b2026', borderRadius: 2 }}
      className="px-3 py-2"
    >
      <span className="font-mono text-jtp-xs" style={{ color }}>
        {sign}${Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );
};

// ─── TradeFilterBar ────────────────────────────────────────────────────────────

const STATUS_CHIPS: { value: StatusFilter; label: string }[] = [
  { value: 'all',      label: 'All' },
  { value: 'open',     label: 'Open' },
  { value: 'won',      label: 'Won' },
  { value: 'lost',     label: 'Lost' },
  { value: 'unfilled', label: 'Unfilled' },
];

const STRATEGY_CHIPS: { value: StrategyFilter; label: string }[] = [
  { value: 'all',  label: 'All' },
  { value: 'copy', label: 'Copy' },
  { value: 'ai',   label: 'AI' },
  { value: 'arb',  label: 'Arb' },
];

interface TradeFilterBarProps {
  trades: AutobotTrade[];
  statusFilter: StatusFilter;
  strategyFilter: StrategyFilter;
  onStatusChange: (f: StatusFilter) => void;
  onStrategyChange: (f: StrategyFilter) => void;
}

const TradeFilterBar: React.FC<TradeFilterBarProps> = ({
  trades, statusFilter, strategyFilter, onStatusChange, onStrategyChange,
}) => {
  const statusCounts: Record<StatusFilter, number> = {
    all:      trades.length,
    open:     trades.filter((t) => t.status === 'filled').length,
    won:      trades.filter((t) => t.status === 'resolved' && (t.pnlUsd ?? 0) > 0).length,
    lost:     trades.filter((t) => t.status === 'resolved' && (t.pnlUsd ?? 0) <= 0).length,
    unfilled: trades.filter((t) => t.status === 'unfilled' || t.status === 'failed').length,
  };

  const strategyCounts: Record<StrategyFilter, number> = {
    all:  trades.length,
    copy: trades.filter((t) => t.signalType === 'copy').length,
    ai:   trades.filter((t) => t.signalType === 'ai').length,
    arb:  trades.filter((t) => t.signalType === 'arb').length,
  };

  const chipBase =
    'font-mono text-jtp-2xs font-semibold px-2.5 py-1 rounded-[2px] border transition-colors whitespace-nowrap select-none';
  const chipInactive =
    'bg-jtp-bg text-jtp-textMuted border-jtp-borderStrong hover:text-jtp-text hover:border-jtp-borderFocus';

  const statusChipClass = (v: StatusFilter): string => {
    if (v !== statusFilter) return `${chipBase} ${chipInactive}`;
    if (v === 'won')  return `${chipBase} bg-[rgba(61,220,132,0.10)] text-[#3ddc84] border-[rgba(61,220,132,0.40)]`;
    if (v === 'lost') return `${chipBase} bg-[rgba(255,91,82,0.10)] text-[#ff5b52] border-[rgba(255,91,82,0.40)]`;
    return `${chipBase} bg-[rgba(232,162,61,0.14)] text-[#e8a23d] border-[rgba(232,162,61,0.45)]`;
  };

  const strategyChipClass = (v: StrategyFilter): string =>
    v === strategyFilter
      ? `${chipBase} bg-[rgba(232,162,61,0.14)] text-[#e8a23d] border-[rgba(232,162,61,0.45)]`
      : `${chipBase} ${chipInactive}`;

  return (
    <div className="px-4 pt-3 pb-2 border-b border-jtp-borderSubtle space-y-2">
      <div className="flex flex-wrap gap-1.5 items-center" role="group" aria-label="Filter by status">
        <span className="font-mono text-jtp-2xs text-jtp-textFaint uppercase tracking-wider mr-1 flex-shrink-0">
          Status
        </span>
        {STATUS_CHIPS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={statusFilter === value}
            onClick={() => onStatusChange(value)}
            className={statusChipClass(value)}
          >
            {label} ({statusCounts[value]})
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 items-center" role="group" aria-label="Filter by strategy">
        <span className="font-mono text-jtp-2xs text-jtp-textFaint uppercase tracking-wider mr-1 flex-shrink-0">
          Strategy
        </span>
        {STRATEGY_CHIPS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={strategyFilter === value}
            onClick={() => onStrategyChange(value)}
            className={strategyChipClass(value)}
          >
            {label} ({strategyCounts[value]})
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Polymarket-mirrored row components ────────────────────────────────────────

// Filter type for the Polymarket-mirrored trade view
type PerfFilter = 'history' | 'open' | 'won' | 'lost';

interface PerfFilterBarProps {
  filter: PerfFilter;
  onFilter: (f: PerfFilter) => void;
  historyCount: number;
  openCount: number;
  wonCount: number;
  lostCount: number;
}

const PerfFilterBar: React.FC<PerfFilterBarProps> = ({
  filter, onFilter, historyCount, openCount, wonCount, lostCount,
}) => {
  const chips: { value: PerfFilter; label: string }[] = [
    { value: 'history', label: `History (${historyCount})` },
    { value: 'open',    label: `Open (${openCount})` },
    { value: 'won',     label: `Won (${wonCount})` },
    { value: 'lost',    label: `Lost (${lostCount})` },
  ];

  const chipBase =
    'font-mono text-jtp-2xs font-semibold px-2.5 py-1 rounded-[2px] border transition-colors whitespace-nowrap select-none';
  const chipInactive =
    'bg-jtp-bg text-jtp-textMuted border-jtp-borderStrong hover:text-jtp-text hover:border-jtp-borderFocus';

  const chipClass = (v: PerfFilter): string => {
    if (v !== filter) return `${chipBase} ${chipInactive}`;
    if (v === 'won')  return `${chipBase} bg-[rgba(61,220,132,0.10)] text-[#3ddc84] border-[rgba(61,220,132,0.40)]`;
    if (v === 'lost') return `${chipBase} bg-[rgba(255,91,82,0.10)] text-[#ff5b52] border-[rgba(255,91,82,0.40)]`;
    return `${chipBase} bg-[rgba(232,162,61,0.14)] text-[#e8a23d] border-[rgba(232,162,61,0.45)]`;
  };

  return (
    <div className="px-4 pt-3 pb-2 border-b border-jtp-borderSubtle">
      <div className="flex flex-wrap gap-1.5 items-center" role="group" aria-label="Filter trade history">
        {chips.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => onFilter(value)}
            className={chipClass(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

// Shared market icon — small rounded img with graceful fallback
const MarketIcon: React.FC<{ icon?: string; title?: string }> = ({ icon, title }) =>
  icon ? (
    <img
      src={icon}
      alt=""
      aria-hidden="true"
      title={title}
      className="w-7 h-7 rounded-full flex-shrink-0 object-cover bg-jtp-control"
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
    />
  ) : (
    <div className="w-7 h-7 rounded-full flex-shrink-0 bg-jtp-control border border-jtp-borderStrong" aria-hidden="true" />
  );

// History row — mirrors Polymarket History tab
const HistoryRow: React.FC<{ item: AutobotPerformanceHistoryItem }> = ({ item }) => {
  const isTrade  = item.type === 'TRADE';
  const isRedeem = item.type === 'REDEEM';
  const isBuy    = item.side === 'BUY';

  const badgeLabel = isTrade ? (isBuy ? 'BUY' : 'SELL') : item.type;
  const badgeVariant: 'neutral' | 'info' | 'profit' | 'loss' | 'warning' =
    isTrade ? (isBuy ? 'info' : 'warning') : 'profit';

  // "@ 52¢" — only for TRADE rows with a meaningful fill price
  const showPrice = isTrade && typeof item.price === 'number' && item.price > 0;
  const priceCents = showPrice ? Math.round((item.price as number) * 100) : 0;

  const resolveLabel = fmtResolve(item.endDate);

  return (
    <div className="px-4 py-3 border-b border-jtp-borderSubtle last:border-b-0 hover:bg-jtp-hover transition-colors flex items-center gap-3 min-w-0">
      <MarketIcon icon={item.icon} />
      <span className="flex-shrink-0">
        <Badge variant={badgeVariant} size="xs">{badgeLabel}</Badge>
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-mono text-jtp-xs text-jtp-text leading-snug truncate">{item.title}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
          {item.outcome && (
            <span className={`font-mono text-jtp-2xs font-semibold ${outcomeColor(item.outcome)}`}>
              {item.outcome}{showPrice ? ` @ ${priceCents}¢` : ''}
            </span>
          )}
          {isRedeem && (
            <span className="font-mono text-jtp-2xs text-jtp-textDim">won · cashed out</span>
          )}
          {resolveLabel && (
            <span className={`font-mono text-jtp-2xs ${resolveLabel === 'resolved' ? 'text-jtp-textFaint' : 'text-[#e8a23d]'}`}>
              {resolveLabel}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end flex-shrink-0 gap-0.5">
        <span
          className="font-mono text-jtp-xs text-jtp-text font-semibold"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          ${item.usdcSize.toFixed(2)}
        </span>
        <span className="font-mono text-jtp-2xs text-jtp-textFaint">{fmtRelTimeMs(item.ts)}</span>
      </div>
    </div>
  );
};

// Open position row — with Close button (same confirm-phase pattern as TradeCard)
interface OpenRowProps {
  pos: AutobotPerformanceOpenPosition;
  onClose?: () => Promise<void>;
  closeBusy?: boolean;
}

const OpenRow: React.FC<OpenRowProps> = ({ pos, onClose, closeBusy }) => {
  const [closePhase, setClosePhase] = useState<'idle' | 'confirm'>('idle');
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startConfirm = () => {
    setClosePhase('confirm');
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    confirmTimerRef.current = setTimeout(() => setClosePhase('idle'), 5000);
  };
  const cancelConfirm = () => {
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    setClosePhase('idle');
  };
  const doClose = async () => {
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    setClosePhase('idle');
    if (onClose) await onClose();
  };

  const openPriceCents = Math.round(pos.price * 100);
  const resolveLabel = fmtResolve(pos.endDate);

  return (
    <div className="px-4 py-3 border-b border-jtp-borderSubtle last:border-b-0 hover:bg-jtp-hover transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-wrap">
        <MarketIcon icon={pos.icon} />
        <div className="flex-1 min-w-0">
          <p className="font-mono text-jtp-xs text-jtp-text leading-snug truncate">{pos.title}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
            {pos.outcome && (
              <span className={`font-mono text-jtp-2xs font-semibold ${outcomeColor(pos.outcome)}`}>
                {pos.outcome} @ {openPriceCents}¢
              </span>
            )}
            {resolveLabel && (
              <span className={`font-mono text-jtp-2xs ${resolveLabel === 'resolved' ? 'text-jtp-textFaint' : 'text-[#e8a23d]'}`}>
                {resolveLabel}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {/* Cost → Value */}
          <span
            className="font-mono text-jtp-2xs text-jtp-textMuted"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            ${pos.cost.toFixed(2)}&nbsp;→&nbsp;
            <span className="text-jtp-text">${pos.value.toFixed(2)}</span>
          </span>
          {/* P&L */}
          <span
            className={`font-mono text-jtp-xs font-semibold ${pnlColor(pos.pnlUsd)}`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {pos.pnlUsd >= 0 ? '+' : ''}{fmtUsd(pos.pnlUsd)}
          </span>
          {/* Close button */}
          {onClose && (
            closeBusy ? (
              <span className="flex items-center gap-1 font-mono text-jtp-2xs text-jtp-textDim" aria-label="Closing position">
                <Spin /> closing…
              </span>
            ) : closePhase === 'confirm' ? (
              <span className="flex items-center gap-1" role="group" aria-label="Confirm close position">
                <span className="font-mono text-jtp-2xs text-[#ff5b52] font-semibold">Sell?</span>
                <button
                  type="button"
                  onClick={doClose}
                  aria-label="Confirm sell position"
                  className="flex items-center justify-center w-5 h-5 rounded-[2px] border border-[rgba(61,220,132,0.5)] text-[#3ddc84] hover:bg-[rgba(61,220,132,0.12)] transition-colors font-mono text-jtp-xs leading-none font-bold"
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={cancelConfirm}
                  aria-label="Cancel sell"
                  className="flex items-center justify-center w-5 h-5 rounded-[2px] border border-jtp-borderStrong text-jtp-textDim hover:text-jtp-text transition-colors font-mono text-jtp-xs leading-none"
                >
                  ✕
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={startConfirm}
                title="Close position — sell at current market price"
                aria-label="Close position"
                className="flex-shrink-0 font-mono text-jtp-2xs font-semibold px-2 py-0.5 rounded-[2px] border border-[rgba(255,91,82,0.4)] text-[#ff5b52] bg-[rgba(255,91,82,0.07)] hover:bg-[rgba(255,91,82,0.15)] transition-colors"
              >
                Close
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

// Settled market row (Won / Lost)
const SettledRow: React.FC<{ item: AutobotPerformanceSettled }> = ({ item }) => (
  <div className="px-4 py-3 border-b border-jtp-borderSubtle last:border-b-0 hover:bg-jtp-hover transition-colors flex items-center gap-3 min-w-0">
    <MarketIcon icon={item.icon} />
    <div className="flex-1 min-w-0">
      <p className="font-mono text-jtp-xs text-jtp-text leading-snug truncate">{item.title}</p>
      <span
        className="font-mono text-jtp-2xs text-jtp-textMuted"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        ${item.cost.toFixed(2)}&nbsp;→&nbsp;
        <span className="text-jtp-text">${item.proceeds.toFixed(2)}</span>
      </span>
    </div>
    <div className="flex flex-col items-end flex-shrink-0 gap-0.5">
      <span
        className={`font-mono text-jtp-xs font-semibold ${pnlColor(item.pnlUsd)}`}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {item.pnlUsd >= 0 ? '+' : ''}{fmtUsd(item.pnlUsd)}
      </span>
      <span className="font-mono text-jtp-2xs text-jtp-textFaint">{fmtRelTimeMs(item.ts)}</span>
    </div>
  </div>
);

// ─── Performance tab ───────────────────────────────────────────────────────────

interface PerformanceTabProps {
  perf: AutobotPerformance | null;
  perfLoading: boolean;
  trades: AutobotTrade[];
  tradesLoading: boolean;
  lastUpdated: string | null;
  onClearTrades: (id?: string) => Promise<void>;
  clearBusy: boolean;
  onClose: (tokenId: string) => Promise<void>;
  closingId: string | null;
  onCloseAll: () => Promise<void>;
  closeAllBusy: boolean;
}

// Recharts AreaChart mirroring WhatWorksPanel's PaperWalletSimCard chart:
// same library, same Area/XAxis/YAxis/Tooltip props, same gradient/fill approach.
// dataKey is "pnl" (cumulative realized $, can go negative) instead of "balance".
const PerformanceTab: React.FC<PerformanceTabProps> = ({
  perf, perfLoading, trades, tradesLoading, lastUpdated, onClearTrades, clearBusy,
  onClose, closingId, onCloseAll, closeAllBusy,
}) => {
  const [perfFilter, setPerfFilter] = useState<PerfFilter>('history');

  if (perfLoading && !perf) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} variant="stat" />)}
        </div>
        <Skeleton className="h-36 w-full" />
        <Skeleton variant="panel" className="h-24" />
      </div>
    );
  }

  const st = perf?.stats;
  const curve = perf?.curve ?? [];
  const chartData = curve.map((pt) => ({ t: pt.t, pnl: pt.pnl }));
  const hasCurve = chartData.length >= 2;
  const resolved = st?.resolved ?? 0;

  const finalPnl = curve.length > 0 ? curve[curve.length - 1].pnl : 0;
  const isUp = finalPnl >= 0;
  const lineColor = isUp ? '#3ddc84' : '#ff5b52';
  const areaId = isUp ? 'autobotAreaUp' : 'autobotAreaDown';

  const yAxisFormatter = (v: number) => {
    const sign = v < 0 ? '-' : '';
    const abs = Math.abs(v);
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
    return `${sign}$${abs.toFixed(0)}`;
  };

  // Polymarket-sourced lists
  const historyItems: AutobotPerformanceHistoryItem[] = perf?.history ?? [];
  const openPositions: AutobotPerformanceOpenPosition[] = perf?.open ?? [];
  const wonItems: AutobotPerformanceSettled[] = perf?.settled?.filter((s) => s.win) ?? [];
  const lostItems: AutobotPerformanceSettled[] = perf?.settled?.filter((s) => !s.win) ?? [];

  // Open count: prefer live positions from perf, fall back to DB trades
  const openCount = openPositions.length > 0
    ? openPositions.length
    : trades.filter((t) => t.status === 'filled').length;

  const hasClearable = trades.some((t) => isClearable(t.status));

  return (
    <div className="flex flex-col gap-4">

      {/* ── Stat tiles: 7 metrics driven by Polymarket ground-truth ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatTile
          label="REALIZED P&amp;L"
          value={
            st
              ? st.realizedPnlUsd === 0
                ? '$0.00'
                : `${st.realizedPnlUsd >= 0 ? '+' : ''}${fmtUsd(st.realizedPnlUsd)}`
              : '—'
          }
          valueColor={st ? pnlColor(st.realizedPnlUsd) : undefined}
          subValue="from Polymarket"
        />
        <StatTile
          label="RIGHT"
          value={st ? String(st.wins) : '—'}
          valueColor="text-[#3ddc84]"
          subValue="trades won"
        />
        <StatTile
          label="WRONG"
          value={st ? String(st.losses) : '—'}
          valueColor="text-[#ff5b52]"
          subValue="trades lost"
        />
        <StatTile
          label="WIN RATE"
          value={st && resolved > 0 ? fmtPct(st.winRate) : '—'}
          subValue={st && resolved > 0 ? `${resolved} resolved` : 'no resolved yet'}
        />
        <StatTile
          label="MAX DRAWDOWN"
          value={st ? fmtUsd(st.maxDrawdownUsd) : '—'}
          valueColor="text-[#ff5b52]"
        />
        <StatTile
          label="OPEN EXPOSURE"
          value={st ? fmtUsd(st.openExposureUsd) : '—'}
          valueColor="text-jtp-textMuted"
        />
        <StatTile
          label="WALLET"
          value={st ? fmtUsd(st.walletUsdce) : '—'}
          subValue="USDC.e"
          valueColor="text-jtp-text"
        />
      </div>

      {/* ── Equity curve ── */}
      {resolved === 0 ? (
        <div
          className="rounded-jtp-sm border border-jtp-borderSubtle flex items-center justify-center"
          style={{ background: '#090b0d', minHeight: 140 }}
        >
          <p className="font-mono text-jtp-xs text-jtp-textFaint text-center max-w-xs px-4">
            No resolved trades yet — Polymarket markets resolve over hours-to-days; win/loss fills in as they settle.
          </p>
        </div>
      ) : hasCurve ? (
        <div
          className="rounded-jtp-sm overflow-hidden"
          style={{ background: '#090b0d', height: 140 }}
          aria-label="Cumulative realized P&L over time"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={lineColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={lineColor} stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" hide />
              <YAxis
                tickFormatter={yAxisFormatter}
                tick={{ fill: '#565d66', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <RechartsTooltip
                content={<PerfTooltip />}
                cursor={{ stroke: '#1b2026', strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="pnl"
                stroke={lineColor}
                strokeWidth={1.5}
                fill={`url(#${areaId})`}
                dot={false}
                activeDot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="font-mono text-jtp-xs text-jtp-textFaint py-2">
          Building curve… more data points accumulate as markets settle.
        </p>
      )}

      {/* ── Polymarket-mirrored History / Positions panel ── */}
      <Panel
        label="LIVE TRADES"
        noPadding
        actions={
          <div className="flex items-center gap-3 flex-wrap">
            {/* Close all open positions — uses perf.open count when available */}
            {openCount >= 1 && (
              <button
                type="button"
                onClick={onCloseAll}
                disabled={closeAllBusy || closingId !== null}
                className="font-mono text-jtp-2xs font-semibold px-2.5 py-1 rounded-[2px] border border-[rgba(255,91,82,0.45)] text-[#ff5b52] bg-[rgba(255,91,82,0.09)] hover:bg-[rgba(255,91,82,0.18)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                aria-label={`Close all ${openCount} open position${openCount === 1 ? '' : 's'}`}
              >
                {closeAllBusy ? <Spin /> : null}
                Close all open ({openCount})
              </button>
            )}
            {hasClearable && (
              <button
                type="button"
                onClick={() => onClearTrades(undefined)}
                disabled={clearBusy}
                className="font-mono text-jtp-2xs font-semibold px-2.5 py-1 rounded-[2px] border border-[rgba(255,91,82,0.35)] text-[#ff5b52] bg-[rgba(255,91,82,0.07)] hover:bg-[rgba(255,91,82,0.14)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Clear all failed and unfilled trade attempts"
              >
                {clearBusy ? <Spin /> : 'Clear failed'}
              </button>
            )}
            <span className="font-mono text-jtp-xs text-jtp-textMuted flex items-center gap-2" aria-live="polite">
              {tradesLoading ? (
                <>
                  <Spin />
                  <span className="text-jtp-textDim">updating…</span>
                </>
              ) : lastUpdated ? (
                <>
                  <span className="inline-block w-2 h-2 rounded-full bg-[#3ddc84] animate-pulse" aria-hidden="true" />
                  <span className="font-semibold text-jtp-textMuted">updated {lastUpdated}</span>
                </>
              ) : null}
            </span>
          </div>
        }
      >
        {/* Filter chips */}
        <PerfFilterBar
          filter={perfFilter}
          onFilter={setPerfFilter}
          historyCount={historyItems.length}
          openCount={openPositions.length}
          wonCount={wonItems.length}
          lostCount={lostItems.length}
        />

        {/* History view — Polymarket activity feed */}
        {perfFilter === 'history' && (
          historyItems.length === 0 ? (
            <EmptyState
              title="No activity yet"
              description="Polymarket buys, sells, and redeems will appear here once the account is linked and trades are placed."
            />
          ) : (
            <div className="divide-y-0">
              {historyItems.map((item, idx) => (
                <HistoryRow key={`${item.ts}-${idx}`} item={item} />
              ))}
            </div>
          )
        )}

        {/* Open positions view */}
        {perfFilter === 'open' && (
          openPositions.length === 0 ? (
            <EmptyState
              title="No open positions"
              description="Live open positions from Polymarket will appear here."
            />
          ) : (
            <div className="divide-y-0">
              {openPositions.map((pos) => (
                <OpenRow
                  key={pos.tokenId || pos.conditionId}
                  pos={pos}
                  onClose={pos.tokenId ? () => onClose(pos.tokenId) : undefined}
                  closeBusy={closingId === pos.tokenId}
                />
              ))}
            </div>
          )
        )}

        {/* Won markets view */}
        {perfFilter === 'won' && (
          wonItems.length === 0 ? (
            <EmptyState
              title="No won markets yet"
              description="Markets you won will appear here once they settle."
            />
          ) : (
            <div className="divide-y-0">
              {wonItems.map((item, idx) => (
                <SettledRow key={`${item.conditionId}-${idx}`} item={item} />
              ))}
            </div>
          )
        )}

        {/* Lost markets view */}
        {perfFilter === 'lost' && (
          lostItems.length === 0 ? (
            <EmptyState
              title="No lost markets yet"
              description="Markets you lost will appear here once they settle."
            />
          ) : (
            <div className="divide-y-0">
              {lostItems.map((item, idx) => (
                <SettledRow key={`${item.conditionId}-${idx}`} item={item} />
              ))}
            </div>
          )
        )}
      </Panel>
    </div>
  );
};

// ─── Strategies card ───────────────────────────────────────────────────────────

type StrategyKey = 'copy' | 'ai' | 'arb';

const STRATEGY_META: { key: StrategyKey; label: string; desc: string }[] = [
  { key: 'copy', label: 'Copy top wallets',  desc: 'Mirror qualified top wallets (Sports-led, fast-settling)' },
  { key: 'ai',   label: 'AI judgment',        desc: 'AI bets contrarian on mispriced narrative markets' },
  { key: 'arb',  label: 'Arbitrage',          desc: 'Near-certain favorites about to settle' },
];

interface StrategiesCardProps {
  strategies: NonNullable<AutobotStatus['strategies']>;
  strategyStats: NonNullable<AutobotStatus['strategyStats']>;
  strategyBusy: Record<StrategyKey, boolean>;
  onToggle: (key: StrategyKey, next: boolean) => void;
}

const StrategiesCard: React.FC<StrategiesCardProps> = ({ strategies, strategyStats, strategyBusy, onToggle }) => (
  <Panel label="STRATEGIES">
    <p className="font-mono text-jtp-xs text-jtp-textMuted mb-3">
      Turn strategies on/off and watch which one actually makes money — then keep the winners.
    </p>
    <div className="space-y-0 divide-y divide-jtp-borderSubtle">
      {STRATEGY_META.map(({ key, label, desc }) => {
        const enabled = strategies[key];
        const stats   = strategyStats[key];
        const busy    = strategyBusy[key];

        const scoreline = (() => {
          if (stats.resolved === 0) return 'no results yet';
          const pnlSign  = stats.pnlUsd >= 0 ? '+' : '';
          const pnlColor = stats.pnlUsd > 0
            ? 'text-[#3ddc84]'
            : stats.pnlUsd < 0
              ? 'text-[#ff5b52]'
              : 'text-jtp-textMuted';
          return (
            <span className="flex items-center gap-2 flex-wrap">
              <span>{stats.trades} trades</span>
              <span className="text-jtp-textFaint">&middot;</span>
              <span>{stats.resolved} resolved</span>
              <span className="text-jtp-textFaint">&middot;</span>
              <span>{(stats.winRate * 100).toFixed(0)}% win</span>
              <span className="text-jtp-textFaint">&middot;</span>
              <span className={pnlColor} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {pnlSign}${Math.abs(stats.pnlUsd).toFixed(2)} P&amp;L
              </span>
            </span>
          );
        })();

        return (
          <div key={key} className="py-3 flex items-start gap-4">
            {/* Left: name + desc + scorecard */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-mono text-jtp-xs font-semibold ${enabled ? 'text-jtp-text' : 'text-jtp-textDim'}`}>
                  {label}
                </span>
                {busy && <Spin />}
              </div>
              <p className="font-mono text-jtp-2xs text-jtp-textFaint mt-0.5 leading-snug">
                {desc}
              </p>
              <div className="font-mono text-jtp-2xs text-jtp-textMuted mt-1.5">
                {scoreline}
              </div>
            </div>

            {/* Right: toggle */}
            <div className="flex-shrink-0 pt-0.5">
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label={`${enabled ? 'Disable' : 'Enable'} ${label} strategy`}
                disabled={busy}
                onClick={() => onToggle(key, !enabled)}
                className={[
                  'relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none',
                  'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-jtp-panel focus-visible:ring-[#3ddc84]',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                  enabled
                    ? 'bg-[#3ddc84]'
                    : 'bg-jtp-control border border-jtp-borderStrong',
                ].join(' ')}
              >
                <span className="sr-only">{enabled ? 'On' : 'Off'}</span>
                <span
                  className={`inline-block w-3.5 h-3.5 transform rounded-full shadow-sm transition-transform ${
                    enabled ? 'bg-[#0d1510] translate-x-4' : 'bg-white translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  </Panel>
);

// ─── Controls tab ──────────────────────────────────────────────────────────────

interface ControlsTabProps {
  status: AutobotStatus;
  modeBusy: boolean;
  modeError: string | null;
  killBusy: boolean;
  killErr: string | null;
  onModeChange: (mode: 'off' | 'auto') => void;
  onKill: () => void;
  onSetLimits: (limits: { maxTotalUsd?: number; maxPerTradeUsd?: number; dailyLossLimitUsd?: number; minEdgePct?: number; orderType?: 'limit' | 'market'; maxSettlementDays?: number; netDepositsUsd?: number }) => Promise<void>;
  onWithdrawOpen: () => void;
  onExportKeyOpen: () => void;
  onLink: (address: string) => Promise<void>;
  onUnlink: () => Promise<void>;
  onSetStrategies: (s: { copy?: boolean; ai?: boolean; arb?: boolean }) => Promise<void>;
  strategyBusy: Record<StrategyKey, boolean>;
}

const ControlsTab: React.FC<ControlsTabProps> = ({
  status, modeBusy, modeError, killBusy, killErr,
  onModeChange, onKill, onSetLimits, onWithdrawOpen, onExportKeyOpen,
  onLink, onUnlink, onSetStrategies, strategyBusy,
}) => {
  const isAuto = status.mode === 'auto';

  return (
    <div className="flex flex-col gap-4">

      {/* ── Mode toggle ── */}
      <Panel label="BOT MODE">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
          <div className="flex-1">
            <SegmentedControl<'off' | 'auto'>
              segments={MODE_SEGS}
              value={status.mode}
              onChange={onModeChange}
            />
          </div>
          <div className="flex items-center gap-3">
            {modeBusy && <Spin />}
            {isAuto && (
              <span className="flex items-center gap-1.5 font-mono text-jtp-xs font-semibold text-[#3ddc84]" aria-live="polite">
                <span className="inline-block w-2 h-2 rounded-full bg-[#3ddc84] animate-pulse" aria-hidden="true" />
                BOT LIVE
              </span>
            )}
            {status.killSwitch && (
              <Badge variant="loss" size="sm">KILL SWITCH ON</Badge>
            )}
          </div>
        </div>
        {modeError && (
          <p role="alert" className="mt-2 text-jtp-xs text-[#ff5b52] font-mono">{modeError}</p>
        )}
        {!status.linked && (
          <p className="mt-2 font-mono text-jtp-xs text-[#e8a23d]" role="note">
            Auto mode won&apos;t place real trades until your Polymarket account is linked (see Bot Wallet below).
          </p>
        )}
      </Panel>

      {/* ── Money management — shown when Polymarket account is linked ── */}
      {status.linked && (
        <Panel label="MONEY MANAGEMENT">
          <MoneyManagementSection status={status} />
        </Panel>
      )}

      {/* ── Strategies ── */}
      {status.strategies && status.strategyStats && (
        <StrategiesCard
          strategies={status.strategies}
          strategyStats={status.strategyStats}
          strategyBusy={strategyBusy}
          onToggle={(key, next) => onSetStrategies({ [key]: next })}
        />
      )}

      {/* ── Two-column: wallet + limits ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Bot wallet */}
        <Panel
          label="BOT WALLET"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="secondary" onClick={onExportKeyOpen} className="!px-3 !py-1.5 text-jtp-xs">
                Export private key
              </Button>
              <Button variant="secondary" onClick={onWithdrawOpen} className="!px-3 !py-1.5 text-jtp-xs">
                Withdraw
              </Button>
            </div>
          }
        >
          {/* Address */}
          <div className="mb-4">
            <div className="jtp-label mb-1">ADDRESS (POLYGON)</div>
            <div className="flex items-center flex-wrap gap-1">
              <span className="font-mono text-jtp-xs text-jtp-text break-all" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {status.address}
              </span>
              <CopyButton text={status.address} />
            </div>
          </div>

          {/* Balances — when linked: shown as secondary "gas / signer wallet"; when unlinked: shown as the fundable wallet */}
          {status.linked ? (
            <div className="mb-4">
              <div className="jtp-label mb-1 text-jtp-textDim">GAS / SIGNER WALLET</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-jtp-bg border border-jtp-borderSubtle rounded-[2px] px-3 py-2">
                  <div className="jtp-label text-jtp-2xs mb-0.5 text-jtp-textFaint">USDC.e</div>
                  <div className="font-mono font-semibold text-jtp-md text-jtp-textDim" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {fmtUsd(status.balance.usdce)}
                  </div>
                  <div className="font-mono text-jtp-2xs text-jtp-textFaint mt-0.5">signer only — ~$1 needed</div>
                </div>
                <div className="bg-jtp-bg border border-jtp-borderSubtle rounded-[2px] px-3 py-2">
                  <div className="jtp-label text-jtp-2xs mb-0.5 text-jtp-textFaint">POL</div>
                  <div className="font-mono font-semibold text-jtp-md text-jtp-textDim" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {status.balance.pol.toFixed(3)}
                  </div>
                  <div className="font-mono text-jtp-2xs text-jtp-textFaint mt-0.5">gas</div>
                </div>
              </div>
              <p className="mt-2 font-mono text-jtp-2xs text-jtp-textFaint leading-relaxed">
                This is the bot&apos;s signing key — it authorises orders but the real trading
                funds live in your Polymarket account (shown in Trading Balance above).
                Keep ~$1 USDC.e + a small POL balance here for gas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-jtp-bg border border-jtp-border rounded-[2px] px-3 py-3">
                <div className="jtp-label mb-1">USDC.e</div>
                <div className="font-mono font-bold text-jtp-2xl text-jtp-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {fmtUsd(status.balance.usdce)}
                </div>
              </div>
              <div className="bg-jtp-bg border border-jtp-border rounded-[2px] px-3 py-3">
                <div className="jtp-label mb-1">POL (GAS)</div>
                <div className="font-mono font-bold text-jtp-2xl text-jtp-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {status.balance.pol.toFixed(3)}
                </div>
              </div>
            </div>
          )}

          <LinkPolymarketSection status={status} onLink={onLink} onUnlink={onUnlink} />

          {!status.linked && (
            <div className="rounded-[2px] border border-jtp-borderSubtle bg-jtp-bg px-3 py-2.5 mt-3">
              <p className="font-mono text-jtp-xs text-jtp-textMuted leading-relaxed">
                <span className="text-jtp-text font-semibold">Manual option:</span>{' '}
                send <span className="text-jtp-text">USDC.e</span> +
                ~$1 worth of <span className="text-jtp-text">POL</span> for gas on{' '}
                <span className="text-jtp-text">Polygon</span> to the address above.
              </p>
            </div>
          )}
        </Panel>

        {/* Limits & kill switch */}
        <Panel label="LIMITS &amp; KILL SWITCH">
          <div className="mb-4">
            <Button
              variant="danger"
              onClick={onKill}
              isLoading={killBusy}
              disabled={killBusy}
              className="w-full !py-3 text-jtp-base font-bold tracking-widest"
              aria-label="Emergency kill switch — stop all bot activity"
            >
              KILL SWITCH — STOP EVERYTHING NOW
            </Button>
            {status.killSwitch && (
              <p className="mt-1.5 font-mono text-jtp-xs text-[#ff5b52]">
                Kill switch is active. Bot is halted. Change mode to re-enable.
              </p>
            )}
            {killErr && (
              <p role="alert" className="mt-1.5 font-mono text-jtp-xs text-[#ff5b52]">{killErr}</p>
            )}
          </div>

          <LimitsEditor limits={status.limits} netDepositsUsd={status.netDepositsUsd} onSave={onSetLimits} />
        </Panel>
      </div>

      {/* ── AI Copilot ── */}
      <QuantCopilot />
    </div>
  );
};

// ─── Money management section ──────────────────────────────────────────────────

interface MoneyManagementSectionProps {
  status: AutobotStatus;
}

const MoneyManagementSection: React.FC<MoneyManagementSectionProps> = ({ status }) => {
  const portfolio     = status.portfolioValue ?? 0;
  const available     = status.availableUsd ?? status.tradeableUsdce ?? 0;
  const positionsVal  = status.positionsValue ?? status.exposureUsd ?? 0;
  const openPositions = status.openPositions ?? 0;
  const unrealizedPnl = status.unrealizedPnlUsd ?? 0;
  const realizedPnl   = status.stats.realizedPnlUsd;
  const todayPnl      = status.todayPnlUsd ?? 0;
  const totalPnl      = status.totalPnlUsd ?? null;
  const netDeposits   = status.netDepositsUsd;

  // Border color for Total P&L tile — green when profit, red when loss, amber when unset
  const totalPnlBorderColor =
    totalPnl === null
      ? 'rgba(232,162,61,0.45)'
      : totalPnl >= 0
        ? 'rgba(61,220,132,0.55)'
        : 'rgba(255,91,82,0.55)';

  return (
    <div className="space-y-3">
      {/* ── Seven money tiles (Total P&L is the headline) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">

        {/* TOTAL P&L — ground-truth headline metric: portfolioValue − netDeposits */}
        <div
          className="bg-jtp-bg rounded-[2px] px-3 py-3 flex flex-col gap-1 col-span-2 sm:col-span-2 lg:col-span-1"
          style={{ border: `2px solid ${totalPnlBorderColor}` }}
          aria-label="Total P&L vs deposits — the real profit number"
        >
          <div
            className="jtp-label"
            style={{ color: totalPnl === null ? '#e8a23d' : totalPnl >= 0 ? '#3ddc84' : '#ff5b52' }}
          >
            TOTAL P&amp;L
          </div>
          <div
            className={`font-mono font-bold text-jtp-2xl ${
              totalPnl === null
                ? 'text-[#e8a23d]'
                : totalPnl >= 0
                  ? 'text-[#3ddc84]'
                  : 'text-[#ff5b52]'
            }`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {totalPnl === null
              ? 'set deposits →'
              : totalPnl === 0
                ? '$0.00'
                : `${totalPnl >= 0 ? '+' : ''}${fmtUsd(totalPnl)}`}
          </div>
          <div className="font-mono text-jtp-2xs text-jtp-textFaint leading-snug">
            {totalPnl !== null && netDeposits != null
              ? `vs deposits (${fmtUsd(netDeposits)}) — the real number`
              : 'set deposits in Limits below'}
          </div>
        </div>

        {/* PORTFOLIO — mirrors Polymarket "Portfolio" figure */}
        <div
          className="bg-jtp-bg border border-[rgba(61,220,132,0.35)] rounded-[2px] px-3 py-3 flex flex-col gap-1"
          aria-label="Portfolio total value"
        >
          <div className="jtp-label text-[#3ddc84]">PORTFOLIO</div>
          <div
            className="font-mono font-bold text-jtp-2xl text-[#3ddc84]"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {fmtUsd(portfolio)}
          </div>
          <div className="font-mono text-jtp-2xs text-jtp-textFaint">cash + positions</div>
        </div>

        {/* CASH (available) */}
        <div
          className="bg-jtp-bg border border-jtp-border rounded-[2px] px-3 py-3 flex flex-col gap-1"
          aria-label="Available cash"
        >
          <div className="jtp-label">CASH</div>
          <div
            className="font-mono font-bold text-jtp-2xl text-jtp-text"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {fmtUsd(available)}
          </div>
          <div className="font-mono text-jtp-2xs text-jtp-textFaint">available</div>
        </div>

        {/* IN POSITIONS */}
        <div
          className="bg-jtp-bg border border-jtp-border rounded-[2px] px-3 py-3 flex flex-col gap-1"
          aria-label="Live value of open positions"
        >
          <div className="jtp-label">IN POSITIONS</div>
          <div
            className="font-mono font-bold text-jtp-2xl text-jtp-textMuted"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {fmtUsd(positionsVal)}
          </div>
          <div className="font-mono text-jtp-2xs text-jtp-textFaint">
            {openPositions > 0 ? `${openPositions} open` : 'no open bets'}
          </div>
        </div>

        {/* UNREALIZED P&L */}
        <div
          className="bg-jtp-bg border border-jtp-border rounded-[2px] px-3 py-3 flex flex-col gap-1"
          aria-label="Unrealized profit and loss on open positions"
        >
          <div className="jtp-label">UNREALIZED P&amp;L</div>
          <div
            className={`font-mono font-bold text-jtp-2xl ${pnlColor(unrealizedPnl)}`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {unrealizedPnl === 0
              ? '$0.00'
              : `${unrealizedPnl >= 0 ? '+' : ''}${fmtUsd(unrealizedPnl)}`}
          </div>
          <div className="font-mono text-jtp-2xs text-jtp-textFaint">unrealized / open</div>
        </div>

        {/* REALIZED P&L */}
        <div
          className="bg-jtp-bg border border-jtp-border rounded-[2px] px-3 py-3 flex flex-col gap-1"
          aria-label="Realized profit and loss from settled trades"
        >
          <div className="jtp-label">REALIZED P&amp;L</div>
          <div
            className={`font-mono font-bold text-jtp-2xl ${pnlColor(realizedPnl)}`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {realizedPnl === 0
              ? '$0.00'
              : `${realizedPnl >= 0 ? '+' : ''}${fmtUsd(realizedPnl)}`}
          </div>
          <div className="font-mono text-jtp-2xs text-jtp-textFaint">settled trades (may lag)</div>
        </div>

        {/* TODAY P&L */}
        <div
          className="bg-jtp-bg border border-jtp-border rounded-[2px] px-3 py-3 flex flex-col gap-1"
          aria-label="Today's profit and loss — matches Polymarket 1-day figure"
        >
          <div className="jtp-label">TODAY</div>
          <div
            className={`font-mono font-bold text-jtp-2xl ${pnlColor(todayPnl)}`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {todayPnl === 0
              ? '$0.00'
              : `${todayPnl >= 0 ? '+' : ''}${fmtUsd(todayPnl)}`}
          </div>
          <div className="font-mono text-jtp-2xs text-jtp-textFaint">today (1d) — matches Polymarket</div>
        </div>
      </div>

      {/* ── P&L explainer ── */}
      <div className="rounded-[2px] border border-jtp-borderSubtle bg-jtp-bg px-3 py-2">
        <p className="font-mono text-jtp-xs text-jtp-textMuted leading-relaxed">
          <span className="text-jtp-text font-semibold">Unrealized</span> = live value of open
          bets (moves until they settle).{' '}
          <span className="text-jtp-text font-semibold">Realized</span> = locked-in profit from
          resolved markets.
        </p>
      </div>

      {/* ── Sizing explainer ── */}
      <div className="rounded-[2px] border border-jtp-borderSubtle bg-jtp-bg px-3 py-2.5">
        <p className="font-mono text-jtp-xs text-jtp-textMuted leading-relaxed">
          The bot sizes each trade dynamically — half-Kelly of your bankroll scaled by the
          signal&apos;s edge — capped at your Max-per-trade (
          <span className="text-jtp-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {fmtUsd(status.limits.maxPerTradeUsd)}
          </span>
          ). It stops opening new trades when Available hits{' '}
          <span className="text-jtp-text">$0</span> or Max-total exposure (
          <span className="text-jtp-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {fmtUsd(status.limits.maxTotalUsd)}
          </span>
          ) is reached.
        </p>
      </div>
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────

const QuantAutoBotPanel: React.FC = () => {
  const { getToken } = useAuth();

  // ── State ──────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<BotTab>('performance');

  const [status, setStatus] = useState<AutobotStatus | null>(null);
  const [perf, setPerf] = useState<AutobotPerformance | null>(null);
  const [trades, setTrades] = useState<AutobotTrade[]>([]);

  const [loading, setLoading] = useState(true);      // initial full load
  const [perfLoading, setPerfLoading] = useState(true);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [modeError, setModeError] = useState<string | null>(null);
  const [modeBusy, setModeBusy] = useState(false);
  const [killBusy, setKillBusy] = useState(false);
  const [killErr, setKillErr] = useState<string | null>(null);
  const [clearBusy, setClearBusy] = useState(false);
  const [strategyBusy, setStrategyBusy] = useState<Record<StrategyKey, boolean>>({ copy: false, ai: false, arb: false });
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [exportKeyOpen, setExportKeyOpen] = useState(false);

  // Close position state
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closeAllBusy, setCloseAllBusy] = useState(false);

  // Inline toast (matches QuantManualArbDesk style)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((t: { msg: string; type: 'success' | 'error' }) => {
    setToast(t);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setTradesLoading(!opts?.silent);
    setLoadErr(null);
    try {
      const token = await getToken();
      const [st, tr, pf] = await Promise.allSettled([
        api.autobotStatus(token),
        api.autobotTrades(60, token),
        api.autobotPerformance(token),
      ]);

      if (st.status === 'fulfilled') setStatus(st.value);
      else if (!status) throw new Error((st as PromiseRejectedResult).reason?.message || 'Could not load bot status.');

      if (tr.status === 'fulfilled') setTrades(Array.isArray(tr.value) ? tr.value : []);

      if (pf.status === 'fulfilled') { setPerf(pf.value); setPerfLoading(false); }
      else setPerfLoading(false);

      setLastUpdated(fmtTimestamp());
    } catch (ex: any) {
      setLoadErr(ex?.message || 'Could not load bot status.');
    } finally {
      setLoading(false);
      setTradesLoading(false);
    }
  }, [getToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(() => fetchAll({ silent: true }), 8_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
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

  const handleSetLimits = async (limits: { maxTotalUsd?: number; maxPerTradeUsd?: number; dailyLossLimitUsd?: number; minEdgePct?: number; orderType?: 'limit' | 'market'; maxSettlementDays?: number; netDepositsUsd?: number }) => {
    const token = await getToken();
    const updated = await api.autobotSetLimits(limits, token);
    setStatus(updated);
  };

  // ── Withdraw ───────────────────────────────────────────────────────────────

  const handleWithdraw = async (to: string) => {
    const token = await getToken();
    await api.autobotWithdraw(to, token);
    fetchAll({ silent: true });
  };

  // ── Export key ─────────────────────────────────────────────────────────────

  const handleExportKey = async (): Promise<{ address: string; privateKey: string }> => {
    const token = await getToken();
    return api.autobotExportKey(token);
  };

  // ── Clear failed / unfilled trades ────────────────────────────────────────

  const handleClearTrades = async (id?: string) => {
    setClearBusy(true);
    try {
      const token = await getToken();
      const updated = await api.autobotClearTrades(id, token);
      if (updated) setStatus(updated);
      await fetchAll({ silent: true });
    } catch {
      // silent — the trades list will refresh on next poll
    } finally {
      setClearBusy(false);
    }
  };

  // ── Set strategies ────────────────────────────────────────────────────────

  const handleSetStrategies = async (s: { copy?: boolean; ai?: boolean; arb?: boolean }) => {
    const key = Object.keys(s)[0] as StrategyKey;
    setStrategyBusy((prev) => ({ ...prev, [key]: true }));
    try {
      const token = await getToken();
      const updated = await api.autobotSetStrategies(s, token);
      setStatus(updated);
    } catch {
      // silent — status will refresh on next poll
    } finally {
      setStrategyBusy((prev) => ({ ...prev, [key]: false }));
    }
  };

  // ── Close single position ─────────────────────────────────────────────────

  const handleClose = useCallback(async (tokenId: string) => {
    setClosingId(tokenId);
    try {
      const token = await getToken();
      const result = await api.autobotClose(tokenId, token);
      showToast({ msg: `Closed — got ${fmtUsd(result.proceeds)}`, type: 'success' });
      await fetchAll({ silent: true });
    } catch (ex: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      showToast({ msg: ex?.message || 'Close failed.', type: 'error' });
    } finally {
      setClosingId(null);
    }
  }, [getToken, fetchAll, showToast]);

  // ── Close all open positions ───────────────────────────────────────────────

  const handleCloseAll = useCallback(async () => {
    // Prefer live count from Polymarket open positions; fall back to DB trades
    const openCount = (perf?.open?.length ?? 0) > 0
      ? perf!.open!.length
      : trades.filter((t) => t.status === 'filled').length;
    if (!window.confirm(`Sell all ${openCount} open position${openCount === 1 ? '' : 's'} now?`)) return;
    setCloseAllBusy(true);
    try {
      const token = await getToken();
      const result = await api.autobotCloseAll(token);
      showToast({ msg: `Closed ${result.closed} of ${result.total}`, type: 'success' });
      await fetchAll({ silent: true });
    } catch (ex: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      showToast({ msg: ex?.message || 'Close all failed.', type: 'error' });
    } finally {
      setCloseAllBusy(false);
    }
  }, [getToken, perf, trades, fetchAll, showToast]);

  // ── Set funder (link / unlink Polymarket account) ──────────────────────────

  const handleSetFunder = async (address: string) => {
    const token = await getToken();
    const updated = await api.autobotSetFunder(address, token);
    setStatus(updated);
  };

  const handleLink = async (address: string) => handleSetFunder(address);
  const handleUnlink = async () => handleSetFunder('');

  // ── Initial skeleton ───────────────────────────────────────────────────────

  if (loading && !status) {
    return (
      <div className="space-y-3">
        <Skeleton variant="block" className="h-14" />
        <Skeleton variant="block" className="h-10" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} variant="stat" />)}
        </div>
        <Skeleton className="h-36 w-full" />
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

  return (
    <div className="flex flex-col gap-4 animate-jtp-fade-in">

      {/* ── Honesty banner — always visible above tabs ── */}
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

      {/* ── Tab bar ── */}
      <div>
        <SegmentedControl<BotTab>
          segments={BOT_TAB_SEGS}
          value={tab}
          onChange={setTab}
        />
      </div>

      {/* ── Inline toast (success / error from close operations) ── */}
      {toast && (
        <div
          role="alert"
          aria-live="polite"
          className={`px-3 py-2 rounded-[2px] font-mono text-jtp-xs flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-[rgba(61,220,132,.12)] text-[#3ddc84] border border-[rgba(61,220,132,.35)]'
              : 'bg-[rgba(255,91,82,.12)] text-[#ff5b52] border border-[rgba(255,91,82,.35)]'
          }`}
        >
          {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {/* ── Tab content ── */}
      {tab === 'performance' ? (
        <PerformanceTab
          perf={perf}
          perfLoading={perfLoading}
          trades={trades}
          tradesLoading={tradesLoading}
          lastUpdated={lastUpdated}
          onClearTrades={handleClearTrades}
          clearBusy={clearBusy}
          onClose={handleClose}
          closingId={closingId}
          onCloseAll={handleCloseAll}
          closeAllBusy={closeAllBusy}
        />
      ) : (
        <ControlsTab
          status={st}
          modeBusy={modeBusy}
          modeError={modeError}
          killBusy={killBusy}
          killErr={killErr}
          onModeChange={handleModeChange}
          onKill={handleKill}
          onSetLimits={handleSetLimits}
          onWithdrawOpen={() => setWithdrawOpen(true)}
          onExportKeyOpen={() => setExportKeyOpen(true)}
          onLink={handleLink}
          onUnlink={handleUnlink}
          onSetStrategies={handleSetStrategies}
          strategyBusy={strategyBusy}
        />
      )}

      {/* ── Withdraw modal — stays at root so it layers over both tabs ── */}
      {withdrawOpen && (
        <WithdrawModal
          onClose={() => setWithdrawOpen(false)}
          onWithdraw={handleWithdraw}
        />
      )}

      {/* ── Export private key modal ── */}
      {exportKeyOpen && (
        <ExportKeyModal
          onClose={() => setExportKeyOpen(false)}
          onExport={handleExportKey}
        />
      )}
    </div>
  );
};

export default QuantAutoBotPanel;
