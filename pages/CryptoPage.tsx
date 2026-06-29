/**
 * CryptoPage — Multi-exchange crypto trading engine.
 *
 * Tabs:
 *   Funding Arb   — LIVE: delta-neutral funding rate scanner, polls every 30s
 *   Momentum      — described, coming
 *   Mean-Reversion— described, coming
 *   AI Signals    — described, coming
 *   Auto Bot      — described, coming
 *   Connection    — exchange API key status (read-only; keys set via Admin)
 *
 * Gated by quantEnabled (same gate as Quant).
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Panel, Badge, SegmentedControl, EmptyState, Skeleton } from '../components/ui';
import { CryptoFundingOpp, CryptoFundingScan, ExchangeStatusMap } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type CryptoTab =
  | 'funding_arb'
  | 'momentum'
  | 'mean_reversion'
  | 'ai_signals'
  | 'auto_bot'
  | 'connection';

// ─── Icons ────────────────────────────────────────────────────────────────────

const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <path d="M2 8a6 6 0 0110.5-4" strokeLinecap="round" />
    <path d="M14 8a6 6 0 01-10.5 4" strokeLinecap="round" />
    <polyline points="12,2 12.5,4.5 10,4.5" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="4,13.5 3.5,11 6,11" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TickerSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <polyline points="2,12 5,7 8,9 11,4 14,6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Funding Arb Row ─────────────────────────────────────────────────────────

const FundingRow: React.FC<{ opp: CryptoFundingOpp }> = ({ opp }) => {
  const isCarry = opp.side === 'cash-and-carry';
  const sideVariant = isCarry ? 'profit' : 'info' as const;
  const sideLabel = isCarry ? 'CASH-AND-CARRY' : 'REV-CARRY';

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-3 py-4 border-b border-jtp-border last:border-0">
      {/* Yield + symbol */}
      <div className="flex items-baseline gap-3 min-w-0 flex-1">
        <span
          className="font-mono font-bold tabular-nums flex-shrink-0"
          style={{ fontSize: '22px', color: '#3ddc84', lineHeight: 1 }}
        >
          +{opp.netAnnualPct.toFixed(1)}%/yr
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-semibold text-jtp-text text-jtp-lg">
              {opp.symbol}
            </span>
            <Badge variant="neutral" size="xs">
              {opp.fundingPct8h.toFixed(4)}%/8h
            </Badge>
            <Badge variant={sideVariant} size="xs">
              {sideLabel}
            </Badge>
          </div>
          <div className="mt-[3px] flex items-center gap-2 flex-wrap">
            <span className="font-mono text-jtp-xs text-jtp-textDim tabular-nums">
              mark&nbsp;
              <span className="text-jtp-textMuted">
                ${opp.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </span>
            </span>
            <span className="font-mono text-jtp-xs text-jtp-textDim tabular-nums">
              vol&nbsp;
              <span className="text-jtp-textMuted">
                ${(opp.volume24hUsd / 1_000_000).toFixed(0)}M
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="flex-shrink-0 max-w-xs">
        <p className="text-jtp-xs text-jtp-textDim leading-snug font-mono">
          {opp.action}
        </p>
      </div>
    </div>
  );
};

// ─── Tab: Funding Arb ────────────────────────────────────────────────────────

