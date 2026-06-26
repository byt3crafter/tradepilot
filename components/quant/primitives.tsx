import React, { useEffect, useRef, useState } from 'react';

// ─── Hooks ──────────────────────────────────────────────────────────────────

/** setInterval that survives re-renders and always calls the latest callback. */
export function useInterval(callback: () => void, delayMs: number | null) {
  const saved = useRef(callback);
  useEffect(() => {
    saved.current = callback;
  }, [callback]);
  useEffect(() => {
    if (delayMs === null) return;
    const id = setInterval(() => saved.current(), delayMs);
    return () => clearInterval(id);
  }, [delayMs]);
}

/** A ticking clock value (HH:MM:SS), updated once per second. */
export function useClock(): string {
  const [now, setNow] = useState(() => new Date());
  useInterval(() => setNow(new Date()), 1000);
  return now.toLocaleTimeString('en-GB', { hour12: false });
}

// ─── Formatters ─────────────────────────────────────────────────────────────

export const truncAddr = (a?: string) =>
  a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a || '';

export const fmtInt = (n: number) =>
  Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—';

export const fmtUsd = (n: number) => {
  if (!Number.isFinite(n)) return '—';
  const sign = n < 0 ? '-' : '';
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `${sign}$${(a / 1_000).toFixed(1)}K`;
  return `${sign}$${a.toFixed(0)}`;
};

export const fmtPct = (n: number) => (Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : '—');

/** Compact relative time since an ISO timestamp, e.g. "12s", "4m", "3h", "2d". */
export const relTime = (iso?: string) => {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '—';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return `${Math.floor(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};
export const fmtCents = (edgePerShare: number) =>
  Number.isFinite(edgePerShare) ? `${(edgePerShare * 100).toFixed(1)}¢` : '—';

export const edgeTone = (n: number) =>
  n > 0 ? 'qt-led-green' : n < 0 ? 'qt-led-red' : 'text-[var(--qt-dim)]';

export const ledOf = (n: number) =>
  n > 0 ? 'qt-led-green' : n < 0 ? 'qt-led-red' : 'qt-led-blue';

// ─── CountUp ────────────────────────────────────────────────────────────────

/** Animated integer that tweens from its previous value to the new one. */
export const CountUp: React.FC<{
  value: number;
  durationMs?: number;
  className?: string;
}> = ({ value, durationMs = 900, className }) => {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number>();

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) {
      setDisplay(to);
      return;
    }
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = to;
    };
  }, [value, durationMs]);

  return <span className={className}>{fmtInt(display)}</span>;
};

// ─── LiveDot ────────────────────────────────────────────────────────────────

export const LiveDot: React.FC<{ tone?: 'green' | 'red' | 'amber' }> = ({ tone = 'green' }) => (
  <span
    className={tone === 'red' ? 'qt-dot qt-dot-red' : tone === 'amber' ? 'qt-dot qt-dot-amber' : 'qt-dot'}
    aria-hidden="true"
  />
);

// ─── Panel shell ────────────────────────────────────────────────────────────

export const Panel: React.FC<{
  label: string;
  live?: boolean;
  right?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}> = ({ label, live, right, className, bodyClassName, children }) => (
  <section className={`qt-panel ${className ?? ''}`}>
    <header className="flex items-center justify-between gap-2 px-3 h-7 border-b border-[var(--qt-border)]">
      <div className="flex items-center gap-1.5 min-w-0">
        {live && <LiveDot />}
        <span className="qt-panel-label truncate">{label}</span>
      </div>
      {right && <div className="flex items-center gap-2 text-[9px] text-[var(--qt-faint)] uppercase tracking-wider whitespace-nowrap">{right}</div>}
    </header>
    <div className={bodyClassName ?? 'p-3'}>{children}</div>
  </section>
);
