/**
 * StatusBar — the always-on bottom strip of the Operator Console.
 *
 * Renders at the very bottom of the viewport (full-width, below sidebar + content).
 * Provides at-a-glance system status that reinforces the "live trading desk" feel.
 *
 * Shows:
 *   - System status dot (green = operational)
 *   - Bot/agent status (when botEnabled)
 *   - Closed trade count
 *   - Last data update (human-readable relative time)
 *   - Live UTC clock (ticks every second)
 *   - Market session hint (currently open session)
 */
import React, { useState, useEffect, useRef } from 'react';
import { useTrade } from '../context/TradeContext';
import { useAuth } from '../context/AuthContext';

// ── Clock hook ─────────────────────────────────────────────────────────────────

function useUtcClock(): string {
  const [time, setTime] = useState(() => new Date());
  const rafRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    rafRef.current = setInterval(() => setTime(new Date()), 1000);
    return () => {
      if (rafRef.current) clearInterval(rafRef.current);
    };
  }, []);

  return time.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
    hour12: false,
  });
}

// ── Market session ──────────────────────────────────────────────────────────────

function getMarketSession(): { label: string; active: boolean } {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMin  = now.getUTCMinutes();
  const totalMin = utcHour * 60 + utcMin;

  // Sydney:  20:00 – 05:00 UTC
  // Tokyo:   23:00 – 08:00 UTC
  // London:  07:00 – 16:00 UTC
  // New York:12:00 – 21:00 UTC (overlaps London 12–16)
  if (totalMin >= 12 * 60 && totalMin < 16 * 60) {
    return { label: 'LONDON + NY OVERLAP', active: true };
  }
  if (totalMin >= 7 * 60 && totalMin < 16 * 60) {
    return { label: 'LONDON SESSION', active: true };
  }
  if (totalMin >= 12 * 60 && totalMin < 21 * 60) {
    return { label: 'NEW YORK SESSION', active: true };
  }
  if (totalMin >= 23 * 60 || totalMin < 8 * 60) {
    return { label: 'TOKYO SESSION', active: true };
  }
  if (totalMin >= 20 * 60 || totalMin < 5 * 60) {
    return { label: 'SYDNEY SESSION', active: true };
  }
  return { label: 'MARKETS CLOSED', active: false };
}

// ── Separator ───────────────────────────────────────────────────────────────────

const Sep: React.FC = () => (
  <span className="text-jtp-borderStrong select-none mx-[6px]">·</span>
);

// ── StatusBar ───────────────────────────────────────────────────────────────────

const StatusBar: React.FC = () => {
  const utcTime = useUtcClock();
  const { closedTrades, isTradesSynced } = useTrade();
  const { botEnabled } = useAuth();
  const [session, setSession] = useState(() => getMarketSession());

  // Update market session every minute
  useEffect(() => {
    const id = setInterval(() => setSession(getMarketSession()), 60_000);
    return () => clearInterval(id);
  }, []);

  const tradeCount = closedTrades.length;
  const systemOk = isTradesSynced;

  return (
    <footer
      className="flex-shrink-0 flex items-center h-statusbar bg-jtp-statusbar border-t border-jtp-border px-4 gap-0 z-50"
      style={{ fontSize: '9.5px', letterSpacing: '0.08em', fontFamily: '"JetBrains Mono", monospace' }}
      aria-label="System status"
    >
      {/* System status */}
      <span className="flex items-center gap-[5px] text-jtp-textDim uppercase">
        <span
          className={systemOk ? 'status-dot-live' : 'status-dot-warn'}
          aria-hidden="true"
        />
        <span className={systemOk ? 'text-jtp-profit' : 'text-jtp-warning'}>
          {systemOk ? 'SYSTEM OK' : 'SYNCING'}
        </span>
      </span>

      <Sep />

      {/* Agent / bot status */}
      {botEnabled ? (
        <>
          <span className="flex items-center gap-[5px] text-jtp-textDim uppercase">
            <span className="status-dot-live" aria-hidden="true" />
            <span className="text-jtp-profit">AGENT ONLINE</span>
          </span>
          <Sep />
        </>
      ) : (
        <>
          <span className="flex items-center gap-[5px] text-jtp-textDim uppercase">
            <span className="status-dot-idle" aria-hidden="true" />
            <span>AGENT IDLE</span>
          </span>
          <Sep />
        </>
      )}

      {/* Trade count */}
      <span className="text-jtp-textDim uppercase hidden sm:inline">
        TRADES&nbsp;
        <span className="text-jtp-textMuted">{tradeCount.toLocaleString('en-US')}</span>
      </span>

      <Sep />

      {/* Market session */}
      <span className="hidden md:inline-flex items-center gap-[5px] text-jtp-textDim uppercase">
        <span
          className={session.active ? 'status-dot-live' : 'status-dot-idle'}
          aria-hidden="true"
        />
        <span className={session.active ? 'text-jtp-textMuted' : 'text-jtp-textDim'}>
          {session.label}
        </span>
      </span>

      <Sep />

      {/* Spacer */}
      <span className="flex-1" />

      {/* UTC Clock */}
      <span
        className="text-jtp-textMuted tabular-nums"
        style={{ fontVariantNumeric: 'tabular-nums' }}
        aria-live="off"
        aria-label={`Current UTC time: ${utcTime}`}
      >
        {utcTime} <span className="text-jtp-textDim">UTC</span>
      </span>
    </footer>
  );
};

export default StatusBar;
