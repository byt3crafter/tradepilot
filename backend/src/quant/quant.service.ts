import { Injectable, Logger, OnApplicationBootstrap, BadRequestException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PolymarketClient } from './polymarket.client';
import { ChatgptService } from '../chatgpt/chatgpt.service';

const Z = 1.64; // one-sided 95% lower bound
const MIN_CLOSED = 15; // display gate (v1; spec target 30 — relaxed while the bank warms)

@Injectable()
export class QuantService implements OnApplicationBootstrap {
  private readonly logger = new Logger(QuantService.name);
  private ticking = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly pm: PolymarketClient,
    private readonly chatgpt: ChatgptService,
  ) {}

  /**
   * On-demand AI Verdict for a wallet that already passed the statistical edge test.
   * Runs on the *requesting user's* connected ChatGPT account (per-user, on-demand).
   */
  async aiVerdict(userId: string, addressRaw: string) {
    const address = String(addressRaw || '').toLowerCase();
    const w = await this.prisma.pmWallet.findUnique({ where: { address } });
    if (!w || !w.qualified) {
      throw new BadRequestException('Wallet needs ≥15 closed positions before a verdict.');
    }
    if (w.aiVerdict && w.aiVerdictAt && Date.now() - w.aiVerdictAt.getTime() < 24 * 3600 * 1000) {
      return JSON.parse(w.aiVerdict);
    }
    if (!(await this.chatgpt.isAllowed(userId, 'verdict'))) {
      throw new BadRequestException('AI Verdict is disabled or ChatGPT/Codex is not connected (Settings → AI).');
    }
    const instructions =
      'You are a skeptical Polymarket quant analyst. From a wallet\'s realized-edge stats, ' +
      'judge whether its edge is COPYABLE (a replicable modeling/mispricing edge on slow markets) ' +
      'vs NON-COPYABLE (latency/speed bots, insider) vs NONE (luck or insurance-selling). ' +
      'Reply with STRICT JSON only, no prose: ' +
      '{"verdict":"COPY|WATCH|AVOID","edgeType":"mispricing|speed|insider|insurance|none","copyable":true|false,"confidence":"low|medium|high","summary":"one sentence"}';
    const input =
      `Wallet ${address} focus=${w.marketFocus || 'mixed'}. ` +
      `edgeLcb=${w.edgeLcb.toFixed(4)} (95% lower bound of realized edge/share), ` +
      `meanEdge=${w.meanEdge.toFixed(4)}, nClosed=${w.nClosed}, nEff=${w.nEff.toFixed(0)}, ` +
      `dollarEdge=${w.dollarEdge.toFixed(4)}, winRate=${(w.winRate * 100).toFixed(0)}%, volume=$${w.volume.toFixed(0)}.`;
    const text = await this.chatgpt.complete(userId, instructions, input);
    let parsed: any;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { verdict: 'WATCH', edgeType: 'none', copyable: false, confidence: 'low', summary: text.slice(0, 200) || 'No response' };
    }
    await this.prisma.pmWallet.update({ where: { address }, data: { aiVerdict: JSON.stringify(parsed), aiVerdictAt: new Date() } });
    return parsed;
  }

  onApplicationBootstrap() {
    setTimeout(() => this.autoTick().catch(() => {}), 8000);
  }

  /** A wallet's current OPEN positions — for "mirror this" from the report. */
  async walletPositions(addressRaw: string) {
    const address = String(addressRaw || '').toLowerCase();
    const positions = await this.pm.positions(address);
    return positions
      .filter((p) => Number(p.size) > 0 && !p.redeemable)
      .map((p) => ({
        conditionId: p.conditionId,
        tokenId: p.asset, // CLOB token id for this outcome
        outcome: p.outcome,
        outcomeIndex: Number(p.outcomeIndex) || 0,
        title: p.title,
        slug: p.slug,
        eventSlug: p.eventSlug,
        size: Number(p.size) || 0,
        avgPrice: Number(p.avgPrice) || 0,
        curPrice: Number(p.curPrice) || 0,
        endDate: p.endDate,
      }))
      .slice(0, 50);
  }

  /** Live recent trades across markets — for the terminal ticker tape. */
  async feed(limit = 40) {
    const trades = await this.pm.recentTrades(Math.min(limit, 100));
    return trades.map((t) => ({
      wallet: t.proxyWallet,
      pseudonym: t.pseudonym || t.name || null,
      side: t.side,
      size: Number(t.size) || 0,
      price: Number(t.price) || 0,
      usd: Number(t.size) * Number(t.price) || 0,
      title: t.title || '',
      outcome: t.outcome || '',
      ts: t.timestamp,
    }));
  }

  /** Harvest wallet addresses from the live trades feed (autonomous discovery). */
  async discover(limit = 200): Promise<{ discovered: number }> {
    const trades = await this.pm.recentTrades(limit);
    let added = 0;
    for (const t of trades) {
      const address = String(t.proxyWallet || '').toLowerCase();
      if (!address.startsWith('0x')) continue;
      const existing = await this.prisma.pmWallet.findUnique({ where: { address }, select: { id: true } });
      if (!existing) {
        await this.prisma.pmWallet.create({
          data: { address, pseudonym: t.pseudonym || t.name || null, profileImage: t.profileImage || null },
        });
        added++;
      }
    }
    return { discovered: added };
  }

  /** Resolutions with a global cache (each market fetched once). */
  private async resolveMarkets(conds: string[]) {
    const result: Record<string, { closed: boolean; winningIndex: number | null }> = {};
    const cached = await this.prisma.pmMarket.findMany({ where: { conditionId: { in: conds } } });
    const map = new Map(cached.map((m) => [m.conditionId, m]));
    const missing: string[] = [];
    for (const c of conds) {
      const m = map.get(c);
      if (m && (m.closed || Date.now() - m.fetchedAt.getTime() < 3600 * 1000)) {
        result[c] = { closed: m.closed, winningIndex: m.winningIndex };
      } else {
        missing.push(c);
      }
    }
    if (missing.length) {
      const fetched = await this.pm.marketResolutions(missing);
      for (const c of missing) {
        const f = fetched[c] || { closed: false, winningIndex: null, outcomePrices: null };
        result[c] = { closed: f.closed, winningIndex: f.winningIndex };
        await this.prisma.pmMarket.upsert({
          where: { conditionId: c },
          create: { conditionId: c, closed: f.closed, winningIndex: f.winningIndex, outcomePrices: f.outcomePrices, fetchedAt: new Date() },
          update: { closed: f.closed, winningIndex: f.winningIndex, outcomePrices: f.outcomePrices, fetchedAt: new Date() },
        });
      }
    }
    return result;
  }

  /**
   * EdgeScore pipeline: reconstruct closed positions from fills, join resolutions,
   * compute realized edge-per-share (how much they beat the market's implied price),
   * then rank by the one-sided 95% lower confidence bound with clustered n_eff.
   */
  async scanWallet(addressRaw: string) {
    const address = String(addressRaw || '').toLowerCase();
    const [activity, positionsValue] = await Promise.all([
      this.pm.activity(address, 1000),
      this.pm.value(address),
    ]);

    // group fills into positions per (market, outcome)
    type Pos = { cid: string; oi: number; eventSlug: string; buyShares: number; buyCost: number; sellShares: number; sellProceeds: number; redeemShares: number; redeemProceeds: number };
    const pos = new Map<string, Pos>();
    let volume = 0;
    for (const a of activity) {
      const usd = Number(a.usdcSize) || 0;
      volume += usd;
      const cid = a.conditionId;
      if (!cid) continue;
      const oi = Number(a.outcomeIndex) || 0;
      const key = `${cid}|${oi}`;
      let p = pos.get(key);
      if (!p) {
        p = { cid, oi, eventSlug: a.eventSlug || a.slug || cid, buyShares: 0, buyCost: 0, sellShares: 0, sellProceeds: 0, redeemShares: 0, redeemProceeds: 0 };
        pos.set(key, p);
      }
      const size = Number(a.size) || 0;
      if (a.type === 'TRADE' && a.side === 'BUY') { p.buyShares += size; p.buyCost += usd; }
      else if (a.type === 'TRADE' && a.side === 'SELL') { p.sellShares += size; p.sellProceeds += usd; }
      else if (a.type === 'REDEEM') { p.redeemShares += size; p.redeemProceeds += usd; }
    }

    const conds = [...new Set([...pos.values()].map((p) => p.cid))];
    const res = await this.resolveMarkets(conds);

    // realized edge per closed position
    const edges: { e: number; notional: number; eventSlug: string }[] = [];
    let realizedPnl = 0, wins = 0;
    for (const p of pos.values()) {
      if (p.buyShares < 1e-6) continue; // only positions they actually entered (long)
      // Truncation guard: if more shares were sold/redeemed than we saw bought, the
      // buy side predates the activity window — entry price is unreliable, so skip.
      if (p.sellShares + p.redeemShares > p.buyShares * 1.05) continue;
      const entryAvg = p.buyCost / p.buyShares;
      const r = res[p.cid] || { closed: false, winningIndex: null };
      const held = Math.max(p.buyShares - p.sellShares - p.redeemShares, 0);
      let proceeds = p.sellProceeds + p.redeemProceeds;
      let closed = false;
      if (r.closed) {
        closed = true;
        proceeds += held * (r.winningIndex === p.oi ? 1 : 0); // resolve held shares to {0,1}
      } else if (p.sellShares + p.redeemShares >= p.buyShares * 0.99) {
        closed = true; // fully exited before resolution
      }
      if (!closed) continue; // never mark-to-mid open positions
      // realized edge per share, clamped to [-1,1] (binary-outcome bound) as a backstop
      const e = Math.max(-1, Math.min(1, proceeds / p.buyShares - entryAvg));
      edges.push({ e, notional: p.buyCost, eventSlug: p.eventSlug });
      realizedPnl += proceeds - p.buyCost;
      if (proceeds > p.buyCost) wins++;
    }

    const nClosed = edges.length;
    const winRate = nClosed ? wins / nClosed : 0;
    let meanEdge = 0, stdEdge = 0, edgeLcb = 0, dollarEdge = 0, nEff = 0;
    if (nClosed > 0) {
      meanEdge = edges.reduce((s, x) => s + x.e, 0) / nClosed;
      if (nClosed > 1) {
        const v = edges.reduce((s, x) => s + (x.e - meanEdge) ** 2, 0) / (nClosed - 1);
        stdEdge = Math.sqrt(v);
      }
      // n_eff: cluster correlated bets by event (15 same-day China-temp markets ≈ 1 event)
      nEff = new Set(edges.map((x) => x.eventSlug)).size || nClosed;
      const se = nEff > 0 ? stdEdge / Math.sqrt(nEff) : stdEdge;
      edgeLcb = meanEdge - Z * se;
      const tot = edges.reduce((s, x) => s + x.notional, 0);
      dollarEdge = tot > 0 ? edges.reduce((s, x) => s + x.e * x.notional, 0) / tot : 0;
    }
    const qualified = nClosed >= MIN_CLOSED;
    const marketFocus = this.classifyFocus(activity);

    const pseudonym = activity[0]?.pseudonym || activity[0]?.name || undefined;
    const profileImage = activity[0]?.profileImage || undefined;
    const data = {
      pnl: realizedPnl, realizedPnl, volume, positionsValue,
      tradeCount: activity.length, winRate, marketFocus,
      nClosed, nEff, meanEdge, stdEdge, edgeLcb, dollarEdge, edgeScore: edgeLcb, qualified,
      scanned: true, lastScanned: new Date(),
    };
    return this.prisma.pmWallet.upsert({
      where: { address },
      create: { address, pseudonym, profileImage, ...data },
      update: { ...data, ...(pseudonym ? { pseudonym } : {}), ...(profileImage ? { profileImage } : {}) },
    });
  }

  private classifyFocus(items: any[]): string | null {
    const text = items.map((i) => String(i.title || '').toLowerCase()).join(' ');
    if (!text.trim()) return null;
    const cats: [string, RegExp][] = [
      ['BTC Up/Down', /(bitcoin|btc).{0,12}up or down/],
      ['ETH Up/Down', /(ethereum|eth).{0,12}up or down/],
      ['Crypto Up/Down', /up or down/],
      ['Weather', /temperature|weather|degrees|highest temp/],
      ['Sports', /\b(nba|nfl|mlb|ufc|soccer|premier league|match|vs)\b/],
      ['Politics', /\b(election|president|trump|senate|congress|vote|fed )\b/],
      ['Crypto Price', /\b(bitcoin|ethereum|solana|btc|eth|sol)\b/],
    ];
    const counts = cats.map(([name, re]) => [name, (text.match(new RegExp(re, 'g')) || []).length] as [string, number]);
    counts.sort((a, b) => b[1] - a[1]);
    return counts[0][1] > 0 ? counts[0][0] : 'Mixed';
  }

  /** Leaderboard: only statistically-qualified wallets, ranked by edge LCB. */
  leaderboard(limit = 50) {
    return this.prisma.pmWallet.findMany({
      where: { scanned: true, qualified: true },
      orderBy: { edgeLcb: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
    });
  }

  async getWallet(addressRaw: string) {
    const address = String(addressRaw || '').toLowerCase();
    const existing = await this.prisma.pmWallet.findUnique({ where: { address } });
    if (existing?.scanned && existing.lastScanned && Date.now() - existing.lastScanned.getTime() < 3600 * 1000) {
      return existing;
    }
    return this.scanWallet(address);
  }

  async stats() {
    const [total, scanned, qualified] = await Promise.all([
      this.prisma.pmWallet.count(),
      this.prisma.pmWallet.count({ where: { scanned: true } }),
      this.prisma.pmWallet.count({ where: { qualified: true } }),
    ]);
    return { total, scanned, qualified };
  }

  @Interval('quant-autodiscover', 5 * 60 * 1000)
  async autoTick() {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const { discovered } = await this.discover(200);
      const scannedCount = await this.prisma.pmWallet.count({ where: { scanned: true } });
      const take = scannedCount < 120 ? 20 : 8;
      const batch = await this.prisma.pmWallet.findMany({
        where: { OR: [{ scanned: false }, { lastScanned: { lt: new Date(Date.now() - 12 * 3600 * 1000) } }] },
        orderBy: [{ scanned: 'asc' }, { lastScanned: 'asc' }],
        take,
      });
      for (const w of batch) {
        await this.scanWallet(w.address);
        await new Promise((r) => setTimeout(r, 400));
      }
      this.logger.log(`quant tick: +${discovered} discovered, ${batch.length} scanned`);
    } catch (e: any) {
      this.logger.warn(`quant tick failed: ${e?.message}`);
    } finally {
      this.ticking = false;
    }
  }
}
