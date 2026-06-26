import React, { useCallback, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useView } from '../../context/ViewContext';
import api from '../../services/api';
import { AiOpportunity, AiStrategy } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const profileUrl = (addr: string) => `https://polymarket.com/profile/${addr}`;

/** Backend signals "needs ChatGPT" via an error message mentioning "Settings → AI". */
const isConnectError = (msg: string) =>
  /settings\s*[→>-]+\s*ai/i.test(msg) || msg.includes('CHATGPT_NOT_CONNECTED');

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

const confidenceStyles: Record<AiStrategy['confidence'], string> = {
  low: 'bg-[rgba(239,68,68,0.12)] text-jtp-loss border-[rgba(239,68,68,0.25)]',
  medium: 'bg-[rgba(234,179,8,0.12)] text-jtp-warning border-[rgba(234,179,8,0.25)]',
  high: 'bg-[rgba(34,197,94,0.12)] text-jtp-profit border-[rgba(34,197,94,0.25)]',
};

const Chip: React.FC<{ label: string }> = ({ label }) =>
  label ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-jtp-xs font-medium bg-jtp-active border border-jtp-border text-jtp-textMuted">
      {label}
    </span>
  ) : null;

// ─── Connect prompt (when AI not connected/permitted) ───────────────────────────

const ConnectPrompt: React.FC = () => {
  const { navigateTo } = useView();
  return (
    <p className="text-jtp-xs text-jtp-warning">
      <button
        type="button"
        onClick={() => navigateTo('settings', 'ai')}
        className="hover:underline font-medium"
      >
        Connect ChatGPT in Settings → AI
      </button>{' '}
      to use AI features.
    </p>
  );
};

// ─── Opportunity card ───────────────────────────────────────────────────────────

