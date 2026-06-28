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

  /** Search/list tradeable Polymarket markets (with outcome tokenIds + prices). */
  markets(query?: string) {
    return this.pm.searchMarkets(query, 30);
  }

  /**
   * Arbitrage / mispricing scanner — the REAL edge (pure Polymarket math, no wallet copying):
   *  • cross-market: NegRisk (mutually-exclusive) events whose Yes prices sum < $1 →
   *    buy every outcome's Yes, exactly one pays $1 → locked profit (after fees).
   *  • settlement-lag: a dominant near-certain outcome (≥95¢) still < $1 on a market that's
   *    ended/ending → buy the favorite, collect the gap at resolution.
   * Edges are shown AFTER a 2% fee/slippage buffer, so only genuinely profitable ones surface.
   */
  async scanArbs() {
    const FEE = 0.02;
    const now = Date.now();

    const events = await this.pm.activeEvents(150);
    const cross: any[] = [];
    for (const e of events) {
      if (!(e.negRisk || e.enableNegRisk)) continue; // mutually-exclusive sets only
      const mks = (e.markets || []).filter((m: any) => m.enableOrderBook !== false && !m.closed);
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

    const markets = await this.pm.activeMarkets(250);
    const lag: any[] = [];
    for (const m of markets) {
      if (m.enableOrderBook === false || m.closed) continue;
      let pr: number[] = [], tk: string[] = [], oc: string[] = [];
      try { pr = JSON.parse(m.outcomePrices || '[]').map(Number); } catch { continue; }
      try { tk = JSON.parse(m.clobTokenIds || '[]'); } catch { /* */ }
      try { oc = JSON.parse(m.outcomes || '[]'); } catch { /* */ }
      if (!pr.length || !tk.length) continue;
      const idx = pr.indexOf(Math.max(...pr));
      const fav = pr[idx];
      const end = m.endDate ? Date.parse(m.endDate) : NaN;
      const endingSoon = !isNaN(end) && end <= now + 24 * 3600 * 1000;
      if (fav >= 0.95 && fav < 0.999 && endingSoon) {
        const edge = (1 - fav) / fav;
        if (edge > FEE) lag.push({
          type: 'lag', title: m.question, slug: m.slug, outcome: oc[idx] || `#${idx}`,
          price: +fav.toFixed(3), tokenId: tk[idx], conditionId: m.conditionId, outcomeIndex: idx,
          edgePct: +((edge - FEE) * 100).toFixed(2), endsAt: isNaN(end) ? null : end,
        });
      }
    }

    return {
      crossMarket: cross.sort((a, b) => b.edgePct - a.edgePct).slice(0, 30),
      settlementLag: lag.sort((a, b) => b.edgePct - a.edgePct).slice(0, 30),
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
      const already = await this.prisma.agentDecision.count({ where: { subjectAddr: address, mode: 'backfill' } });
      if (already === 0 && closedPos.length) {
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
  private evCache: { at: number; table: Map<string, { mean: number; n: number }> } | null = null;
  private bucketKey(focus: string | null | undefined, price: number): string {
    const band = Math.min(9, Math.max(0, Math.floor(price * 10)));
    return `${focus || 'Mixed'}|${band}`;
  }
  async getEvTable(): Promise<Map<string, { mean: number; n: number }>> {
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
    const acc = new Map<string, { sum: number; n: number }>();
    for (const o of outs) {
      const meta: any = o.decision?.meta || {};
      const price = Number(meta.entryPrice);
      if (!(price > 0 && price < 1)) continue;
      const focus = o.decision?.subjectAddr ? focusMap.get(o.decision.subjectAddr) || 'Mixed' : 'Mixed';
      const key = this.bucketKey(focus, price);
      const a = acc.get(key) || { sum: 0, n: 0 };
      a.sum += o.roiPct || 0; a.n++;
      acc.set(key, a);
    }
    const table = new Map<string, { mean: number; n: number }>();
    for (const [k, v] of acc) table.set(k, { mean: v.sum / v.n, n: v.n });
    this.evCache = { at: Date.now(), table };
    return table;
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
    const trades = await this.pm.recentTrades(200);
    if (!trades.length) return 0;
    const addrs = [...new Set(trades.map((t) => String(t.proxyWallet || '').toLowerCase()))];
    const wallets = await this.prisma.pmWallet.findMany({ where: { address: { in: addrs }, qualified: true }, select: { address: true, marketFocus: true } });
    const focusMap = new Map(wallets.map((w) => [w.address, w.marketFocus]));
    const ev = await this.getEvTable();
    const MIN_SAMPLE = 12, EV_THRESHOLD = 2; // roiPct units (≈ fee buffer)
    // Proven PRIORS (used only where forward data is too thin to have learned yet):
    const PRIOR_BLOCK = new Set(['Mixed', 'Politics', 'Weather', 'Crypto Price']);
    const cands = trades
      .filter((t) => {
        const addr = String(t.proxyWallet || '').toLowerCase();
        const price = Number(t.price);
        if (!focusMap.has(addr)) return false; // qualified wallets only
        if (!(String(t.side).toUpperCase() === 'BUY' && price >= 0.05 && price < 0.98 && t.conditionId && t.transactionHash)) return false;
        const focus = focusMap.get(addr);
        const b = ev.get(this.bucketKey(focus, price));
        // Learned (forward) EV where we have enough real samples; otherwise fall back to the
        // proven priors (price≥0.30 + drop loss-making focuses). The model overrides the
        // prior per-bucket as out-of-sample data accumulates — learn from experience, keep a prior.
        return b && b.n >= MIN_SAMPLE ? b.mean > EV_THRESHOLD : price >= 0.30 && !PRIOR_BLOCK.has(focus || 'Mixed');
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
    let resolved = 0;
    for (const d of open) {
      const r = d.market ? res[d.market] : null;
      if (!r || !r.closed || r.winningIndex == null) continue;
      const meta: any = d.meta || {};
      const oi = Number(meta.outcomeIndex) || 0;
      const entry = Number(meta.entryPrice) || 0;
      if (entry <= 0) continue;
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
  async learningDecisions(limit = 60, sample: 'live' | 'all' = 'live') {
    const rows = await this.prisma.agentDecision.findMany({
      where: { kind: 'paper_copy', ...(sample === 'live' ? { mode: 'auto' } : {}) },
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
        side: 'BUY',
        outcomeLabel: meta.outcome ?? null,  // which side it bet (Yes/No/team)
        entryPrice: meta.entryPrice ?? null, // at what price
        title: meta.title ?? null,           // the market question (short description)
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
    const frac = Math.min(Math.max(risk, 0.005), 0.5);
    const FEE = 0.02; // per-trade fee + slippage haircut (fraction of stake)
    const modeFilter = sample === 'historical' ? { mode: 'backfill' } : { mode: { not: 'backfill' } };
    const outs = await this.prisma.agentOutcome.findMany({
      where: { decision: { kind: 'paper_copy', ...modeFilter } },
      include: { decision: { select: { meta: true } } },
      take: 5000,
    });
    const items = outs
      .map((o) => {
        const meta: any = o.decision?.meta || {};
        const ts = Number(meta.ts) ? Number(meta.ts) * 1000 : o.resolvedAt?.getTime() || 0;
        return { ts, roi: (o.roiPct || 0) / 100, win: !!o.success };
      })
      .sort((a, b) => a.ts - b.ts);
    let bal = start, peak = start, maxDD = 0, wins = 0;
    const curve: { t: number; balance: number }[] = [];
    for (const it of items) {
      const stake = bal * frac;
      bal = Math.max(0, bal + stake * it.roi - stake * FEE); // pnl minus fee/slippage
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
      riskFraction: frac,
      curve: curve.slice(-500),
      note: sample === 'historical'
        ? 'HINDSIGHT backtest — copies the wallets\' own already-won past trades. Optimistic and NOT achievable forward.'
        : 'Out-of-sample: forward copy signals logged before the market resolved. The honest test.',
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
        const has = await this.prisma.agentDecision.count({ where: { subjectAddr: w.address, mode: 'backfill' } });
        if (has === 0) { await this.scanWallet(w.address).catch(() => {}); bf++; await new Promise((r) => setTimeout(r, 400)); }
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
