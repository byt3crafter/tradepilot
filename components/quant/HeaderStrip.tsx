import React from 'react';
import { CountUp, LiveDot, useClock } from './primitives';

type Stats = { total: number; scanned: number; qualified: number } | null;

const Stat: React.FC<{ label: string; value: number | null; tone?: string }> = ({ label, value, tone }) => (
  <div className="flex flex-col items-end leading-none">
    <span className={`text-[15px] font-semibold ${tone ?? 'text-[var(--qt-text)]'}`}>
      {value === null ? '—' : <CountUp value={value} />}
    </span>
    <span className="text-[9px] uppercase tracking-[0.14em] text-[var(--qt-dim)] mt-1">{label}</span>
  </div>
);

const HeaderStrip: React.FC<{ stats: Stats }> = ({ stats }) => {
  const clock = useClock();
  return (
    <div className="qt-panel relative overflow-hidden">
      <div className="qt-accent-line absolute top-0 left-0 right-0 h-px" />
      <div className="flex items-center justify-between gap-4 px-4 py-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[15px] font-semibold tracking-[0.12em] text-[var(--qt-text)] whitespace-nowrap">
            JTRADEPILOT <span className="text-[var(--qt-faint)]">×</span>{' '}
            <span className="qt-led-blue">QUANT</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-[var(--qt-border-bright)] rounded-[3px]">
            <LiveDot />
            <span className="text-[9px] uppercase tracking-[0.18em] text-[var(--qt-green)] font-semibold">Live</span>
          </span>
        </div>

        <div className="flex items-center gap-6">
          <Stat label="Tracked" value={stats?.total ?? null} />
          <Stat label="Scanned" value={stats?.scanned ?? null} tone="text-[var(--qt-blue)]" />
          <Stat label="Qualified" value={stats?.qualified ?? null} tone="text-[var(--qt-green)]" />
          <div className="flex flex-col items-end leading-none pl-6 border-l border-[var(--qt-border)]">
            <span className="text-[15px] font-semibold text-[var(--qt-text)] tabular-nums">{clock}</span>
            <span className="text-[9px] uppercase tracking-[0.14em] text-[var(--qt-dim)] mt-1">UTC±LOCAL</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeaderStrip;
