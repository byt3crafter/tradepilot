import { Injectable, Logger } from '@nestjs/common';
import { mapSymbol } from './symbol-map';

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
}

export interface CandlesResult {
  symbol: string;
  mappedSymbol: string | null;
  candles: Candle[];
  /** present when no data could be returned, so the UI can explain why */
  note?: string;
}

/**
 * Fetches OHLC candles from Twelve Data. The API key lives only on the server
 * (MARKET_DATA_API_KEY); the browser never sees it. Results are cached to respect
 * rate limits, and every failure degrades gracefully to an empty series so the
 * chart simply hides rather than breaking the page.
 */
@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly TTL = 1000 * 60 * 30; // 30 minutes

  async getCandles(
    rawSymbol: string,
    interval = '1h',
    start?: string,
    end?: string,
  ): Promise<CandlesResult> {
    const mappedSymbol = mapSymbol(rawSymbol);
    if (!mappedSymbol) return { symbol: rawSymbol, mappedSymbol: null, candles: [], note: 'unknown symbol' };

    const key = `${mappedSymbol}|${interval}|${start ?? ''}|${end ?? ''}`;
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < this.TTL) {
      return { symbol: rawSymbol, mappedSymbol, candles: hit.data };
    }

    const apikey = process.env.MARKET_DATA_API_KEY || 'demo';
    const params = new URLSearchParams({
      symbol: mappedSymbol,
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
        const note = json?.message || 'no data for symbol';
        this.logger.warn(`market-data ${mappedSymbol}: ${note}`);
        return { symbol: rawSymbol, mappedSymbol, candles: [], note };
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
        .filter((c: Candle) => Number.isFinite(c.time) && Number.isFinite(c.close))
        .sort((a: Candle, b: Candle) => a.time - b.time);

      this.cache.set(key, { at: Date.now(), data: candles });
      return { symbol: rawSymbol, mappedSymbol, candles };
    } catch (e: any) {
      this.logger.error(`market-data fetch failed for ${mappedSymbol}: ${e?.message}`);
      return { symbol: rawSymbol, mappedSymbol, candles: [], note: 'fetch failed' };
    }
  }
}
