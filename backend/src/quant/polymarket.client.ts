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

  /**
   * Resolution status for markets, via gamma. Returns a map conditionId ->
   * { closed, winningIndex, outcomePrices }. Fetched in chunks.
   */
  async marketResolutions(
    conditionIds: string[],
  ): Promise<Record<string, { closed: boolean; winningIndex: number | null; outcomePrices: string | null }>> {
    const out: Record<string, { closed: boolean; winningIndex: number | null; outcomePrices: string | null }> = {};
    const chunk = 20;
    for (let i = 0; i < conditionIds.length; i += chunk) {
      const ids = conditionIds.slice(i, i + chunk);
      const qs = ids.map((c) => `condition_ids=${c}`).join('&');
      try {
        const res = await fetch(`https://gamma-api.polymarket.com/markets?${qs}&limit=${chunk}`, {
          headers: { 'User-Agent': 'JTradePilot/1.0' },
        });
        if (!res.ok) continue;
        const markets: any[] = await res.json();
        for (const m of markets || []) {
          const cid = m.conditionId;
          if (!cid) continue;
          let prices: number[] = [];
          try { prices = JSON.parse(m.outcomePrices || '[]').map(Number); } catch { /* ignore */ }
          const winningIndex = m.closed ? prices.findIndex((p) => p >= 0.99) : null;
          out[cid] = {
            closed: !!m.closed,
            winningIndex: winningIndex != null && winningIndex >= 0 ? winningIndex : null,
            outcomePrices: m.outcomePrices || null,
          };
        }
      } catch { /* skip chunk */ }
    }
    return out;
  }
}

