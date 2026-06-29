import { Injectable, Logger } from '@nestjs/common';
import { CexAdapter } from './cex-adapter.interface';
import { BinanceAdapter } from './adapters/binance.adapter';

/**
 * Multi-venue crypto engine. Adapters (Binance, Bybit, …) implement one interface;
 * strategies run against it so every venue behaves the same. Isolated from Quant/Polymarket.
 */
@Injectable()
export class ExchangesService {
  private readonly logger = new Logger(ExchangesService.name);
  private readonly adapters: Record<string, CexAdapter> = {
    binance: new BinanceAdapter(),
    // bybit: new BybitAdapter(),  ← future: one file, plugs in here
  };

  list() {
    return { exchanges: Object.keys(this.adapters) };
  }

  adapter(name = 'binance'): CexAdapter {
    return this.adapters[name] || this.adapters.binance;
  }

  /**
   * Funding-rate scanner — the first real crypto edge (delta-neutral): when funding is
   * positive, long spot + short perp earns the funding; negative → the reverse. We rank
   * LIQUID perps by annualized funding after a fee/slippage haircut.
   */
  async fundingScan(exchange = 'binance', minVolUsd = 10_000_000) {
    const FEE_DRAG = 6; // ~%/yr round-trip cost estimate (open+close both legs, periodically)
    let rates: any[] = [];
    try { rates = await this.adapter(exchange).getFundingRates(); } catch (e: any) {
      this.logger.warn(`fundingScan ${exchange}: ${e?.message}`);
      return { exchange, opportunities: [], scannedAt: Date.now(), error: 'feed unavailable' };
    }
    const liquid = rates.filter((r) => r.volume24hUsd >= minVolUsd);
    const opps = liquid
      .map((r) => {
        const positive = r.fundingRate >= 0;
        const netAnnualPct = +(Math.abs(r.annualizedPct) - FEE_DRAG).toFixed(1);
        return {
          symbol: r.symbol,
          base: r.base,
          fundingPct8h: +(r.fundingRate * 100).toFixed(4),
          annualizedPct: r.annualizedPct,
          netAnnualPct,
          markPrice: r.markPrice,
          volume24hUsd: Math.round(r.volume24hUsd),
          // the delta-neutral play:
          action: positive
            ? `LONG ${r.base} spot + SHORT ${r.symbol} perp → collect funding`
            : `SHORT ${r.base} + LONG ${r.symbol} perp → collect funding`,
          side: positive ? 'cash-and-carry' : 'reverse-carry',
        };
      })
      .filter((o) => o.netAnnualPct > 5) // only meaningfully profitable after fees
      .sort((a, b) => b.netAnnualPct - a.netAnnualPct)
      .slice(0, 30);
    return { exchange, opportunities: opps, count: opps.length, scannedAt: Date.now() };
  }
}
