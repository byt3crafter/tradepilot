import React, { useMemo } from 'react';
import { QuantFeedItem } from '../../types';
import { truncAddr } from './primitives';

const Item: React.FC<{ t: QuantFeedItem }> = ({ t }) => {
  const buy = t.side === 'BUY';
  const tone = buy ? 'text-[var(--qt-green)]' : 'text-[var(--qt-red)]';
  const arrow = buy ? '▲' : '▼';
  const title = (t.title || t.outcome || '').slice(0, 42);
  return (
    <span className="inline-flex items-center gap-1.5 px-4 text-[11px] border-r border-[var(--qt-border)]">
      <span className={`${tone} font-semibold`}>{arrow} {t.side}</span>
      <span className="text-[var(--qt-text)]">{Math.round(t.size).toLocaleString('en-US')}</span>
      <span className="text-[var(--qt-faint)]">@</span>
      <span className="text-[var(--qt-text)]">{Number.isFinite(t.price) ? t.price.toFixed(2) : '—'}</span>
      {title && <span className="text-[var(--qt-dim)] truncate max-w-[260px]">· {title}</span>}
      <span className="text-[var(--qt-blue)]">· @{(t.pseudonym || truncAddr(t.wallet)) || 'anon'}</span>
    </span>
  );
};

const TickerTape: React.FC<{ feed: QuantFeedItem[]; loading: boolean }> = ({ feed, loading }) => {
  // Duplicate the list so the -50% marquee loop is seamless.
  const doubled = useMemo(() => (feed.length ? [...feed, ...feed] : []), [feed]);

  // Tie the loop duration to item count so it's always a steady, readable crawl
  // (~4.5s per item) — roughly 2.5–3x slower than the old fixed 60s loop.
  const durationS = useMemo(() => Math.max(80, Math.round(feed.length * 4.5)), [feed.length]);

  return (
    <div className="qt-panel flex items-stretch h-9 overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 border-r border-[var(--qt-border-bright)] bg-[#0c0f12] flex-shrink-0">
        <span className="qt-dot" aria-hidden="true" />
        <span className="qt-panel-label">Live Trades</span>
      </div>
      <div className="qt-ticker-mask flex-1 flex items-center">
        {feed.length === 0 ? (
          <span className="px-4 text-[11px] text-[var(--qt-faint)]">
            {loading ? 'Streaming live trades…' : 'No live trades on the wire right now.'}
          </span>
        ) : (
          <div className="qt-ticker-track" style={{ animationDuration: `${durationS}s` }}>
            {doubled.map((t, i) => (
              <Item key={`${t.wallet}-${t.ts}-${i}`} t={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TickerTape;