const FundingArbTab: React.FC<{ exchange: string; token: string | null }> = ({
  exchange,
  token,
}) => {
  const [scan, setScan] = useState<CryptoFundingScan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.exchangesFunding(exchange, token);
      setScan(data);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e.message || 'Failed to load funding data');
    } finally {
      setLoading(false);
    }
  }, [exchange, token]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 30_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  const updatedStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  const headerActions = (
    <div className="flex items-center gap-2">
      {updatedStr && (
        <span className="font-mono text-jtp-xs text-jtp-textDim">
          <RefreshIcon className="inline w-3 h-3 mr-1 align-middle" />
          updated {updatedStr}
        </span>
      )}
      <button
        onClick={load}
        disabled={loading}
        className="font-mono text-jtp-xs text-jtp-textDim hover:text-jtp-textMuted transition-colors disabled:opacity-40"
        aria-label="Refresh funding data"
      >
        {loading ? 'loading...' : 'refresh'}
      </button>
    </div>
  );

  if (error) {
    return (
      <Panel label="FUNDING OPPORTUNITIES" actions={headerActions}>
        <div className="py-6 text-center">
          <p className="text-jtp-loss text-jtp-md font-mono">{error}</p>
          <button
            onClick={load}
            className="mt-3 text-jtp-xs text-jtp-textDim hover:text-jtp-textMuted font-mono"
          >
            retry
          </button>
        </div>
      </Panel>
    );
  }

  if (loading && !scan) {
    return (
      <Panel label="FUNDING OPPORTUNITIES" actions={headerActions}>
        <div className="space-y-3 py-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} variant="panel" className="h-16" />
          ))}
        </div>
      </Panel>
    );
  }

  const opps = scan?.opportunities ?? [];

  return (
    <div className="space-y-4">
      <Panel
        label="FUNDING OPPORTUNITIES"
        actions={headerActions}
      >
        {opps.length === 0 ? (
          <EmptyState
            title="No opportunities found"
            description="No funding rate opportunities detected for this exchange right now."
          />
        ) : (
          <div>
            {opps.map((opp, i) => (
              <FundingRow key={`${opp.symbol}-${i}`} opp={opp} />
            ))}
          </div>
        )}
      </Panel>

      {/* Disclaimer */}
      <Panel label="HOW THIS WORKS">
        <div className="space-y-2 text-jtp-sm text-jtp-textMuted leading-relaxed max-w-2xl">
          <p>
            <span className="text-jtp-amber font-semibold">Delta-neutral funding yield.</span>{' '}
            Crypto perpetual futures pay a funding rate every 8 hours — positive rates mean longs
            pay shorts. By holding equal and opposite spot + perp positions you collect the funding
            with near-zero directional exposure.
          </p>
          <p>
            <span className="text-jtp-amber font-semibold">Risk note:</span>{' '}
            Highest rates are on volatile alts (higher risk); BTC/ETH are lower but safer. Rates
            shown are gross — net yield assumes ~6%/yr in fees (exchange fees, spread, borrow).
            Rates can flip rapidly.
          </p>
          <p>
            <span className="text-jtp-textDim font-mono text-jtp-xs">
              READ-ONLY SCANNER. Execution coming — testnet first.
            </span>
          </p>
        </div>
      </Panel>
    </div>
  );
};

// ─── "Coming" tab content ─────────────────────────────────────────────────────

interface ComingTabProps {
  title: string;
  description: string;
  detail?: string;
}

const ComingTab: React.FC<ComingTabProps> = ({ title, description, detail }) => (
  <Panel label={title.toUpperCase()}>
    <div className="py-6 space-y-4 max-w-xl">
      <div className="flex items-center gap-3">
        <Badge variant="warning" size="md">COMING</Badge>
        <span className="font-mono text-jtp-xs text-jtp-textDim">
          Forward-proven on testnet before live activation
        </span>
      </div>
      <p className="text-jtp-md text-jtp-textMuted leading-relaxed">{description}</p>
      {detail && (
        <p className="text-jtp-sm text-jtp-textDim leading-relaxed font-mono">{detail}</p>
      )}
    </div>
  </Panel>
);

// ─── Tab: Connection ──────────────────────────────────────────────────────────

