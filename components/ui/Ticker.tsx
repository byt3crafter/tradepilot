/**
 * Ticker — horizontal scrolling data tape (trading terminal live feed).
 *
 * Renders a single-line continuous marquee of symbol/price/change pairs.
 * Ticker items auto-scroll from right to left in a seamless loop.
 *
 * Usage:
 *   <Ticker items={[
 *     { symbol: 'EUR/USD', price: '1.0842', change: '+0.12%', positive: true },
 *     { symbol: 'GBP/USD', price: '1.2714', change: '-0.08%', positive: false },
 *   ]} />
 *
 * When no items are provided, renders a static "MARKET DATA" placeholder.
 *
 * Requires the `animate-ticker-scroll` Tailwind animation to be defined:
 *   keyframes: { tickerScroll: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } } }
 *   animation: { 'ticker-scroll': 'tickerScroll linear infinite' }
 */
import React from 'react';

export interface TickerItem {
  symbol: string;
  price: string;
  change?: string;
  positive?: boolean;
}

export interface TickerProps {
  items?: TickerItem[];
  className?: string;
  /** Controls scroll animation-duration: slow=45s, normal=30s, fast=15s */
  speed?: 'slow' | 'normal' | 'fast';
}

const SPEED_MS: Record<NonNullable<TickerProps['speed']>, string> = {
  slow: '45s',
  normal: '30s',
  fast: '15s',
};

const PLACEHOLDER: TickerItem[] = [
  { symbol: 'EUR/USD', price: '-.----', change: '--.--%' },
  { symbol: 'GBP/USD', price: '-.----', change: '--.--%' },
  { symbol: 'USD/JPY', price: '---.--', change: '--.--%' },
  { symbol: 'XAU/USD', price: '----.--', change: '--.--%' },
];

const TickerItem: React.FC<{ item: TickerItem }> = ({ item }) => (
  <span className="inline-flex items-center gap-[6px] px-[14px]">
    {/* Bullet separator */}
    <span className="text-jtp-textDim text-[8px] select-none">●</span>

    {/* Symbol */}
    <span className="font-mono text-[11px] text-jtp-textMuted tracking-[0.08em]">
      {item.symbol}
    </span>

    {/* Price */}
    <span
      className="font-mono text-[11px] font-bold text-jtp-text"
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {item.price}
    </span>

    {/* Change */}
    {item.change !== undefined && (
      <span
        className={`font-mono text-[10px] font-semibold ${
          item.positive === true
            ? 'text-jtp-profit'
            : item.positive === false
              ? 'text-jtp-loss'
              : 'text-jtp-textDim'
        }`}
      >
        {item.change}
      </span>
    )}
  </span>
);

const Ticker: React.FC<TickerProps> = ({
  items,
  className = '',
  speed = 'normal',
}) => {
  const displayItems = items && items.length > 0 ? items : PLACEHOLDER;
  const duration = SPEED_MS[speed];

  return (
    <div
      className={`h-[26px] flex items-center overflow-hidden bg-jtp-statusbar border-b border-jtp-border select-none ${className}`}
    >
      {/* Left edge label */}
      <span className="flex-shrink-0 inline-flex items-center gap-[6px] pl-[10px] pr-[8px] border-r border-jtp-border h-full">
        <span
          className="font-mono text-[10px] font-bold tracking-[0.15em]"
          style={{ color: '#e8a23d' }}
        >
          LIVE
        </span>
      </span>

      {/* Scrolling tape */}
      <div className="flex-1 overflow-hidden h-full flex items-center">
        <div
          className="flex items-center whitespace-nowrap animate-ticker-scroll"
          style={{ animationDuration: duration }}
        >
          {/* Render items twice side-by-side for seamless loop */}
          {displayItems.map((item, i) => (
            <TickerItem key={`a-${i}`} item={item} />
          ))}
          {displayItems.map((item, i) => (
            <TickerItem key={`b-${i}`} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Ticker;
