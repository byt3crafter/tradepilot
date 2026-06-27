import React, { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useView } from '../../context/ViewContext';
import api from '../../services/api';
import { AiOpportunity, AiStrategy } from '../../types';
import { Panel, Badge, Button, EmptyState } from '../../components/ui';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const profileUrl = (addr: string) => `https://polymarket.com/profile/${addr}`;

/** Backend signals "needs ChatGPT" via an error message mentioning "Settings → AI". */
const isConnectError = (msg: string) =>
  /settings\s*[→>-]+\s*ai/i.test(msg) || msg.includes('CHATGPT_NOT_CONNECTED');

const CONFIDENCE_VARIANT: Record<AiStrategy['confidence'], 'profit' | 'warning' | 'loss'> = {
  high: 'profit',
  medium: 'warning',
  low: 'loss',
};

// ─── Connect prompt (when AI not connected/permitted) ─────────────────────────

const ConnectPrompt: React.FC = () => {
  const { navigateTo } = useView();
  return (
    <p className="text-jtp-md text-jtp-warning">
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

// ─── Opportunity card ─────────────────────────────────────────────────────────

const OpportunityCard: React.FC<{ opp: AiOpportunity; rank: number }> = ({ opp, rank }) => (
  <div className="bg-jtp-bg border border-jtp-border rounded-[2px] overflow-hidden">
    <div className="px-4 py-3 border-b border-jtp-border flex items-center gap-2.5 flex-wrap">
      <span className="font-mono text-jtp-xs text-jtp-textDim">#{rank}</span>
      <span className="text-jtp-lg font-semibold text-jtp-text font-mono">
        {opp.wallet || 'Unknown wallet'}
      </span>
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
      <span className="ml-auto flex items-center gap-2 flex-wrap justify-end">
        {opp.focus && <Badge variant="neutral" size="xs">{opp.focus}</Badge>}
        <Badge variant={opp.copyable ? 'profit' : 'loss'} size="xs">
          {opp.copyable ? '✓ Copyable' : '✗ Not copyable'}
        </Badge>
      </span>
    </div>
    <div className="px-4 py-3 space-y-2.5">
      {opp.edge && <p className="font-mono text-jtp-md text-jtp-textMuted">{opp.edge}</p>}
      {opp.action && (
        <div className="bg-jtp-active border-l-2 border-jtp-amber rounded-[2px] px-3 py-2">
          <span className="jtp-label">Action</span>
          <p className="text-jtp-lg font-semibold text-jtp-text mt-0.5">{opp.action}</p>
        </div>
      )}
      {opp.why && (
        <div>
          <span className="jtp-label">Why</span>
          <p className="text-jtp-md text-jtp-textMuted leading-relaxed mt-0.5">{opp.why}</p>
        </div>
      )}
    </div>
  </div>
);

// ─── Strategy card ────────────────────────────────────────────────────────────

const RuleList: React.FC<{ title: string; rules: string[]; accent: string }> = ({ title, rules, accent }) => (
  <div className="bg-jtp-bg border border-jtp-border rounded-[2px] px-4 py-3">
    <h4 className={`text-jtp-xs font-semibold uppercase tracking-wide mb-2 ${accent}`}>{title}</h4>
    {rules && rules.length > 0 ? (
      <ul className="space-y-1.5">
        {rules.map((r, i) => (
          <li key={i} className="text-jtp-md text-jtp-textMuted leading-snug flex gap-2">
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
  <div className="bg-jtp-bg border border-jtp-border rounded-[2px] overflow-hidden">
    <div className="px-4 py-3 border-b border-jtp-border flex items-center gap-2.5 flex-wrap">
      <span className="text-jtp-lg font-semibold text-jtp-text">
        {strategy.name || 'Untitled strategy'}
      </span>
      {strategy.marketType && <Badge variant="neutral" size="xs">{strategy.marketType}</Badge>}
      <span className="ml-auto">
        <Badge variant={CONFIDENCE_VARIANT[strategy.confidence] ?? 'warning'} size="sm">
          {strategy.confidence} confidence
        </Badge>
      </span>
    </div>
    <div className="px-4 py-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <RuleList title="Entry" rules={strategy.entryRules} accent="text-jtp-profit" />
        <RuleList title="Exit" rules={strategy.exitRules} accent="text-jtp-blue" />
        <RuleList title="Risk" rules={strategy.riskRules} accent="text-jtp-warning" />
      </div>
      {strategy.rationale && (
        <div>
          <span className="jtp-label">Rationale</span>
          <p className="text-jtp-md text-jtp-textMuted leading-relaxed mt-0.5">{strategy.rationale}</p>
        </div>
      )}
      <p className="text-jtp-xs text-jtp-textDim italic">Draft strategy — backtest before trading.</p>
    </div>
  </div>
);

// ─── Full-page analysis overlay (portal to body) ──────────────────────────────

const AnalysisOverlay: React.FC<{
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, subtitle, onClose, children }) => {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-5xl bg-jtp-panel border border-jtp-border rounded-[2px] my-2"
        style={{ borderTop: '2px solid rgba(232,162,61,0.55)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-3 border-b border-jtp-border bg-jtp-panel">
          <div className="min-w-0">
            <span className="jtp-label tracking-[0.12em]">
              <span style={{ color: '#e8a23d', marginRight: '6px' }}>▸</span>{title}
            </span>
            {subtitle && <p className="text-jtp-xs text-jtp-textDim mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 font-mono text-jtp-md text-jtp-textMuted hover:text-jtp-text border border-jtp-border hover:border-jtp-borderStrong rounded-[2px] px-3 py-1.5 transition-colors"
            aria-label="Close"
          >
            ✕ ESC
          </button>
        </header>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
};

// ─── Main panel ───────────────────────────────────────────────────────────────

const AiQuantPanel: React.FC = () => {
  const { getToken } = useAuth();

  const [oppLoading, setOppLoading] = useState(false);
  const [opps, setOpps] = useState<AiOpportunity[] | null>(null);
  const [oppNote, setOppNote] = useState<string | null>(null);
  const [oppError, setOppError] = useState<string | null>(null);
  const [oppNeedsConnect, setOppNeedsConnect] = useState(false);

  const [stratLoading, setStratLoading] = useState(false);
  const [strategy, setStrategy] = useState<AiStrategy | null>(null);
  const [stratError, setStratError] = useState<string | null>(null);
  const [stratNeedsConnect, setStratNeedsConnect] = useState(false);

  // Which result is open on the full-page overlay
  const [view, setView] = useState<'opps' | 'strategy' | null>(null);

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

  const oppCount = opps?.length ?? 0;
  const idle =
    !oppLoading && !opps && !oppError && !oppNeedsConnect &&
    !stratLoading && !strategy && !stratError && !stratNeedsConnect;

  return (
    <>
      <Panel label="AI OPPORTUNITIES">
        <p className="text-jtp-md text-jtp-textDim mb-3">
          AI-suggested copyable edges — not financial advice.
        </p>

        {/* ── Triggers: full-width stacked buttons (no clipping) ── */}
        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            className="w-full justify-center"
            onClick={findOpportunities}
            isLoading={oppLoading}
            disabled={oppLoading}
          >
            {oppLoading ? 'Scanning…' : opps ? 'Re-scan opportunities' : 'Find Opportunities'}
          </Button>
          <Button
            variant="secondary"
            className="w-full justify-center"
            onClick={buildStrategy}
            isLoading={stratLoading}
            disabled={stratLoading}
          >
            {stratLoading ? 'Building…' : strategy ? 'Rebuild Strategy' : 'Build Strategy'}
          </Button>
        </div>

        {/* ── Ready states → click to view full page ── */}
        <div className="mt-3 space-y-2">
          {oppNeedsConnect && <ConnectPrompt />}
          {oppError && <p role="alert" className="text-jtp-md text-jtp-loss">{oppError}</p>}
          {opps && oppCount > 0 && (
            <button
              type="button"
              onClick={() => setView('opps')}
              className="w-full text-left bg-jtp-bg border border-jtp-profit/40 rounded-[2px] px-3 py-2.5 hover:border-jtp-profit transition-colors group"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-jtp-md text-jtp-text">
                  <span className="text-jtp-profit font-mono font-semibold">✓ {oppCount}</span>{' '}
                  {oppCount === 1 ? 'opportunity' : 'opportunities'} ready
                </span>
                <span className="font-mono text-jtp-xs text-jtp-amber group-hover:translate-x-0.5 transition-transform">
                  VIEW ANALYSIS →
                </span>
              </span>
            </button>
          )}
          {opps && oppCount === 0 && (
            <EmptyState title="No copyable opportunities right now" description={oppNote ?? undefined} />
          )}

          {stratNeedsConnect && <ConnectPrompt />}
          {stratError && <p role="alert" className="text-jtp-md text-jtp-loss">{stratError}</p>}
          {strategy && (
            <button
              type="button"
              onClick={() => setView('strategy')}
              className="w-full text-left bg-jtp-bg border border-jtp-amber/40 rounded-[2px] px-3 py-2.5 hover:border-jtp-amber transition-colors group"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-jtp-md text-jtp-text truncate">
                  <span className="text-jtp-amber font-mono font-semibold">✓ Strategy</span>{' '}
                  <span className="text-jtp-textMuted truncate">{strategy.name || 'ready'}</span>
                </span>
                <span className="font-mono text-jtp-xs text-jtp-amber group-hover:translate-x-0.5 transition-transform flex-shrink-0">
                  VIEW →
                </span>
              </span>
            </button>
          )}
        </div>

        {idle && (
          <p className="text-jtp-md text-jtp-textDim mt-3">
            Scan the qualified leaderboard for AI-ranked copyable edges, or generate a draft strategy — then click to open the full analysis.
          </p>
        )}
      </Panel>

      {/* ── Full-page overlays ── */}
      {view === 'opps' && opps && (
        <AnalysisOverlay
          title="AI OPPORTUNITIES"
          subtitle={`${oppCount} AI-ranked copyable edge${oppCount === 1 ? '' : 's'} · not financial advice`}
          onClose={() => setView(null)}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {opps.map((opp, i) => (
              <OpportunityCard key={opp.addr || i} opp={opp} rank={i + 1} />
            ))}
          </div>
        </AnalysisOverlay>
      )}
      {view === 'strategy' && strategy && (
        <AnalysisOverlay
          title="AI STRATEGY"
          subtitle={strategy.name || undefined}
          onClose={() => setView(null)}
        >
          <StrategyCard strategy={strategy} />
        </AnalysisOverlay>
      )}
    </>
  );
};

export default AiQuantPanel;
