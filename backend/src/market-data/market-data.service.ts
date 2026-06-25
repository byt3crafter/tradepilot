import { Injectable, Logger } from '@nestjs/common';
import { mapSymbol, yahooIndexSymbol } from './symbol-map';

export interface Candle {
  time: number; // unix seconds (UTC)
  open: number;
  high: number;
  low: number;
  close: number;
}

interface CacheEntry {
  at: number;
  data: Candle[];
  source: string;
  mappedSymbol: string | null;
}

export interface CandlesResult {
  symbol: string;
  mappedSymbol: string | null;
  candles: Candle[];
  source?: string; // 'twelvedata' | 'yahoo'
  note?: string;
}

// our interval → Yahoo interval
const YAHOO_INTERVAL: Record<string, string> = {
  '1min': '1m',
  '5min': '5m',
  '15min': '15m',
  '30min': '30m',
  '45min': '30m',
  '1h': '60m',
  '2h': '60m',
  '4h': '60m',
  '1day': '1d',
  '1week': '1wk',
};

const toUnix = (s?: string): number | undefined => {
  if (!s) return undefined;
  const ms = Date.parse(s.includes('T') ? s : `${s.replace(' ', 'T')}Z`);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : undefined;
};

/**
 * Fetches OHLC candles. Primary source is Twelve Data (server-side key); for
 * indices, which the Twelve Data free tier excludes, it falls back to Yahoo
 * Finance. The browser never sees the key. Results are cached; every failure
 * degrades to an empty series so the chart hides instead of breaking the page.
 */
@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly TTL = 1000 * 60 * 30; // 30 minutes

  /** Sort ascending and collapse duplicate timestamps (charts require strict asc). */
  private clean(candles: Candle[]): Candle[] {
    const m = new Map<number, Candle>();
    for (const c of candles) {
      if (Number.isFinite(c.time) && Number.isFinite(c.close)) m.set(c.time, c); // last wins
    }
    return [...m.values()].sort((a, b) => a.time - b.time);
  }

  async getCandles(rawSymbol: string, interval = '1h', start?: string, end?: string): Promise<CandlesResult> {
    const mappedSymbol = mapSymbol(rawSymbol);
    if (!mappedSymbol) return { symbol: rawSymbol, mappedSymbol: null, candles: [], note: 'unknown symbol' };

    const cacheKey = `${rawSymbol}|${interval}|${start ?? ''}|${end ?? ''}`;
    const hit = this.cache.get(cacheKey);
    if (hit && Date.now() - hit.at < this.TTL) {
      return { symbol: rawSymbol, mappedSymbol: hit.mappedSymbol, candles: hit.data, source: hit.source };
    }

    // 1) Twelve Data
    const td = await this.fetchTwelveData(mappedSymbol, interval, start, end);
    if (td.candles.length) {
      this.cache.set(cacheKey, { at: Date.now(), data: td.candles, source: 'twelvedata', mappedSymbol });
      return { symbol: rawSymbol, mappedSymbol, candles: td.candles, source: 'twelvedata' };
    }

    // 2) Yahoo fallback for indices
    const ysym = yahooIndexSymbol(rawSymbol);
    if (ysym) {
      const yh = await this.fetchYahoo(ysym, interval, start, end);
      if (yh.length) {
        this.cache.set(cacheKey, { at: Date.now(), data: yh, source: 'yahoo', mappedSymbol: ysym });
        return { symbol: rawSymbol, mappedSymbol: ysym, candles: yh, source: 'yahoo' };
      }
    }

    return { symbol: rawSymbol, mappedSymbol, candles: [], note: td.note || 'no data for symbol' };
  }

  private async fetchTwelveData(
    symbol: string,
    interval: string,
    start?: string,
    end?: string,
  ): Promise<{ candles: Candle[]; note?: string }> {
    const apikey = process.env.MARKET_DATA_API_KEY || 'demo';
    const params = new URLSearchParams({
      symbol,
      interval,
      apikey,
      outputsize: '500',
      format: 'JSON',
      order: 'ASC',
      timezone: 'UTC',
    });
    if (start) params.set('start_date', start);
    if (end) params.set('end_date', end);

    try {
      const res = await fetch(`https://api.twelvedata.com/time_series?${params.toString()}`);
      const json: any = await res.json();
      if (json?.status === 'error' || !Array.isArray(json?.values)) {
        return { candles: [], note: json?.message || 'no data for symbol' };
      }
      const candles: Candle[] = json.values
        .map((v: any) => {
          const raw: string = String(v.datetime);
          const iso = raw.length <= 10 ? `${raw}T00:00:00Z` : `${raw.replace(' ', 'T')}Z`;
          return {
            time: Math.floor(new Date(iso).getTime() / 1000),
            open: parseFloat(v.open),
            high: parseFloat(v.high),
            low: parseFloat(v.low),
            close: parseFloat(v.close),
          };
        })
        .filter((c: Candle) => Number.isFinite(c.time) && Number.isFinite(c.close));
      return { candles: this.clean(candles) };
    } catch (e: any) {
      this.logger.error(`twelvedata fetch failed for ${symbol}: ${e?.message}`);
      return { candles: [], note: 'fetch failed' };
    }
  }

  private async fetchYahoo(symbol: string, interval: string, start?: string, end?: string): Promise<Candle[]> {
    const yi = YAHOO_INTERVAL[interval] || '1d';
    const params = new URLSearchParams({ interval: yi, includePrePost: 'false' });
    const p1 = toUnix(start);
    const p2 = toUnix(end);
    if (p1 && p2) {
      params.set('period1', String(p1));
      params.set('period2', String(p2));
    } else {
      params.set('range', '3mo');
    }
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${params.toString()}`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const json: any = await res.json();
      const r = json?.chart?.result?.[0];
      const q = r?.indicators?.quote?.[0];
      if (!Array.isArray(r?.timestamp) || !q) return [];
      const out: Candle[] = [];
      for (let i = 0; i < r.timestamp.length; i++) {
        const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i];
        if ([o, h, l, c].every((v) => v != null && Number.isFinite(v))) {
          out.push({ time: r.timestamp[i], open: o, high: h, low: l, close: c });
        }
      }
      return this.clean(out);
    } catch (e: any) {
      this.logger.error(`yahoo fetch failed for ${symbol}: ${e?.message}`);
      return [];
    }
  }
}
