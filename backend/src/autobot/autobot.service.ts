import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import * as crypto from 'crypto';
import { ethers } from 'ethers';
import { PrismaService } from '../prisma/prisma.service';
import { QuantService } from '../quant/quant.service';
import { BrainService } from '../brain/brain.service';
import { ChatgptService } from '../chatgpt/chatgpt.service';

// polygon-rpc.com now 401s; publicnode is a reliable keyless default.
const POLYGON_RPC = process.env.POLYGON_RPC || 'https://polygon-bor-rpc.publicnode.com';
const USDCE = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'; // USDC.e (Polymarket collateral)
const ERC20 = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
];
// Polymarket exchange contracts (Polygon) — USDC.e must be approved for these to BUY.
const CTF_EXCHANGE = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E';
const NEG_RISK_EXCHANGE = '0xC5d563A36AE78145C45a50134d48A1215220f80a';
const NEG_RISK_ADAPTER = '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296';

/**
 * Autonomous Polymarket bot. Trades from an ISOLATED per-user wallet (server-signed) so the
 * blast radius is capped to that wallet's balance — the user's main wallet is never touched.
 * Hard limits (per-trade, total exposure, daily-loss) + kill switch + default OFF.
 */
@Injectable()
export class AutobotService {
  private readonly logger = new Logger(AutobotService.name);
  private readonly provider = new ethers.JsonRpcProvider(POLYGON_RPC, 137);

  constructor(
    private readonly prisma: PrismaService,
    private readonly quant: QuantService,
    private readonly brain: BrainService,
    private readonly chatgpt: ChatgptService,
  ) {}

  private verdictCache = new Map<string, { v: any; t: number }>(); // per-market verdict cache (1h)
  private codexHour = { n: 0, start: 0 };                            // hourly Codex-call throttle
  private readonly CODEX_MAX_PER_HOUR = 20;

