import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import * as crypto from 'crypto';
import { ethers } from 'ethers';
import { PrismaService } from '../prisma/prisma.service';
import { QuantService } from '../quant/quant.service';

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
  ) {}

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

  private async balances(address: string): Promise<{ usdce: number; pol: number }> {
    try {
      const usdc = new ethers.Contract(USDCE, ERC20, this.provider);
      const [bal, pol] = await Promise.all([usdc.balanceOf(address), this.provider.getBalance(address)]);
      return { usdce: Number(ethers.formatUnits(bal, 6)), pol: Number(ethers.formatEther(pol)) };
    } catch {
      return { usdce: 0, pol: 0 };
    }
  }

  // ── public API ────────────────────────────────────────────────────────────
  async status(userId: string) {
    const w = await this.getOrCreate(userId);
    const bal = await this.balances(w.address);
    const openTrades = await this.prisma.agentTrade.findMany({
      where: { userId, status: { in: ['placed', 'filled'] } },
      orderBy: { createdAt: 'desc' }, take: 50,
    });
    const exposure = openTrades.reduce((s, t) => s + (t.sizeUsd || 0), 0);
    const allTrades = await this.prisma.agentTrade.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 });
    const resolved = allTrades.filter((t) => t.status === 'resolved');
    const realizedPnl = resolved.reduce((s, t) => s + (t.pnlUsd || 0), 0);
    const wins = resolved.filter((t) => (t.pnlUsd || 0) > 0).length;
    return {
      address: w.address,
      mode: w.mode,
      killSwitch: w.killSwitch,
      balance: bal,
      limits: { maxTotalUsd: w.maxTotalUsd, maxPerTradeUsd: w.maxPerTradeUsd, dailyLossLimitUsd: w.dailyLossLimitUsd },
      daily: { spentUsd: w.dailySpentUsd, pnlUsd: w.dailyPnlUsd },
      exposureUsd: exposure,
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
    const bal = await this.balances(w.address);
    const openExposure = trades.filter((t) => ['placed', 'filled'].includes(t.status)).reduce((s, t) => s + (t.sizeUsd || 0), 0);
    return {
      stats: {
        trades: trades.length,
        open: trades.filter((t) => ['placed', 'filled'].includes(t.status)).length,
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

  async setMode(userId: string, mode: 'off' | 'auto') {
    const w = await this.getOrCreate(userId);
    if (mode === 'auto') {
      const bal = await this.balances(w.address);
      if (bal.usdce < 1) throw new BadRequestException('Fund the bot wallet with USDC.e before enabling Auto.');
    }
    await this.prisma.pmAgentWallet.update({ where: { userId }, data: { mode, killSwitch: false } });
    return this.status(userId);
  }

  async kill(userId: string) {
    await this.getOrCreate(userId);
    await this.prisma.pmAgentWallet.update({ where: { userId }, data: { mode: 'off', killSwitch: true } });
    return this.status(userId);
  }

  async setLimits(userId: string, l: { maxTotalUsd?: number; maxPerTradeUsd?: number; dailyLossLimitUsd?: number }) {
    await this.getOrCreate(userId);
    const data: any = {};
    if (l.maxTotalUsd != null) data.maxTotalUsd = Math.max(1, Math.min(10000, l.maxTotalUsd));
    if (l.maxPerTradeUsd != null) data.maxPerTradeUsd = Math.max(0.5, Math.min(1000, l.maxPerTradeUsd));
    if (l.dailyLossLimitUsd != null) data.dailyLossLimitUsd = Math.max(0.5, Math.min(10000, l.dailyLossLimitUsd));
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
    const bal = await this.balances(w.address);
    if (bal.usdce < 1) return; // nothing to trade
    if (bal.pol < 0.02) { this.logger.warn(`autobot ${w.address}: low POL for gas`); return; }

    // current exposure
    let open = await this.prisma.agentTrade.findMany({ where: { userId: w.userId, status: { in: ['placed', 'filled'] } } });
    let exposure = open.reduce((s, t) => s + (t.sizeUsd || 0), 0);
    if (exposure >= w.maxTotalUsd) return; // fully deployed

    const { signals } = await this.quant.signals();
    const held = new Set(open.map((t) => t.tokenId));
    const fresh = (signals || []).filter((s: any) => s.tokenId && !held.has(s.tokenId) && (s.edgePct || 0) > 0);

    // place up to 3 fresh signals per tick so the book deploys (and the user sees activity) fast
    let placed = 0;
    let usdceLeft = bal.usdce;
    for (const pick of fresh) {
      if (placed >= 3 || exposure >= w.maxTotalUsd) break;
      const room = Math.min(w.maxPerTradeUsd, w.maxTotalUsd - exposure, usdceLeft);
      const sizeUsd = Math.floor(room * 100) / 100;
      if (sizeUsd < 1) break;
      const price = pick.price || (pick.priceCents || 0) / 100;
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
        const orderId = await this.placeOrder(w, pick.tokenId, price, sizeUsd);
        await this.prisma.agentTrade.update({ where: { id: trade.id }, data: { status: 'placed', orderId } });
        await this.prisma.pmAgentWallet.update({ where: { id: w.id }, data: { dailySpentUsd: { increment: sizeUsd } } });
        this.logger.log(`autobot ${w.address}: BUY ${pick.outcome} $${sizeUsd} @ ${price} (${pick.type})`);
        exposure += sizeUsd; usdceLeft -= sizeUsd; placed++;
      } catch (e: any) {
        await this.prisma.agentTrade.update({ where: { id: trade.id }, data: { status: 'failed', error: String(e?.message || e).slice(0, 300) } });
        this.logger.warn(`autobot ${w.address}: order failed — ${e?.message}`);
        break; // stop on first failure this tick (avoid spamming the same error)
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
    const open = await this.prisma.agentTrade.findMany({ where: { status: { in: ['placed', 'filled'] }, outcomeIndex: { not: null } } });
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

  private async placeOrder(w: any, tokenId: string, price: number, sizeUsd: number): Promise<string> {
    const wallet = this.signer(w.encPrivKey);
    await this.ensureAllowances(wallet); // first BUY sets approvals (one-time)
    // dynamic import keeps clob-client out of the hot path unless actually trading
    const clobMod: any = await import('@polymarket/clob-client');
    const { ClobClient, Side, OrderType } = clobMod;
    const host = 'https://clob.polymarket.com';
    // clob-client v5.8.1 mis-detects ethers v6 (has signTypedData) as a viem wallet → fails.
    // Wrap as a v5-style signer (_signTypedData + getAddress) so it uses the ethers path.
    const clobSigner: any = {
      getAddress: () => wallet.getAddress(),
      _signTypedData: (d: any, t: any, v: any) => wallet.signTypedData(d, t, v),
      signMessage: (m: any) => wallet.signMessage(m),
      provider: wallet.provider,
    };
    let creds = w.apiCreds;
    const base = new ClobClient(host, 137, clobSigner);
    if (!creds) {
      creds = await base.createOrDeriveApiKey();
      await this.prisma.pmAgentWallet.update({ where: { id: w.id }, data: { apiCreds: creds } });
    }
    const client = new ClobClient(host, 137, clobSigner, creds);
    const size = Math.max(5, Math.round(sizeUsd / Math.max(price, 0.01))); // shares (min 5)
    const order = await client.createOrder({ tokenID: tokenId, price, side: Side.BUY, size });
    const resp = await client.postOrder(order, OrderType.GTC);
    return resp?.orderID || resp?.orderId || 'submitted';
  }
}
