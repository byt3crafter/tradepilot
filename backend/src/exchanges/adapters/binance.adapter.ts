import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { CexAdapter, FundingRate } from '../cex-adapter.interface';

type Creds = { apiKey: string; apiSecret: string; testnet: boolean };

/**
 * Binance adapter. Public data (funding/prices) needs no key and always reads LIVE markets
 * (so the scanner sees real opportunities). Signed endpoints (balances/orders) use the
 * credentialed instance + route to testnet or live per the stored credential.
 */
export class BinanceAdapter implements CexAdapter {
  readonly name = 'binance';
  private readonly liveFapi = 'https://fapi.binance.com';
  private readonly logger = new Logger('BinanceAdapter');

  constructor(private readonly creds?: Creds) {}

  // ── public (no key) ─────────────────────────────────────────────────────────
  private async get(base: string, path: string): Promise<any> {
    const res = await fetch(`${base}${path}`, { headers: { 'User-Agent': 'JTradePilot/1.0' } });
    if (!res.ok) throw new Error(`binance ${path} -> ${res.status}`);
    return res.json();
  }

  async getFundingRates(): Promise<FundingRate[]> {
    const [prem, tick] = await Promise.all([
      this.get(this.liveFapi, '/fapi/v1/premiumIndex'),
      this.get(this.liveFapi, '/fapi/v1/ticker/24hr'),
    ]);
    const volBySym = new Map<string, number>();
    for (const t of Array.isArray(tick) ? tick : []) volBySym.set(t.symbol, Number(t.quoteVolume) || 0);
    const out: FundingRate[] = [];
    for (const p of Array.isArray(prem) ? prem : []) {
      const symbol: string = p.symbol || '';
      if (!symbol.endsWith('USDT')) continue;
      const fr = Number(p.lastFundingRate);
      if (!isFinite(fr)) continue;
      out.push({
        symbol, base: symbol.replace(/USDT$/, ''), fundingRate: fr,
        annualizedPct: +(fr * 3 * 365 * 100).toFixed(1),
        markPrice: Number(p.markPrice) || 0, volume24hUsd: volBySym.get(symbol) || 0,
      });
    }
    return out;
  }

  async getPrice(symbol: string): Promise<number> {
    const d = await this.get(this.liveFapi, `/fapi/v1/ticker/price?symbol=${encodeURIComponent(symbol)}`);
    return Number(d?.price) || 0;
  }

  /** All 24h spot tickers (public, live) — momentum + volatility + current prices in one call. */
  async get24hrTickers(): Promise<any[]> {
    const d = await this.get('https://api.binance.com', '/api/v3/ticker/24hr');
    return Array.isArray(d) ? d : [];
  }

  // ── signed (needs key/secret) ────────────────────────────────────────────────
  private base(market: 'spot' | 'fapi'): string {
    if (market === 'fapi') return this.creds?.testnet ? 'https://testnet.binancefuture.com' : 'https://fapi.binance.com';
    return this.creds?.testnet ? 'https://testnet.binance.vision' : 'https://api.binance.com';
  }

  private async signed(method: 'GET' | 'POST', market: 'spot' | 'fapi', path: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.creds?.apiKey || !this.creds?.apiSecret) throw new Error('exchange credentials not set');
    const q = new URLSearchParams({ ...params, timestamp: String(Date.now()), recvWindow: '5000' });
    const sig = crypto.createHmac('sha256', this.creds.apiSecret).update(q.toString()).digest('hex');
    q.append('signature', sig);
    const res = await fetch(`${this.base(market)}${path}?${q.toString()}`, {
      method, headers: { 'X-MBX-APIKEY': this.creds.apiKey, 'User-Agent': 'JTradePilot/1.0' },
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.msg || `binance ${path} -> ${res.status}`);
    return j;
  }

  /** Futures account balances. */
  async getBalances(): Promise<{ asset: string; free: number }[]> {
    const j = await this.signed('GET', 'fapi', '/fapi/v2/balance');
    return (Array.isArray(j) ? j : [])
      .filter((b: any) => Number(b.balance) > 0)
      .map((b: any) => ({ asset: b.asset, free: Number(b.availableBalance) || 0 }));
  }

  /** Spot account balances — connection test for a Spot (testnet.binance.vision) key. */
  async getSpotBalances(): Promise<{ asset: string; free: number }[]> {
    const j = await this.signed('GET', 'spot', '/api/v3/account');
    return (j?.balances || [])
      .filter((b: any) => Number(b.free) > 0)
      .map((b: any) => ({ asset: b.asset, free: Number(b.free) || 0 }));
  }

  /** Spot market order by USD amount (quoteOrderQty) — for entries. */
  async placeSpotMarketByQuote(symbol: string, side: 'BUY' | 'SELL', quoteUsd: number): Promise<any> {
    return this.signed('POST', 'spot', '/api/v3/order', { symbol, side, type: 'MARKET', quoteOrderQty: quoteUsd });
  }

  // LOT_SIZE step per symbol (cached) — so SELL quantities respect precision.
  private lotCache = new Map<string, { step: number; decimals: number }>();
  private async lotStep(symbol: string): Promise<{ step: number; decimals: number }> {
    if (this.lotCache.has(symbol)) return this.lotCache.get(symbol)!;
    const d = await this.get(this.base('spot'), `/api/v3/exchangeInfo?symbol=${symbol}`);
    const f = (d?.symbols?.[0]?.filters || []).find((x: any) => x.filterType === 'LOT_SIZE');
    const stepStr = String(f?.stepSize || '0.00000001');
    const step = Number(stepStr);
    const decimals = (stepStr.split('.')[1] || '').replace(/0+$/, '').length;
    const info = { step, decimals };
    this.lotCache.set(symbol, info);
    return info;
  }

  /** Spot MARKET SELL a base quantity (rounded down to lot step). */
  async placeSpotSell(symbol: string, qty: number): Promise<any> {
    const { decimals } = await this.lotStep(symbol);
    const rounded = Number(qty.toFixed(decimals));
    return this.signed('POST', 'spot', '/api/v3/order', { symbol, side: 'SELL', type: 'MARKET', quantity: rounded });
  }

  async getPositions(): Promise<any[]> {
    const j = await this.signed('GET', 'fapi', '/fapi/v2/positionRisk');
    return (Array.isArray(j) ? j : []).filter((p: any) => Math.abs(Number(p.positionAmt)) > 0);
  }

  async placeOrder(o: { symbol: string; side: 'BUY' | 'SELL'; type?: 'MARKET' | 'LIMIT'; qty: number; price?: number; reduceOnly?: boolean; market?: 'spot' | 'fapi' }): Promise<any> {
    const market = o.market || 'fapi';
    const params: Record<string, any> = { symbol: o.symbol, side: o.side, type: o.type || 'MARKET', quantity: o.qty };
    if ((o.type || 'MARKET') === 'LIMIT') { params.price = o.price; params.timeInForce = 'GTC'; }
    if (o.reduceOnly) params.reduceOnly = 'true';
    return this.signed('POST', market, market === 'fapi' ? '/fapi/v1/order' : '/api/v3/order', params);
  }
}