const OpportunityCard: React.FC<{ opp: AiOpportunity; rank: number }> = ({ opp, rank }) => (
  <div className="bg-jtp-bg border border-jtp-border rounded-jtp-xl overflow-hidden">
    <div className="px-4 py-3 border-b border-jtp-border flex items-center gap-2.5 flex-wrap">
      <span className="font-mono text-jtp-xs text-jtp-textDim">#{rank}</span>
      <span className="text-jtp-sm font-semibold text-jtp-text truncate">{opp.wallet || 'Unknown wallet'}</span>
      {opp.addr && (
        <a
          href={profileUrl(opp.addr)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-jtp-xs font-medium text-jtp-blue hover:underline flex-shrink-0"
        >
          Polymarket ↗
        </a>
      )}
      <span className="ml-auto flex items-center gap-2">
        <Chip label={opp.focus} />
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-jtp-xs font-semibold border ${
            opp.copyable
              ? 'bg-[rgba(34,197,94,0.12)] text-jtp-profit border-[rgba(34,197,94,0.25)]'
              : 'bg-[rgba(239,68,68,0.12)] text-jtp-loss border-[rgba(239,68,68,0.25)]'
          }`}
        >
          {opp.copyable ? '✓ Copyable' : '✗ Not copyable'}
        </span>
      </span>
    </div>
    <div className="px-4 py-3 space-y-2.5">
      {opp.edge && (
        <p className="font-mono text-jtp-sm text-jtp-textMuted">{opp.edge}</p>
      )}
      {opp.action && (
        <div className="bg-jtp-active border border-jtp-borderFocus rounded-jtp-lg px-3 py-2">
          <span className="text-jtp-xs text-jtp-textDim uppercase tracking-wide">Action</span>
          <p className="text-jtp-sm font-semibold text-jtp-text mt-0.5">{opp.action}</p>
        </div>
      )}
      {opp.why && (
        <div>
          <span className="text-jtp-xs text-jtp-textDim uppercase tracking-wide">Why</span>
          <p className="text-jtp-sm text-jtp-textMuted leading-relaxed mt-0.5">{opp.why}</p>
        </div>
      )}
    </div>
  </div>
);

// ─── Strategy card ──────────────────────────────────────────────────────────────

const RuleList: React.FC<{ title: string; rules: string[]; accent: string }> = ({ title, rules, accent }) => (
  <div className="bg-jtp-bg border border-jtp-border rounded-jtp-xl px-4 py-3">
    <h4 className={`text-jtp-xs font-semibold uppercase tracking-wide mb-2 ${accent}`}>{title}</h4>
    {rules && rules.length > 0 ? (
      <ul className="space-y-1.5">
        {rules.map((r, i) => (
          <li key={i} className="text-jtp-sm text-jtp-textMuted leading-snug flex gap-2">
            <span className="text-jtp-textDim flex-shrink-0">•</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-jtp-xs text-jtp-textDim">—</p>
    )}
  </div>
);

const StrategyCard: React.FC<{ strategy: AiStrategy }> = ({ strategy }) => (
  <div className="bg-jtp-bg border border-jtp-border rounded-jtp-xl overflow-hidden">
    <div className="px-4 py-3 border-b border-jtp-border flex items-center gap-2.5 flex-wrap">
      <span className="text-jtp-base font-semibold text-jtp-text">{strategy.name || 'Untitled strategy'}</span>
      <Chip label={strategy.marketType} />
      <span
        className={`ml-auto inline-flex items-center px-2.5 py-1 rounded-md text-jtp-xs font-bold border capitalize ${confidenceStyles[strategy.confidence] ?? confidenceStyles.medium}`}
      >
        {strategy.confidence} confidence
      </span>
    </div>
    <div className="px-4 py-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <RuleList title="Entry" rules={strategy.entryRules} accent="text-jtp-profit" />
        <RuleList title="Exit" rules={strategy.exitRules} accent="text-jtp-blue" />
        <RuleList title="Risk" rules={strategy.riskRules} accent="text-jtp-warning" />
      </div>
      {strategy.rationale && (
        <div>
          <span className="text-jtp-xs text-jtp-textDim uppercase tracking-wide">Rationale</span>
          <p className="text-jtp-sm text-jtp-textMuted leading-relaxed mt-0.5">{strategy.rationale}</p>
        </div>
      )}
      <p className="text-jtp-xs text-jtp-textDim italic">Draft strategy — backtest before trading.</p>
    </div>
  </div>
);

// ─── Main panel ─────────────────────────────────────────────────────────────────

const AiQuantPanel: React.FC = () => {
  const { getToken } = useAuth();

  // Opportunities state
  const [oppLoading, setOppLoading] = useState(false);
  const [opps, setOpps] = useState<AiOpportunity[] | null>(null);
  const [oppNote, setOppNote] = useState<string | null>(null);
  const [oppError, setOppError] = useState<string | null>(null);
  const [oppNeedsConnect, setOppNeedsConnect] = useState(false);

  // Strategy state
  const [stratLoading, setStratLoading] = useState(false);
  const [strategy, setStrategy] = useState<AiStrategy | null>(null);
  const [stratError, setStratError] = useState<string | null>(null);
  const [stratNeedsConnect, setStratNeedsConnect] = useState(false);

  const findOpportunities = useCallback(async () => {
    setOppLoading(true);
    setOppError(null);
    setOppNeedsConnect(false);
    setOpps(null);
    setOppNote(null);
    try {
      const token = await getToken();
      const res = await api.aiOpportunities(token);
      setOpps(Array.isArray(res?.opportunities) ? res.opportunities : []);
      setOppNote(res?.note ?? null);
    } catch (e: any) {
      const msg = e?.message || '';
      if (isConnectError(msg)) setOppNeedsConnect(true);
      else setOppError(msg || 'Could not scan for opportunities. Please try again.');
    } finally {
      setOppLoading(false);
    }
  }, [getToken]);

  const buildStrategy = useCallback(async () => {
    setStratLoading(true);
    setStratError(null);
    setStratNeedsConnect(false);
    setStrategy(null);
    try {
      const token = await getToken();
      const res = await api.aiStrategy(token);
      setStrategy(res);
    } catch (e: any) {
      const msg = e?.message || '';
      if (isConnectError(msg)) setStratNeedsConnect(true);
      else setStratError(msg || 'Could not build a strategy. Please try again.');
    } finally {
      setStratLoading(false);
    }
  }, [getToken]);

  return (
    <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel overflow-hidden">
      <div className="px-5 py-4 border-b border-jtp-border flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-jtp-base font-semibold text-jtp-text tracking-tight">⚡ AI Opportunities</h2>
          <p className="text-jtp-xs text-jtp-textDim mt-1">
            AI-suggested copyable edges — not financial advice.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={findOpportunities}
            disabled={oppLoading}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-jtp-xl text-jtp-xs font-semibold bg-jtp-blue text-white hover:bg-jtp-blueHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {oppLoading ? <Spinner /> : null}
            {oppLoading ? 'Scanning…' : opps ? 'Re-scan' : 'Find opportunities'}
          </button>
          <button
            type="button"
            onClick={buildStrategy}
            disabled={stratLoading}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-jtp-xl text-jtp-xs font-semibold bg-jtp-active border border-jtp-border text-jtp-text hover:bg-jtp-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {stratLoading ? <Spinner /> : null}
            {stratLoading ? 'Building…' : '🧠 Build Strategy'}
          </button>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* ── Opportunities results ── */}
        {oppNeedsConnect && <ConnectPrompt />}
        {oppError && (
          <p role="alert" className="text-jtp-xs text-jtp-loss">
            {oppError}
          </p>
        )}
        {opps && opps.length > 0 && (
          <div className="space-y-2.5">
            {opps.map((opp, i) => (
              <OpportunityCard key={opp.addr || i} opp={opp} rank={i + 1} />
            ))}
          </div>
        )}
        {opps && opps.length === 0 && (
          <div className="text-center py-6">
            <p className="text-jtp-sm text-jtp-textMuted font-medium">No copyable opportunities right now</p>
            {oppNote && <p className="text-jtp-xs text-jtp-textDim mt-1 max-w-md mx-auto">{oppNote}</p>}
          </div>
        )}

        {/* ── Strategy result ── */}
        {(stratNeedsConnect || stratError || strategy) && (
          <div className="pt-1 border-t border-jtp-borderSubtle space-y-2.5">
            <h3 className="text-jtp-sm font-semibold text-jtp-text pt-3">🧠 AI Strategy</h3>
            {stratNeedsConnect && <ConnectPrompt />}
            {stratError && (
              <p role="alert" className="text-jtp-xs text-jtp-loss">
                {stratError}
              </p>
            )}
            {strategy && <StrategyCard strategy={strategy} />}
          </div>
        )}

        {/* ── Idle hint ── */}
        {!opps && !oppLoading && !oppError && !oppNeedsConnect && !strategy && !stratLoading && !stratError && !stratNeedsConnect && (
          <p className="text-jtp-xs text-jtp-textDim">
            Scan the qualified leaderboard for AI-ranked copyable edges, or generate a draft strategy.
          </p>
        )}
      </div>
    </div>
  );
};

export default AiQuantPanel;
