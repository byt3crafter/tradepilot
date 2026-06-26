import { Injectable, Logger } from '@nestjs/common';

/** Thin client over Polymarket's public data API. */
@Injectable()
export class PolymarketClient {
  private readonly logger = new Logger(PolymarketClient.name);
  private readonly base = 'https://data-api.polymarket.com';

  private async get(path: string): Promise<any> {
    try {
      const res = await fetch(`${this.base}${path}`, { headers: { 'User-Agent': 'JTradePilot/1.0' } });
      if (!res.ok) {
        this.logger.warn(`polymarket ${path} -> ${res.status}`);
        return null;
      }
      return await res.json();
    } catch (e: any) {
      this.logger.warn(`polymarket ${path} failed: ${e?.message}`);
      return null;
    }
  }

  /** Recent trades across all markets — the autonomous wallet-discovery feed. */
  recentTrades(limit = 100): Promise<any[]> {
    return this.get(`/trades?limit=${limit}`).then((d) => (Array.isArray(d) ? d : []));
  }

  positions(address: string, limit = 500): Promise<any[]> {
    return this.get(`/positions?user=${address}&limit=${limit}`).then((d) => (Array.isArray(d) ? d : []));
  }

  activity(address: string, limit = 500): Promise<any[]> {
    return this.get(`/activity?user=${address}&limit=${limit}`).then((d) => (Array.isArray(d) ? d : []));
  }

  async value(address: string): Promise<number> {
    const d = await this.get(`/value?user=${address}`);
    return Array.isArray(d) && d[0]?.value ? Number(d[0].value) : 0;
  }
}