  // ── per-wallet async mutex ──────────────────────────────────────────────────
  // Every money-critical section (place/close) for a given userId runs strictly one-at-a-time.
  // This is the single root-cause fix for the bug cluster: it removes the TOCTOU window between
  // "read balance/exposure" and "place order" by serialising all order-placing per wallet.
  private locks = new Map<string, Promise<unknown>>();
  private withWalletLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(userId) ?? Promise.resolve();
    // chain after the previous holder settles (resolve OR reject — a failure must not jam the queue)
    const run = prev.then(() => fn(), () => fn());
    const tail = run.then(() => undefined, () => undefined); // swallowed tail keeps the chain alive
    this.locks.set(userId, tail);
    // best-effort cleanup so the map doesn't grow unbounded once a wallet is idle
    tail.finally(() => { if (this.locks.get(userId) === tail) this.locks.delete(userId); });
    return run;
  }

  /** Re-read the wallet row from the DB (defeats stale in-memory snapshots for mode/killSwitch/
   * daily counters/deposits). Carries over an in-memory apiCreds if the DB hasn't caught up. */
  private async freshWallet(w: any): Promise<any> {
    const fresh = await this.prisma.pmAgentWallet.findUnique({ where: { id: w.id } });
    if (!fresh) return w;
    if (w.apiCreds && !fresh.apiCreds) fresh.apiCreds = w.apiCreds;
    return fresh;
  }

  /** Phase-2 brain: recall past lessons + a Codex verdict on the top candidate. Best-effort —
   * if ChatGPT isn't connected/allowed or errors, returns null and the bot falls back to rules.
   * Token-frugal: caches each market's verdict for 1h + caps Codex calls per hour. */
  private async aiReason(w: any, pick: any): Promise<{ take: boolean; conviction: number; rationale?: string } | null> {
    try {
      if (!(await this.chatgpt.isAllowed(w.userId, 'bot'))) return null;
      const key = String(pick.conditionId || pick.tokenId || pick.title || '');
      // 1) cache — never pay to re-research the same market within an hour
      const cached = this.verdictCache.get(key);
      if (cached && Date.now() - cached.t < 3_600_000) {
        this.brain.publish({ userId: w.userId, module: 'polymarket', kind: 'recall', title: `Cached verdict · ${cached.v.take ? 'TAKE' : 'SKIP'} (${(cached.v.conviction * 100).toFixed(0)}%)`, detail: `${pick.outcome} — reused, no token spend`, data: cached.v });
        return cached.v;
      }
      // 2) throttle — cap Codex calls/hour so cost stays tiny
      const now = Date.now();
      if (now - this.codexHour.start > 3_600_000) this.codexHour = { n: 0, start: now };
      if (this.codexHour.n >= this.CODEX_MAX_PER_HOUR) {
        this.brain.publish({ userId: w.userId, module: 'polymarket', kind: 'note', title: 'Reasoning throttled — saving tokens', detail: `hit ${this.CODEX_MAX_PER_HOUR}/hr cap; deciding on rules this cycle`, data: {} });
        return null;
      }
      this.codexHour.n++;
      const lessons = await this.prisma.brainEvent.findMany({
        where: { userId: w.userId, module: 'polymarket', kind: 'learn' }, orderBy: { createdAt: 'desc' }, take: 8,
      });
      this.brain.publish({
        userId: w.userId, module: 'polymarket', kind: 'recall',
        title: `Recalled ${lessons.length} past lesson${lessons.length === 1 ? '' : 's'}`,
        detail: lessons[0]?.title || 'no prior lessons yet — learning from scratch',
        data: { count: lessons.length },
      });
      const lessonTxt = lessons.map((l) => `- ${l.title}: ${l.detail || ''}`).join('\n') || '(none yet)';
      const instr = 'You are a disciplined prediction-market trader. Judge ONE candidate trade using the rationale + your past lessons. Be selective — skip weak/uncertain edges. Reply STRICT JSON only: {"take":boolean,"conviction":0..1,"rationale":"one sentence"}.';
      const input = `Candidate: ${pick.title}\nBuy ${pick.outcome} @ ${(((pick.price) || 0) * 100).toFixed(0)}¢ · claimed edge ${pick.edgePct ?? '?'}% · signal ${pick.type}\nWhy: ${pick.reason || pick.detail || ''}\nPast lessons:\n${lessonTxt}\nJSON only.`;
      const out = await this.chatgpt.complete(w.userId, instr, input);
      const m = out.match(/\{[\s\S]*\}/);
      const v = m ? JSON.parse(m[0]) : null;
      if (!v) return null;
      const conviction = Math.max(0, Math.min(1, Number(v.conviction) || 0));
      this.brain.publish({
        userId: w.userId, module: 'polymarket', kind: 'research',
        title: `AI verdict: ${v.take ? 'TAKE' : 'SKIP'} · conviction ${(conviction * 100).toFixed(0)}%`,
        detail: v.rationale, data: { take: !!v.take, conviction, rationale: v.rationale, title: pick.title },
      });
      const result = { take: !!v.take, conviction, rationale: v.rationale };
      this.verdictCache.set(key, { v: result, t: Date.now() });
      return result;
    } catch {
      return null;
    }
  }

  // ── key encryption (AES-256-GCM) ──────────────────────────────────────────
  private key(): Buffer {
    const secret = process.env.AGENT_WALLET_SECRET;
    if (!secret || secret.length < 16) throw new Error('AGENT_WALLET_SECRET not configured');
    return crypto.createHash('sha256').update(secret).digest();
  }
  private encrypt(plain: string): string {
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv('aes-256-gcm', this.key(), iv);
    const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
    const tag = c.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
  }
  private decrypt(blob: string): string {
    const [ivh, tagh, ench] = blob.split(':');
    const d = crypto.createDecipheriv('aes-256-gcm', this.key(), Buffer.from(ivh, 'hex'));
    d.setAuthTag(Buffer.from(tagh, 'hex'));
    return Buffer.concat([d.update(Buffer.from(ench, 'hex')), d.final()]).toString('utf8');
  }

  // ── wallet lifecycle ──────────────────────────────────────────────────────
  async getOrCreate(userId: string) {
    let w = await this.prisma.pmAgentWallet.findUnique({ where: { userId } });
    if (!w) {
      const wallet = ethers.Wallet.createRandom();
      w = await this.prisma.pmAgentWallet.create({
        data: { userId, address: wallet.address.toLowerCase(), encPrivKey: this.encrypt(wallet.privateKey) },
      });
      this.logger.log(`created bot wallet ${w.address} for ${userId}`);
    }
    return w;
  }

  private signer(encPrivKey: string): ethers.Wallet {
    return new ethers.Wallet(this.decrypt(encPrivKey), this.provider);
  }

  // ── strategy toggles + per-strategy rating ────────────────────────────────
  private strategiesOf(w: any): { copy: boolean; ai: boolean; arb: boolean } {
    const s = (w?.strategies as any) || {};
    return { copy: s.copy !== false, ai: s.ai !== false, arb: s.arb !== false }; // default all on
  }

  /** Per-strategy scorecard from resolved trades — so the user can RATE what works. */
  private rateStrategies(trades: any[]) {
    const out: Record<string, { trades: number; resolved: number; wins: number; winRate: number; pnlUsd: number }> = {
      copy: { trades: 0, resolved: 0, wins: 0, winRate: 0, pnlUsd: 0 },
      ai: { trades: 0, resolved: 0, wins: 0, winRate: 0, pnlUsd: 0 },
      arb: { trades: 0, resolved: 0, wins: 0, winRate: 0, pnlUsd: 0 },
    };
    for (const t of trades) {
      const k = (t.signalType || '').toLowerCase();
      if (!out[k]) continue;
      out[k].trades++;
      if (t.status === 'resolved') {
        out[k].resolved++;
        if ((t.pnlUsd || 0) > 0) out[k].wins++;
        out[k].pnlUsd += t.pnlUsd || 0;
      }
    }
    for (const k of Object.keys(out)) { const r = out[k]; r.winRate = r.resolved ? r.wins / r.resolved : 0; r.pnlUsd = +r.pnlUsd.toFixed(2); }
    return out;
  }

  async setStrategies(userId: string, s: { copy?: boolean; ai?: boolean; arb?: boolean }) {
    const w = await this.getOrCreate(userId);
    const cur = this.strategiesOf(w);
    const next = { copy: s.copy ?? cur.copy, ai: s.ai ?? cur.ai, arb: s.arb ?? cur.arb };
    await this.prisma.pmAgentWallet.update({ where: { userId }, data: { strategies: next } });
    return this.status(userId);
  }

  /** Arb thresholds the user sets themselves (no hard-coding). Merged with existing + defaults. */
  arbConfigOf(w: any) {
    const c = (w?.arbConfig as any) || {};
    return {
      safeMinPrice: c.safeMinPrice ?? 0.95, safeMaxHrs: c.safeMaxHrs ?? 24,
      immMinPrice: c.immMinPrice ?? 0.90, immMaxHrs: c.immMaxHrs ?? 6,
      minEdgePct: c.minEdgePct ?? 0,
    };
  }

  async setArbConfig(userId: string, cfg: any) {
    const w = await this.getOrCreate(userId);
    const num = (v: any, lo: number, hi: number) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : undefined; };
    const clean: any = {};
    if (cfg.safeMinPrice != null) clean.safeMinPrice = num(cfg.safeMinPrice, 0.5, 0.999);
    if (cfg.safeMaxHrs != null) clean.safeMaxHrs = num(cfg.safeMaxHrs, 0.5, 720);
    if (cfg.immMinPrice != null) clean.immMinPrice = num(cfg.immMinPrice, 0.5, 0.999);
    if (cfg.immMaxHrs != null) clean.immMaxHrs = num(cfg.immMaxHrs, 0.25, 168);
    if (cfg.minEdgePct != null) clean.minEdgePct = num(cfg.minEdgePct, 0, 50);
    const merged = { ...((w.arbConfig as any) || {}), ...clean };
    await this.prisma.pmAgentWallet.update({ where: { userId }, data: { arbConfig: merged } });
    return this.status(userId);
  }

  /** Live arb opportunities (user's thresholds) enriched with EdgeScore — for the manual quick list.
   * `smartMoney` = a qualified top wallet is ALSO buying this market (strategy confirmation). */
  async opportunities(userId: string) {
    const w = await this.getOrCreate(userId);
    const scan = await this.quant.scanArbs(this.arbConfigOf(w));
    const lag = scan.settlementLag || [];
    let smart = new Set<string>();
    try {
      const copy = await this.quant.copySignals();
      smart = new Set((copy || []).map((c: any) => c.conditionId).filter(Boolean));
    } catch { /* edgescore optional */ }
    const enriched = lag.map((o: any) => ({ ...o, smartMoney: smart.has(o.conditionId) }));
    return { settlementLag: enriched, crossMarket: scan.crossMarket || [], scannedAt: scan.scannedAt };
  }

  /** On-demand AI verdict for ONE opportunity (button-triggered). Cached 1h + throttled = token-safe.
   * Returns the AI's read on the outcome so the user can decide before manually trading. */
  async assess(userId: string, body: { tokenId?: string; conditionId?: string; title?: string; outcome?: string; price?: number; edgePct?: number; detail?: string; type?: string }) {
    const w = await this.getOrCreate(userId);
    const pick = {
      tokenId: body.tokenId, conditionId: body.conditionId, title: body.title || '', outcome: body.outcome || '',
      price: body.price || 0, edgePct: body.edgePct ?? 0, type: body.type || 'arb', detail: body.detail || '',
    };
    const ai = await this.aiReason(w, pick);
    return { ai: ai || { take: null, conviction: null, rationale: 'AI not connected or not allowed for the bot.' } };
  }

  /** AI Copilot — answers questions about the bot, GROUNDED in the user's real data (trades, brain,
   * positions, P&L, what-works). Read-only; one AI call per question (user-initiated). */
  async copilot(userId: string, question: string): Promise<{ answer: string }> {
    const q = String(question || '').trim();
    if (q.length < 2) throw new BadRequestException('Ask a question.');
    if (!(await this.chatgpt.isAllowed(userId, 'bot'))) return { answer: 'Connect your ChatGPT/AI in Settings to use the copilot.' };
    const [status, perf, brain, policy] = await Promise.all([
      this.status(userId),
      this.performance(userId),
      this.prisma.brainEvent.findMany({ where: { userId, module: 'polymarket' }, orderBy: { createdAt: 'desc' }, take: 30, select: { kind: true, title: true, detail: true } }),
      this.quant.learnedPolicy().catch(() => [] as any[]),
    ]);
    const ctx = {
      money: { totalPnl: status.totalPnlUsd, portfolio: status.portfolioValue, cash: status.tradeableUsdce, unrealizedPnl: status.unrealizedPnlUsd, realizedPnl: status.stats.realizedPnlUsd, deposits: status.netDepositsUsd },
      limits: status.limits, strategies: status.strategies, strategyStats: status.strategyStats,
      whatWorks: (policy as any[]).slice(0, 12),
      openPositions: (perf.open || []).map((o: any) => ({ title: o.title, outcome: o.outcome, priceCents: Math.round((o.price || 0) * 100), pnlUsd: o.pnlUsd, valueUsd: o.value, resolvesMs: o.endDate })),
      recentActivity: (perf.history || []).slice(0, 25).map((t: any) => ({ type: t.type, side: t.side, title: t.title, outcome: t.outcome, priceCents: Math.round((t.price || 0) * 100), usd: t.usdcSize, tsMs: t.ts })),
      brainEvents: brain.map((b) => ({ kind: b.kind, title: b.title, detail: b.detail })),
    };
    const instr = 'You are the trading bot\'s Copilot. The bot trades Polymarket prediction markets (sports/politics/etc.) by copying top wallets + AI judgment + arbitrage. Answer the user\'s question ONLY from the JSON data about THEIR bot below. Be specific: cite prices in ¢, outcomes (Yes/No/Over/Under/team), reasons, and $ P&L. If the answer is not in the data, say so plainly. Honest, concise, no hype. End nothing with financial advice — this is informational.';
    const input = `QUESTION: ${q}\n\nBOT DATA (JSON):\n${JSON.stringify(ctx)}`;
    try {
      const answer = await this.chatgpt.complete(userId, instr, input);
      return { answer: answer || 'No answer.' };
    } catch (e: any) {
      return { answer: `Couldn't reach the AI right now (${String(e?.message || e).slice(0, 80)}).` };
    }
  }

  /** Sell a single open position NOW (exit on your terms). Market sell, floored at mark −5¢ so it
   * fills without dumping. Books the realized P&L on the matching trade + a learn neuron. */
  async closePosition(userId: string, tokenId: string) {
    const w0 = await this.getOrCreate(userId);
    if (!tokenId) throw new BadRequestException('Missing position.');
    // Serialise every close/place for this wallet so two concurrent closes can't both sell (M5/M10).
    return this.withWalletLock(userId, async () => {
      const w = await this.freshWallet(w0);
      const funder = (w.funderAddress || process.env.PM_BOT_FUNDER || '').trim();
      // RE-READ the LIVE position size inside the lock (force-fresh — this fetch is uncached).
      let pos: any = null;
      try {
        const r = await fetch(`https://data-api.polymarket.com/positions?user=${funder}`, { headers: { 'User-Agent': 'JTradePilot/1.0' } } as any);
        const arr: any = await r.json();
        pos = (Array.isArray(arr) ? arr : []).find((p: any) => String(p.asset) === String(tokenId));
      } catch { /* */ }
      const shares = Number(pos?.size) || 0;
      if (!pos || shares <= 0) {
        // IDEMPOTENT: nothing live to sell (already closed/settled by a prior call or resolution).
        // Make sure no filled rows are left orphaned — resolve any stragglers at $0 proceeds (M10).
        await this.prisma.agentTrade.updateMany({ where: { userId, tokenId, status: 'filled' }, data: { status: 'resolved', resolvedAt: new Date(), detail: 'closed (no live shares)' } });
        return { ok: true, filled: false, proceeds: 0, alreadyClosed: true };
      }
      const mark = Number(pos.curPrice) || Number(pos.avgPrice) || 0.5;
      const res = await this.placeOrder(w, tokenId, mark, shares, 'SELL');
      if (!res.filled) throw new BadRequestException(`Sell not filled (status ${res.status}) — book may be thin, try again or wait for settlement.`);
      // Book proceeds from the ACTUAL executed price/shares; fall back to the capped sell price
      // (mark−5¢), NEVER the optimistic full mark (M9/M17).
      const soldShares = res.filledShares && res.filledShares > 0 ? res.filledShares : shares;
      const execPrice = res.avgPrice && res.avgPrice > 0 ? res.avgPrice : (res.cap ?? mark);
      const proceeds = res.filledUsd && res.filledUsd > 0 ? +res.filledUsd.toFixed(2) : +(soldShares * execPrice).toFixed(2);
      // Book against the SUM of ALL matching filled rows' cost (not just the latest) so partial /
      // multi-fill entries reconcile, and resolve them atomically to prevent a double-sell (M5/M10).
      const rows = await this.prisma.agentTrade.findMany({ where: { userId, tokenId, status: 'filled' } });
      const totalCost = rows.reduce((s, t) => s + (t.sizeUsd || 0), 0);
      const pnl = +(proceeds - totalCost).toFixed(2);
      const now = new Date();
      for (const tr of rows) {
        const share = totalCost > 0 ? (tr.sizeUsd || 0) / totalCost : (rows.length ? 1 / rows.length : 1);
        const rowPnl = +((proceeds * share) - (tr.sizeUsd || 0)).toFixed(2);
        await this.prisma.agentTrade.update({ where: { id: tr.id }, data: { status: 'resolved', pnlUsd: rowPnl, roiPct: tr.sizeUsd ? +((rowPnl / tr.sizeUsd) * 100).toFixed(1) : null, resolvedAt: now, detail: 'closed manually' } });
      }
      // Realized P&L from manual closes feeds the daily breaker so manual losses count (M4/M11).
      if (rows.length) await this.prisma.pmAgentWallet.update({ where: { id: w.id }, data: { dailyPnlUsd: { increment: pnl } } }).catch(() => {});
      if (rows.length) this.brain.publish({ userId, module: 'polymarket', kind: 'learn', title: `Closed ${rows[0].outcome} ${pnl >= 0 ? '+' : ''}$${pnl}`, detail: `Manual exit @ ~${Math.round(execPrice * 100)}¢ — booked $${pnl}`, data: { pnl, proceeds, manual: true } });
      this.collCache.delete(w.userId); this.posCache.delete(funder); // force fresh balances next read
      return { ok: true, filled: true, proceeds };
    });
  }

  /** Sell EVERY open position now. Returns per-position results (some may fail on thin books). */
  async closeAll(userId: string) {
    const w = await this.getOrCreate(userId);
    const funder = (w.funderAddress || process.env.PM_BOT_FUNDER || '').trim();
    let arr: any[] = [];
    try {
      const r = await fetch(`https://data-api.polymarket.com/positions?user=${funder}`, { headers: { 'User-Agent': 'JTradePilot/1.0' } } as any);
      const d: any = await r.json(); arr = Array.isArray(d) ? d : [];
    } catch { /* */ }
    const results: any[] = [];
    // Each closePosition() takes the per-wallet lock and re-reads the LIVE size itself, so this
    // outer snapshot can be stale without harm and we must NOT hold the lock here (re-entrant
    // deadlock) — locking is delegated per position, which also serialises the sells (M5/M10).
    for (const p of arr) {
      if (!(Number(p.size) > 0)) continue;
      try { const r = await this.closePosition(userId, String(p.asset)); results.push({ tokenId: p.asset, ...r }); }
      catch (e: any) { results.push({ tokenId: p.asset, ok: false, error: String(e?.message || e).slice(0, 120) }); }
    }
    return { closed: results.filter((r) => r.ok).length, total: results.length, results };
  }

  /** Manually place ONE trade from the quick list. Enforces every limit — refuses if cap/cash reached. */
  async manualTrade(userId: string, body: { tokenId: string; conditionId?: string; price: number; outcome?: string; outcomeIndex?: number; sizeUsd?: number; title?: string; type?: string }) {
    const w0 = await this.getOrCreate(userId);
    if (!body.tokenId || !(body.price > 0)) throw new BadRequestException('Invalid order.');
    // Serialise with every other order-placing section for this wallet (M1/M8 TOCTOU).
    return this.withWalletLock(userId, async () => {
      // RE-READ everything fresh inside the lock — no stale snapshots (M3/M4/M11).
      const w = await this.freshWallet(w0);
      if (w.killSwitch) throw new BadRequestException('Kill switch is on — re-enable the bot first.');
      // Manual activity must respect (and later feed) the daily breakers (M4/M11).
      if (w.dailyPnlUsd <= -Math.abs(w.dailyLossLimitUsd)) throw new BadRequestException(`Daily loss limit ($${w.dailyLossLimitUsd}) hit — paused for today.`);
      const bal = await this.tradeable(w, true); // force-fresh cash (bypass 5s cache)
      if (w.maxDrawdownUsd > 0 && w.netDepositsUsd > 0) {
        const funderAddr = (w.funderAddress || process.env.PM_BOT_FUNDER || '').trim();
        const mtm = await this.positionsMtm(funderAddr);
        const totalPnl = (bal.usdce + mtm.value) - w.netDepositsUsd;
        if (totalPnl <= -Math.abs(w.maxDrawdownUsd)) throw new BadRequestException(`Max drawdown (−$${w.maxDrawdownUsd}) hit — bot halted; close positions or raise the limit.`);
      }
      const open = await this.prisma.agentTrade.findMany({ where: { userId, status: 'filled' } });
      const exposure = open.reduce((s, t) => s + (t.sizeUsd || 0), 0);
      if (exposure >= w.maxTotalUsd) throw new BadRequestException(`Max-total exposure ($${w.maxTotalUsd}) reached — raise the limit or wait for positions to settle.`);
      // Room is the binding cap. NO Math.max(1,…) floor — that floor used to bypass the caps and
      // overspend; instead clamp the requested size to room and reject outright when room < 1 (M1/M8).
      const room = Math.min(w.maxPerTradeUsd, w.maxTotalUsd - exposure, bal.usdce);
      if (bal.usdce < 1 || room < 1) throw new BadRequestException(`Not enough room (available $${bal.usdce.toFixed(2)}, cap room $${Math.max(0, room).toFixed(2)}).`);
      const sizeUsd = Math.floor(Math.min(body.sizeUsd || w.maxPerTradeUsd, room) * 100) / 100;
      if (sizeUsd < 1) throw new BadRequestException(`Order too small after caps (size $${sizeUsd.toFixed(2)}).`);
      const trade = await this.prisma.agentTrade.create({
        data: { userId, market: body.conditionId || '', tokenId: body.tokenId, outcome: body.outcome || '', outcomeIndex: body.outcomeIndex ?? null, title: body.title || '', side: 'BUY', sizeUsd, price: body.price, signalType: body.type || 'arb', detail: 'manual', status: 'pending' },
      });
      try {
        const res = await this.placeOrder(w, body.tokenId, body.price, sizeUsd);
        if (res.filled) {
          const execPrice = res.avgPrice && res.avgPrice > 0 ? +res.avgPrice.toFixed(4) : body.price;
          // Persist the ACTUAL executed price so resolution books P&L on truth, not the signal price (M9).
          await this.prisma.agentTrade.update({ where: { id: trade.id }, data: { status: 'filled', orderId: res.orderId, price: execPrice } });
          // Manual fills now count toward the daily-spend breaker (M11).
          await this.prisma.pmAgentWallet.update({ where: { id: w.id }, data: { dailySpentUsd: { increment: sizeUsd } } }).catch(() => {});
          this.brain.publish({ userId, module: 'polymarket', kind: 'execute', title: `MANUAL · ${body.outcome} $${sizeUsd}`, detail: `Manual arb @ ${Math.round(execPrice * 100)}¢`, data: { title: body.title, sizeUsd, price: execPrice, orderId: res.orderId, manual: true } });
        } else {
          await this.prisma.agentTrade.update({ where: { id: trade.id }, data: { status: 'unfilled', orderId: res.orderId, error: `status=${res.status}` } });
        }
        return { ok: true, filled: res.filled, status: res.status };
      } catch (e: any) {
        await this.prisma.agentTrade.update({ where: { id: trade.id }, data: { status: 'failed', error: String(e?.message || e).slice(0, 300) } });
        this.brain.error({ userId, module: 'polymarket', title: `Manual order FAILED · ${body.outcome}`, detail: String(e?.message || e).slice(0, 200), data: {} });
        throw new BadRequestException(`Order failed: ${String(e?.message || e).slice(0, 160)}`);
      }
    });
  }

  private async balances(address: string): Promise<{ usdce: number; pol: number }> {
    try {
      const usdc = new ethers.Contract(USDCE, ERC20, this.provider);
      const [bal, pol] = await Promise.all([usdc.balanceOf(address), this.provider.getBalance(address)]);
      return { usdce: Number(ethers.formatUnits(bal, 6)), pol: Number(ethers.formatEther(pol)) };
    } catch {
      return { usdce: 0, pol: 0 };
    }
  }

  private collCache = new Map<string, { v: number; t: number }>();
  /** Real tradeable USDC bankroll. When linked, the deposit wallet's funds live INSIDE Polymarket's
   * CLOB (not as an on-chain token — the proxy shows 0 on-chain), so read the internal COLLATERAL
   * balance via getBalanceAllowance. Else the EOA's on-chain balance. Cached 30s (status polls). */
  private async tradeable(w: any, force = false): Promise<{ usdce: number; pol: number }> {
    const funder = (w.funderAddress || process.env.PM_BOT_FUNDER || '').trim();
    if (!funder) return this.balances(w.address); // EOA path is always a live on-chain read
    const c = this.collCache.get(w.userId);
    // `force` bypasses the 5s cache for the money-critical read taken inside the wallet lock.
    if (!force && c && Date.now() - c.t < 5000) return { usdce: c.v, pol: 999 };
    try {
      const wallet = this.signer(w.encPrivKey);
      const clobMod: any = await import('@polymarket/clob-client-v2');
      const { ClobClient, SignatureTypeV2, Chain, AssetType } = clobMod;
      const clobSigner: any = {
        getAddress: () => wallet.getAddress(),
        _signTypedData: (d: any, t: any, v: any) => wallet.signTypedData(d, t, v),
        signMessage: (m: any) => wallet.signMessage(m),
        provider: wallet.provider,
      };
      const baseOpts: any = { host: 'https://clob.polymarket.com', chain: Chain.POLYGON, signer: clobSigner, signatureType: SignatureTypeV2.POLY_1271, funderAddress: funder };
      let creds = w.apiCreds;
      if (!creds) {
        creds = await new ClobClient(baseOpts).createOrDeriveApiKey();
        await this.prisma.pmAgentWallet.update({ where: { id: w.id }, data: { apiCreds: creds } });
        w.apiCreds = creds;
      }
      const client = new ClobClient({ ...baseOpts, creds });
      const r = await client.getBalanceAllowance({ asset_type: AssetType.COLLATERAL });
      const v = Number(r?.balance || 0) / 1e6;
      this.collCache.set(w.userId, { v, t: Date.now() });
      return { usdce: v, pol: 999 };
    } catch (e: any) {
      this.logger.warn(`autobot collateral read failed: ${e?.message}`);
      return { usdce: c?.v ?? 0, pol: 999 };
    }
  }

  private posCache = new Map<string, { v: any; t: number }>();
  /** Live mark-to-market of open positions held in the deposit wallet (Polymarket data-api),
   * so the app shows the SAME portfolio value + unrealized P&L Polymarket shows — not just
   * resolved P&L. Cached 30s. */
  private async positionsMtm(funder: string): Promise<{ value: number; unrealizedPnl: number; count: number }> {
    if (!funder) return { value: 0, unrealizedPnl: 0, count: 0 };
    const c = this.posCache.get(funder);
    if (c && Date.now() - c.t < 5000) return c.v;
    try {
      const r = await fetch(`https://data-api.polymarket.com/positions?user=${funder}`, { headers: { 'User-Agent': 'JTradePilot/1.0' } } as any);
      const d: any = await r.json();
      const arr = Array.isArray(d) ? d : [];
      // Only LIVE positions (currentValue > 1¢) count as "open/unrealized". Worthless settled
      // losers (currentValue ≈ 0) are realized losses — counting them as unrealized is what made
      // the two tabs disagree. Their loss flows into realized via (total − unrealized).
      const live = arr.filter((p: any) => Number(p.currentValue) > 0.01);
      const value = live.reduce((s: number, p: any) => s + (Number(p.currentValue) || 0), 0);
      const unreal = live.reduce((s: number, p: any) => s + (Number(p.cashPnl) || 0), 0);
      const v = { value: +value.toFixed(2), unrealizedPnl: +unreal.toFixed(2), count: live.length };
      this.posCache.set(funder, { v, t: Date.now() });
      return v;
    } catch { return c?.v ?? { value: 0, unrealizedPnl: 0, count: 0 }; }
  }

  // ── public API ────────────────────────────────────────────────────────────
  async status(userId: string) {
    const w = await this.getOrCreate(userId);
    const bal = await this.balances(w.address);       // EOA: the gas/signer wallet
    const trade = await this.tradeable(w);            // deposit wallet: the real trading funds
    const funder = (w.funderAddress || process.env.PM_BOT_FUNDER || '').trim();
    const mtm = await this.positionsMtm(funder);      // live value + unrealized P&L of open positions
    const openTrades = await this.prisma.agentTrade.findMany({
      where: { userId, status: 'filled' },
      orderBy: { createdAt: 'desc' }, take: 50,
    });
    const exposure = openTrades.reduce((s, t) => s + (t.sizeUsd || 0), 0);
    const allTrades = await this.prisma.agentTrade.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 });
    const resolved = allTrades.filter((t) => t.status === 'resolved');
    const realizedPnl = resolved.reduce((s, t) => s + (t.pnlUsd || 0), 0);
    const wins = resolved.filter((t) => (t.pnlUsd || 0) > 0).length;
    // TODAY's P&L = change in TOTAL P&L (portfolio − deposits) since day start. Tracking total-pnl
    // (not raw portfolio) means a DEPOSIT doesn't show up as a "gain" — fixes the inflated Today.
    const portfolioValue = +(trade.usdce + mtm.value).toFixed(2);
    const totalNow = +(portfolioValue - (w.netDepositsUsd || 0)).toFixed(2);
    const today = new Date().toISOString().slice(0, 10);
    let pfOpen = w.pfDayOpen;
    if (w.pfDayStamp !== today || pfOpen == null) {
      pfOpen = totalNow;
      this.prisma.pmAgentWallet.update({ where: { id: w.id }, data: { pfDayStamp: today, pfDayOpen: totalNow } }).catch(() => {});
    }
    const todayPnlUsd = +(totalNow - (pfOpen ?? totalNow)).toFixed(2);
    // TRUTH-SOURCED P&L (matches Polymarket): Total = portfolio − deposits. Realized is then
    // DERIVED as Total − Unrealized, so the three always reconcile and match Polymarket — instead
    // of the per-trade tally that drifted (missed booking settled wins).
    const totalPnl = w.netDepositsUsd > 0 ? +(portfolioValue - w.netDepositsUsd).toFixed(2) : null;
    const realizedShown = totalPnl != null ? +(totalPnl - mtm.unrealizedPnl).toFixed(2) : +realizedPnl.toFixed(2);
    return {
      address: w.address,
      funderAddress: w.funderAddress || null, // linked Polymarket proxy (POLY_PROXY maker)
      linked: !!w.funderAddress,
      mode: w.mode,
      killSwitch: w.killSwitch,
      balance: bal,                                    // EOA (gas) wallet
      tradeableUsdce: trade.usdce,                      // real trading cash (deposit wallet if linked)
      availableUsd: Math.max(0, trade.usdce),           // cash free to deploy now
      limits: { maxTotalUsd: w.maxTotalUsd, maxPerTradeUsd: w.maxPerTradeUsd, dailyLossLimitUsd: w.dailyLossLimitUsd, minEdgePct: w.minEdgePct ?? 5, maxSettlementDays: w.maxSettlementDays ?? 7, maxDrawdownUsd: w.maxDrawdownUsd ?? 0, minEntryPrice: w.minEntryPrice ?? 0.68, maxEntryPrice: w.maxEntryPrice ?? 0.92, orderType: w.orderType || 'limit' },
      daily: { spentUsd: w.dailySpentUsd, pnlUsd: w.dailyPnlUsd },
      exposureUsd: exposure,
      positionsValue: mtm.value,                         // live mark-to-market value of open positions
      unrealizedPnlUsd: mtm.unrealizedPnl,               // total open P&L vs entry (the honest -$ number)
      todayPnlUsd,                                        // change since start of today (matches Polymarket 1D)
      portfolioValue,                                    // cash + positions = total portfolio
      netDepositsUsd: w.netDepositsUsd || 0,
      // GROUND TRUTH — portfolio minus what you put in. Can't be fooled by missed per-trade bookings.
      totalPnlUsd: totalPnl,
      openPositions: mtm.count,
      strategies: this.strategiesOf(w),                  // {copy,ai,arb} enable flags
      arbConfig: this.arbConfigOf(w),                    // user-set arb thresholds
      strategyStats: this.rateStrategies(allTrades),     // per-strategy scorecard (rate what works)
      stats: { trades: allTrades.length, resolved: resolved.length, wins, winRate: resolved.length ? wins / resolved.length : 0, realizedPnlUsd: realizedShown },
    };
  }

  /** Real-money performance: equity curve (cumulative realized P&L) + win/loss stats. */
  /** Performance sourced ENTIRELY from Polymarket (data-api) — the same place the wallet lives, so
   * the app mirrors Polymarket exactly. History = the activity feed; realized/win-loss/curve are
   * computed by matching BUY cost vs SELL+REDEEM proceeds per market on SETTLED markets (anything
   * not currently holding live value). No dependency on the internal trade log (which drifted). */
  async performance(userId: string) {
    const w = await this.getOrCreate(userId);
    const funder = (w.funderAddress || process.env.PM_BOT_FUNDER || '').trim();
    const bal = await this.tradeable(w);
    const headers = { 'User-Agent': 'JTradePilot/1.0' } as any;
    let acts: any[] = [], positions: any[] = [];
    try { const r = await fetch(`https://data-api.polymarket.com/activity?user=${funder}&limit=500`, { headers }); const d: any = await r.json(); acts = Array.isArray(d) ? d : []; } catch { /* */ }
    try { const r = await fetch(`https://data-api.polymarket.com/positions?user=${funder}`, { headers }); const d: any = await r.json(); positions = Array.isArray(d) ? d : []; } catch { /* */ }

    // Our OWN trade records = the reliable cost basis per market (the activity window can miss an
    // old BUY → that's why Won showed $0 cost → +$0). Sum what the bot actually paid per market.
    const myTrades = await this.prisma.agentTrade.findMany({ where: { userId, status: { in: ['filled', 'resolved'] } }, select: { market: true, sizeUsd: true } });
    const costByMarket = new Map<string, number>();
    for (const t of myTrades) { if (t.market) costByMarket.set(t.market, (costByMarket.get(t.market) || 0) + (t.sizeUsd || 0)); }

    // OPEN positions (live value) — drives the Open view + Close buttons
    const open = positions.filter((p) => Number(p.currentValue) > 0.01).map((p) => ({
      conditionId: p.conditionId, tokenId: String(p.asset), title: p.title, outcome: p.outcome, slug: p.slug, icon: p.icon,
      cost: +(+p.initialValue || 0).toFixed(2), value: +(+p.currentValue || 0).toFixed(2), pnlUsd: +(+p.cashPnl || 0).toFixed(2), price: +(+p.curPrice || 0), size: +p.size,
    }));
    const openCids = new Set(open.map((o) => o.conditionId));

    // Group activity by market → cost (BUY) vs proceeds (SELL+REDEEM). Settled = not currently open.
    const byMkt = new Map<string, any>();
    for (const a of acts) {
      const cid = a.conditionId; if (!cid) continue;
      const m = byMkt.get(cid) || { conditionId: cid, title: a.title, slug: a.slug, icon: a.icon, cost: 0, proceeds: 0, ts: 0 };
      const usd = +a.usdcSize || 0;
      if (a.type === 'BUY') m.cost += usd;
      else if (a.type === 'SELL' || a.type === 'REDEEM') m.proceeds += usd;
      m.ts = Math.max(m.ts, +a.timestamp || 0);
      if (a.title) m.title = a.title;
      byMkt.set(cid, m);
    }
    // Reliable win/loss: WON = distinct redeemed markets (REDEEM events paid out); LOST = settled
    // losers still sitting at ~0 value in /positions. (Per-market $ is anchored to truth below.)
    const redeemByCid = new Map<string, any>();
    for (const a of acts) {
      if (a.type !== 'REDEEM' || !a.conditionId) continue;
      const r = redeemByCid.get(a.conditionId) || { conditionId: a.conditionId, title: a.title, slug: a.slug, icon: a.icon, proceeds: 0, ts: 0, win: true };
      r.proceeds += +a.usdcSize || 0; r.ts = Math.max(r.ts, (+a.timestamp || 0) * 1000);
      if (a.title) r.title = a.title;
      redeemByCid.set(a.conditionId, r);
    }
    const wonList = [...redeemByCid.values()].map((r) => {
      // cost: prefer activity-window BUYs, fall back to our own trade records (always known).
      const cost = byMkt.get(r.conditionId)?.cost || costByMarket.get(r.conditionId) || 0;
      return { conditionId: r.conditionId, title: r.title, slug: r.slug, icon: r.icon, ts: r.ts, cost: +cost.toFixed(2), proceeds: +r.proceeds.toFixed(2), pnlUsd: cost ? +(r.proceeds - cost).toFixed(2) : null, win: true };
    });
    const lostList = positions.filter((p: any) => Number(p.currentValue) <= 0.01 && Number(p.initialValue) > 0)
      .map((p: any) => ({ conditionId: p.conditionId, title: p.title, slug: p.slug, icon: p.icon, outcome: p.outcome, ts: 0, cost: +(+p.initialValue || 0).toFixed(2), proceeds: 0, pnlUsd: +(+p.cashPnl || 0).toFixed(2), win: false }));
    const settled = [...wonList, ...lostList].sort((a, b) => (b.ts || 0) - (a.ts || 0));
    const realizedPnl = 0; // fallback only — realized is anchored to ground truth below
    const wins = wonList.length;
    const losses = lostList.length;

    // equity curve (cumulative of settled markets with known P&L) + max drawdown — illustrative;
    // the headline realized number is truth-anchored, not summed from this.
    const chrono = settled.filter((m) => m.pnlUsd != null).sort((a, b) => (a.ts || 0) - (b.ts || 0));
    let cum = 0; const curve = chrono.map((m) => { cum += m.pnlUsd!; return { t: m.ts, pnl: +cum.toFixed(2) }; });
    let peak = 0, maxdd = 0; for (const p of curve) { peak = Math.max(peak, p.pnl); maxdd = Math.max(maxdd, peak - p.pnl); }

    // ANCHOR realized to the ground truth (Total − Unrealized) — the proceeds-vs-cost grouping above
    // is unreliable (the 500-event window can cut off a winner's BUY → inflated). The derived value
    // always matches Polymarket. We keep the per-market `settled` list for the win/loss breakdown.
    const positionsValue = +open.reduce((s, o) => s + o.value, 0).toFixed(2);
    const unrealized = +open.reduce((s, o) => s + o.pnlUsd, 0).toFixed(2);
    const portfolioValue = +(bal.usdce + positionsValue).toFixed(2);
    const totalPnl = w.netDepositsUsd > 0 ? +(portfolioValue - w.netDepositsUsd).toFixed(2) : null;
    const realizedTrue = totalPnl != null ? +(totalPnl - unrealized).toFixed(2) : realizedPnl;
    const openExposure = positionsValue;
    // History feed = raw Polymarket activity, newest first (mirrors Polymarket's History tab)
    const history = acts.slice().sort((a, b) => (+b.timestamp || 0) - (+a.timestamp || 0)).slice(0, 100).map((a) => ({
      type: a.type, title: a.title, outcome: a.outcome, usdcSize: +(+a.usdcSize || 0).toFixed(2), price: +a.price || 0,
      ts: (+a.timestamp || 0) * 1000, slug: a.slug, icon: a.icon, conditionId: a.conditionId, side: a.side,
    }));

    // Attach market resolve times (when each market settles) to open + history rows.
    const endCids = [...new Set([...open.map((o) => o.conditionId), ...history.map((h) => h.conditionId)].filter(Boolean))] as string[];
    const ends = await this.quant.endDatesFor(endCids).catch(() => ({} as Record<string, number>));
    for (const o of open) (o as any).endDate = ends[o.conditionId] || null;
    for (const h of history) (h as any).endDate = ends[h.conditionId] || null;

    return {
      stats: {
        trades: byMkt.size, open: open.length, resolved: settled.length, wins, losses,
        winRate: settled.length ? wins / settled.length : 0,
        realizedPnlUsd: realizedTrue,            // ground-truth realized (matches Polymarket)
        unrealizedPnlUsd: unrealized,
        totalPnlUsd: totalPnl,
        portfolioValue,
        maxDrawdownUsd: +maxdd.toFixed(2),
        walletUsdce: bal.usdce, openExposureUsd: openExposure,
      },
      curve, history, open, settled,
    };
  }

  /** Link the user's Polymarket proxy/deposit wallet (the maker the bot trades from). The
   * EOA stays the signer; the proxy holds the deposited USDC. Pass empty string to unlink. */
  async setFunder(userId: string, address: string) {
    await this.getOrCreate(userId);
    const addr = (address || '').trim();
    if (addr && !/^0x[a-fA-F0-9]{40}$/.test(addr)) throw new BadRequestException('Invalid wallet address.');
    await this.prisma.pmAgentWallet.update({ where: { userId }, data: { funderAddress: addr || null, apiCreds: null } });
    return this.status(userId);
  }

  /** Clear failed/unfilled attempts so the trades list stays clean. With an id, deletes just that
   * one (any non-active status); without, clears all failed+unfilled. Never touches filled/resolved/pending. */
  async clearTrades(userId: string, id?: string) {
    if (id) {
      await this.prisma.agentTrade.deleteMany({ where: { id, userId, status: { in: ['unfilled', 'failed'] } } });
    } else {
      await this.prisma.agentTrade.deleteMany({ where: { userId, status: { in: ['unfilled', 'failed'] } } });
    }
    return this.status(userId);
  }

  async setMode(userId: string, mode: 'off' | 'auto') {
    const w = await this.getOrCreate(userId);
    if (mode === 'auto') {
      const bal = await this.tradeable(w); // check the deposit wallet (real trading funds) if linked
      if (bal.usdce < 1) throw new BadRequestException('Fund the bot wallet (or link a funded Polymarket account) before enabling Auto.');
    }
    await this.prisma.pmAgentWallet.update({ where: { userId }, data: { mode, killSwitch: false } });
    return this.status(userId);
  }

  async kill(userId: string) {
    await this.getOrCreate(userId);
    await this.prisma.pmAgentWallet.update({ where: { userId }, data: { mode: 'off', killSwitch: true } });
    return this.status(userId);
  }

  async setLimits(userId: string, l: { maxTotalUsd?: number; maxPerTradeUsd?: number; dailyLossLimitUsd?: number; minEdgePct?: number; maxSettlementDays?: number; maxDrawdownUsd?: number; minEntryPrice?: number; maxEntryPrice?: number; netDepositsUsd?: number; orderType?: string }) {
    await this.getOrCreate(userId);
    const data: any = {};
    if (l.maxTotalUsd != null) data.maxTotalUsd = Math.max(1, Math.min(10000, l.maxTotalUsd));
    if (l.maxPerTradeUsd != null) data.maxPerTradeUsd = Math.max(0.5, Math.min(1000, l.maxPerTradeUsd));
    if (l.dailyLossLimitUsd != null) data.dailyLossLimitUsd = Math.max(0.5, Math.min(10000, l.dailyLossLimitUsd));
    if (l.minEdgePct != null) data.minEdgePct = Math.max(0, Math.min(100, l.minEdgePct));
    if (l.maxSettlementDays != null) data.maxSettlementDays = Math.max(0, Math.min(365, l.maxSettlementDays));
    if (l.minEntryPrice != null) data.minEntryPrice = Math.max(0, Math.min(1, l.minEntryPrice));
    if (l.maxEntryPrice != null) data.maxEntryPrice = Math.max(0, Math.min(1, l.maxEntryPrice));
    if (l.maxDrawdownUsd != null) data.maxDrawdownUsd = Math.max(0, Math.min(1_000_000, l.maxDrawdownUsd));
    if (l.netDepositsUsd != null) data.netDepositsUsd = Math.max(0, Math.min(1_000_000, l.netDepositsUsd));
    if (l.orderType === 'limit' || l.orderType === 'market') data.orderType = l.orderType;
    await this.prisma.pmAgentWallet.update({ where: { userId }, data });
    return this.status(userId);
  }

  async trades(userId: string, limit = 60) {
    return this.prisma.agentTrade.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: Math.min(limit, 200) });
  }

  /** Reveal the bot wallet's private key so the user can import it into their own wallet
   * (Phantom/MetaMask). It's their wallet + funds — full self-custody. Sensitive: returned once. */
  async exportPrivateKey(userId: string) {
    const w = await this.prisma.pmAgentWallet.findUnique({ where: { userId } });
    if (!w) throw new BadRequestException('No bot wallet.');
    return { address: w.address, privateKey: this.decrypt(w.encPrivKey) };
  }

  async withdraw(userId: string, to: string) {
    if (!ethers.isAddress(to)) throw new BadRequestException('Invalid destination address.');
    const w = await this.getOrCreate(userId);
    const signer = this.signer(w.encPrivKey);
    const usdc = new ethers.Contract(USDCE, ERC20, signer);
    const bal = await usdc.balanceOf(w.address);
    if (bal === 0n) throw new BadRequestException('No USDC.e to withdraw.');
    const tx = await usdc.transfer(to, bal);
    await this.prisma.pmAgentWallet.update({ where: { userId }, data: { mode: 'off' } });
    return { txHash: tx.hash, amount: Number(ethers.formatUnits(bal, 6)) };
  }

  // ── autonomous executor ───────────────────────────────────────────────────
  private executing = false;
  @Interval('autobot-exec', 3 * 60 * 1000)
  async tick() {
    if (this.executing) return;
    this.executing = true;
    try {
      const active = await this.prisma.pmAgentWallet.findMany({ where: { mode: 'auto', killSwitch: false } });
      for (const w of active) {
        try { await this.runWallet(w); } catch (e: any) { this.logger.warn(`autobot ${w.address}: ${e?.message}`); this.brain.error({ userId: w.userId, module: 'polymarket', title: 'Tick error', detail: String(e?.message || e).slice(0, 200), data: {} }); }
      }
    } finally {
      this.executing = false;
    }
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private async runWallet(w: any) {
    // daily reset
    const day = this.today();
    if (w.dayStamp !== day) {
      await this.prisma.pmAgentWallet.update({ where: { id: w.id }, data: { dayStamp: day, dailySpentUsd: 0, dailyPnlUsd: 0 } });
      w.dailySpentUsd = 0; w.dailyPnlUsd = 0;
    }
    // daily-loss circuit breaker
    if (w.dailyPnlUsd <= -Math.abs(w.dailyLossLimitUsd)) {
      await this.prisma.pmAgentWallet.update({ where: { id: w.id }, data: { mode: 'off', killSwitch: true } });
      this.logger.warn(`autobot ${w.address}: daily loss limit hit → halted`);
      return;
    }
    // Bankroll = the real trading funds: the linked deposit wallet (else the EOA).
    const linked = !!(w.funderAddress || '').trim();
    const bal = await this.tradeable(w);
    // MAX-DRAWDOWN circuit breaker — halt if total P&L (portfolio − deposits) drops below the limit.
    if (w.maxDrawdownUsd > 0 && w.netDepositsUsd > 0) {
      const funderAddr = (w.funderAddress || process.env.PM_BOT_FUNDER || '').trim();
      const mtm = await this.positionsMtm(funderAddr);
      const totalPnl = (bal.usdce + mtm.value) - w.netDepositsUsd;
      if (totalPnl <= -Math.abs(w.maxDrawdownUsd)) {
        await this.prisma.pmAgentWallet.update({ where: { id: w.id }, data: { mode: 'off', killSwitch: true } });
        this.brain.error({ userId: w.userId, module: 'polymarket', title: `Max drawdown −$${w.maxDrawdownUsd} hit — bot HALTED`, detail: `Down $${(-totalPnl).toFixed(2)} total — stopped to protect capital`, data: { totalPnl } });
        return;
      }
    }
    if (bal.usdce < 1) return; // nothing to trade
    // POL gas is only needed for EOA-mode on-chain approvals; deposit-wallet CLOB orders are
    // off-chain signed (gasless), and the proxy holds no POL — so skip the gas check when linked.
    if (!linked && bal.pol < 0.02) { this.logger.warn(`autobot ${w.address}: low POL for gas`); return; }

    // current exposure
    let open = await this.prisma.agentTrade.findMany({ where: { userId: w.userId, status: 'filled' } });
    let exposure = open.reduce((s, t) => s + (t.sizeUsd || 0), 0);
    if (exposure >= w.maxTotalUsd) return; // fully deployed

    const { signals } = await this.quant.signals(w.arbConfig || undefined);
    const held = new Set(open.map((t) => t.tokenId));
    // Only take signals whose edge clears the user's minimum — fewer, stronger trades.
    const minEdge = w.minEdgePct ?? 5;
    const strat = this.strategiesOf(w); // only act on strategies the user enabled
    // Don't trade far-out markets (the "waiting weeks" problem). 0 = allow any horizon.
    const maxDays = w.maxSettlementDays ?? 7;
    const cutoff = maxDays > 0 ? Date.now() + maxDays * 864e5 : Infinity;
    // Entry-price cap: skip copy/ai buys above maxEntryPrice (high-price favorites pay tiny but
    // lose big — the win-small/lose-big trap). Arb is exempt (its edge IS the near-certain favorite).
    // DATA-DRIVEN EDGE: resolved copies are PROFITABLE in the favorite band (70–90¢, 73–80% win,
    // +$) and BLEED in longshots (30–60¢, 0–38% win). So copy a favorite WINDOW [minEntry,maxEntry]
    // — not a low cap (that kept the losers, cut the winners). Arb exempt.
    const minEntry = w.minEntryPrice ?? 0.68;
    const maxEntry = w.maxEntryPrice ?? 0.92;
    const fresh = (signals || []).filter((s: any) => s.tokenId && !held.has(s.tokenId) && (s.edgePct || 0) >= minEdge && strat[s.type as 'copy' | 'ai' | 'arb'] !== false && (!s.endDate || s.endDate <= cutoff) && (s.type === 'arb' || ((s.price || 0) >= minEntry && (maxEntry <= 0 || (s.price || 0) <= maxEntry))));
    const arbN = (signals || []).filter((s: any) => s.type === 'arb').length;

    // 🧠 thinking pulse — what the brain is watching this cycle (free, no LLM)
    const top = [...fresh].sort((a: any, b: any) => (b.edgePct || 0) - (a.edgePct || 0)).slice(0, 3);
    const watching = top.map((s: any) => `${(s.title || s.outcome || '?').slice(0, 28)} (${(s.edgePct || 0).toFixed(0)}%)`).join(' · ') || 'no setup yet — waiting';
    this.brain.publish({
      userId: w.userId, module: 'polymarket', kind: 'tick',
      title: `Watching ${(signals || []).length} markets · ${fresh.length} with edge ≥${minEdge}% · ${arbN} arb`,
      detail: `👀 ${watching} · bankroll $${bal.usdce.toFixed(2)} · ${held.size} open · ${arbN} arb live`,
      data: { scanned: (signals || []).length, fresh: fresh.length, arb: arbN, minEdge, bankroll: bal.usdce, held: held.size, exposure, watching: top.map((s: any) => ({ title: s.title, edgePct: s.edgePct })) },
    });

    // place ONE fresh signal per tick — deliberate pacing (was 3, felt like "a lot of trades").
    let placed = 0;
    let researched = 0;
    for (const pick of fresh) {
      if (placed >= 3 || exposure >= w.maxTotalUsd) break;
      // 🧠 Phase-2 reasoning: recall lessons + a Codex verdict on this candidate (best-effort,
      // capped per tick). If the brain vetoes, skip it and try the next; conviction scales size.
      let conviction = 1;
      if (researched < 3) {
        const ai = await this.aiReason(w, pick);
        researched++;
        if (ai && !ai.take) {
          this.brain.publish({ userId: w.userId, module: 'polymarket', kind: 'skip', title: `Skipped — brain vetoed ${pick.outcome}`, detail: ai.rationale, data: { title: pick.title } });
          continue;
        }
        if (ai) conviction = Math.max(0.4, ai.conviction);
      }
      // DYNAMIC money management: half-Kelly fraction of the live bankroll, scaled by the
      // signal's edge AND the brain's conviction. Capped by per-trade/total/available limits.
      const edgeFrac = Math.min(0.25, Math.max(0, (pick.edgePct || 0) / 100)); // edge as fraction (cap 25%)
      const price = pick.price || (pick.priceCents || 0) / 100;
      // ── MONEY-CRITICAL SECTION ──────────────────────────────────────────────
      // Serialise per wallet AND re-read every input fresh inside the lock so a manual trade /
      // close / kill that landed since the tick started can't be raced (M1/M3/M4/M8/M11).
      const outcome: 'stop' | 'skip' | 'placed' = await this.withWalletLock(w.userId, async () => {
        const fw = await this.freshWallet(w);
        // M3 — kill-switch / mode flipped since the tick began.
        if (fw.mode !== 'auto' || fw.killSwitch) return 'stop';
        // M4 — daily-loss breaker on FRESH counters (manual closes now feed dailyPnlUsd too).
        if (fw.dailyPnlUsd <= -Math.abs(fw.dailyLossLimitUsd)) {
          await this.prisma.pmAgentWallet.update({ where: { id: fw.id }, data: { mode: 'off', killSwitch: true } }).catch(() => {});
          this.brain.error({ userId: fw.userId, module: 'polymarket', title: `Daily loss −$${fw.dailyLossLimitUsd} hit — bot halted`, detail: `Daily P&L $${(fw.dailyPnlUsd || 0).toFixed(2)}`, data: { dailyPnlUsd: fw.dailyPnlUsd } });
          return 'stop';
        }
        const freshBal = await this.tradeable(w, true); // force-fresh cash (bypass 5s cache)
        // M4 — max-drawdown breaker on FRESH deposits + live value.
        if (fw.maxDrawdownUsd > 0 && fw.netDepositsUsd > 0) {
          const funderAddr = (fw.funderAddress || process.env.PM_BOT_FUNDER || '').trim();
          const mtm = await this.positionsMtm(funderAddr);
          const totalPnl = (freshBal.usdce + mtm.value) - fw.netDepositsUsd;
          if (totalPnl <= -Math.abs(fw.maxDrawdownUsd)) {
            await this.prisma.pmAgentWallet.update({ where: { id: fw.id }, data: { mode: 'off', killSwitch: true } }).catch(() => {});
            this.brain.error({ userId: fw.userId, module: 'polymarket', title: `Max drawdown −$${fw.maxDrawdownUsd} hit — bot HALTED`, detail: `Down $${(-totalPnl).toFixed(2)} total — stopped to protect capital`, data: { totalPnl } });
            return 'stop';
          }
        }
        // M1/M8 — re-read filled trades + cash, recompute exposure + room; abort if room < 1.
        const freshOpen = await this.prisma.agentTrade.findMany({ where: { userId: fw.userId, status: 'filled' } });
        const freshExposure = freshOpen.reduce((s, t) => s + (t.sizeUsd || 0), 0);
        if (freshExposure >= fw.maxTotalUsd) return 'stop';
        const room = Math.min(fw.maxPerTradeUsd, fw.maxTotalUsd - freshExposure, freshBal.usdce);
        if (room < 1) return 'stop';
        const kellyUsd = freshBal.usdce * edgeFrac * 0.5 * conviction; // half-Kelly × conviction on FRESH cash
        // Size = half-Kelly but at least ~$2 so a small bankroll doesn't produce sub-$1 sizes that get
        // skipped (why the bot sat idle). ALWAYS clamped to `room` → never exceeds the caps (the M8 fix).
        const sizeUsd = Math.floor(Math.min(room, Math.max(kellyUsd, 2)) * 100) / 100;
        if (sizeUsd < 1) return 'skip'; // only when room itself < $1 (already guarded above)
        // 🧠 the brain decides — stream it live
        this.brain.publish({
          userId: fw.userId, module: 'polymarket', kind: 'decide',
          title: `${pick.type?.toUpperCase() || 'SIGNAL'} · BUY ${pick.outcome} @ ${(price * 100).toFixed(0)}¢`,
          detail: pick.reason || pick.detail || pick.title,
          data: { title: pick.title, outcome: pick.outcome, price, edgePct: pick.edgePct ?? null, sizeUsd, signalType: pick.type, bankroll: freshBal.usdce },
        });
        // log intent first (audit) WITH full reasoning, then attempt the order
        const trade = await this.prisma.agentTrade.create({
          data: {
            userId: fw.userId, market: pick.conditionId, tokenId: pick.tokenId, outcome: pick.outcome,
            outcomeIndex: pick.outcomeIndex ?? null,
            title: pick.title, side: 'BUY', sizeUsd, price, signalType: pick.type,
            reason: pick.reason || null, edgePct: pick.edgePct ?? null, detail: pick.detail || null,
            status: 'pending',
          },
        });
        try {
          const res = await this.placeOrder(w, pick.tokenId, price, sizeUsd);
          if (res.filled) {
            // Persist the ACTUAL executed price so resolution books P&L on truth, not the signal price (M9).
            const execPrice = res.avgPrice && res.avgPrice > 0 ? +res.avgPrice.toFixed(4) : price;
            await this.prisma.agentTrade.update({ where: { id: trade.id }, data: { status: 'filled', orderId: res.orderId, price: execPrice } });
            await this.prisma.pmAgentWallet.update({ where: { id: fw.id }, data: { dailySpentUsd: { increment: sizeUsd } } });
            this.logger.log(`autobot ${w.address}: FILLED ${pick.outcome} $${sizeUsd} @ ${execPrice} (${pick.type})`);
            this.brain.publish({
              userId: fw.userId, module: 'polymarket', kind: 'execute',
              title: `FILLED · ${pick.outcome} $${sizeUsd}`,
              detail: pick.title,
              data: { title: pick.title, outcome: pick.outcome, price: execPrice, sizeUsd, orderId: res.orderId },
            });
            exposure = freshExposure + sizeUsd; // keep the outer loop guard coherent
            return 'placed';
          }
          // order did NOT fill — $0 spent, NO position. DELETE the row so unfilled attempts don't
          // pile up and look like committed money; the brain trace keeps it for debugging.
          await this.prisma.agentTrade.delete({ where: { id: trade.id } }).catch(() => {});
          this.logger.warn(`autobot ${w.address}: order not filled — status=${res.status} ${JSON.stringify(res.raw || {}).slice(0, 240)}`);
          this.brain.trace({ userId: fw.userId, module: 'polymarket', title: `Unfilled · ${pick.outcome} (status ${res.status})`, detail: JSON.stringify(res.raw || {}).slice(0, 200), data: { status: res.status, raw: res.raw } });
          return 'skip';
        } catch (e: any) {
          await this.prisma.agentTrade.update({ where: { id: trade.id }, data: { status: 'failed', error: String(e?.message || e).slice(0, 300) } });
          this.logger.warn(`autobot ${w.address}: order failed — ${e?.message}`);
          this.brain.error({ userId: fw.userId, module: 'polymarket', title: `Order FAILED · ${pick.outcome}`, detail: String(e?.message || e).slice(0, 200), data: { title: pick.title } });
          return 'stop'; // stop on first hard failure this tick
        }
      });
      if (outcome === 'stop') break;
      if (outcome === 'placed') placed++;
    }
  }

  /**
   * Place a real CLOB order from the agent wallet. Server-side signing via ethers.
   * Lazy-imports the CLOB client so a bad/missing dep can't break the whole app.
   */
  // Resolve placed/filled trades against real market outcomes → win/loss + P&L.
  @Interval('autobot-resolve', 10 * 60 * 1000)
  async resolveTrades() {
    const open = await this.prisma.agentTrade.findMany({ where: { status: 'filled', outcomeIndex: { not: null } } });
    if (!open.length) return;
    const cids = [...new Set(open.map((t) => t.market).filter(Boolean) as string[])];
    let res: any = {};
    try { res = await this.quant.resolutions(cids); } catch { return; }
    for (const t of open) {
      const r = t.market ? res[t.market] : null;
      if (!r || !r.closed || r.winningIndex == null) continue;
      // t.price is the ACTUAL executed entry price (persisted at fill from the order response /
      // capped fill — not the optimistic signal price), so the booked P&L is on truth (M9/M17).
      const price = t.price || 0;
      if (price <= 0) continue;
      const payoff = r.winningIndex === t.outcomeIndex ? 1 : 0;
      const roiPct = ((payoff - price) / price) * 100;
      const pnlUsd = t.sizeUsd * (payoff / price - 1);
      await this.prisma.agentTrade.update({ where: { id: t.id }, data: { status: 'resolved', roiPct, pnlUsd, resolvedAt: new Date() } });
      await this.prisma.pmAgentWallet.update({ where: { userId: t.userId }, data: { dailyPnlUsd: { increment: pnlUsd } } }).catch(() => {});
      this.brain.publish({
        userId: t.userId, module: 'polymarket', kind: 'learn',
        title: `${payoff ? 'WON' : 'LOST'} · ${t.outcome} ${pnlUsd >= 0 ? '+' : ''}$${pnlUsd.toFixed(2)}`,
        detail: `${t.title || ''} — entry ${(price * 100).toFixed(0)}¢, ${t.signalType || ''} signal ${payoff ? 'paid off' : 'missed'}`,
        data: { title: t.title, outcome: t.outcome, won: !!payoff, pnlUsd, roiPct, signalType: t.signalType, edgePct: t.edgePct },
      });
      this.logger.log(`autobot resolve: ${payoff ? 'WON' : 'LOST'} ${t.outcome} pnl=$${pnlUsd.toFixed(2)}`);
    }
  }

  /** One-time: approve USDC.e for Polymarket's exchanges so the bot's BUYs can settle. */
  private async ensureAllowances(wallet: ethers.Wallet) {
    const usdc = new ethers.Contract(USDCE, ERC20, wallet);
    const owner = await wallet.getAddress();
    const need = ethers.parseUnits('1000000', 6);
    for (const spender of [CTF_EXCHANGE, NEG_RISK_EXCHANGE, NEG_RISK_ADAPTER]) {
      const cur: bigint = await usdc.allowance(owner, spender);
      if (cur < need) {
        const tx = await usdc.approve(spender, ethers.MaxUint256);
        await tx.wait();
        this.logger.log(`autobot ${owner}: approved USDC.e for ${spender}`);
      }
    }
  }

  private async placeOrder(w: any, tokenId: string, price: number, amount: number, side: 'BUY' | 'SELL' = 'BUY'): Promise<{ orderId: string | null; filled: boolean; status: string; raw: any; cap?: number; avgPrice?: number; filledShares?: number; filledUsd?: number }> {
    const wallet = this.signer(w.encPrivKey);
    // CLOB **V2** (Polymarket upgraded the exchange 2026-04-28: order struct + EIP-712 domain
    // bumped 1→2; old @polymarket/clob-client → "invalid order version"). clob-client-v2 builds V2.
    const clobMod: any = await import('@polymarket/clob-client-v2');
    const { ClobClient, Side, OrderType, SignatureTypeV2, Chain } = clobMod;
    const host = 'https://clob.polymarket.com';
    const address = await wallet.getAddress();
    // ClobSigner accepts an ethers-style signer (needs _signTypedData + getAddress).
    const clobSigner: any = {
      getAddress: () => wallet.getAddress(),
      _signTypedData: (d: any, t: any, v: any) => wallet.signTypedData(d, t, v),
      signMessage: (m: any) => wallet.signMessage(m),
      provider: wallet.provider,
    };
    // V2 no longer allows a bare EOA as maker ("maker address not allowed"). Working bots
    // (e.g. Polycop) trade through a Polymarket **proxy/deposit wallet**: the EOA only SIGNS,
    // the proxy is the maker+funder and holds the deposited USDC. Set PM_BOT_FUNDER to the
    // wallet's Polymarket proxy address → POLY_PROXY mode. Without it we fall back to EOA.
    const funder = (w.funderAddress || process.env.PM_BOT_FUNDER || '').trim();
    if (!funder) await this.ensureAllowances(wallet); // EOA mode: approve from the EOA
    // Linked = a Polymarket V2 deposit wallet → POLY_1271 (signatureType 3, EIP-1271 smart-wallet
    // sig). POLY_PROXY (1) is rejected with "use the deposit wallet flow" for these.
    const baseOpts: any = funder
      ? { host, chain: Chain.POLYGON, signer: clobSigner, signatureType: SignatureTypeV2.POLY_1271, funderAddress: funder }
      : { host, chain: Chain.POLYGON, signer: clobSigner, signatureType: SignatureTypeV2.EOA, funderAddress: address };
    let creds = w.apiCreds;
    if (!creds) {
      creds = await new ClobClient(baseOpts).createOrDeriveApiKey();
      await this.prisma.pmAgentWallet.update({ where: { id: w.id }, data: { apiCreds: creds } });
      w.apiCreds = creds; // reuse within this tick — re-deriving per order raced + failed some
    }
    const client = new ClobClient({ ...baseOpts, creds });
    const isBuy = side !== 'SELL';
    // BUY ORDER TYPE (per the user's setting; default 'limit'):
    //  • limit  — fill at entry +2¢ (FAK) → minimal spread bleed; may not fill if book moved away.
    //  • market — take liquidity now, up to +3¢ over entry (FOK) → fills more, costs spread.
    // SELL (closing): floor at mark −5¢ (FAK) so it exits without dumping at a terrible price.
    //   For SELL `amount` is SHARES; for BUY `amount` is USDC.
    const isLimit = (w.orderType || 'limit') !== 'market';
    let cap: number | undefined;
    if (isBuy) cap = price > 0 ? (isLimit ? Math.min(0.99, +(price + 0.02).toFixed(2)) : Math.min(0.99, +(price + 0.03).toFixed(2))) : undefined;
    else cap = price > 0 ? Math.max(0.01, +(price - 0.05).toFixed(2)) : undefined;
    const ot = isBuy ? (isLimit ? (OrderType.FAK || OrderType.FOK) : OrderType.FOK) : (OrderType.FAK || OrderType.FOK);
    const resp = await client.createAndPostMarketOrder(
      { tokenID: tokenId, amount, side: isBuy ? Side.BUY : Side.SELL, ...(cap ? { price: cap } : {}) },
      undefined,
      ot,
    );
    const status = String(resp?.status || (resp?.success ? 'submitted' : 'failed'));
    const makingAmount = Number(resp?.makingAmount) || 0; // BUY: USDC paid · SELL: shares sold
    const takingAmount = Number(resp?.takingAmount) || 0; // BUY: shares bought · SELL: USDC received
    const filled = !!resp?.success && (status === 'matched' || status === 'live' || makingAmount > 0 || takingAmount > 0);
    // ACTUAL executed price/size from the order response (so callers book truth, not the optimistic
    // mark/signal price). Fall back to the capped price (price±buffer) — never the raw mark.
    let avgPrice = Number(resp?.price) || 0;
    let filledShares = isBuy ? takingAmount : makingAmount;
    let filledUsd = isBuy ? makingAmount : takingAmount;
    if (!(avgPrice > 0 && avgPrice <= 1) && filledShares > 0 && filledUsd > 0) avgPrice = filledUsd / filledShares;
    if (!(avgPrice > 0 && avgPrice <= 1)) avgPrice = cap ?? price; // last resort: the capped (realistic) price
    if (!(filledShares > 0)) filledShares = avgPrice > 0 ? amount / (isBuy ? avgPrice : 1) : 0;
    return { orderId: resp?.orderID || resp?.orderId || null, filled, status, raw: resp, cap, avgPrice, filledShares, filledUsd };
  }
}
