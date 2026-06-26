import React, { useCallback, useState } from 'react';
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

// Confidence → Badge variant
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
  <div className="bg-jtp-bg border border-jtp-border rounded-jtp-xl overflow-hidden">
    <div className="px-4 py-3 border-b border-jtp-border flex items-center gap-2.5 flex-wrap">
      <span className="font-mono text-jtp-xs text-jtp-textDim">#{rank}</span>
      <span className="text-jtp-lg font-semibold text-jtp-text truncate">
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
      <span className="ml-auto flex items-center gap-2">
        {opp.focus && <Badge variant="neutral" size="xs">{opp.focus}</Badge>}
        <Badge variant={opp.copyable ? 'profit' : 'loss'} size="xs">
          {opp.copyable ? '✓ Copyable' : '✗ Not copyable'}
        </Badge>
      </span>
    </div>
    <div className="px-4 py-3 space-y-2.5">
      {opp.edge && (
        <p className="font-mono text-jtp-md text-jtp-textMuted">{opp.edge}</p>
      )}
      {opp.action && (
        <div className="bg-jtp-active border border-jtp-borderFocus rounded-jtp-lg px-3 py-2">
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
  <div className="bg-jtp-bg border border-jtp-border rounded-jtp-xl px-4 py-3">
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
  <div className="bg-jtp-bg border border-jtp-border rounded-jtp-xl overflow-hidden">
    <div className="px-4 py-3 border-b border-jtp-border flex items-center gap-2.5 flex-wrap">
      <span className="text-jtp-lg font-semibold text-jtp-text">
        {strategy.name || 'Untitled strategy'}
      </span>
      {strategy.marketType && <Badge variant="neutral" size="xs">{strategy.marketType}</Badge>}
      <span className="ml-auto">
        <Badge
          variant={CONFIDENCE_VARIANT[strategy.confidence] ?? 'warning'}
          size="sm"
        >
          {strategy.confidence} confidence
        </Badge>
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
          <span className="jtp-label">Rationale</span>
          <p className="text-jtp-md text-jtp-textMuted leading-relaxed mt-0.5">{strategy.rationale}</p>
        </div>
      )}
      <p className="text-jtp-xs text-jtp-textDim italic">Draft strategy — backtest before trading.</p>
    </div>
  </div>
);

// ─── Main panel ───────────────────────────────────────────────────────────────

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

  const panelActions = (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        onClick={buildStrategy}
        isLoading={stratLoading}
        disabled={stratLoading}
      >
        {stratLoading ? 'Building…' : 'Build Strategy'}
      </Button>
      <Button
        variant="primary"
        onClick={findOpportunities}
        isLoading={oppLoading}
        disabled={oppLoading}
      >
        {oppLoading ? 'Scanning…' : opps ? 'Re-scan' : 'Find Opportunities'}
      </Button>
    </div>
  );

  return (
    <Panel label="AI OPPORTUNITIES" actions={panelActions}>
      <p className="text-jtp-md text-jtp-textDim mb-4">
        AI-suggested copyable edges — not financial advice.
      </p>

      {/* ── Opportunities results ── */}
      {oppNeedsConnect && <ConnectPrompt />}
      {oppError && (
        <p role="alert" className="text-jtp-md text-jtp-loss">
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
        <EmptyState
          title="No copyable opportunities right now"
          description={oppNote ?? undefined}
        />
      )}

      {/* ── Strategy result ── */}
      {(stratNeedsConnect || stratError || strategy) && (
        <div className="pt-4 border-t border-jtp-borderSubtle space-y-3 mt-4">
          <span className="jtp-label">AI Strategy</span>
          {stratNeedsConnect && <ConnectPrompt />}
          {stratError && (
            <p role="alert" className="text-jtp-md text-jtp-loss">
              {stratError}
            </p>
          )}
          {strategy && <StrategyCard strategy={strategy} />}
        </div>
      )}

      {/* ── Idle hint ── */}
      {!opps && !oppLoading && !oppError && !oppNeedsConnect &&
        !strategy && !stratLoading && !stratError && !stratNeedsConnect && (
        <p className="text-jtp-md text-jtp-textDim">
          Scan the qualified leaderboard for AI-ranked copyable edges, or generate a draft strategy.
        </p>
      )}
    </Panel>
  );
};

export default AiQuantPanel;
