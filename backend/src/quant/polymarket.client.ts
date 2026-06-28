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

  /**
   * COMPLETE activity history — pages backwards via the `&end=<ts>` time cursor to
   * get every fill past the 1,000-row per-request cap. This is the fix for accurate
   * whale PnL/edge: no proxy-mapping, no Dune, same public API.
   */
  async activityComplete(address: string, maxPages = 12, pageSize = 500): Promise<any[]> {
    const all: any[] = [];
    const seen = new Set<string>();
    let end: number | undefined;
    for (let i = 0; i < maxPages; i++) {
      const url = `/activity?user=${address}&limit=${pageSize}${end ? `&end=${end}` : ''}`;
      const rows = await this.get(url);
      if (!Array.isArray(rows) || rows.length === 0) break;
      let added = 0;
      let oldest = Infinity;
      for (const r of rows) {
        const ts = Number(r.timestamp) || 0;
        if (ts < oldest) oldest = ts;
        const k = `${r.transactionHash}:${r.conditionId}:${r.outcomeIndex}:${r.side}:${r.size}:${ts}`;
        if (!seen.has(k)) { seen.add(k); all.push(r); added++; }
      }
      if (added === 0) break;                 // no new rows → exhausted
      if (rows.length < pageSize) break;       // last (partial) page
      if (!isFinite(oldest) || oldest === end) break; // no older progress
      end = oldest;                            // walk strictly older
      await new Promise((r) => setTimeout(r, 150));
    }
    return all;
  }

  async value(address: string): Promise<number> {
    const d = await this.get(`/value?user=${address}`);
    return Array.isArray(d) && d[0]?.value ? Number(d[0].value) : 0;
  }

  private async gget(url: string): Promise<any> {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'JTradePilot/1.0' } });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /**
   * Search / list tradeable markets via gamma. Returns market cards with each
   * outcome's CLOB tokenId + current price (so the UI can trade without a raw id).
   */
  async searchMarkets(query: string | undefined, limit = 30): Promise<any[]> {
    const base = 'https://gamma-api.polymarket.com';
    let raw: any[] = [];
    if (query && query.trim()) {
      const d = await this.gget(`${base}/public-search?q=${encodeURIComponent(query.trim())}&limit_per_type=25&events_status=active`);
      for (const e of d?.events || []) for (const m of e.markets || []) raw.push(m);
      if (Array.isArray(d?.markets)) raw.push(...d.markets);
    }
    if (!raw.length) {
      const d = await this.gget(`${base}/markets?active=true&closed=false&order=volume24hr&ascending=false&limit=${limit * 2}`);
      raw = Array.isArray(d) ? d : [];
      if (query && query.trim()) {
        const q = query.trim().toLowerCase();
        raw = raw.filter((m) => (m.question || '').toLowerCase().includes(q));
      }
    }
    const out: any[] = [];
    const seen = new Set<string>();
    for (const m of raw) {
      if (m.closed || m.enableOrderBook === false) continue;
      let outcomes: string[] = [], tokenIds: string[] = [], prices: number[] = [];
      try { outcomes = JSON.parse(m.outcomes || '[]'); } catch { /* */ }
      try { tokenIds = JSON.parse(m.clobTokenIds || '[]'); } catch { /* */ }
      try { prices = JSON.parse(m.outcomePrices || '[]').map(Number); } catch { /* */ }
      if (!outcomes.length || tokenIds.length !== outcomes.length) continue;
      const key = m.conditionId || m.slug || m.question;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({
        question: m.question,
        slug: m.slug,
        conditionId: m.conditionId,
        image: m.image || m.icon || null,
        category: m.category || null,
        endDate: m.endDate || null,
        volume: Number(m.volumeNum || m.volume || 0),
        outcomes: outcomes.map((o, i) => ({ label: o, tokenId: tokenIds[i], price: prices[i] ?? null })),
      });
      if (out.length >= limit) break;
    }
    return out;
  }

  /** Active events (with their markets) — for cross-market / NegRisk arbitrage scanning. */
  async activeEvents(limit = 150): Promise<any[]> {
    const d = await this.gget(`https://gamma-api.polymarket.com/events?closed=false&active=true&order=volume24hr&ascending=false&limit=${limit}`);
    return Array.isArray(d) ? d : [];
  }

  /** Active tradeable markets (raw gamma) — for settlement-lag arbitrage scanning. */
  async activeMarkets(limit = 250): Promise<any[]> {
    const d = await this.gget(`https://gamma-api.polymarket.com/markets?active=true&closed=false&order=volume24hr&ascending=false&limit=${limit}`);
    return Array.isArray(d) ? d : [];
  }

  /** Narrative / judgment markets (politics, geopolitics, world) — where AI judgment, not
   * speed, is the edge. Pulled from gamma event tags, flattened + deduped by conditionId. */
  async narrativeMarkets(): Promise<any[]> {
    const tags = ['politics', 'geopolitics', 'world', 'elections', 'middle-east'];
    const out: any[] = [];
    const seen = new Set<string>();
    for (const tag of tags) {
      const ev = await this.gget(`https://gamma-api.polymarket.com/events?active=true&closed=false&tag_slug=${tag}&limit=100`);
      for (const e of Array.isArray(ev) ? ev : []) {
        for (const m of e.markets || []) {
          const cid = m.conditionId;
          if (!cid || seen.has(cid)) continue;
          seen.add(cid);
          out.push(m);
        }
      }
      await new Promise((r) => setTimeout(r, 150));
    }
    return out;
  }

  /** End timestamps (ms) per conditionId, via gamma — for short-horizon signal biasing. */
  async marketEndDates(conditionIds: string[]): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    const chunk = 20;
    for (let i = 0; i < conditionIds.length; i += chunk) {
      const ids = conditionIds.slice(i, i + chunk);
      const qs = ids.map((c) => `condition_ids=${c}`).join('&');
      const d = await this.gget(`https://gamma-api.polymarket.com/markets?${qs}&limit=${chunk}`);
      for (const m of d || []) {
        if (m?.conditionId && m?.endDate) {
          const t = Date.parse(m.endDate);
          if (!isNaN(t)) out[m.conditionId] = t;
        }
      }
    }
    return out;
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
          // Resolution from DECISIVE prices (one outcome ≈ $1), not gamma's lagging
          // `closed` flag — which was hiding resolution losses and faking ~100% win rates.
          const wi = prices.findIndex((p) => p >= 0.99);
          const decisive = wi >= 0;
          out[cid] = {
            closed: !!m.closed || decisive,
            winningIndex: decisive ? wi : null,
            outcomePrices: m.outcomePrices || null,
          };
        }
      } catch { /* skip chunk */ }
    }
    return out;
  }
}

