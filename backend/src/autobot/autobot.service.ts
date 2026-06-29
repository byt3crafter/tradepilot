import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import * as crypto from 'crypto';
import { ethers } from 'ethers';
import { PrismaService } from '../prisma/prisma.service';
import { QuantService } from '../quant/quant.service';

const POLYGON_RPC = process.env.POLYGON_RPC || 'https://polygon-rpc.com';
const USDCE = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'; // USDC.e (Polymarket collateral)
const ERC20 = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

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
    const open = await this.prisma.agentTrade.findMany({ where: { userId: w.userId, status: { in: ['placed', 'filled'] } } });
    const exposure = open.reduce((s, t) => s + (t.sizeUsd || 0), 0);
    if (exposure >= w.maxTotalUsd) return; // fully deployed

    // pick the best fresh signal we don't already hold
    const { signals } = await this.quant.signals();
    const held = new Set(open.map((t) => t.tokenId));
    const pick = (signals || []).find((s: any) => s.tokenId && !held.has(s.tokenId) && (s.edgePct || 0) > 0);
    if (!pick) return;

    const room = Math.min(w.maxPerTradeUsd, w.maxTotalUsd - exposure, bal.usdce);
    const sizeUsd = Math.floor(room * 100) / 100;
    if (sizeUsd < 1) return;

    // log intent first (audit), then attempt the order
    const trade = await this.prisma.agentTrade.create({
      data: {
        userId: w.userId, market: pick.conditionId, tokenId: pick.tokenId, outcome: pick.outcome,
        title: pick.title, side: 'BUY', sizeUsd, price: pick.price || (pick.priceCents || 0) / 100,
        signalType: pick.type, status: 'pending',
      },
    });
    try {
      const orderId = await this.placeOrder(w, pick.tokenId, pick.price || (pick.priceCents || 0) / 100, sizeUsd);
      await this.prisma.agentTrade.update({ where: { id: trade.id }, data: { status: 'placed', orderId } });
      await this.prisma.pmAgentWallet.update({ where: { id: w.id }, data: { dailySpentUsd: { increment: sizeUsd } } });
      this.logger.log(`autobot ${w.address}: BUY ${pick.outcome} $${sizeUsd} @ ${pick.price} (${pick.type})`);
    } catch (e: any) {
      await this.prisma.agentTrade.update({ where: { id: trade.id }, data: { status: 'failed', error: String(e?.message || e).slice(0, 300) } });
      this.logger.warn(`autobot ${w.address}: order failed — ${e?.message}`);
    }
  }

  /**
   * Place a real CLOB order from the agent wallet. Server-side signing via ethers.
   * Lazy-imports the CLOB client so a bad/missing dep can't break the whole app.
   */
  private async placeOrder(w: any, tokenId: string, price: number, sizeUsd: number): Promise<string> {
    const signer = this.signer(w.encPrivKey);
    // dynamic import keeps clob-client out of the hot path unless actually trading
    const clobMod: any = await import('@polymarket/clob-client');
    const { ClobClient, Side, OrderType } = clobMod;
    const host = 'https://clob.polymarket.com';
    let creds = w.apiCreds;
    const base = new ClobClient(host, 137, signer as any);
    if (!creds) {
      creds = await base.createOrDeriveApiKey();
      await this.prisma.pmAgentWallet.update({ where: { id: w.id }, data: { apiCreds: creds } });
    }
    const client = new ClobClient(host, 137, signer as any, creds);
    const size = Math.max(1, Math.round(sizeUsd / Math.max(price, 0.01))); // shares
    const order = await client.createOrder({ tokenID: tokenId, price, side: Side.BUY, size });
    const resp = await client.postOrder(order, OrderType.GTC);
    return resp?.orderID || resp?.orderId || 'submitted';
  }
}
