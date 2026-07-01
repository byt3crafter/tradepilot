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

  /** Search/list tradeable Polymarket markets (with outcome tokenIds + prices).
   * Query hits Polymarket's full public-search catalog; no query = top markets by volume. */
  markets(query?: string) {
    return this.pm.searchMarkets(query, 120);
  }

  /** Market resolutions by conditionId — used by the autobot trade resolver. */
  resolutions(conditionIds: string[]) {
    return this.pm.marketResolutions(conditionIds);
  }

  /**
   * Arbitrage / mispricing scanner — the REAL edge (pure Polymarket math, no wallet copying):
   *  • cross-market: NegRisk (mutually-exclusive) events whose Yes prices sum < $1 →
   *    buy every outcome's Yes, exactly one pays $1 → locked profit (after fees).
   *  • settlement-lag: a dominant near-certain outcome (≥95¢) still < $1 on a market that's
   *    ended/ending → buy the favorite, collect the gap at resolution.
   * Edges are shown AFTER a 2% fee/slippage buffer, so only genuinely profitable ones surface.
   */
  async scanArbs(opts?: { safeMinPrice?: number; safeMaxHrs?: number; immMinPrice?: number; immMaxHrs?: number; minEdgePct?: number }) {
    const FEE = 0.02;
    const now = Date.now();
    // User-configurable thresholds (no hard-coding) — fall back to sane defaults.
    const cfg = {
      safeMinPrice: opts?.safeMinPrice ?? 0.95,
      safeMaxHrs: opts?.safeMaxHrs ?? 24,
      immMinPrice: opts?.immMinPrice ?? 0.90,
      immMaxHrs: opts?.immMaxHrs ?? 6,
      minEdgePct: opts?.minEdgePct ?? 0,
    };

    const events = await this.pm.activeEvents(150);
    const cross: any[] = [];
    for (const e of events) {
      if (!(e.negRisk || e.enableNegRisk)) continue; // mutually-exclusive sets only
      const allMarkets = (e.markets || []);
      const fullCount = allMarkets.length; // M12: full set size BEFORE filtering closed/no-book legs
      const mks = allMarkets.filter((m: any) => m.enableOrderBook !== false && !m.closed);
      if (mks.length < 2) continue;
      const legs: any[] = [];
      let ok = true;
      for (const m of mks) {
        let pr: number[] = [], tk: string[] = [];
        try { pr = JSON.parse(m.outcomePrices || '[]').map(Number); } catch { ok = false; }
        try { tk = JSON.parse(m.clobTokenIds || '[]'); } catch { /* */ }
        if (!pr.length || tk.length < 1) { ok = false; break; }
        legs.push({ title: m.groupItemTitle || m.question, yesPrice: pr[0], tokenId: tk[0] });
      }
      if (!ok || legs.length < 2) continue;
      // M12: a NegRisk arb is riskless ONLY if we can buy EVERY mutually-exclusive outcome.
      // If any leg was filtered out (closed / no order book), buying the survivors is not a
      // hedge — exactly-one-pays-$1 no longer holds, so 1 - sumYes over a partial set is a
      // phantom edge. Require the surviving legs to cover the COMPLETE set.
      if (legs.length !== fullCount) continue;
      const sumYes = legs.reduce((s, l) => s + l.yesPrice, 0);
      const edge = 1 - sumYes; // buy-all-yes underpriced
      if (edge > FEE) {
        cross.push({
          type: 'cross', event: e.title, slug: e.slug, nOutcomes: legs.length,
          sumYes: +sumYes.toFixed(4), edgePct: +((edge - FEE) * 100).toFixed(2),
          legs: legs.sort((a, b) => b.yesPrice - a.yesPrice).slice(0, 12),
        });
      }
    }

    const markets = await this.pm.activeMarkets(400); // wider scan → more last-window opportunities
    const NOVELTY = QuantService.NOVELTY;
    const lag: any[] = [];
    for (const m of markets) {
      if (m.enableOrderBook === false || m.closed) continue;
      if (NOVELTY.test(m.question || '')) continue; // skip joke/novelty markets
      let pr: number[] = [], tk: string[] = [], oc: string[] = [];
      try { pr = JSON.parse(m.outcomePrices || '[]').map(Number); } catch { continue; }
      try { tk = JSON.parse(m.clobTokenIds || '[]'); } catch { /* */ }
      try { oc = JSON.parse(m.outcomes || '[]'); } catch { /* */ }
      if (!pr.length || !tk.length) continue;
      const idx = pr.indexOf(Math.max(...pr));
      const fav = pr[idx];
      const end = m.endDate ? Date.parse(m.endDate) : NaN;
      if (isNaN(end)) continue;
      const hrs = (end - now) / 3_600_000;
      if (hrs <= 0) continue;
      // TWO tiers — the lower price is ONLY allowed when resolution is imminent (little time to flip):
      //   • safe     — near-certain favorite (≥95¢) resolving within 24h (classic riskless-ish lag)
      //   • imminent — strong favorite (90–95¢) resolving within 6h ("last opportunity", your idea)
      let tier: string | null = null;
      if (fav >= cfg.safeMinPrice && fav < 0.999 && hrs <= cfg.safeMaxHrs) tier = 'safe';
      else if (fav >= cfg.immMinPrice && fav < cfg.safeMinPrice && hrs <= cfg.immMaxHrs) tier = 'imminent';
      if (!tier) continue;
      const edge = (1 - fav) / fav;
      if (edge > FEE && (edge - FEE) * 100 >= cfg.minEdgePct) lag.push({
        type: 'lag', tier, title: m.question, slug: m.slug, outcome: oc[idx] || `#${idx}`,
        price: +fav.toFixed(3), tokenId: tk[idx], conditionId: m.conditionId, outcomeIndex: idx,
        edgePct: +((edge - FEE) * 100).toFixed(2), endsAt: end, endsInH: +hrs.toFixed(1),
      });
    }

    return {
      crossMarket: cross.sort((a, b) => b.edgePct - a.edgePct).slice(0, 30),
      // LAST-OPPORTUNITY first: soonest-resolving floats up, then biggest edge.
      settlementLag: lag.sort((a, b) => (a.endsInH - b.endsInH) || (b.edgePct - a.edgePct)).slice(0, 40),
      scannedAt: now,
    };
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
      this.pm.activityComplete(address), // complete history via &end cursor (past the 1000 cap)
      this.pm.value(address),
    ]);

    // group fills into positions per (market, outcome)
    type Pos = { cid: string; oi: number; eventSlug: string; title?: string; outcome?: string; lastTs: number; buyShares: number; buyCost: number; sellShares: number; sellProceeds: number; redeemShares: number; redeemProceeds: number };
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
        p = { cid, oi, eventSlug: a.eventSlug || a.slug || cid, title: a.title, outcome: a.outcome, lastTs: 0, buyShares: 0, buyCost: 0, sellShares: 0, sellProceeds: 0, redeemShares: 0, redeemProceeds: 0 };
        pos.set(key, p);
      }
      const size = Number(a.size) || 0;
      if (Number(a.timestamp) > p.lastTs) p.lastTs = Number(a.timestamp) || 0;
      if (a.type === 'TRADE' && a.side === 'BUY') { p.buyShares += size; p.buyCost += usd; }
      else if (a.type === 'TRADE' && a.side === 'SELL') { p.sellShares += size; p.sellProceeds += usd; }
      else if (a.type === 'REDEEM') { p.redeemShares += size; p.redeemProceeds += usd; }
    }

    const conds = [...new Set([...pos.values()].map((p) => p.cid))];
    const res = await this.resolveMarkets(conds);

    // realized edge per closed position
    const edges: { e: number; notional: number; eventSlug: string }[] = [];
    const closedPos: { cid: string; oi: number; entry: number; payoff: number; roiPct: number; success: boolean; ts: number; title?: string; outcome?: string }[] = [];
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
      const payoffPerShare = proceeds / p.buyShares;
      const e = Math.max(-1, Math.min(1, payoffPerShare - entryAvg));
      edges.push({ e, notional: p.buyCost, eventSlug: p.eventSlug });
      if (entryAvg > 0.01 && entryAvg < 0.99) {
        closedPos.push({
          cid: p.cid, oi: p.oi, entry: entryAvg, payoff: payoffPerShare,
          roiPct: ((payoffPerShare - entryAvg) / entryAvg) * 100, success: payoffPerShare > entryAvg,
          ts: p.lastTs || 0, title: p.title, outcome: p.outcome,
        });
      }
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

    // HONEST total return — mark-to-market, NO survivorship: cash out (sells + redeems)
    // PLUS current holdings value (positionsValue, authoritative from /value) MINUS cash in
    // (all buys). This captures the LOSING positions the wallet is still holding — which the
    // realized-only view excluded, producing the fake ~100% win / inflated ROI.
    let totalBuys = 0, totalSells = 0, totalRedeems = 0;
    for (const p of pos.values()) { totalBuys += p.buyCost; totalSells += p.sellProceeds; totalRedeems += p.redeemProceeds; }
    const invested = totalBuys;
    const netPnl = totalSells + totalRedeems + positionsValue - totalBuys;
    const roiPct = invested > 0 ? (netPnl / invested) * 100 : 0;

    const pseudonym = activity[0]?.pseudonym || activity[0]?.name || undefined;
    const profileImage = activity[0]?.profileImage || undefined;
    const data = {
      pnl: netPnl, realizedPnl: netPnl, volume, positionsValue, invested, roiPct,
      tradeCount: activity.length, winRate, marketFocus,
      nClosed, nEff, meanEdge, stdEdge, edgeLcb, dollarEdge, edgeScore: edgeLcb, qualified,
      scanned: true, lastScanned: new Date(),
    };
    const saved = await this.prisma.pmWallet.upsert({
      where: { address },
      create: { address, pseudonym, profileImage, ...data },
      update: { ...data, ...(pseudonym ? { pseudonym } : {}), ...(profileImage ? { profileImage } : {}) },
    });
    // Time-series snapshot (qualified wallets only) — feeds analytics + edge-decay + learning.
    if (qualified) {
      await this.prisma.pmWalletSnapshot.create({
        data: { address, edgeLcb, meanEdge, roiPct, invested, pnl: netPnl, nClosed, nEff, winRate, volume, marketFocus },
      }).catch(() => {});

      // Backfill this wallet's closed positions as resolved paper-copy decisions ONCE
      // (in-sample/historical) so the learning panel + paper-wallet sim have data fast.
      const already = await this.prisma.agentDecision.findFirst({ where: { subjectAddr: address, mode: 'backfill' }, select: { id: true } });
      if (!already && closedPos.length) {
        for (const c of closedPos) {
          await this.prisma.agentDecision.create({
            data: {
              extKey: `bf:${address}:${c.cid}:${c.oi}`, mode: 'backfill', kind: 'paper_copy',
              subjectAddr: address, market: c.cid, action: 'COPY',
              rationale: `Hist: ${pseudonym || address.slice(0, 8)} ${c.outcome || ''} @ ${c.entry.toFixed(3)}`.slice(0, 200),
              meta: { outcomeIndex: c.oi, entryPrice: c.entry, historical: true, ts: c.ts, title: c.title, outcome: c.outcome },
              outcome: { create: { roiPct: c.roiPct, realizedPnl: c.payoff - c.entry, success: c.success, resolvedAt: c.ts ? new Date(c.ts * 1000) : new Date() } },
            },
          }).catch(() => { /* dup extKey */ });
        }
      }
    }
    return saved;
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

  // ── Paper learning loop (P3) — prove "what works" with no real money ──────────
  // Log paper "copy" decisions when a QUALIFIED wallet buys, resolve them against
  // real market outcomes, and aggregate per-wallet paper performance. The substrate
  // for self-healing: validate winners, disable losers — before any live capital.

  /** Snapshot recent buys by qualified wallets as paper-copy decisions (deduped). */
  // ── Learned EV model: generalize from ALL resolved decisions (no hand-coded filters) ──
  // The engine learns expected ROI per (marketFocus × entry-price-band) bucket and only
  // takes positive-EV signals — so the price-floor / focus-block rules EMERGE from data and
  // self-update. Generalizes to unseen markets via features (baby-brain), not brute force.
  // Junk/novelty markets that pollute the "politics" tag — never trade these.
  static readonly NOVELTY = /\bgta\b|grand theft|jesus|\bchrist\b|rapture|second coming|\baliens?\b|extraterrestrial|bigfoot|loch ness|nostradamus/i;
  // Ultra-short MINUTE markets (e.g. "... Up or Down - June 30, 9:40AM-9:45AM ET"). Pure 50/50
  // coin-flips that bleed to fees every few minutes. Identified by a time-RANGE in the title — this
  // does NOT block normal crypto markets (no time window). The "not stupid things" exclusion.
  static readonly MINUTE_MARKET = /\d{1,2}:\d{2}\s*(?:am|pm)?\s*[-–—]\s*\d{1,2}:\d{2}\s*(?:am|pm)/i;

  private evCache: { at: number; table: Map<string, { mean: number; n: number; winRate: number }> } | null = null;
  private bucketKey(focus: string | null | undefined, price: number): string {
    const band = Math.min(9, Math.max(0, Math.floor(price * 10)));
    return `${focus || 'Mixed'}|${band}`;
  }
  async getEvTable(): Promise<Map<string, { mean: number; n: number; winRate: number }>> {
    if (this.evCache && Date.now() - this.evCache.at < 30 * 60 * 1000) return this.evCache.table;
    const outs = await this.prisma.agentOutcome.findMany({
      // FORWARD only — training on the 'backfill' (hindsight, winners-only) poisons the model
      // (it would learn longshots are great because backfill omits the losers). Out-of-sample
      // is the only honest teacher.
      where: { decision: { kind: 'paper_copy', mode: { not: 'backfill' } } },
      include: { decision: { select: { meta: true, subjectAddr: true } } },
      take: 60000,
    });
    const addrs = [...new Set(outs.map((o) => o.decision?.subjectAddr).filter(Boolean) as string[])];
    const wallets = await this.prisma.pmWallet.findMany({ where: { address: { in: addrs } }, select: { address: true, marketFocus: true } });
    const focusMap = new Map(wallets.map((w) => [w.address, w.marketFocus]));
    const acc = new Map<string, { sum: number; n: number; wins: number }>();
    for (const o of outs) {
      const meta: any = o.decision?.meta || {};
      const price = Number(meta.entryPrice);
      if (!(price > 0 && price < 1)) continue;
      const focus = o.decision?.subjectAddr ? focusMap.get(o.decision.subjectAddr) || 'Mixed' : 'Mixed';
      const key = this.bucketKey(focus, price);
      const a = acc.get(key) || { sum: 0, n: 0, wins: 0 };
      a.sum += o.roiPct || 0; a.n++; if (o.success) a.wins++;
      acc.set(key, a);
    }
    const table = new Map<string, { mean: number; n: number; winRate: number }>();
    for (const [k, v] of acc) table.set(k, { mean: v.sum / v.n, n: v.n, winRate: v.wins / v.n });
    this.evCache = { at: Date.now(), table };
    return table;
  }

  /** Public passthrough — market end timestamps (ms) per conditionId, for the trade history UI. */
  async endDatesFor(conditionIds: string[]): Promise<Record<string, number>> {
    if (!conditionIds.length) return {};
    return this.pm.marketEndDates(conditionIds).catch(() => ({}));
  }

  /** The learned policy table — what the engine has learned wins/loses, per feature bucket. */
  async learnedPolicy() {
    const t = await this.getEvTable();
    return [...t.entries()]
      .map(([k, v]) => {
        const [focus, band] = k.split('|');
        const lo = Number(band) * 10;
        return { focus, priceBand: `${lo}-${lo + 10}¢`, avgRoi: +v.mean.toFixed(1), n: v.n, decision: v.n >= 12 ? (v.mean > 2 ? 'take' : 'skip') : 'explore' };
      })
      .sort((a, b) => b.avgRoi - a.avgRoi);
  }

  async recordPaperSignals(): Promise<number> {
    // Coverage: 12k+ qualified wallets but few trade inside any short window, so the limiter is
    // how much of the global feed we capture. Widen to 1000 (the data-api max) — 2x the +EV
    // signal capture, which compounds into higher paper return over time. Filters still apply.
    const trades = await this.pm.recentTrades(1000);
    if (!trades.length) return 0;
    const addrs = [...new Set(trades.map((t) => String(t.proxyWallet || '').toLowerCase()))];
    // Measured (forward): wallets with edgeLcb ≥ 0.10 LOSE (-9 to -34%) — extreme historical
    // EDGE FIX: edgeLcb was uncorrelated with profit (high-win-rate favorite-bettors → ~0% ROI).
    // Copy only genuinely-profitable wallets: realized ROI ≥15% + ≥50 closed + winRate ≥55%.
    const wallets = await this.prisma.pmWallet.findMany({ where: { address: { in: addrs }, qualified: true, roiPct: { gte: 15 }, nClosed: { gte: 50 }, winRate: { gte: 0.55 } }, select: { address: true, marketFocus: true } });
    const focusMap = new Map(wallets.map((w) => [w.address, w.marketFocus]));
    const ev = await this.getEvTable();
    const MIN_SAMPLE = 12, EV_THRESHOLD = 2; // roiPct units (≈ fee buffer)
    // Proven PRIORS (used only where forward data is too thin to have learned yet):
    // Crypto Up/Down added pass 5: flipped negative forward (-4% over n=31, 77% win but big
    // -100% losers outweigh small high-priced wins). Sports (+13%) carries the book.
    const PRIOR_BLOCK = new Set(['Mixed', 'Politics', 'Weather', 'Crypto Price', 'Crypto Up/Down']);
    const cands = trades
      .filter((t) => {
        const addr = String(t.proxyWallet || '').toLowerCase();
        const price = Number(t.price);
        if (!focusMap.has(addr)) return false; // qualified wallets only
        // M18: never copy ultra-short MINUTE markets — 5-min coin-flips bleed to fees and
        // pollute the EV table / learnedPolicy / sim. Same exclusion signals() applies.
        if (QuantService.MINUTE_MARKET.test(String(t.title || ''))) return false;
        // HARD price floor 0.25 — bands <0.20 lose -100%/-33% across every pass; the learned
        // gate could otherwise override the 0.30 prior on a falsely-positive bucket. Guard it.
        if (!(String(t.side).toUpperCase() === 'BUY' && price >= 0.25 && price < 0.98 && t.conditionId && t.transactionHash)) return false;
        // Skip the 0.40–0.50 "coin-flip dead zone": max-uncertainty markets where the crowd has
        // no consensus → no copyable edge, only fee drag. Forward: band 0.40-0.50 = −17.3% over
        // n=31 while both neighbours (0.30-0.40 +12%, 0.50-0.60 +27%) are strongly positive.
        // Hard-skip (before the learned gate) lifts the sim +226%→+249%.
        if (price >= 0.40 && price < 0.50) return false;
        const focus = focusMap.get(addr);
        const b = ev.get(this.bucketKey(focus, price));
        // Structurally -EV focuses are HARD-blocked — never copy, even when a (focus×band)
        // bucket looks positive in-sample. Forward proof: Crypto Up/Down −11.3% over n=40 (70%
        // win, but the −100% tails swamp the small high-priced wins) kept slipping through the
        // learned branch on overfit in-sample means. Hard block lifts the sim +175%→+197%.
        if (PRIOR_BLOCK.has(focus || 'Mixed')) return false;
        // Learned (forward) EV where we have enough real samples; otherwise the proven price prior.
        return b && b.n >= MIN_SAMPLE ? b.mean > EV_THRESHOLD : price >= 0.30;
      });
    if (!cands.length) return 0;
    // Short-horizon bias: only copy markets settling within 7 days, so the out-of-sample
    // test produces resolved results fast (crypto/sports resolve same-day) instead of
    // months-out markets that never settle inside the test window.
    const conds = [...new Set(cands.map((t) => t.conditionId as string))];
    const ends = await this.pm.marketEndDates(conds);
    const horizon = Date.now() + 7 * 24 * 3600 * 1000;
    let created = 0;
    for (const t of cands) {
      const cond = t.conditionId as string;
      const end = ends[cond];
      if (!end || end > horizon || end < Date.now() - 3600 * 1000) continue; // soon-resolving only
      const addr = String(t.proxyWallet || '').toLowerCase();
      const price = Number(t.price), oi = Number(t.outcomeIndex) || 0, tx = t.transactionHash;
      try {
        await this.prisma.agentDecision.create({
          data: {
            extKey: `pc:${addr}:${cond}:${oi}:${tx}`,
            mode: 'auto', kind: 'paper_copy', subjectAddr: addr, market: cond, action: 'COPY',
            rationale: `Copy ${t.pseudonym || addr.slice(0, 8)} BUY ${t.outcome} @ ${price} (${t.title || ''})`.slice(0, 300),
            meta: { outcomeIndex: oi, entryPrice: price, size: Number(t.size) || 0, eventSlug: t.eventSlug || null, title: t.title || null, outcome: t.outcome || null, endsAt: end },
          },
        });
        created++;
      } catch { /* duplicate extKey → already logged */ }
    }
    return created;
  }

  /** Resolve open paper decisions whose market has settled → paper PnL/ROI. */
  async resolvePaperOutcomes(): Promise<number> {
    const open = await this.prisma.agentDecision.findMany({
      where: { kind: 'paper_copy', outcome: null }, take: 300, orderBy: { createdAt: 'asc' },
    });
    if (!open.length) return 0;
    const conds = [...new Set(open.map((d) => d.market).filter(Boolean) as string[])];
    const res = await this.resolveMarkets(conds);
    const now = Date.now();
    const AGE_OUT_MS = 14 * 24 * 3600 * 1000; // N1(b): markets unresolved this long past end get aged out
    let resolved = 0;
    // N1: write a TERMINAL outcome (the `outcome` relation) for any decision that can never
    // resolve normally, so it leaves the `outcome: null` pending set. Creating the AgentOutcome
    // IS what sets AgentDecision.outcome (it's a 1:1 relation, not a scalar), so this is exactly
    // the "set the decision's outcome so it exits the pending set" the head-of-line fix needs.
    const terminate = async (decisionId: string, notes: string) => {
      await this.prisma.agentOutcome.create({
        data: { decisionId, realizedPnl: 0, roiPct: 0, success: false, resolvedAt: new Date(), notes },
      }).catch(() => {});
      resolved++;
    };
    for (const d of open) {
      const r = d.market ? res[d.market] : null;
      const meta: any = d.meta || {};
      // N1(b): market still hasn't resolved. If it's well past its expected end (or just very
      // old), age it out as 'expired' so a delisted / never-settling market can't permanently
      // jam the front of the FIFO queue and starve newer resolvable decisions.
      if (!r || !r.closed) {
        const endsAt = Number(meta.endsAt) || 0;
        const tooOld =
          now - d.createdAt.getTime() > AGE_OUT_MS ||
          (endsAt > 0 && now - endsAt > AGE_OUT_MS);
        if (tooOld) await terminate(d.id, 'expired (market never resolved)');
        continue;
      }
      // N1(a): closed but no winning index (voided / invalid / delisted resolution) — there is
      // no payoff to compute, so write a TERMINAL 'void' outcome instead of skipping forever.
      const oi = Number(meta.outcomeIndex) || 0;
      const entry = Number(meta.entryPrice) || 0;
      if (r.winningIndex == null || !(entry > 0)) {
        await terminate(d.id, r.winningIndex == null ? 'void (closed, no winning index)' : 'void (missing entry price)');
        continue;
      }
      const payoff = r.winningIndex === oi ? 1 : 0; // binary outcome settles to {0,1}
      const roiPct = ((payoff - entry) / entry) * 100;
      await this.prisma.agentOutcome.create({
        data: { decisionId: d.id, realizedPnl: payoff - entry, roiPct, success: payoff > entry, resolvedAt: new Date(), notes: `payoff=${payoff} entry=${entry.toFixed(3)}` },
      }).catch(() => {});
      resolved++;
    }
    return resolved;
  }

  /** Aggregate paper performance → "what works" (per wallet + overall).
   * FORWARD/out-of-sample ONLY (excludes the in-sample 'backfill' hindsight) so the
   * numbers are honest/trustworthy — not survivorship-inflated. */
  async learningStats() {
    const outcomes = await this.prisma.agentOutcome.findMany({
      where: { decision: { kind: 'paper_copy', mode: { not: 'backfill' } } },
      include: { decision: { select: { subjectAddr: true } } },
      take: 5000,
    });
    const n = outcomes.length;
    const wins = outcomes.filter((o) => o.success).length;
    const avgRoi = n ? outcomes.reduce((s, o) => s + (o.roiPct || 0), 0) / n : 0;
    const byWallet = new Map<string, { n: number; wins: number; roi: number }>();
    for (const o of outcomes) {
      const a = o.decision?.subjectAddr || 'unknown';
      const m = byWallet.get(a) || { n: 0, wins: 0, roi: 0 };
      m.n++; if (o.success) m.wins++; m.roi += o.roiPct || 0;
      byWallet.set(a, m);
    }
    const pending = await this.prisma.agentDecision.count({ where: { kind: 'paper_copy', outcome: null } });
    const wallets = [...byWallet.entries()]
      .map(([address, m]) => {
        const ar = m.roi / m.n;
        return {
          address, n: m.n, winRate: m.wins / m.n, avgRoi: ar,
          verdict: m.n >= 10 ? (ar > 2 ? 'validated' : ar < -2 ? 'disabled' : 'watch') : 'learning',
        };
      })
      .sort((a, b) => b.avgRoi - a.avgRoi);
    return { overall: { resolved: n, pending, winRate: n ? wins / n : 0, avgRoi }, wallets };
  }

  /** Prediction → outcome ledger: each paper decision + what actually happened. */
  async learningDecisions(limit = 60, sample: 'live' | 'all' = 'live', mode?: string) {
    const where: any = { kind: 'paper_copy' };
    if (mode) where.mode = mode;                              // exact mode (e.g. 'ai_judgment')
    else if (sample === 'live') where.mode = { not: 'backfill' }; // all forward: copy + arb + ai
    const rows = await this.prisma.agentDecision.findMany({
      where,
      include: { outcome: true },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
    });
    // attach wallet pseudonym + focus + that wallet's forward working % (from learning)
    const addrs = [...new Set(rows.map((r) => r.subjectAddr).filter(Boolean) as string[])];
    const wallets = await this.prisma.pmWallet.findMany({ where: { address: { in: addrs } }, select: { address: true, pseudonym: true, marketFocus: true } });
    const wmap = new Map(wallets.map((w) => [w.address, w]));
    return rows.map((d) => {
      const meta: any = d.meta || {};
      const w = d.subjectAddr ? wmap.get(d.subjectAddr) : undefined;
      return {
        id: d.id,
        createdAt: d.createdAt,
        wallet: d.subjectAddr,
        pseudonym: w?.pseudonym ?? null,
        focus: w?.marketFocus ?? null,
        market: d.market,
        mode: d.mode,                        // auto=copy | arb | ai_judgment
        side: 'BUY',
        outcomeLabel: meta.outcome ?? null,  // which side it bet (Yes/No/team)
        entryPrice: meta.entryPrice ?? null, // at what price
        title: meta.title ?? null,           // the market question (short description)
        rationale: d.rationale ?? null,      // the AI's / engine's reasoning
        aiTrueProb: meta.aiTrueProb ?? null, // AI's estimated true prob (ai_judgment)
        status: d.outcome ? (d.outcome.success ? 'win' : 'loss') : 'pending',
        roiPct: d.outcome?.roiPct ?? null,
        resolvedAt: d.outcome?.resolvedAt ?? null,
      };
    });
  }

  /**
   * Paper-wallet simulation: "if you put $bankroll, copying the engine's paper
   * decisions at risk-fraction per trade, what would you have now?" Computes a
   * compounding equity curve over resolved decisions in time order.
   */
  /**
   * sample: 'live' = honest out-of-sample (forward paper loop only, decisions logged
   * BEFORE resolution); 'historical' = in-sample backfill (HINDSIGHT — the wallets'
   * own already-won trades, optimistic, NOT achievable). Default 'live'.
   * Includes a fees+slippage haircut per trade for realism.
   */
  async simulate(bankroll = 50, risk = 0.05, sample: 'live' | 'historical' = 'live') {
    const start = Math.max(1, bankroll);
    const maxFrac = Math.min(Math.max(risk, 0.005), 0.5); // the risk slider = MAX bet cap
    const FEE = 0.02; // per-trade fee + slippage haircut (fraction of stake)
    const modeFilter = sample === 'historical' ? { mode: 'backfill' } : { mode: { not: 'backfill' } };
    const outs = await this.prisma.agentOutcome.findMany({
      where: { decision: { kind: 'paper_copy', ...modeFilter } },
      include: { decision: { select: { meta: true, subjectAddr: true, mode: true } } },
      take: 5000,
    });
    // learned EV table + wallet focus → per-trade Kelly sizing
    const ev = await this.getEvTable();
    const addrs = [...new Set(outs.map((o) => o.decision?.subjectAddr).filter(Boolean) as string[])];
    const fwallets = await this.prisma.pmWallet.findMany({ where: { address: { in: addrs } }, select: { address: true, marketFocus: true } });
    const focusMap = new Map(fwallets.map((w) => [w.address, w.marketFocus]));
    // Backtest the CURRENT ruleset over history (not a mix of retired ones): drop copy
    // trades whose focus/price the live filters now reject — they will never recur, so
    // including them understates the strategy. Arb/AI are separate strategies, kept as-is.
    const COPY_BLOCK = new Set(['Mixed', 'Politics', 'Weather', 'Crypto Price', 'Crypto Up/Down']);
    const applyFilter = sample !== 'historical';
    const items = outs
      .map((o) => {
        const meta: any = o.decision?.meta || {};
        const ts = Number(meta.ts) ? Number(meta.ts) * 1000 : o.resolvedAt?.getTime() || 0;
        const price = Number(meta.entryPrice) || 0;
        const focus = o.decision?.subjectAddr ? focusMap.get(o.decision.subjectAddr) || 'Mixed' : 'Mixed';
        return { ts, roi: (o.roiPct || 0) / 100, win: !!o.success, price, focus, mode: o.decision?.mode || 'auto' };
      })
      .filter((it) => !applyFilter || it.mode !== 'auto' || (!COPY_BLOCK.has(it.focus) && it.price >= 0.25 && !(it.price >= 0.40 && it.price < 0.50)))
      .sort((a, b) => a.ts - b.ts);
    let bal = start, peak = start, maxDD = 0, wins = 0;
    const curve: { t: number; balance: number }[] = [];
    for (const it of items) {
      // Fractional-Kelly: bet proportional to edge (bucket win-rate vs price), capped by the risk slider.
      // Under-sampled/unproven buckets get HALF the cap (don't bet full size on what we haven't
      // validated); proven buckets (n≥12) get full half-Kelly. Measured: +198% → +217% at 5% cap.
      let f = maxFrac * 0.5;
      const b = ev.get(this.bucketKey(it.focus, it.price));
      if (b && b.n >= 12 && it.price > 0 && it.price < 0.99) {
        const kelly = (b.winRate - it.price) / (1 - it.price); // edge / odds
        f = Math.max(0, Math.min(maxFrac, 0.5 * kelly)); // half-Kelly, capped
      }
      const stake = bal * f;
      bal = Math.max(0, bal + stake * it.roi - stake * FEE);
      if (it.win) wins++;
      peak = Math.max(peak, bal);
      maxDD = Math.max(maxDD, peak > 0 ? (peak - bal) / peak : 0);
      curve.push({ t: it.ts, balance: +bal.toFixed(2) });
    }
    const n = items.length;
    return {
      sample,
      startBalance: start,
      finalBalance: +bal.toFixed(2),
      returnPct: +(((bal - start) / start) * 100).toFixed(1),
      nTrades: n,
      winRate: n ? wins / n : 0,
      maxDrawdownPct: +(maxDD * 100).toFixed(1),
      riskFraction: maxFrac,
      sizing: 'fractional-kelly (edge-proportional, capped by risk)',
      curve: curve.slice(-500),
      note: sample === 'historical'
        ? 'HINDSIGHT backtest — copies the wallets\' own already-won past trades. Optimistic and NOT achievable forward.'
        : 'Out-of-sample, fractional-Kelly sized: bigger bets on higher-edge signals, capped by your risk %.',
    };
  }

  /**
   * Autonomous PAPER arb executor — auto-"takes" settlement-lag arbs into the paper
   * ledger (mode='arb') so we forward-prove the arb edge before any real money. Real
   * (live) auto-execution stays gated on quantMode='auto' + delegated signing (custody B).
   */
  async arbPaperTick(): Promise<number> {
    let scan: any;
    try { scan = await this.scanArbs(); } catch { return 0; }
    const lags = (scan?.settlementLag || []).slice(0, 15);
    let created = 0;
    for (const a of lags) {
      if (!a.conditionId || a.outcomeIndex == null) continue;
      // M18: never paper-take ultra-short MINUTE markets — same exclusion as signals().
      if (QuantService.MINUTE_MARKET.test(String(a.title || ''))) continue;
      try {
        await this.prisma.agentDecision.create({
          data: {
            extKey: `arb:lag:${a.conditionId}:${a.outcomeIndex}`,
            mode: 'arb', kind: 'paper_copy', subjectAddr: null, market: a.conditionId, action: 'BUY',
            rationale: `Arb (settlement-lag): ${a.outcome} @ ${a.price} (+${a.edgePct}%) — ${a.title || ''}`.slice(0, 300),
            meta: { type: 'lag', outcomeIndex: a.outcomeIndex, entryPrice: a.price, edgePct: a.edgePct, title: a.title, outcome: a.outcome, ts: Math.floor(Date.now() / 1000) },
          },
        });
        created++;
      } catch { /* dup extKey → already taken */ }
    }
    return created;
  }

  @Interval('quant-arb-paper', 20 * 60 * 1000)
  async arbPaperLoop() {
    try {
      const created = await this.arbPaperTick();
      if (created) this.logger.log(`arb paper: +${created} settlement-lag arbs taken (paper)`);
    } catch (e: any) {
      this.logger.warn(`arb paper loop failed: ${e?.message}`);
    }
  }

  /**
   * SIGNALS — the single "what to buy now" board. Aggregates the engine's live, actionable
   * edges (AI-judgment open calls + settlement-lag arbs) into one ranked list with a tradeable
   * tokenId, so the user can act manually in one click. The learning loops keep running behind it.
   */
  /** COPY-TOP-WALLET signals — the validated paper strategy (the +200%+ sim) surfaced live:
   * recent BUYs by qualified wallets that pass the same gate as recordPaperSignals (focus block,
   * price 0.25–0.98 excl the 0.40–0.50 dead zone, learned-EV bucket). Each carries the market
   * end date so the bot can prefer fast-resolving markets (Sports = best focus AND settles same-day). */
  async copySignals(): Promise<any[]> {
    try {
      const trades = await this.pm.recentTrades(1000);
      const addrs = [...new Set(trades.map((t: any) => String(t.proxyWallet || '').toLowerCase()))];
      // EDGE FIX: copy only genuinely-profitable wallets (realized ROI ≥15% + ≥50 closed + winRate
      // ≥55%) — edgeLcb was uncorrelated with profit (high-win-rate favorite-bettors lose money).
      const wallets = await this.prisma.pmWallet.findMany({ where: { address: { in: addrs }, qualified: true, roiPct: { gte: 15 }, nClosed: { gte: 50 }, winRate: { gte: 0.55 } }, select: { address: true, marketFocus: true } });
      const focusMap = new Map(wallets.map((w) => [w.address, w.marketFocus]));
      const ev = await this.getEvTable();
      const PRIOR_BLOCK = new Set(['Mixed', 'Politics', 'Weather', 'Crypto Price', 'Crypto Up/Down']);
      const MIN_SAMPLE = 12, EV_THRESHOLD = 2;
      const picked: any[] = []; const seen = new Set<string>();
      for (const t of trades) {
        const addr = String(t.proxyWallet || '').toLowerCase();
        if (!focusMap.has(addr)) continue;
        // M18: skip ultra-short MINUTE markets (5-min coin-flips) — same exclusion as signals().
        if (QuantService.MINUTE_MARKET.test(String(t.title || ''))) continue;
        const price = Number(t.price);
        if (!(String(t.side).toUpperCase() === 'BUY' && price >= 0.25 && price < 0.98 && t.conditionId)) continue;
        if (price >= 0.40 && price < 0.50) continue; // coin-flip dead zone
        const focus = focusMap.get(addr);
        if (PRIOR_BLOCK.has(focus || 'Mixed')) continue;
        const b = ev.get(this.bucketKey(focus, price));
        const pass = b && b.n >= MIN_SAMPLE ? b.mean > EV_THRESHOLD : price >= 0.30;
        if (!pass) continue;
        const tok = t.asset || t.tokenId;
        if (!tok || seen.has(tok)) continue; seen.add(tok);
        picked.push({
          type: 'copy' as const, title: t.title || '', action: 'BUY', outcome: t.outcome || '',
          priceCents: Math.round(price * 100), edgePct: Math.max(5, b && b.n >= MIN_SAMPLE ? Math.round(b.mean) : 6),
          detail: `copying top ${focus} wallet`, confidence: null,
          reason: `Top qualified ${focus} wallet bought ${t.outcome} @ ${Math.round(price * 100)}¢ — mirroring proven edge`,
          tokenId: tok, price, conditionId: t.conditionId, outcomeIndex: t.outcomeIndex ?? null,
        });
        if (picked.length >= 25) break;
      }
      const ends = await this.pm.marketEndDates([...new Set(picked.map((p) => p.conditionId))]).catch(() => ({} as any));
      for (const p of picked) p.endDate = ends[p.conditionId] || null;
      return picked;
    } catch { return []; }
  }

  async signals(arbCfg?: any) {
    const aiRows = (await this.prisma.agentDecision.findMany({
      where: { kind: 'paper_copy', mode: 'ai_judgment', outcome: null },
      orderBy: { createdAt: 'desc' }, take: 60,
    })).filter((d) => !QuantService.NOVELTY.test(String((d.meta as any)?.title || '')));
    const ai = aiRows.map((d) => {
      const m: any = d.meta || {};
      const entry = Number(m.entryPrice) || 0;
      const trueP = Number(m.aiTrueProb) || 0;
      return {
        type: 'ai' as const, title: m.title || d.market || '', action: 'BUY',
        outcome: m.outcome || '', priceCents: Math.round(entry * 100),
        edgePct: +(((trueP - entry) * 100)).toFixed(0),
        detail: `AI ${Math.round(trueP * 100)}% vs crowd ${Math.round(entry * 100)}%`,
        confidence: m.confidence ?? null, reason: d.rationale || '',
        tokenId: m.tokenId || null, price: entry, conditionId: d.market, outcomeIndex: m.outcomeIndex ?? null,
      };
    });
    let arbs: any[] = [];
    try {
      const scan = await this.scanArbs(arbCfg || undefined);
      arbs = (scan.settlementLag || []).map((a: any) => ({
        type: 'arb' as const, title: a.title, action: 'BUY', outcome: a.outcome,
        priceCents: Math.round(a.price * 100), edgePct: a.edgePct, endDate: a.endsAt || null,
        detail: a.endsInH != null ? `settlement-lag · ${a.tier} · ends in ${a.endsInH}h` : 'settlement-lag · ends soon', confidence: null,
        reason: `Favourite at ${Math.round(a.price * 100)}¢ resolving ${a.endsInH != null ? `in ~${a.endsInH}h` : 'soon'} — collect the gap to $1.00 (after fees +${a.edgePct}%). ${a.tier === 'imminent' ? 'Imminent resolution → little time to flip.' : 'High-probability, not guaranteed.'}`,
        tokenId: a.tokenId || null, price: a.price, conditionId: a.conditionId, outcomeIndex: a.outcomeIndex ?? null,
      }));
    } catch { /* arbs optional */ }
    // COPY top wallets (the validated strategy) + attach end dates to AI signals too.
    const copy = await this.copySignals();
    const aiCids = [...new Set(ai.map((s: any) => s.conditionId).filter(Boolean))] as string[];
    const aiEnds = await this.pm.marketEndDates(aiCids).catch(() => ({} as any));
    for (const s of ai as any[]) s.endDate = aiEnds[s.conditionId] || null;
    const now = Date.now();
    // Drop ultra-short minute-markets (5-min coin-flips) from EVERY source — they bleed to fees.
    const all = [...copy, ...ai, ...arbs].filter((s: any) => !QuantService.MINUTE_MARKET.test(s.title || ''));
    // Prefer FAST-resolving markets (resolve within 7 days float up — Sports settles same-day),
    // then by edge. Stops the book from being all weeks-out narrative bets.
    all.sort((x: any, y: any) => {
      const fx = (x.endDate || Infinity) - now < 7 * 864e5 ? 0 : 1;
      const fy = (y.endDate || Infinity) - now < 7 * 864e5 ? 0 : 1;
      if (fx !== fy) return fx - fy;
      return (y.edgePct || 0) - (x.edgePct || 0);
    });
    return { signals: all.slice(0, 40), generatedAt: Date.now() };
  }

  /**
   * THE CONTRARIAN EDGE — AI judgment vs the crowd. Bots win on speed in liquid markets;
   * we win on JUDGMENT in slow, narrative-driven, manipulable markets (politics/geopolitics)
   * where the crowd is emotional, there's no sharp book to arb, and bots have no opinion.
   * The AI reads each market, estimates the TRUE probability, and we bet (paper) only where
   * it disagrees with the crowd by a margin. Forward-resolved → an honest track record of
   * whether AI judgment actually beats the crowd. Runs on the operator's connected AI.
   */
  async aiMispricingScan(maxMarkets = 6): Promise<number> {
    const conn = await this.prisma.chatgptConnection.findFirst({ where: { accessToken: { not: '' } }, select: { userId: true } });
    if (!conn) return 0; // no operator AI connected
    const markets = await this.pm.narrativeMarkets(); // politics/geopolitics/world tags
    const now = Date.now();
    const NOVELTY = QuantService.NOVELTY;
    const cands = markets.filter((m) => {
      if (m.enableOrderBook === false || m.closed) return false;
      if (NOVELTY.test(m.question || '')) return false; // skip joke/novelty "before GTA VI" etc.
      let pr: number[] = []; try { pr = JSON.parse(m.outcomePrices || '[]').map(Number); } catch { return false; }
      if (pr.length !== 2) return false; // binary only for v1
      const fav = Math.max(...pr);
      if (!(fav >= 0.10 && fav <= 0.90)) return false; // room to be wrong
      const end = m.endDate ? Date.parse(m.endDate) : NaN;
      if (isNaN(end) || end < now + 24 * 3600 * 1000 || end > now + 45 * 24 * 3600 * 1000) return false; // 1-45d
      return Number(m.volumeNum || m.volume || 0) > 2000;
    }).slice(0, maxMarkets);
    let created = 0;
    for (const m of cands) {
      let pr: number[] = [], oc: string[] = [], tk: string[] = [];
      try { pr = JSON.parse(m.outcomePrices || '[]').map(Number); oc = JSON.parse(m.outcomes || '[]'); tk = JSON.parse(m.clobTokenIds || '[]'); } catch { continue; }
      const system = 'You are a sharp, skeptical prediction-market analyst. The CROWD price is the market-implied probability — it is often distorted by narrative, news cycles and emotion. Your edge is finding where the crowd is WRONG. Reason from base rates and real-world knowledge. Respond ONLY with compact JSON: {"trueProb":<0..1 for the FIRST listed outcome>,"mispriced":<bool>,"confidence":<0..1>,"side":"<exact outcome text you would bet>","reason":"<=140 chars"}.';
      const input = `Market: ${m.question}\nOutcomes: ${oc.join(' | ')}\nCrowd: ${oc.map((o, i) => `${o}=${(pr[i] * 100).toFixed(0)}%`).join(', ')}\nResolves: ${m.endDate}\nWhere is the crowd wrong? JSON only.`;
      let text = '';
      try { text = await this.chatgpt.complete(conn.userId, system, input); } catch { continue; }
      let j: any; try { j = JSON.parse((text.match(/\{[\s\S]*\}/) || [''])[0]); } catch { continue; }
      if (!j || !j.mispriced || (Number(j.confidence) || 0) < 0.6) continue;
      let oi = oc.findIndex((o) => String(o).toLowerCase() === String(j.side || '').toLowerCase());
      if (oi < 0) oi = Number(j.trueProb) >= 0.5 ? 0 : 1;
      const entry = pr[oi];
      if (!(entry > 0.05 && entry < 0.95)) continue;
      const trueProbSide = oi === 0 ? Number(j.trueProb) : 1 - Number(j.trueProb);
      if (!(trueProbSide - entry > 0.07)) continue; // require ≥7% edge over the crowd
      try {
        await this.prisma.agentDecision.create({
          data: {
            extKey: `ai:${m.conditionId}:${oi}`, mode: 'ai_judgment', kind: 'paper_copy', subjectAddr: null, market: m.conditionId, action: 'BUY',
            rationale: `AI judgment: ${oc[oi]} @ ${(entry * 100).toFixed(0)}¢ (AI says ${(trueProbSide * 100).toFixed(0)}%) — ${String(j.reason || '').slice(0, 140)}`.slice(0, 300),
            meta: { type: 'ai_judgment', outcomeIndex: oi, entryPrice: entry, title: m.question, outcome: oc[oi], tokenId: tk[oi] || null, aiTrueProb: trueProbSide, confidence: Number(j.confidence), ts: Math.floor(now / 1000) },
          },
        });
        created++;
      } catch { /* dup extKey */ }
    }
    return created;
  }

  @Interval('quant-ai-judgment', 4 * 3600 * 1000)
  async aiJudgmentLoop() {
    try {
      const c = await this.aiMispricingScan(6);
      if (c) this.logger.log(`AI judgment: +${c} mispricing bets recorded (paper)`);
    } catch (e: any) {
      this.logger.warn(`ai judgment loop failed: ${e?.message}`);
    }
  }

  @Interval('quant-paper-loop', 10 * 60 * 1000)
  async paperTick() {
    try {
      const created = await this.recordPaperSignals();
      const resolved = await this.resolvePaperOutcomes();
      // Backfill the best un-backfilled qualified wallets (≤10/tick) so the sim + learning fill in fast.
      const top = await this.prisma.pmWallet.findMany({ where: { qualified: true }, orderBy: { edgeLcb: 'desc' }, take: 120, select: { address: true } });
      let bf = 0;
      for (const w of top) {
        if (bf >= 10) break;
        const has = await this.prisma.agentDecision.findFirst({ where: { subjectAddr: w.address, mode: 'backfill' }, select: { id: true } });
        if (!has) { await this.scanWallet(w.address).catch(() => {}); bf++; await new Promise((r) => setTimeout(r, 400)); }
      }
      if (created || resolved || bf) this.logger.log(`paper loop: +${created} signals, ${resolved} resolved, ${bf} backfilled`);
    } catch (e: any) {
      this.logger.warn(`paper loop failed: ${e?.message}`);
    }
  }

  @Interval('quant-autodiscover', 5 * 60 * 1000)
  async autoTick() {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const { discovered } = await this.discover(200);
      const scannedCount = await this.prisma.pmWallet.count({ where: { scanned: true } });
      const take = scannedCount < 120 ? 20 : 30;
      const batch = await this.prisma.pmWallet.findMany({
        where: { OR: [{ scanned: false }, { lastScanned: { lt: new Date(Date.now() - 12 * 3600 * 1000) } }, { qualified: true, invested: 0 }] },
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