const ConnectionTab: React.FC<{ token: string | null }> = ({ token }) => {
  const [status, setStatus] = useState<ExchangeStatusMap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    api.exchangesStatus(token)
      .then(setStatus)
      .catch((e: any) => setError(e.message || 'Failed to load status'))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <Panel label="EXCHANGE CONNECTION STATUS">
      {loading && (
        <div className="space-y-3">
          <Skeleton variant="panel" className="h-20" />
          <Skeleton variant="panel" className="h-20" />
        </div>
      )}

      {error && (
        <p className="text-jtp-loss text-jtp-md font-mono py-4">{error}</p>
      )}

      {!loading && !error && status && (
        <div className="space-y-3">
          {Object.entries(status).map(([exchange, info]) => (
            <div
              key={exchange}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-jtp-raised border border-jtp-border rounded-[2px]"
            >
              {/* Exchange name */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-jtp-text uppercase tracking-wider text-jtp-md">
                    {exchange}
                  </span>
                  <Badge
                    variant={info.configured ? 'profit' : 'neutral'}
                    size="xs"
                  >
                    {info.configured ? 'CONFIGURED' : 'NOT SET'}
                  </Badge>
                  <Badge
                    variant={info.testnet ? 'warning' : 'info'}
                    size="xs"
                  >
                    {info.testnet ? 'TESTNET' : 'LIVE'}
                  </Badge>
                </div>
                {info.keyMask && (
                  <p className="font-mono text-jtp-xs text-jtp-textDim mt-1">
                    key: {info.keyMask}
                  </p>
                )}
              </div>

              {/* Status dot */}
              <div className="flex-shrink-0 flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    info.configured ? 'bg-[#3ddc84]' : 'bg-jtp-textDim/40'
                  }`}
                />
                <span className={`font-mono text-jtp-xs ${info.configured ? 'text-[#3ddc84]' : 'text-jtp-textDim'}`}>
                  {info.configured ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
            </div>
          ))}

          {Object.keys(status).length === 0 && (
            <EmptyState
              title="No exchanges configured"
              description="Ask an admin to set up exchange API keys."
            />
          )}
        </div>
      )}

      {!loading && !error && !status && (
        <EmptyState
          title="No status data"
          description="Could not load exchange status."
        />
      )}

      <div className="mt-4 pt-4 border-t border-jtp-border">
        <p className="font-mono text-jtp-xs text-jtp-textDim">
          API keys are set by an admin in Admin &rarr; Exchange Keys.
          Keys are write-only once saved — only the masked preview is shown here.
        </p>
      </div>
    </Panel>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const TAB_LABELS: { value: CryptoTab; label: string }[] = [
  { value: 'funding_arb',    label: 'Funding Arb' },
  { value: 'momentum',       label: 'Momentum' },
  { value: 'mean_reversion', label: 'Mean-Rev' },
  { value: 'ai_signals',     label: 'AI Signals' },
  { value: 'auto_bot',       label: 'Auto Bot' },
  { value: 'connection',     label: 'Connection' },
];

const CryptoPage: React.FC = () => {
  const { accessToken } = useAuth();

  const [exchanges, setExchanges] = useState<string[]>(['binance']);
  const [activeExchange, setActiveExchange] = useState('binance');
  const [activeTab, setActiveTab] = useState<CryptoTab>('funding_arb');

  // Load exchange list
  useEffect(() => {
    if (!accessToken) return;
    api.exchangesList(accessToken)
      .then(r => {
        if (r.exchanges?.length) {
          setExchanges(r.exchanges);
          setActiveExchange(r.exchanges[0]);
        }
      })
      .catch(() => {/* default to binance */});
  }, [accessToken]);

  const exchangeSegments = exchanges.map(e => ({
    value: e,
    label: e.charAt(0).toUpperCase() + e.slice(1),
  }));

  return (
    <div className="space-y-4">
      {/* Page controls row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Exchange picker */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-jtp-xs text-jtp-textDim uppercase tracking-[0.1em] flex-shrink-0">
            Exchange
          </span>
          <SegmentedControl
            segments={exchangeSegments}
            value={activeExchange}
            onChange={setActiveExchange}
            size="sm"
          />
        </div>

        <div className="flex-1" />

        {/* Sub-tab selector */}
        <div className="overflow-x-auto pb-1 sm:pb-0">
          <SegmentedControl
            segments={TAB_LABELS}
            value={activeTab}
            onChange={setActiveTab}
            size="xs"
          />
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'funding_arb' && (
        <FundingArbTab exchange={activeExchange} token={accessToken} />
      )}

      {activeTab === 'momentum' && (
        <ComingTab
          title="Momentum"
          description="Buy spot, ride the trend, sell higher — systematic trend-following on liquid coins. Enters breakouts confirmed by volume and momentum oscillators. Exits on trailing stop or momentum exhaustion."
          detail="Will be forward-proven on testnet before live activation. Backtest results will be shared alongside live signal performance."
        />
      )}

      {activeTab === 'mean_reversion' && (
        <ComingTab
          title="Mean-Reversion"
          description="Buy dips and sell rips within established ranges, augmented by an automated grid for passive accumulation/distribution. Best suited to sideways, high-volume markets."
          detail="Grid parameters will be set per-asset based on average true range. Live only after testnet validation."
        />
      )}

      {activeTab === 'ai_signals' && (
        <ComingTab
          title="AI Signals"
          description="AI reads price action, funding rate history, open interest, and news/sentiment to generate directional calls with a stated confidence and risk level. Signals are explanatory — you decide whether to act."
          detail="Signals will be logged and tracked for accuracy. The model will be evaluated on out-of-sample forward predictions before integration."
        />
      )}

      {activeTab === 'auto_bot' && (
        <ComingTab
          title="Auto Bot"
          description="Flip any proven strategy autonomous — testnet first, then live — with hard position limits, a kill switch, real-time equity monitoring, and win/loss circuit breakers. The same execution engine as the Polymarket auto bot."
          detail="Every strategy requires a testnet track record before live activation. Hard limits enforced at the exchange API level, not just application logic."
        />
      )}

      {activeTab === 'connection' && (
        <ConnectionTab token={accessToken} />
      )}
    </div>
  );
};

export default CryptoPage;
