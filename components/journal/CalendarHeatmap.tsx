import React, { useState, useMemo, useRef } from 'react';
import { Trade, TradeResult } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Net P&L for a single trade after commission and swap. */
function tradeNet(t: Trade): number {
  return (t.profitLoss ?? 0) - (t.commission ?? 0) - (t.swap ?? 0);
}

/** YYYY-MM-DD bucket for a trade — exit date preferred, falls back to entry. */
function tradeDateKey(t: Trade): string {
  const raw = t.exitDate ?? t.entryDate;
  // Strip time component — handles both ISO strings and bare dates
  return raw.slice(0, 10);
}

/** Format P&L with sign prefix. Compact for large values. */
function fmtPL(v: number, compact = false): string {
  const abs = Math.abs(v);
  const sign = v >= 0 ? '+' : '-';
  if (compact && abs >= 10000) return `${sign}$${(abs / 1000).toFixed(0)}k`;
  if (compact && abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(2)}`;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ─── Day-level data types ──────────────────────────────────────────────────────

interface DayStat {
  netPL: number;
  tradeCount: number;
  wins: number;
  losses: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  closedTrades: Trade[];
}

const CalendarHeatmap: React.FC<Props> = ({ closedTrades }) => {
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Tooltip state: the YYYY-MM-DD key of the hovered day
  const [tooltipDay, setTooltipDay] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // ── Build day → stats map for current month ──────────────────────────────
  const dayMap = useMemo<Map<string, DayStat>>(() => {
    const map = new Map<string, DayStat>();
    for (const t of closedTrades) {
      const key = tradeDateKey(t);
      if (!key.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)) continue;
      const net = tradeNet(t);
      const existing = map.get(key);
      if (existing) {
        existing.netPL += net;
        existing.tradeCount += 1;
        if (t.result === TradeResult.Win) existing.wins += 1;
        if (t.result === TradeResult.Loss) existing.losses += 1;
      } else {
        map.set(key, {
          netPL: net,
          tradeCount: 1,
          wins: t.result === TradeResult.Win ? 1 : 0,
          losses: t.result === TradeResult.Loss ? 1 : 0,
        });
      }
    }
    return map;
  }, [closedTrades, year, month]);

  // ── Max absolute P&L this month (for intensity scaling) ──────────────────
  const maxAbsPL = useMemo(() => {
    let max = 0;
    dayMap.forEach(d => {
      const abs = Math.abs(d.netPL);
      if (abs > max) max = abs;
    });
    return max || 1; // avoid divide-by-zero
  }, [dayMap]);

  // ── Month-level summary stats ─────────────────────────────────────────────
  const monthStats = useMemo(() => {
    let totalPL = 0;
    let greenDays = 0;
    let redDays = 0;
    let totalTrades = 0;
    let totalWins = 0;
    let totalLosses = 0;

    dayMap.forEach(d => {
      totalPL += d.netPL;
      totalTrades += d.tradeCount;
      totalWins += d.wins;
      totalLosses += d.losses;
      if (d.netPL > 0) greenDays++;
      else if (d.netPL < 0) redDays++;
    });

    const winRate =
      totalWins + totalLosses > 0
        ? Math.round((totalWins / (totalWins + totalLosses)) * 100)
        : null;

    return { totalPL, greenDays, redDays, totalTrades, winRate };
  }, [dayMap]);

  // ── Build week rows ───────────────────────────────────────────────────────
  // Each row is 7 slots (Sun..Sat); null = padding cell outside the month
  const weeks = useMemo<Array<Array<number | null>>>(() => {
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const flat: Array<number | null> = [];
    for (let i = 0; i < firstDay; i++) flat.push(null);
    for (let d = 1; d <= daysInMonth; d++) flat.push(d);
    // Pad to full weeks
    while (flat.length % 7 !== 0) flat.push(null);

    const rows: Array<Array<number | null>> = [];
    for (let i = 0; i < flat.length; i += 7) {
      rows.push(flat.slice(i, i + 7));
    }
    return rows;
  }, [year, month]);

  // ── Weekly totals ─────────────────────────────────────────────────────────
  const weeklyTotals = useMemo<number[]>(() => {
    return weeks.map(row => {
      let sum = 0;
      row.forEach(day => {
        if (day === null) return;
        const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const stat = dayMap.get(key);
        if (stat) sum += stat.netPL;
      });
      return sum;
    });
  }, [weeks, dayMap, year, month]);

  // ── Date key helper ───────────────────────────────────────────────────────
  const dayKey = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // ── Cell color ────────────────────────────────────────────────────────────
  // Returns inline style with bg + border tuned to heatmap intensity.
  function cellStyle(stat: DayStat | undefined): React.CSSProperties {
    if (!stat || stat.tradeCount === 0) return {};
    const intensity = Math.min(Math.abs(stat.netPL) / maxAbsPL, 1);
    // bg opacity: 0.07 (barely visible) → 0.30 (vivid)
    const alpha = 0.07 + intensity * 0.23;
    if (stat.netPL > 0) {
      // profit green: jtp-profit #4cc38a
      return {
        backgroundColor: `rgba(76, 195, 138, ${alpha})`,
        borderColor: `rgba(76, 195, 138, ${Math.min(alpha * 1.8, 0.45)})`,
      };
    } else {
      // loss red: jtp-loss #e5635f
      return {
        backgroundColor: `rgba(229, 99, 95, ${alpha})`,
        borderColor: `rgba(229, 99, 95, ${Math.min(alpha * 1.8, 0.45)})`,
      };
    }
  }

  // ── P&L text colour class ─────────────────────────────────────────────────
  function plClass(v: number): string {
    if (v > 0) return 'text-jtp-profit';
    if (v < 0) return 'text-jtp-loss';
    return 'text-jtp-textDim';
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  const goPrev = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNext = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToday = () => {
    const n = new Date();
    setViewDate(new Date(n.getFullYear(), n.getMonth(), 1));
  };

  const isCurrentMonth =
    new Date().getFullYear() === year && new Date().getMonth() === month;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="py-[18px] select-none">

      {/* ── Month header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5">
        {/* Navigation */}
        <button
          onClick={goPrev}
          aria-label="Previous month"
          className="w-7 h-7 rounded-jtp-xl bg-jtp-control border border-jtp-borderStrong hover:border-jtp-borderHover text-jtp-textSoft flex items-center justify-center transition-colors text-jtp-lg leading-none"
        >
          ‹
        </button>

        <div className="text-jtp-xl font-semibold text-jtp-text min-w-[150px]">
          {MONTH_NAMES[month]} {year}
        </div>

        <button
          onClick={goNext}
          aria-label="Next month"
          className="w-7 h-7 rounded-jtp-xl bg-jtp-control border border-jtp-borderStrong hover:border-jtp-borderHover text-jtp-textSoft flex items-center justify-center transition-colors text-jtp-lg leading-none"
        >
          ›
        </button>

        {!isCurrentMonth && (
          <button
            onClick={goToday}
            className="px-2.5 py-1 rounded-jtp-xl bg-jtp-control border border-jtp-borderStrong hover:border-jtp-borderHover text-jtp-textDim text-jtp-xs transition-colors"
          >
            Today
          </button>
        )}

        <div className="flex-1" />

        {/* Month summary stats */}
        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="text-jtp-xs uppercase tracking-wider text-jtp-textDim mb-0.5">
              Net P&amp;L
            </div>
            <div
              className={`font-mono font-semibold text-jtp-xl ${
                monthStats.totalTrades === 0
                  ? 'text-jtp-textDim'
                  : plClass(monthStats.totalPL)
              }`}
            >
              {monthStats.totalTrades === 0 ? '—' : fmtPL(monthStats.totalPL)}
            </div>
          </div>

          <div className="w-px h-7 bg-jtp-borderStrong" />

          <div className="text-right">
            <div className="text-jtp-xs uppercase tracking-wider text-jtp-textDim mb-0.5">
              Days
            </div>
            <div className="font-mono font-semibold text-jtp-xl text-jtp-text flex items-baseline gap-1">
              <span className="text-jtp-profit">{monthStats.greenDays}</span>
              <span className="text-jtp-textFaint text-jtp-sm">/</span>
              <span className="text-jtp-loss">{monthStats.redDays}</span>
            </div>
          </div>

          <div className="w-px h-7 bg-jtp-borderStrong" />

          <div className="text-right">
            <div className="text-jtp-xs uppercase tracking-wider text-jtp-textDim mb-0.5">
              Trades
            </div>
            <div className="font-mono font-semibold text-jtp-xl text-jtp-text">
              {monthStats.totalTrades}
            </div>
          </div>

          <div className="w-px h-7 bg-jtp-borderStrong" />

          <div className="text-right">
            <div className="text-jtp-xs uppercase tracking-wider text-jtp-textDim mb-0.5">
              Win rate
            </div>
            <div className="font-mono font-semibold text-jtp-xl text-jtp-text">
              {monthStats.winRate != null ? `${monthStats.winRate}%` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Day-of-week header row (8 cols: 7 days + week total) ─────────── */}
      <div className="grid gap-1.5 mb-1.5" style={{ gridTemplateColumns: 'repeat(7, 1fr) 68px' }}>
        {DAY_LABELS.map(d => (
          <div
            key={d}
            className="text-center text-jtp-xs font-semibold tracking-wider uppercase text-jtp-textFaint py-0.5"
          >
            {d}
          </div>
        ))}
        <div className="text-center text-jtp-xs font-semibold tracking-wider uppercase text-jtp-textFaint py-0.5">
          Week
        </div>
      </div>

      {/* ── Calendar grid ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        {weeks.map((row, wi) => {
          const weekTotal = weeklyTotals[wi];
          const hasWeekTrades = row.some(day => {
            if (day === null) return false;
            return (dayMap.get(dayKey(day))?.tradeCount ?? 0) > 0;
          });

          return (
            <div
              key={wi}
              className="grid gap-1.5"
              style={{ gridTemplateColumns: 'repeat(7, 1fr) 68px' }}
            >
              {/* Day cells */}
              {row.map((day, di) => {
                if (day === null) {
                  return (
                    <div
                      key={`empty-${wi}-${di}`}
                      className="rounded-jtp-2xl border border-jtp-border opacity-20"
                      style={{ aspectRatio: '1.1' }}
                    />
                  );
                }

                const key = dayKey(day);
                const stat = dayMap.get(key);
                const hasTrades = (stat?.tradeCount ?? 0) > 0;
                const isToday =
                  isCurrentMonth && day === new Date().getDate();

                return (
                  <div
                    key={key}
                    onMouseEnter={() => setTooltipDay(key)}
                    onMouseLeave={() => setTooltipDay(null)}
                    className="relative rounded-jtp-2xl border border-jtp-border bg-jtp-panel flex flex-col p-2 cursor-default transition-all duration-100 hover:border-jtp-borderHover"
                    style={{
                      aspectRatio: '1.1',
                      ...cellStyle(stat),
                    }}
                  >
                    {/* Day number */}
                    <div
                      className={`font-mono text-jtp-xs leading-none ${
                        isToday
                          ? 'text-jtp-blue font-semibold'
                          : 'text-jtp-textFaint'
                      }`}
                    >
                      {day}
                      {isToday && (
                        <span className="ml-0.5 inline-block w-1 h-1 rounded-full bg-jtp-blue align-middle" />
                      )}
                    </div>

                    {/* P&L + trade count */}
                    {hasTrades && stat && (
                      <div className="mt-auto">
                        <div
                          className={`font-mono font-semibold text-jtp-base-minus leading-tight ${plClass(stat.netPL)}`}
                        >
                          {fmtPL(stat.netPL, true)}
                        </div>
                        <div className="text-jtp-2xs text-jtp-textFaint mt-px">
                          {stat.tradeCount} trade{stat.tradeCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    )}

                    {/* Hover tooltip */}
                    {tooltipDay === key && hasTrades && stat && (
                      <div
                        ref={tooltipRef}
                        className="absolute z-50 bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 pointer-events-none"
                        style={{ minWidth: '140px' }}
                      >
                        <div className="bg-jtp-active border border-jtp-borderStrong rounded-jtp-panel p-2.5 shadow-jtp-drawer">
                          {/* Arrow */}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0" style={{
                            borderLeft: '5px solid transparent',
                            borderRight: '5px solid transparent',
                            borderTop: '5px solid #232931',
                          }} />

                          <div className="text-jtp-xs text-jtp-textDim mb-1.5 font-medium">
                            {new Date(key + 'T12:00:00').toLocaleDateString('en-US', {
                              weekday: 'short', month: 'short', day: 'numeric',
                            })}
                          </div>

                          <div className={`font-mono font-semibold text-jtp-md ${plClass(stat.netPL)}`}>
                            {fmtPL(stat.netPL)}
                          </div>

                          <div className="mt-1.5 pt-1.5 border-t border-jtp-border flex gap-3 text-jtp-xs">
                            <div>
                              <span className="text-jtp-textFaint">Trades </span>
                              <span className="font-mono text-jtp-text font-medium">{stat.tradeCount}</span>
                            </div>
                            {(stat.wins > 0 || stat.losses > 0) && (
                              <div>
                                <span className="text-jtp-profit font-mono">{stat.wins}W</span>
                                <span className="text-jtp-textFaint mx-0.5">/</span>
                                <span className="text-jtp-loss font-mono">{stat.losses}L</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Weekly total cell */}
              <div
                className={`rounded-jtp-2xl border flex flex-col items-center justify-center ${
                  hasWeekTrades && weekTotal !== 0
                    ? weekTotal > 0
                      ? 'border-jtp-profit/20 bg-jtp-profit/5'
                      : 'border-jtp-loss/20 bg-jtp-loss/5'
                    : 'border-jtp-border bg-jtp-panel opacity-40'
                }`}
                style={{ aspectRatio: '1.1' }}
              >
                {hasWeekTrades && weekTotal !== 0 ? (
                  <>
                    <div className="text-jtp-2xs text-jtp-textFaint uppercase tracking-wider mb-0.5">
                      Wk
                    </div>
                    <div className={`font-mono font-semibold text-jtp-base-minus leading-tight text-center ${plClass(weekTotal)}`}>
                      {fmtPL(weekTotal, true)}
                    </div>
                  </>
                ) : (
                  <div className="text-jtp-2xs text-jtp-textFaint uppercase tracking-wider">Wk</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {monthStats.totalTrades === 0 && (
        <div className="mt-6 text-center text-jtp-textFaint text-jtp-sm">
          No closed trades in {MONTH_NAMES[month]} {year}.
        </div>
      )}
    </div>
  );
};

export default CalendarHeatmap;
