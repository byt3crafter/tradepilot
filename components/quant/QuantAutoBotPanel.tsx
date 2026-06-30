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
import { AutobotStatus, AutobotTrade, AutobotPerformance } from '../../types';
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
  if (trade.status === 'failed')   return { label: 'FAILED',  variant: 'loss' };
  if (trade.status === 'filled')   return { label: 'PLACED',  variant: 'info' };
  if (trade.status === 'placed')   return { label: 'PLACED',  variant: 'info' };
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

// ─── TradeCard ─────────────────────────────────────────────────────────────────

const TradeCard: React.FC<{ trade: AutobotTrade }> = ({ trade }) => {
  const { label: statusLabel, variant: statusVariant } = resolvedStatusLabel(trade);
  const sigVariant = SIGNAL_BADGE_VARIANT[trade.signalType] ?? 'neutral';
  const sigLabel   = SIGNAL_LABELS[trade.signalType] ?? trade.signalType.toUpperCase();
  const priceCents = (trade.price * 100).toFixed(0);

  return (
    <div className="px-4 py-3 border-b border-jtp-borderSubtle last:border-b-0 hover:bg-jtp-hover transition-colors">
      <div className="flex items-start justify-between gap-3">
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
        <span className="flex-shrink-0 mt-[1px]">
          <Badge variant={statusVariant} size="xs">{statusLabel}</Badge>
        </span>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-jtp-2xs pl-[calc(theme(spacing.2)+2.5rem)]">
        <span className="text-jtp-textMuted">@ {priceCents}¢</span>
        <span className="text-jtp-textMuted">{fmtUsd(trade.sizeUsd)}</span>
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

// ─── Performance tab ───────────────────────────────────────────────────────────

interface PerformanceTabProps {
  perf: AutobotPerformance | null;
  perfLoading: boolean;
  trades: AutobotTrade[];
  tradesLoading: boolean;
  lastUpdated: string | null;
}

// Recharts AreaChart mirroring WhatWorksPanel's PaperWalletSimCard chart:
// same library, same Area/XAxis/YAxis/Tooltip props, same gradient/fill approach.
// dataKey is "pnl" (cumulative realized $, can go negative) instead of "balance".
const PerformanceTab: React.FC<PerformanceTabProps> = ({
  perf, perfLoading, trades, tradesLoading, lastUpdated,
}) => {
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

  return (
    <div className="flex flex-col gap-4">

      {/* ── Stat tiles: 7 metrics across responsive grid ── */}
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

      {/* ── Live trades feed ── */}
      <Panel
        label="LIVE TRADES"
        noPadding
        actions={
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
        }
      >
        {trades.length === 0 ? (
          <EmptyState
            title="No trades yet"
            description="Fund the wallet and switch to AUTO to start trading."
          />
        ) : (
          <div className="divide-y-0">
            {trades.map((trade) => (
              <TradeCard key={trade.id} trade={trade} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
};

// ─── Controls tab ──────────────────────────────────────────────────────────────

interface ControlsTabProps {
  status: AutobotStatus;
  modeBusy: boolean;
  modeError: string | null;
  killBusy: boolean;
  killErr: string | null;
  onModeChange: (mode: 'off' | 'auto') => void;
  onKill: () => void;
  onSetLimits: (limits: { maxTotalUsd?: number; maxPerTradeUsd?: number; dailyLossLimitUsd?: number }) => Promise<void>;
  onWithdrawOpen: () => void;
  onExportKeyOpen: () => void;
  onLink: (address: string) => Promise<void>;
  onUnlink: () => Promise<void>;
}

const ControlsTab: React.FC<ControlsTabProps> = ({
  status, modeBusy, modeError, killBusy, killErr,
  onModeChange, onKill, onSetLimits, onWithdrawOpen, onExportKeyOpen,
  onLink, onUnlink,
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

          {/* Balances */}
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

          <LinkPolymarketSection status={status} onLink={onLink} onUnlink={onUnlink} />

          <div className="rounded-[2px] border border-jtp-borderSubtle bg-jtp-bg px-3 py-2.5 mt-3">
            <p className="font-mono text-jtp-xs text-jtp-textMuted leading-relaxed">
              <span className="text-jtp-text font-semibold">Manual option:</span>{' '}
              send <span className="text-jtp-text">USDC.e</span> +
              ~$1 worth of <span className="text-jtp-text">POL</span> for gas on{' '}
              <span className="text-jtp-text">Polygon</span> to the address above.
            </p>
          </div>
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

          <LimitsEditor limits={status.limits} onSave={onSetLimits} />
        </Panel>
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
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [exportKeyOpen, setExportKeyOpen] = useState(false);

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
    fetchAll({ silent: true });
  };

  // ── Export key ─────────────────────────────────────────────────────────────

  const handleExportKey = async (): Promise<{ address: string; privateKey: string }> => {
    const token = await getToken();
    return api.autobotExportKey(token);
  };

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

      {/* ── Tab content ── */}
      {tab === 'performance' ? (
        <PerformanceTab
          perf={perf}
          perfLoading={perfLoading}
          trades={trades}
          tradesLoading={tradesLoading}
          lastUpdated={lastUpdated}
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
