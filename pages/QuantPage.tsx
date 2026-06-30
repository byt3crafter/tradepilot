import React, { useState, useCallback } from 'react';
import WhatWorksPanel from '../components/quant/WhatWorksPanel';
import QuantArbPanel from '../components/quant/QuantArbPanel';
import QuantSignalsPanel from '../components/quant/QuantSignalsPanel';
import QuantAutoBotPanel from '../components/quant/QuantAutoBotPanel';
import type { TradePrefill } from '../components/trade/PolymarketTradePanel';
import { SegmentedControl } from '../components/ui';
import type { Segment } from '../components/ui';

type QuantMode = 'signals' | 'auto' | 'learning' | 'arbitrage';

// ─── Mode segments ────────────────────────────────────────────────────────────

const MODE_SEGMENTS: Segment<QuantMode>[] = [
  { value: 'signals',   label: 'Signals' },
  { value: 'auto',      label: 'Auto Bot' },
  { value: 'learning',  label: 'What Works' },
  { value: 'arbitrage', label: 'Arbitrage' },
];

// Tabs that were previously in localStorage but no longer exist.
const REMOVED_MODES = ['trade', 'leaderboard', 'terminal'];

// ─── Main QuantPage ───────────────────────────────────────────────────────────

const QuantPage: React.FC = () => {
  const [mode, setModeRaw] = useState<QuantMode>(() => {
    try {
      const saved = localStorage.getItem('jtp.quantMode');
      // Guard against stale values from removed tabs ('trade', 'leaderboard', 'terminal').
      return saved && !REMOVED_MODES.includes(saved) ? (saved as QuantMode) : 'signals';
    } catch {
      return 'signals';
    }
  });

  const setMode = (m: QuantMode) => {
    setModeRaw(m);
    try { localStorage.setItem('jtp.quantMode', m); } catch { /* ignore */ }
  };

  const handleArbTrade = useCallback((prefill: TradePrefill) => {
    const url = prefill.slug
      ? `https://polymarket.com/event/${prefill.slug}`
      : 'https://polymarket.com';
    window.open(url, '_blank', 'noopener');
  }, []);

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

      ) : mode === 'auto' ? (
        /* ── Auto Bot — autonomous bot wallet + monitor ── */
        <>
          <div>
            <h1 className="text-jtp-2xl font-semibold text-jtp-text tracking-tight">
              Auto Bot
            </h1>
            <p className="text-jtp-lg text-jtp-textMuted mt-1.5 max-w-3xl">
              Autonomous Polymarket trading from an isolated server-held wallet. Fund it, set your
              limits, and switch to AUTO — the bot places trades on your behalf.
            </p>
          </div>
          <QuantAutoBotPanel />
        </>

      ) : mode === 'learning' ? (
        /* ── What Works — predictions vs outcomes transparency view ── */
        <WhatWorksPanel />

      ) : (
        /* ── Arbitrage — live scanner of cross-market + settlement-lag arbs ── */
        <>
          <div>
            <h1 className="text-jtp-2xl font-semibold text-jtp-text tracking-tight">
              Arbitrage Scanner
            </h1>
            <p className="text-jtp-lg text-jtp-textMuted mt-1.5 max-w-3xl">
              Live scan for real arb opportunities on Polymarket — settlement-lag edges and
              cross-market NegRisk mismatches. Arbs are rare and often close within seconds.
              Click <span className="text-jtp-text font-medium">Trade ↗</span> to open the
              market on Polymarket.
            </p>
          </div>
          <QuantArbPanel onTrade={handleArbTrade} />
        </>
      )}
    </div>
  );
};

export default QuantPage;
