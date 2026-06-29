// Common interface every centralized-exchange adapter implements. Strategies (funding-arb,
// research loop) run against THIS, so Binance / Bybit / OKX all plug in identically — adding
// a venue = one new adapter file, nothing else changes.

export interface FundingRate {
  symbol: string;        // e.g. BTCUSDT (the perp)
  base: string;          // e.g. BTC
  fundingRate: number;   // per-interval rate (e.g. 0.0001 = 0.01%/8h)
  annualizedPct: number; // ~ rate * 3 * 365 * 100
  markPrice: number;
  volume24hUsd: number;  // perp 24h quote volume (liquidity filter)
}

export interface CexAdapter {
  readonly name: string;
  /** Current funding rates across all perps (public data, no key). */
  getFundingRates(): Promise<FundingRate[]>;
  /** Last/mark price for a symbol. */
  getPrice(symbol: string): Promise<number>;

  // ── trading (testnet/live) — added when we wire execution per venue ──
  // getBalances(): Promise<{ asset: string; free: number }[]>;
  // placeOrder(o: { symbol: string; side: 'BUY'|'SELL'; type: 'MARKET'|'LIMIT'; qty: number; price?: number; reduceOnly?: boolean; market: 'spot'|'perp' }): Promise<{ orderId: string }>;
  // closePosition(symbol: string): Promise<void>;
  // getPositions(): Promise<any[]>;
}
