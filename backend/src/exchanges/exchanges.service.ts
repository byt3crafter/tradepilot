import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { BrainService } from '../brain/brain.service';
import { CexAdapter } from './cex-adapter.interface';
import { BinanceAdapter } from './adapters/binance.adapter';

/**
 * Multi-venue crypto engine. Adapters (Binance, Bybit, …) implement one interface;
 * strategies run against it so every venue behaves the same. Isolated from Quant/Polymarket.
 */
@Injectable()
export class ExchangesService {
  private readonly logger = new Logger(ExchangesService.name);
  private readonly adapters: Record<string, CexAdapter> = {
    binance: new BinanceAdapter(),
    // bybit: new BybitAdapter(),  ← future: one file, plugs in here
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly brain: BrainService,
  ) {}

  // The crypto bot is a single shared/admin bot; its brain neurons stream to the operator
  // (first ADMIN user) so they appear on the Brain dashboard. Cached.
  private _opId: string | null = null;
  private async operatorUserId(): Promise<string | null> {
    if (this._opId) return this._opId;
    const u = await this.prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } }).catch(() => null);
    this._opId = u?.id || null;
    return this._opId;
  }

  list() {
    return { exchanges: Object.keys(this.adapters) };
  }

  // ── credentials (admin-set, AES-256-GCM) ──────────────────────────────────
  private key(): Buffer {
    const secret = process.env.AGENT_WALLET_SECRET || 'jtp-fallback-secret-change-me';
    return crypto.createHash('sha256').update(secret).digest();
  }
  private enc(s: string): string {
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv('aes-256-gcm', this.key(), iv);
    const e = Buffer.concat([c.update(s, 'utf8'), c.final()]);
    return `${iv.toString('hex')}:${c.getAuthTag().toString('hex')}:${e.toString('hex')}`;
  }
  private dec(b: string): string {
    const [iv, tag, e] = b.split(':');
    const d = crypto.createDecipheriv('aes-256-gcm', this.key(), Buffer.from(iv, 'hex'));
    d.setAuthTag(Buffer.from(tag, 'hex'));
    return Buffer.concat([d.update(Buffer.from(e, 'hex')), d.final()]).toString('utf8');
  }

  async setCredential(exchange: string, apiKey: string, apiSecret: string, testnet = true) {
    const ex = (exchange || '').toLowerCase();
    if (!this.adapters[ex]) throw new Error(`unsupported exchange: ${exchange}`);
    if (!apiKey || !apiSecret) throw new Error('apiKey and apiSecret required');
    await this.prisma.exchangeCredential.upsert({
      where: { exchange: ex },
      create: { exchange: ex, apiKey: this.enc(apiKey), apiSecret: this.enc(apiSecret), testnet },
      update: { apiKey: this.enc(apiKey), apiSecret: this.enc(apiSecret), testnet },
    });
    return this.credentialStatus();
  }

  /** Masked status for the UI/admin — never returns the secrets. */
  async credentialStatus() {
    const creds = await this.prisma.exchangeCredential.findMany();
    const map: Record<string, { configured: boolean; testnet: boolean; keyMask?: string }> = {};
    for (const ex of Object.keys(this.adapters)) map[ex] = { configured: false, testnet: true };
    for (const c of creds) {
      let mask = '••••';
      try { const k = this.dec(c.apiKey); mask = `${k.slice(0, 4)}…${k.slice(-4)}`; } catch { /* */ }
      map[c.exchange] = { configured: true, testnet: c.testnet, keyMask: mask };
    }
    return map;
  }

  /** Decrypted keys for trading (internal use by execution). */
  async getCredential(exchange: string): Promise<{ apiKey: string; apiSecret: string; testnet: boolean } | null> {
    const c = await this.prisma.exchangeCredential.findUnique({ where: { exchange: exchange.toLowerCase() } });
    if (!c) return null;
    return { apiKey: this.dec(c.apiKey), apiSecret: this.dec(c.apiSecret), testnet: c.testnet };
  }

  adapter(name = 'binance'): CexAdapter {
    return this.adapters[name] || this.adapters.binance;
  }

  /**
   * Funding-rate scanner — the first real crypto edge (delta-neutral): when funding is
   * positive, long spot + short perp earns the funding; negative → the reverse. We rank
   * LIQUID perps by annualized funding after a fee/slippage haircut.
   */
  async fundingScan(exchange = 'binance', opts?: { minVolUsd?: number; maxAbsAnnualPct?: number; minNetAnnualPct?: number }) {
    // Thresholds are CONFIGURABLE (no hard-coding) — defaults tuned to REAL, tradeable funding-arb:
    const cfg = {
      minVolUsd: opts?.minVolUsd ?? 50_000_000,        // deep liquidity — both legs must fill cheaply
      maxAbsAnnualPct: opts?.maxAbsAnnualPct ?? 100,    // exclude manipulated extremes (e.g. −953% = a broken/delisting market, not an edge)
      minNetAnnualPct: opts?.minNetAnnualPct ?? 5,      // must clear fees meaningfully
    };
    const FEE_DRAG = 6; // ~%/yr round-trip cost estimate (open+close both legs, periodically)
    let rates: any[] = [];
    try { rates = await this.adapter(exchange).getFundingRates(); } catch (e: any) {
      this.logger.warn(`fundingScan ${exchange}: ${e?.message}`);
      return { exchange, opportunities: [], config: cfg, scannedAt: Date.now(), error: 'feed unavailable' };
    }
    // Funding-arb needs a SPOT leg to hedge the perp — drop perp-only coins we can't actually hedge.
    const spotBases = new Set<string>();
    try {
      const tks: any[] = (await (this.adapter(exchange) as any).get24hrTickers?.()) || [];
      for (const t of tks) { const sym = String(t.symbol || ''); if (sym.endsWith('USDT')) spotBases.add(sym.replace(/USDT$/, '')); }
    } catch { /* spot check optional — falls back to volume+funding filters */ }
    const opps = rates
      .filter((r) => r.volume24hUsd >= cfg.minVolUsd)                    // liquid enough to execute both legs
      .filter((r) => Math.abs(r.annualizedPct) <= cfg.maxAbsAnnualPct)   // exclude broken/manipulated extremes
      .filter((r) => spotBases.size === 0 || spotBases.has(r.base))      // hedge-able (a spot market exists)
      .map((r) => {
        const positive = r.fundingRate >= 0;
        const netAnnualPct = +(Math.abs(r.annualizedPct) - FEE_DRAG).toFixed(1);
        return {
          symbol: r.symbol,
          base: r.base,
          logoUrl: `https://assets.coincap.io/assets/icons/${r.base.toLowerCase()}@2x.png`,
          fundingPct8h: +(r.fundingRate * 100).toFixed(4),
          annualizedPct: r.annualizedPct,
          netAnnualPct,
          markPrice: r.markPrice,
          volume24hUsd: Math.round(r.volume24hUsd),
          // the delta-neutral play (positive funding = the clean, easy one):
          action: positive
            ? `LONG ${r.base} spot + SHORT ${r.symbol} perp → collect funding`
            : `SHORT ${r.symbol} perp + hedge → collect funding (needs margin)`,
          side: positive ? 'cash-and-carry' : 'reverse-carry',
        };
      })
      .filter((o) => o.netAnnualPct > cfg.minNetAnnualPct)
      .sort((a, b) => b.netAnnualPct - a.netAnnualPct)
      .slice(0, 30);
    return { exchange, opportunities: opps, count: opps.length, config: cfg, scannedAt: Date.now() };
  }

  // ── PAPER LEARNING LOOP (funding strategy) — public data, no key ──────────────
  private readonly PAPER_SIZE = 100;     // $ per paper position
  private readonly FEE_RATE = 0.001;     // ~0.1% per side (entry/exit)
  private readonly HOLD_HOURS = 24;      // close after 1 day (3 funding cycles) — faster forward proof
  private readonly MAX_OPEN = 12;

  /** Open paper funding positions for the top opportunities we don't already hold. */
  async fundingPaperOpen(exchange = 'binance'): Promise<number> {
    const scan = await this.fundingScan(exchange);
    const opps = (scan.opportunities || []).filter((o: any) => o.netAnnualPct > 15); // only juicy
    const openTrades = await this.prisma.cexPaperTrade.findMany({ where: { strategy: 'funding', status: 'open' } });
    const held = new Set(openTrades.map((t) => t.symbol));
    let created = 0;
    for (const o of opps) {
      if (openTrades.length + created >= this.MAX_OPEN) break;
      if (held.has(o.symbol)) continue;
      await this.prisma.cexPaperTrade.create({
        data: {
          exchange, strategy: 'funding', symbol: o.symbol, base: o.base, sizeUsd: this.PAPER_SIZE,
          entryFundingPct: o.fundingPct8h, status: 'open',
          pnlUsd: -(this.PAPER_SIZE * this.FEE_RATE), feesUsd: this.PAPER_SIZE * this.FEE_RATE,
          meta: { action: o.action, side: o.side, entryNetAnnualPct: o.netAnnualPct },
        },
      });
      created++;
    }
    return created;
  }

  // DRIVER: the funding paper loop was never scheduled — this runs it so we get closed cycles +
  // real forward P&L (opens top opportunities, accrues funding each tick, closes after HOLD_HOURS).
  @Interval('cex-funding-paper', 30 * 60 * 1000)
  async fundingPaperLoop() {
    try {
      const opened = await this.fundingPaperOpen('binance');
      const { accrued, closed } = await this.fundingAccrue('binance');
      if (opened || closed) this.logger.log(`funding paper: +${opened} opened · ${accrued} accruing · ${closed} closed`);
    } catch (e: any) { this.logger.warn(`funding paper loop: ${e?.message}`); }
  }

  /** Accrue funding on open positions (real current rate) + close after the hold window. */
  async fundingAccrue(exchange = 'binance'): Promise<{ accrued: number; closed: number }> {
    const open = await this.prisma.cexPaperTrade.findMany({ where: { strategy: 'funding', status: 'open' } });
    if (!open.length) return { accrued: 0, closed: 0 };
    let rates: any[] = [];
    try { rates = await this.adapter(exchange).getFundingRates(); } catch { return { accrued: 0, closed: 0 }; }
    const rateMap = new Map(rates.map((r) => [r.symbol, r.fundingRate])); // fraction per 8h
    const now = Date.now();
    let accrued = 0, closed = 0;
    for (const t of open) {
      const cur = rateMap.get(t.symbol) ?? 0;
      const elapsedH = (now - t.lastAccruedAt.getTime()) / 3_600_000;
      const entrySign = Math.sign(t.entryFundingPct || 0) || 1;
      // collect funding in the entry direction; if funding flips sign, this goes negative
      const gain = t.sizeUsd * entrySign * cur * (elapsedH / 8);
      let pnl = t.pnlUsd + gain;
      const ageH = (now - t.openedAt.getTime()) / 3_600_000;
      const doClose = ageH >= this.HOLD_HOURS;
      const data: any = { pnlUsd: pnl, lastAccruedAt: new Date(now) };
      if (doClose) {
        pnl -= t.sizeUsd * this.FEE_RATE; // exit fee
        data.pnlUsd = pnl;
        data.feesUsd = t.feesUsd + t.sizeUsd * this.FEE_RATE;
        data.status = 'closed';
        data.closedAt = new Date(now);
        closed++;
      }
      await this.prisma.cexPaperTrade.update({ where: { id: t.id }, data });
      accrued++;
    }
    return { accrued, closed };
  }

  /** "What Works (Crypto)" — realized performance + learning by entry-funding band. */
  async performance(strategy = 'funding') {
    const trades = await this.prisma.cexPaperTrade.findMany({ where: { strategy }, orderBy: { openedAt: 'asc' } });
    const closed = trades.filter((t) => t.status === 'closed');
    const openT = trades.filter((t) => t.status === 'open');
    const wins = closed.filter((t) => t.pnlUsd > 0).length;
    const losses = closed.length - wins;
    const realizedPnl = closed.reduce((s, t) => s + t.pnlUsd, 0);
    const openPnl = openT.reduce((s, t) => s + t.pnlUsd, 0);
    const investedClosed = closed.reduce((s, t) => s + t.sizeUsd, 0);
    const byClose = closed.filter((t) => t.closedAt).sort((a, b) => a.closedAt!.getTime() - b.closedAt!.getTime());
    let cum = 0;
    const curve = byClose.map((t) => { cum += t.pnlUsd; return { t: t.closedAt!.getTime(), pnl: +cum.toFixed(2) }; });
    // learning: realized yield vs the entry funding rate it promised (does the headline persist?)
    const band = (p: number) => (p >= 0.05 ? '≥0.05%/8h' : p >= 0.02 ? '0.02-0.05%' : p >= 0.01 ? '0.01-0.02%' : '<0.01%');
    const buckets: Record<string, { n: number; pnl: number; size: number }> = {};
    for (const t of closed) {
      const k = band(Math.abs(t.entryFundingPct || 0));
      const b = (buckets[k] ||= { n: 0, pnl: 0, size: 0 });
      b.n++; b.pnl += t.pnlUsd; b.size += t.sizeUsd;
    }
    const byBand = Object.entries(buckets).map(([k, b]) => ({ band: k, n: b.n, realizedYieldPct: b.size ? +((b.pnl / b.size) * 100).toFixed(2) : 0 }));
    return {
      strategy,
      stats: {
        open: openT.length, resolved: closed.length, wins, losses,
        winRate: closed.length ? wins / closed.length : 0,
        realizedPnlUsd: +realizedPnl.toFixed(2),
        openPnlUsd: +openPnl.toFixed(2),
        avgRealizedYieldPct: investedClosed ? +((realizedPnl / investedClosed) * 100).toFixed(2) : 0,
      },
      curve,
      byBand,
    };
  }

  async paperTrades(strategy = 'funding', limit = 60) {
    return this.prisma.cexPaperTrade.findMany({ where: { strategy }, orderBy: { openedAt: 'desc' }, take: Math.min(limit, 200) });
  }

  // ── VOLATILITY TRACKER + MOMENTUM (public data) ───────────────────────────────
  private snapCache: { at: number; rows: any[] } | null = null;
  private async snapshot(exchange = 'binance'): Promise<any[]> {
    if (this.snapCache && Date.now() - this.snapCache.at < 60_000) return this.snapCache.rows;
    const tickers = await (this.adapter(exchange) as any).get24hrTickers();
    const rows = (tickers || [])
      .filter((t: any) => t.symbol.endsWith('USDT') && Number(t.quoteVolume) > 0)
      .map((t: any) => {
        const last = Number(t.lastPrice), hi = Number(t.highPrice), lo = Number(t.lowPrice);
        return {
          symbol: t.symbol, base: t.symbol.replace(/USDT$/, ''),
          last, changePct: Number(t.priceChangePercent),
          rangePct: lo > 0 ? +(((hi - lo) / lo) * 100).toFixed(2) : 0, // 24h high-low range = vol proxy
          volUsd: Number(t.quoteVolume),
        };
      });
    this.snapCache = { at: Date.now(), rows };
    return rows;
  }

  /** Volatility tracker — most volatile liquid coins + market regime (is vol high right now?). */
  async volatilityScan(exchange = 'binance', minVolUsd = 20_000_000) {
    const rows = (await this.snapshot(exchange)).filter((r) => r.volUsd >= minVolUsd);
    const ranges = rows.map((r) => r.rangePct).sort((a, b) => a - b);
    const median = ranges.length ? ranges[Math.floor(ranges.length / 2)] : 0;
    const movers = rows
      .map((r) => ({ ...r, volRegime: r.rangePct > median * 1.6 ? 'high' : r.rangePct < median * 0.6 ? 'low' : 'normal' }))
      .sort((a, b) => b.rangePct - a.rangePct)
      .slice(0, 30);
    return { exchange, marketMedianRangePct: +median.toFixed(2), highVolMarket: median > 6, movers, scannedAt: Date.now() };
  }

  /** Momentum scanner — strong, liquid, not blow-off uptrends (the "buy spot, ride, sell higher"). */
  async momentumScan(exchange = 'binance', minVolUsd = 30_000_000) {
    const rows = (await this.snapshot(exchange)).filter((r) => r.volUsd >= minVolUsd);
    const cands = rows
      .filter((r) => r.changePct >= 4 && r.changePct <= 30 && r.rangePct <= 40) // trending up, not parabolic
      .map((r) => ({ ...r, score: +(r.changePct + Math.log10(r.volUsd)).toFixed(2) }))
      .sort((a, b) => b.changePct - a.changePct)
      .slice(0, 20);
    return { exchange, candidates: cands, count: cands.length, scannedAt: Date.now() };
  }

  // momentum paper loop: buy the trend, exit on target / stop / time
  private readonly MOM_TARGET = 0.08;  // +8%
  private readonly MOM_STOP = 0.04;    // -4%
  private readonly MOM_HOLD_H = 48;

  async momentumPaperOpen(exchange = 'binance'): Promise<number> {
    const { candidates } = await this.momentumScan(exchange);
    const open = await this.prisma.cexPaperTrade.findMany({ where: { strategy: 'momentum', status: 'open' } });
    const held = new Set(open.map((t) => t.symbol));
    let created = 0;
    for (const c of candidates) {
      if (open.length + created >= this.MAX_OPEN) break;
      if (held.has(c.symbol) || !c.last) continue;
      await this.prisma.cexPaperTrade.create({
        data: {
          exchange, strategy: 'momentum', symbol: c.symbol, base: c.base, sizeUsd: this.PAPER_SIZE,
          status: 'open', pnlUsd: -(this.PAPER_SIZE * this.FEE_RATE), feesUsd: this.PAPER_SIZE * this.FEE_RATE,
          meta: { entryPrice: c.last, target: c.last * (1 + this.MOM_TARGET), stop: c.last * (1 - this.MOM_STOP), entryChangePct: c.changePct },
        },
      });
      created++;
    }
    return created;
  }

  async momentumManage(exchange = 'binance'): Promise<{ checked: number; closed: number }> {
    const open = await this.prisma.cexPaperTrade.findMany({ where: { strategy: 'momentum', status: 'open' } });
    if (!open.length) return { checked: 0, closed: 0 };
    const priceMap = new Map((await this.snapshot(exchange)).map((r) => [r.symbol, r.last]));
    const now = Date.now();
    let closed = 0;
    for (const t of open) {
      const meta: any = t.meta || {};
      const entry = Number(meta.entryPrice) || 0;
      const cur = priceMap.get(t.symbol) || 0;
      if (!entry || !cur) continue;
      const ageH = (now - t.openedAt.getTime()) / 3_600_000;
      const hitTarget = cur >= (meta.target || Infinity);
      const hitStop = cur <= (meta.stop || 0);
      if (hitTarget || hitStop || ageH >= this.MOM_HOLD_H) {
        const grossPnl = t.sizeUsd * (cur / entry - 1);
        const pnl = grossPnl - t.sizeUsd * this.FEE_RATE; // exit fee (entry fee already in pnlUsd)
        await this.prisma.cexPaperTrade.update({
          where: { id: t.id },
          data: { status: 'closed', closedAt: new Date(now), pnlUsd: t.pnlUsd + grossPnl - t.sizeUsd * this.FEE_RATE, feesUsd: t.feesUsd + t.sizeUsd * this.FEE_RATE, meta: { ...meta, exitPrice: cur, exitReason: hitTarget ? 'target' : hitStop ? 'stop' : 'time' } },
        });
        closed++;
      }
    }
    return { checked: open.length, closed };
  }

  @Interval('cex-momentum-open', 20 * 60 * 1000)
  async momentumOpenLoop() {
    try { const n = await this.momentumPaperOpen('binance'); if (n) this.logger.log(`cex momentum: +${n} opened`); }
    catch (e: any) { this.logger.warn(`cex momentum open: ${e?.message}`); }
  }

  @Interval('cex-momentum-manage', 10 * 60 * 1000)
  async momentumManageLoop() {
    try { const r = await this.momentumManage('binance'); if (r.closed) this.logger.log(`cex momentum: ${r.closed} closed`); }
    catch (e: any) { this.logger.warn(`cex momentum manage: ${e?.message}`); }
  }

  // ── CRYPTO AUTO BOT (autonomous testnet/live execution) ───────────────────────
  private botConfig(exchange = 'binance') {
    return this.prisma.cexBot.upsert({ where: { exchange }, create: { exchange }, update: {} });
  }

  async botStatus(exchange = 'binance') {
    const cfg = await this.botConfig(exchange);
    const trades = await this.prisma.cexBotTrade.findMany({ where: { exchange }, orderBy: { openedAt: 'desc' }, take: 200 });
    const open = trades.filter((t) => t.status === 'open');
    const closed = trades.filter((t) => t.status === 'closed');
    const wins = closed.filter((t) => (t.pnlUsd || 0) > 0).length;
    const realized = closed.reduce((s, t) => s + (t.pnlUsd || 0), 0);
    const exposure = open.reduce((s, t) => s + (t.sizeUsd || 0), 0);
    let balances: any = null;
    try { balances = await (await this.tradeAdapter(exchange)).getSpotBalances(); } catch { /* no creds */ }
    return {
      exchange, mode: cfg.mode, strategy: cfg.strategy, killSwitch: cfg.killSwitch,
      limits: { maxPerTradeUsd: cfg.maxPerTradeUsd, maxTotalUsd: cfg.maxTotalUsd },
      exposureUsd: +exposure.toFixed(2), balances,
      stats: { open: open.length, resolved: closed.length, wins, losses: closed.length - wins, winRate: closed.length ? wins / closed.length : 0, realizedPnlUsd: +realized.toFixed(2) },
    };
  }

  async botSetMode(exchange = 'binance', mode: 'off' | 'auto') {
    if (mode === 'auto') {
      const c = await this.getCredential(exchange);
      if (!c) throw new Error('Set the exchange API keys in Admin → Exchange Keys first.');
    }
    await this.prisma.cexBot.upsert({ where: { exchange }, create: { exchange, mode, killSwitch: false }, update: { mode, killSwitch: false } });
    return this.botStatus(exchange);
  }

  async botKill(exchange = 'binance') {
    await this.prisma.cexBot.upsert({ where: { exchange }, create: { exchange, mode: 'off', killSwitch: true }, update: { mode: 'off', killSwitch: true } });
    return this.botStatus(exchange);
  }

  async botSetLimits(exchange = 'binance', l: { maxPerTradeUsd?: number; maxTotalUsd?: number }) {
    const data: any = {};
    if (l.maxPerTradeUsd != null) data.maxPerTradeUsd = Math.max(5, Math.min(100000, l.maxPerTradeUsd));
    if (l.maxTotalUsd != null) data.maxTotalUsd = Math.max(5, Math.min(1000000, l.maxTotalUsd));
    await this.prisma.cexBot.upsert({ where: { exchange }, create: { exchange, ...data }, update: data });
    return this.botStatus(exchange);
  }

  async botTrades(exchange = 'binance', limit = 60) {
    return this.prisma.cexBotTrade.findMany({ where: { exchange }, orderBy: { openedAt: 'desc' }, take: Math.min(limit, 200) });
  }

  async botPerformance(exchange = 'binance') {
    const trades = await this.prisma.cexBotTrade.findMany({ where: { exchange, status: 'closed' }, orderBy: { closedAt: 'asc' } });
    let cum = 0;
    const curve = trades.filter((t) => t.closedAt).map((t) => { cum += t.pnlUsd || 0; return { t: t.closedAt!.getTime(), pnl: +cum.toFixed(2) }; });
    return { exchange, curve };
  }

  async botTick(exchange = 'binance') {
    const cfg = await this.botConfig(exchange);
    if (cfg.mode !== 'auto' || cfg.killSwitch) return;
    let a: any;
    try { a = await this.tradeAdapter(exchange); } catch { return; }
    // monitor in the ACCOUNT venue's price space (testnet/live) so entry fills + exit checks match
    let prices = new Map<string, number>();
    try { prices = await a.getSpotPrices(); } catch { prices = new Map((await this.snapshot(exchange)).map((r) => [r.symbol, r.last])); }
    const now = Date.now();
    // manage exits
    const open = await this.prisma.cexBotTrade.findMany({ where: { exchange, status: 'open' } });
    for (const t of open) {
      const cur = prices.get(t.symbol) || 0;
      const entry = t.entryPrice || 0;
      if (!cur || !entry) continue;
      const ageH = (now - t.openedAt.getTime()) / 3_600_000;
      const hitT = cur >= (t.target || Infinity), hitS = cur <= (t.stop || 0), timeUp = ageH >= this.MOM_HOLD_H;
      if (!(hitT || hitS || timeUp)) continue;
      try {
        const sell = await a.placeSpotSell(t.symbol, t.qty || 0);
        const recv = Number(sell.cummulativeQuoteQty) || cur * (t.qty || 0);
        await this.prisma.cexBotTrade.update({
          where: { id: t.id },
          data: { status: 'closed', closedAt: new Date(now), pnlUsd: +(recv - t.sizeUsd).toFixed(2), exitReason: hitT ? 'target' : hitS ? 'stop' : 'time', meta: { ...(t.meta as any), exitPrice: cur, sellRecv: recv } },
        });
        this.logger.log(`cex bot: SELL ${t.symbol} pnl $${(recv - t.sizeUsd).toFixed(2)}`);
        { const opId2 = await this.operatorUserId(); const pnl = +(recv - t.sizeUsd).toFixed(2);
          if (opId2) this.brain.publish({ userId: opId2, module: 'crypto', kind: 'learn', title: `${pnl >= 0 ? 'WON' : 'LOST'} ${t.base || t.symbol} ${pnl >= 0 ? '+' : ''}$${pnl}`, detail: `exit ${hitT ? 'target' : hitS ? 'stop' : 'time'} @ ${cur}`, data: { symbol: t.symbol, pnlUsd: pnl, won: pnl >= 0, exit: hitT ? 'target' : hitS ? 'stop' : 'time' } }); }
      } catch (e: any) {
        await this.prisma.cexBotTrade.update({ where: { id: t.id }, data: { error: String(e?.message || e).slice(0, 200) } });
      }
    }
    // new entries
    const openNow = await this.prisma.cexBotTrade.findMany({ where: { exchange, status: 'open' } });
    let exposure = openNow.reduce((s, t) => s + (t.sizeUsd || 0), 0);
    if (exposure >= cfg.maxTotalUsd) return;
    const held = new Set(openNow.map((t) => t.symbol));
    const { candidates } = await this.momentumScan(exchange);
    const opId = await this.operatorUserId();
    if (opId) this.brain.publish({ userId: opId, module: 'crypto', kind: 'tick', title: `Crypto scan · ${candidates.length} momentum candidates`, detail: `${exchange} · held ${held.size} · exposure $${exposure.toFixed(0)}`, data: { candidates: candidates.length, held: held.size, exposure } });
    for (const c of candidates) {
      if (exposure >= cfg.maxTotalUsd) break;
      if (held.has(c.symbol)) continue;
      const size = Math.min(cfg.maxPerTradeUsd, cfg.maxTotalUsd - exposure);
      if (size < 5) break;
      try {
        const order = await a.placeSpotMarketByQuote(c.symbol, 'BUY', size);
        const execQty = Number(order.executedQty) || 0;
        const quote = Number(order.cummulativeQuoteQty) || size;
        const avg = execQty ? quote / execQty : c.last;
        await this.prisma.cexBotTrade.create({
          data: { exchange, strategy: 'momentum', symbol: c.symbol, base: c.base, side: 'BUY', sizeUsd: size, entryPrice: avg, qty: execQty, orderId: String(order.orderId || ''), status: 'open', target: avg * (1 + this.MOM_TARGET), stop: avg * (1 - this.MOM_STOP), meta: { entryChangePct: c.changePct } },
        });
        exposure += size;
        this.logger.log(`cex bot: BUY ${c.symbol} $${size} @ ${avg}`);
        if (opId) this.brain.publish({ userId: opId, module: 'crypto', kind: 'execute', title: `BUY ${c.base} $${size}`, detail: `momentum +${c.changePct?.toFixed?.(1) ?? '?'}% 24h @ ${avg}`, data: { symbol: c.symbol, base: c.base, sizeUsd: size, entryPrice: avg } });
      } catch (e: any) {
        await this.prisma.cexBotTrade.create({ data: { exchange, strategy: 'momentum', symbol: c.symbol, base: c.base, sizeUsd: size, entryPrice: c.last, status: 'failed', error: String(e?.message || e).slice(0, 200) } });
      }
    }
  }

  @Interval('cex-bot', 5 * 60 * 1000)
  async botLoop() {
    try { await this.botTick('binance'); }
    catch (e: any) {
      this.logger.warn(`cex bot loop: ${e?.message}`);
      const op = await this.operatorUserId();
      if (op) this.brain.error({ userId: op, module: 'crypto', title: 'Crypto bot tick error', detail: String(e?.message || e).slice(0, 200), data: {} });
    }
  }

  // ── live/testnet execution (needs stored credentials) ─────────────────────────
  private async tradeAdapter(exchange = 'binance'): Promise<BinanceAdapter> {
    const c = await this.getCredential(exchange);
    if (!c) throw new Error(`No API keys set for ${exchange} — add them in Admin → Exchange Keys.`);
    if (exchange.toLowerCase() === 'binance') return new BinanceAdapter(c);
    throw new Error(`trading not implemented for ${exchange}`);
  }

  /** Connection test — lists SPOT balances (the testnet key is a Spot key). */
  async testConnection(exchange = 'binance') {
    const c = await this.getCredential(exchange);
    const a = await this.tradeAdapter(exchange);
    const balances = await (a as any).getSpotBalances();
    return { ok: true, exchange, testnet: c?.testnet, market: 'spot', balances };
  }

  /** Tiny test order (maiden voyage) — SPOT market BUY ~$usd of a symbol. */
  async testTrade(exchange = 'binance', symbol = 'BTCUSDT', usd = 20) {
    const a: any = await this.tradeAdapter(exchange);
    const order = await a.placeSpotMarketByQuote(symbol, 'BUY', usd);
    return { ok: true, symbol, usd, market: 'spot', order };
  }

  @Interval('cex-funding-open', 30 * 60 * 1000)
  async fundingOpenLoop() {
    try { const n = await this.fundingPaperOpen('binance'); if (n) this.logger.log(`cex funding paper: +${n} opened`); }
    catch (e: any) { this.logger.warn(`cex funding open: ${e?.message}`); }
  }

  @Interval('cex-funding-accrue', 60 * 60 * 1000)
  async fundingAccrueLoop() {
    try { const r = await this.fundingAccrue('binance'); if (r.accrued) this.logger.log(`cex funding accrue: ${r.accrued} (${r.closed} closed)`); }
    catch (e: any) { this.logger.warn(`cex funding accrue: ${e?.message}`); }
  }
}
