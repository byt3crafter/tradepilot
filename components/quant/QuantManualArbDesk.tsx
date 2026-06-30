/**
 * QuantManualArbDesk — manual arbitrage desk for the Quant → Arbitrage tab.
 *
 * Sections:
 *  1. Arb settings card — editable thresholds (safeMinPrice, safeMaxHrs,
 *     immMinPrice, immMaxHrs, minEdgePct), pre-filled from status.arbConfig.
 *  2. Opportunities list — EdgeScore-filtered list from /api/autobot/opportunities
 *     with AI verdict + Buy actions per row.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { ArbOpportunity, AutobotStatus } from '../../types';
import { Panel, Button, Badge, EmptyState, Skeleton } from '../ui';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Tiny SVG spinner used inline. */
const Spin: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={`animate-spin ${className ?? 'w-3.5 h-3.5'} inline`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

/** Format hours to a human label, e.g. 1.5 → "1h 30m" */
function fmtHours(h: number): string {
  if (h <= 0) return 'ended';
  if (h < 1) return `${Math.round(h * 60)}m`;
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

/** Price in cents from an opportunity (prefers priceCents, falls back to price * 100). */
function toCents(opp: ArbOpportunity): number {
  return opp.priceCents !== undefined ? opp.priceCents : Math.round(opp.price * 100);
}

// ─── Tier badge ───────────────────────────────────────────────────────────────

const TierBadge: React.FC<{ tier: 'safe' | 'imminent' }> = ({ tier }) =>
  tier === 'imminent' ? (
    <span className="inline-flex items-center font-mono font-semibold rounded-none whitespace-nowrap select-none text-[9px] px-[5px] py-[1px] tracking-[0.15em] bg-[rgba(232,162,61,.12)] text-[#e8a23d] border border-[rgba(232,162,61,.35)]">
      IMMINENT
    </span>
  ) : (
    <span className="inline-flex items-center font-mono font-semibold rounded-none whitespace-nowrap select-none text-[9px] px-[5px] py-[1px] tracking-[0.15em] bg-[rgba(56,139,253,.12)] text-[#58a6ff] border border-[rgba(56,139,253,.35)]">
      SAFE
    </span>
  );

// ─── AI verdict inline result ─────────────────────────────────────────────────

interface AiVerdict {
  take: boolean | null;
  conviction: number | null;
  rationale: string;
}

const AiVerdictChip: React.FC<{ verdict: AiVerdict }> = ({ verdict }) => {
  const { take, conviction, rationale } = verdict;
  const label = take === true ? 'TAKE' : take === false ? 'SKIP' : '—';
  const color =
    take === true
      ? 'text-[#3ddc84]'
      : take === false
      ? 'text-[#ff5b52]'
      : 'text-jtp-textMuted';

  return (
    <div className="mt-1.5 flex flex-col gap-0.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`font-mono font-bold text-jtp-xs ${color}`}>{label}</span>
        {conviction !== null && (
          <span className="font-mono text-jtp-2xs text-jtp-textDim">
            {Math.round(conviction * 100)}% conviction
          </span>
        )}
      </div>
      {rationale && (
        <p className="text-jtp-2xs text-jtp-textMuted leading-snug max-w-xs">
          {rationale}
        </p>
      )}
    </div>
  );
};

// ─── Inline toast ─────────────────────────────────────────────────────────────

interface ToastState {
  msg: string;
  type: 'success' | 'error';
}

// ─── NumberInput helper ───────────────────────────────────────────────────────

const NumberInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: number;
  min?: number;
}> = ({ label, value, onChange, step = 1, min = 0 }) => (
  <div className="flex flex-col gap-1">
    <label className="font-mono text-jtp-2xs text-jtp-textMuted tracking-[0.1em] uppercase">
      {label}
    </label>
    <input
      type="number"
      value={value}
      step={step}
      min={min}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-jtp-bg border border-jtp-borderSubtle rounded-[2px] px-2.5 py-1.5 font-mono text-jtp-sm text-jtp-text placeholder-jtp-textMuted focus:outline-none focus:border-jtp-amber transition-colors"
    />
  </div>
);

// ─── Opportunity row ──────────────────────────────────────────────────────────

interface RowState {
  verdictLoading: boolean;
  verdict: AiVerdict | null;
  verdictError: string | null;
  buyLoading: boolean;
}

const OppRow: React.FC<{
  opp: ArbOpportunity;
  onToast: (t: ToastState) => void;
}> = ({ opp, onToast }) => {
  const { getToken } = useAuth();
  const [row, setRow] = useState<RowState>({
    verdictLoading: false,
    verdict: null,
    verdictError: null,
    buyLoading: false,
  });

  const handleAiVerdict = async () => {
    setRow((r) => ({ ...r, verdictLoading: true, verdict: null, verdictError: null }));
    try {
      const token = await getToken();
      const res = await api.autobotAssess(
        {
          tokenId: opp.tokenId,
          conditionId: opp.conditionId,
          title: opp.title,
          outcome: opp.outcome,
          price: opp.price,
          edgePct: opp.edgePct,
          type: 'arb',
        },
        token,
      );
      setRow((r) => ({ ...r, verdict: res.ai }));
    } catch (e: any) {
      setRow((r) => ({ ...r, verdictError: e?.message || 'AI verdict failed.' }));
    } finally {
      setRow((r) => ({ ...r, verdictLoading: false }));
    }
  };

  const handleBuy = async () => {
    setRow((r) => ({ ...r, buyLoading: true }));
    try {
      const token = await getToken();
      const res = await api.autobotManualTrade(
        {
          tokenId: opp.tokenId,
          conditionId: opp.conditionId,
          price: opp.price,
          outcome: opp.outcome,
          outcomeIndex: opp.outcomeIndex,
          title: opp.title,
          type: 'arb',
        },
        token,
      );
      onToast({
        msg: res.filled ? 'Filled' : res.status ?? 'Placed',
        type: 'success',
      });
    } catch (e: any) {
      onToast({ msg: e?.message || 'Trade failed.', type: 'error' });
    } finally {
      setRow((r) => ({ ...r, buyLoading: false }));
    }
  };

  const priceCents = toCents(opp);

  return (
    <div className="border-b border-jtp-borderSubtle last:border-b-0 px-4 py-3 hover:bg-jtp-active transition-colors">
      {/* Top row: title + badges + actions */}
      <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
        {/* Edge */}
        <div className="flex-shrink-0 w-14 text-right pt-px">
          <span className="font-mono text-jtp-base font-bold text-[#3ddc84] leading-none">
            +{opp.edgePct.toFixed(1)}%
          </span>
        </div>

        {/* Info block */}
        <div className="flex-1 min-w-0">
          {/* Market title */}
          <div
            className="text-jtp-base-minus text-jtp-text font-medium leading-snug line-clamp-2 sm:truncate"
            title={opp.title}
          >
            {opp.title}
          </div>

          {/* Meta chips */}
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <span className="font-mono text-jtp-xs text-jtp-textMuted">
              {opp.outcome}
            </span>
            <span className="text-jtp-borderStrong font-mono text-jtp-xs">·</span>
            <span className="font-mono text-jtp-xs text-jtp-text">{priceCents}¢</span>
            <span className="text-jtp-borderStrong font-mono text-jtp-xs">·</span>
            <TierBadge tier={opp.tier} />
            <span className="text-jtp-borderStrong font-mono text-jtp-xs">·</span>
            <span className="font-mono text-jtp-xs">
              ends in <span className="text-[#e8a23d]">{fmtHours(opp.endsInH)}</span>
            </span>
            {opp.smartMoney && (
              <>
                <span className="text-jtp-borderStrong font-mono text-jtp-xs">·</span>
                <Badge variant="profit" size="xs">⚡ smart money</Badge>
              </>
            )}
          </div>

          {/* AI verdict result */}
          {row.verdict && <AiVerdictChip verdict={row.verdict} />}
          {row.verdictError && (
            <p className="mt-1 text-jtp-2xs text-[#ff5b52]">{row.verdictError}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
          <button
            type="button"
            onClick={handleAiVerdict}
            disabled={row.verdictLoading}
            aria-label="Get AI verdict"
            className="flex items-center gap-1.5 font-mono text-jtp-xs text-jtp-textDim hover:text-jtp-text transition-colors border border-jtp-borderSubtle rounded-[2px] px-2.5 py-1.5 disabled:opacity-50 whitespace-nowrap"
          >
            {row.verdictLoading ? <Spin className="w-3 h-3" /> : null}
            AI verdict
          </button>

          <Button
            variant="primary"
            className="!px-3 !py-1.5 !text-jtp-xs whitespace-nowrap"
            onClick={handleBuy}
            disabled={row.buyLoading}
          >
            {row.buyLoading ? <Spin className="w-3 h-3 mr-1" /> : null}
            Buy
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Arb settings card ────────────────────────────────────────────────────────

const ArbSettingsCard: React.FC<{ initialConfig?: AutobotStatus['arbConfig'] }> = ({
  initialConfig,
}) => {
  const { getToken } = useAuth();

  const [safeMinPrice, setSafeMinPrice] = useState(
    String(initialConfig?.safeMinPrice ?? 70),
  );
  const [safeMaxHrs, setSafeMaxHrs] = useState(
    String(initialConfig?.safeMaxHrs ?? 24),
  );
  const [immMinPrice, setImmMinPrice] = useState(
    String(initialConfig?.immMinPrice ?? 85),
  );
  const [immMaxHrs, setImmMaxHrs] = useState(
    String(initialConfig?.immMaxHrs ?? 6),
  );
  const [minEdgePct, setMinEdgePct] = useState(
    String(initialConfig?.minEdgePct ?? 2),
  );

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Sync when parent provides config for the first time
  useEffect(() => {
    if (!initialConfig) return;
    setSafeMinPrice(String(initialConfig.safeMinPrice));
    setSafeMaxHrs(String(initialConfig.safeMaxHrs));
    setImmMinPrice(String(initialConfig.immMinPrice));
    setImmMaxHrs(String(initialConfig.immMaxHrs));
    setMinEdgePct(String(initialConfig.minEdgePct));
  }, [initialConfig]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const token = await getToken();
      await api.autobotSetArbConfig(
        {
          safeMinPrice: Number(safeMinPrice),
          safeMaxHrs: Number(safeMaxHrs),
          immMinPrice: Number(immMinPrice),
          immMaxHrs: Number(immMaxHrs),
          minEdgePct: Number(minEdgePct),
        },
        token,
      );
      setSaveMsg({ ok: true, text: 'Thresholds saved.' });
    } catch (e: any) {
      setSaveMsg({ ok: false, text: e?.message || 'Save failed.' });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  return (
    <Panel
      label="ARB DESK SETTINGS"
      actions={
        <span className="font-mono text-jtp-2xs text-jtp-textMuted">
          You set the thresholds. The bot + this list use them.
        </span>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        <NumberInput
          label="Safe min price (¢)"
          value={safeMinPrice}
          onChange={setSafeMinPrice}
          min={0}
          step={1}
        />
        <NumberInput
          label="Safe max hours"
          value={safeMaxHrs}
          onChange={setSafeMaxHrs}
          min={0}
          step={1}
        />
        <NumberInput
          label="Imminent min price (¢)"
          value={immMinPrice}
          onChange={setImmMinPrice}
          min={0}
          step={1}
        />
        <NumberInput
          label="Imminent max hours"
          value={immMaxHrs}
          onChange={setImmMaxHrs}
          min={0}
          step={1}
        />
        <NumberInput
          label="Min edge %"
          value={minEdgePct}
          onChange={setMinEdgePct}
          min={0}
          step={0.1}
        />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving}
          className="!px-4 !py-1.5 !text-jtp-xs"
        >
          {saving ? <Spin className="w-3 h-3 mr-1" /> : null}
          Save thresholds
        </Button>
        {saveMsg && (
          <span
            className={`font-mono text-jtp-2xs ${saveMsg.ok ? 'text-[#3ddc84]' : 'text-[#ff5b52]'}`}
          >
            {saveMsg.text}
          </span>
        )}
      </div>
    </Panel>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const QuantManualArbDesk: React.FC = () => {
  const { getToken } = useAuth();

  // autobot status (for arbConfig pre-fill)
  const [status, setStatus] = useState<AutobotStatus | null>(null);

  // opportunities
  const [opps, setOpps] = useState<ArbOpportunity[]>([]);
  const [oppsLoading, setOppsLoading] = useState(true);
  const [oppsError, setOppsError] = useState<string | null>(null);
  const [scannedAt, setScannedAt] = useState<string | null>(null);

  // inline toast
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((t: ToastState) => {
    setToast(t);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  // Load autobot status (for arbConfig)
  const loadStatus = useCallback(async () => {
    try {
      const token = await getToken();
      const s = await api.autobotStatus(token);
      setStatus(s);
    } catch {
      // non-critical — settings card falls back to defaults
    }
  }, [getToken]);

  // Load opportunities
  const loadOpps = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await api.autobotOpportunities(token);
      // Merge settlementLag and crossMarket, sort by endsInH ascending (soonest first)
      const combined = [...(res.settlementLag ?? []), ...(res.crossMarket ?? [])].sort(
        (a, b) => a.endsInH - b.endsInH,
      );
      setOpps(combined);
      setScannedAt(res.scannedAt ?? null);
      setOppsError(null);
    } catch (e: any) {
      setOppsError(e?.message || 'Could not load opportunities.');
    } finally {
      setOppsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadStatus();
    loadOpps();
    const interval = setInterval(loadOpps, 60_000);
    return () => {
      clearInterval(interval);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [loadStatus, loadOpps]);

  const fmtScannedAt = scannedAt
    ? new Date(scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <div className="flex flex-col gap-4">

      {/* 1. Arb settings card */}
      <ArbSettingsCard initialConfig={status?.arbConfig} />

      {/* 2. Opportunities list */}
      <Panel
        label="OPPORTUNITIES"
        noPadding
        actions={
          <div className="flex items-center gap-3">
            {fmtScannedAt && (
              <span className="font-mono text-jtp-2xs text-jtp-textDim hidden sm:inline">
                ↻ {fmtScannedAt}
              </span>
            )}
            <button
              type="button"
              onClick={() => { setOppsLoading(true); loadOpps(); }}
              disabled={oppsLoading}
              className="font-mono text-jtp-2xs text-jtp-textDim hover:text-jtp-text transition-colors border border-jtp-borderSubtle rounded-[2px] px-2 py-0.5 disabled:opacity-50"
              aria-label="Refresh opportunities"
            >
              {oppsLoading ? <Spin className="w-3 h-3" /> : 'Refresh'}
            </button>
          </div>
        }
      >
        {/* Header description */}
        <div className="px-4 py-2 border-b border-jtp-borderSubtle">
          <p className="text-jtp-2xs text-jtp-textMuted leading-relaxed">
            Manual arb desk — the list runs your EdgeScore + strategy; tap{' '}
            <span className="text-jtp-text font-medium">AI verdict</span> for the AI's read, then{' '}
            <span className="text-jtp-text font-medium">Buy</span>. Limits still apply.
          </p>
        </div>

        {/* Toast */}
        {toast && (
          <div
            role="alert"
            aria-live="polite"
            className={`mx-4 mt-3 px-3 py-2 rounded-[2px] font-mono text-jtp-xs flex items-center gap-2 ${
              toast.type === 'success'
                ? 'bg-[rgba(61,220,132,.12)] text-[#3ddc84] border border-[rgba(61,220,132,.35)]'
                : 'bg-[rgba(255,91,82,.12)] text-[#ff5b52] border border-[rgba(255,91,82,.35)]'
            }`}
          >
            {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
          </div>
        )}

        {/* Content */}
        {oppsLoading && opps.length === 0 ? (
          <div className="px-4 py-4 flex flex-col gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-3/4" />
          </div>
        ) : oppsError ? (
          <div className="px-4 py-6">
            <p role="alert" className="text-jtp-xs text-[#ff5b52]">{oppsError}</p>
          </div>
        ) : opps.length === 0 ? (
          <div className="px-4 py-6">
            <EmptyState
              title="No opportunities right now"
              description="No opportunities right now — widen your thresholds or check back."
            />
          </div>
        ) : (
          <div>
            {opps.map((opp, i) => (
              <OppRow
                key={`${opp.tokenId}-${opp.outcomeIndex}-${i}`}
                opp={opp}
                onToast={showToast}
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
};

export default QuantManualArbDesk;
