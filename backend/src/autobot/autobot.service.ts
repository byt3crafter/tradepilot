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
  private async tradeable(w: any): Promise<{ usdce: number; pol: number }> {
    const funder = (w.funderAddress || process.env.PM_BOT_FUNDER || '').trim();
    if (!funder) return this.balances(w.address);
    const c = this.collCache.get(w.userId);
    if (c && Date.now() - c.t < 30000) return { usdce: c.v, pol: 999 };
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

  // ── public API ────────────────────────────────────────────────────────────
  async status(userId: string) {
    const w = await this.getOrCreate(userId);
    const bal = await this.balances(w.address);       // EOA: the gas/signer wallet
    const trade = await this.tradeable(w);            // deposit wallet: the real trading funds
    const openTrades = await this.prisma.agentTrade.findMany({
      where: { userId, status: 'filled' },
      orderBy: { createdAt: 'desc' }, take: 50,
    });
    const exposure = openTrades.reduce((s, t) => s + (t.sizeUsd || 0), 0);
    const allTrades = await this.prisma.agentTrade.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 });
    const resolved = allTrades.filter((t) => t.status === 'resolved');
    const realizedPnl = resolved.reduce((s, t) => s + (t.pnlUsd || 0), 0);
    const wins = resolved.filter((t) => (t.pnlUsd || 0) > 0).length;
    return {
      address: w.address,
      funderAddress: w.funderAddress || null, // linked Polymarket proxy (POLY_PROXY maker)
      linked: !!w.funderAddress,
      mode: w.mode,
      killSwitch: w.killSwitch,
      balance: bal,                                    // EOA (gas) wallet
      tradeableUsdce: trade.usdce,                      // real trading cash (deposit wallet if linked)
      availableUsd: Math.max(0, trade.usdce),           // cash free to deploy now
      limits: { maxTotalUsd: w.maxTotalUsd, maxPerTradeUsd: w.maxPerTradeUsd, dailyLossLimitUsd: w.dailyLossLimitUsd, minEdgePct: w.minEdgePct ?? 5 },
      daily: { spentUsd: w.dailySpentUsd, pnlUsd: w.dailyPnlUsd },
      exposureUsd: exposure,
      strategies: this.strategiesOf(w),                  // {copy,ai,arb} enable flags
      strategyStats: this.rateStrategies(allTrades),     // per-strategy scorecard (rate what works)
      stats: { trades: allTrades.length, resolved: resolved.length, wins, winRate: resolved.length ? wins / resolved.length : 0, realizedPnlUsd: realizedPnl },
    };
  }

  /** Real-money performance: equity curve (cumulative realized P&L) + win/loss stats. */
  async performance(userId: string) {
    const trades = await this.prisma.agentTrade.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
    const resolved = trades.filter((t) => t.status === 'resolved');
    const wins = resolved.filter((t) => (t.pnlUsd || 0) > 0).length;
    const losses = resolved.length - wins;
    const realizedPnl = resolved.reduce((s, t) => s + (t.pnlUsd || 0), 0);
    const byTime = resolved.filter((t) => t.resolvedAt).sort((a, b) => a.resolvedAt!.getTime() - b.resolvedAt!.getTime());
    let cum = 0;
    const curve = byTime.map((t) => { cum += t.pnlUsd || 0; return { t: t.resolvedAt!.getTime(), pnl: +cum.toFixed(2) }; });
    let peak = 0, maxdd = 0;
    for (const p of curve) { peak = Math.max(peak, p.pnl); maxdd = Math.max(maxdd, peak - p.pnl); }
    const w = await this.getOrCreate(userId);
    const bal = await this.tradeable(w); // real trading funds (deposit wallet if linked)
    const openExposure = trades.filter((t) => t.status === 'filled').reduce((s, t) => s + (t.sizeUsd || 0), 0);
    return {
      stats: {
        trades: trades.length,
        open: trades.filter((t) => t.status === 'filled').length,
        resolved: resolved.length,
        wins, losses,
        winRate: resolved.length ? wins / resolved.length : 0,
        realizedPnlUsd: +realizedPnl.toFixed(2),
        maxDrawdownUsd: +maxdd.toFixed(2),
        walletUsdce: bal.usdce,
        openExposureUsd: +openExposure.toFixed(2),
      },
      curve,
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

  async setLimits(userId: string, l: { maxTotalUsd?: number; maxPerTradeUsd?: number; dailyLossLimitUsd?: number; minEdgePct?: number }) {
    await this.getOrCreate(userId);
    const data: any = {};
    if (l.maxTotalUsd != null) data.maxTotalUsd = Math.max(1, Math.min(10000, l.maxTotalUsd));
    if (l.maxPerTradeUsd != null) data.maxPerTradeUsd = Math.max(0.5, Math.min(1000, l.maxPerTradeUsd));
    if (l.dailyLossLimitUsd != null) data.dailyLossLimitUsd = Math.max(0.5, Math.min(10000, l.dailyLossLimitUsd));
    if (l.minEdgePct != null) data.minEdgePct = Math.max(0, Math.min(100, l.minEdgePct));
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
        try { await this.runWallet(w); } catch (e: any) { this.logger.warn(`autobot ${w.address}: ${e?.message}`); }
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
    if (bal.usdce < 1) return; // nothing to trade
    // POL gas is only needed for EOA-mode on-chain approvals; deposit-wallet CLOB orders are
    // off-chain signed (gasless), and the proxy holds no POL — so skip the gas check when linked.
    if (!linked && bal.pol < 0.02) { this.logger.warn(`autobot ${w.address}: low POL for gas`); return; }

    // current exposure
    let open = await this.prisma.agentTrade.findMany({ where: { userId: w.userId, status: 'filled' } });
    let exposure = open.reduce((s, t) => s + (t.sizeUsd || 0), 0);
    if (exposure >= w.maxTotalUsd) return; // fully deployed

    const { signals } = await this.quant.signals();
    const held = new Set(open.map((t) => t.tokenId));
    // Only take signals whose edge clears the user's minimum — fewer, stronger trades.
    const minEdge = w.minEdgePct ?? 5;
    const strat = this.strategiesOf(w); // only act on strategies the user enabled
    const fresh = (signals || []).filter((s: any) => s.tokenId && !held.has(s.tokenId) && (s.edgePct || 0) >= minEdge && strat[s.type as 'copy' | 'ai' | 'arb'] !== false);

    // 🧠 thinking pulse — what the brain is watching this cycle (free, no LLM)
    const top = [...fresh].sort((a: any, b: any) => (b.edgePct || 0) - (a.edgePct || 0)).slice(0, 3);
    const watching = top.map((s: any) => `${(s.title || s.outcome || '?').slice(0, 28)} (${(s.edgePct || 0).toFixed(0)}%)`).join(' · ') || 'no setup yet — waiting';
    this.brain.publish({
      userId: w.userId, module: 'polymarket', kind: 'tick',
      title: `Watching ${(signals || []).length} markets · ${fresh.length} with edge ≥${minEdge}%`,
      detail: `👀 ${watching} · bankroll $${bal.usdce.toFixed(2)} · ${held.size} open`,
      data: { scanned: (signals || []).length, fresh: fresh.length, minEdge, bankroll: bal.usdce, held: held.size, exposure, watching: top.map((s: any) => ({ title: s.title, edgePct: s.edgePct })) },
    });

    // place ONE fresh signal per tick — deliberate pacing (was 3, felt like "a lot of trades").
    let placed = 0;
    let researched = 0;
    let usdceLeft = bal.usdce;
    for (const pick of fresh) {
      if (placed >= 1 || exposure >= w.maxTotalUsd) break;
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
      const kellyUsd = bal.usdce * edgeFrac * 0.5 * conviction;                 // half-Kelly × conviction
      const room = Math.min(w.maxPerTradeUsd, w.maxTotalUsd - exposure, usdceLeft);
      if (room < 1) break;
      const sizeUsd = Math.max(1, Math.floor(Math.min(kellyUsd, room) * 100) / 100);
      const price = pick.price || (pick.priceCents || 0) / 100;
      // 🧠 the brain decides — stream it live
      this.brain.publish({
        userId: w.userId, module: 'polymarket', kind: 'decide',
        title: `${pick.type?.toUpperCase() || 'SIGNAL'} · BUY ${pick.outcome} @ ${(price * 100).toFixed(0)}¢`,
        detail: pick.reason || pick.detail || pick.title,
        data: { title: pick.title, outcome: pick.outcome, price, edgePct: pick.edgePct ?? null, sizeUsd, signalType: pick.type, bankroll: bal.usdce },
      });
      // log intent first (audit) WITH full reasoning, then attempt the order
      const trade = await this.prisma.agentTrade.create({
        data: {
          userId: w.userId, market: pick.conditionId, tokenId: pick.tokenId, outcome: pick.outcome,
          outcomeIndex: pick.outcomeIndex ?? null,
          title: pick.title, side: 'BUY', sizeUsd, price, signalType: pick.type,
          reason: pick.reason || null, edgePct: pick.edgePct ?? null, detail: pick.detail || null,
          status: 'pending',
        },
      });
      try {
        const res = await this.placeOrder(w, pick.tokenId, price, sizeUsd);
        if (res.filled) {
          await this.prisma.agentTrade.update({ where: { id: trade.id }, data: { status: 'filled', orderId: res.orderId } });
          await this.prisma.pmAgentWallet.update({ where: { id: w.id }, data: { dailySpentUsd: { increment: sizeUsd } } });
          this.logger.log(`autobot ${w.address}: FILLED ${pick.outcome} $${sizeUsd} @ ${price} (${pick.type})`);
          this.brain.publish({
            userId: w.userId, module: 'polymarket', kind: 'execute',
            title: `FILLED · ${pick.outcome} $${sizeUsd}`,
            detail: pick.title,
            data: { title: pick.title, outcome: pick.outcome, price, sizeUsd, orderId: res.orderId },
          });
          exposure += sizeUsd; usdceLeft -= sizeUsd; placed++;
        } else {
          // order did NOT fill — record honestly, take NO position, count NO P&L
          await this.prisma.agentTrade.update({ where: { id: trade.id }, data: { status: 'unfilled', orderId: res.orderId, error: `status=${res.status}: ${JSON.stringify(res.raw || {}).slice(0, 240)}` } });
          this.logger.warn(`autobot ${w.address}: order not filled — status=${res.status} ${JSON.stringify(res.raw || {}).slice(0, 240)}`);
        }
      } catch (e: any) {
        await this.prisma.agentTrade.update({ where: { id: trade.id }, data: { status: 'failed', error: String(e?.message || e).slice(0, 300) } });
        this.logger.warn(`autobot ${w.address}: order failed — ${e?.message}`);
        break; // stop on first hard failure this tick
      }
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

  private async placeOrder(w: any, tokenId: string, price: number, sizeUsd: number): Promise<{ orderId: string | null; filled: boolean; status: string; raw: any }> {
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
    // MARKET order (take liquidity now): amount = $ to spend on a BUY; FOK so it fills fully or
    // is killed — never rests as a phantom. Auto-resolves tickSize + negRisk exchange per market.
    const resp = await client.createAndPostMarketOrder(
      { tokenID: tokenId, amount: sizeUsd, side: Side.BUY },
      undefined,
      OrderType.FOK,
    );
    const status = String(resp?.status || (resp?.success ? 'submitted' : 'failed'));
    const filled = !!resp?.success && (status === 'matched' || status === 'live' || Number(resp?.makingAmount) > 0 || Number(resp?.takingAmount) > 0);
    return { orderId: resp?.orderID || resp?.orderId || null, filled, status, raw: resp };
  }
}
