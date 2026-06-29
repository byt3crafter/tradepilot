import { Logger } from '@nestjs/common';
import { CexAdapter, FundingRate } from '../cex-adapter.interface';

/** Binance USDⓈ-M futures adapter. Funding/prices are public (no key). */
export class BinanceAdapter implements CexAdapter {
  readonly name = 'binance';
  private readonly fapi = 'https://fapi.binance.com';
  private readonly logger = new Logger('BinanceAdapter');

  private async get(path: string): Promise<any> {
    const res = await fetch(`${this.fapi}${path}`, { headers: { 'User-Agent': 'JTradePilot/1.0' } });
    if (!res.ok) throw new Error(`binance ${path} -> ${res.status}`);
    return res.json();
  }

  async getFundingRates(): Promise<FundingRate[]> {
    const [prem, tick] = await Promise.all([
      this.get('/fapi/v1/premiumIndex'),       // funding + mark price (all perps)
      this.get('/fapi/v1/ticker/24hr'),         // 24h quote volume (liquidity)
    ]);
    const volBySym = new Map<string, number>();
    for (const t of Array.isArray(tick) ? tick : []) volBySym.set(t.symbol, Number(t.quoteVolume) || 0);
    const out: FundingRate[] = [];
    for (const p of Array.isArray(prem) ? prem : []) {
      const symbol: string = p.symbol || '';
      if (!symbol.endsWith('USDT')) continue;          // USDT perps (spot leg exists)
      const fr = Number(p.lastFundingRate);
      if (!isFinite(fr)) continue;
      out.push({
        symbol,
        base: symbol.replace(/USDT$/, ''),
        fundingRate: fr,
        annualizedPct: +(fr * 3 * 365 * 100).toFixed(1), // 3 funding windows/day
        markPrice: Number(p.markPrice) || 0,
        volume24hUsd: volBySym.get(symbol) || 0,
      });
    }
    return out;
  }

  async getPrice(symbol: string): Promise<number> {
    const d = await this.get(`/fapi/v1/ticker/price?symbol=${encodeURIComponent(symbol)}`);
    return Number(d?.price) || 0;
  }
}
