import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PolymarketClient } from './polymarket.client';

@Injectable()
export class QuantService implements OnApplicationBootstrap {
  private readonly logger = new Logger(QuantService.name);
  private ticking = false;

  constructor(private readonly prisma: PrismaService, private readonly pm: PolymarketClient) {}

  onApplicationBootstrap() {
    // Warm the bank shortly after boot so the leaderboard isn't empty.
    setTimeout(() => this.autoTick().catch(() => {}), 8000);
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

  /** Fetch a wallet's positions/activity/value, compute edge-adjusted metrics, persist. */
  async scanWallet(addressRaw: string) {
    const address = String(addressRaw || '').toLowerCase();
    const [positions, activity, positionsValue] = await Promise.all([
      this.pm.positions(address),
      this.pm.activity(address),
      this.pm.value(address),
    ]);

    // PnL from cash-flow over the activity window + current holdings:
    //   buys are cash out; sells/redeems/rebates are cash in; open positions add their value.
    // (Approximate: the activity feed is page-capped, so very high-frequency wallets are
    // understated — refined to full on-chain history in a later phase.)
    let cashIn = 0, cashOut = 0, volume = 0;
    for (const a of activity) {
      const usd = Number(a.usdcSize) || 0;
      volume += usd;
      if (a.type === 'TRADE') {
        if (a.side === 'BUY') cashOut += usd;
        else if (a.side === 'SELL') cashIn += usd;
      } else if (a.type === 'REDEEM' || a.type === 'MAKER_REBATE' || a.type === 'REWARD') {
        cashIn += usd;
      }
    }
    const realizedPnl = cashIn - cashOut;
    const pnl = realizedPnl + positionsValue;

    // Win rate from resolved positions (Polymarket's per-position realized PnL).
    let wins = 0, resolved = 0;
    for (const p of positions) {
      const rp = Number(p.realizedPnl) || 0;
      if (rp !== 0) {
        resolved++;
        if (rp > 0) wins++;
      }
    }
    const tradeCount = activity.length;
    const winRate = resolved ? wins / resolved : 0;
    const marketFocus = this.classifyFocus([...positions, ...activity]);

    // Edge score: PnL anchored, but discounted for small samples and low win rate —
    // so a $1M-over-3-trades fluke ranks below steady edge over hundreds of trades.
    const sampleFactor = Math.min(tradeCount, 100) / 100;
    const edgeScore = pnl * sampleFactor * (0.6 + 0.4 * winRate);

    const pseudonym = activity[0]?.pseudonym || activity[0]?.name || undefined;
    const profileImage = activity[0]?.profileImage || undefined;

    return this.prisma.pmWallet.upsert({
      where: { address },
      create: {
        address, pseudonym, profileImage, pnl, realizedPnl, volume, positionsValue,
        tradeCount, winRate, edgeScore, marketFocus, scanned: true, lastScanned: new Date(),
      },
      update: {
        pnl, realizedPnl, volume, positionsValue, tradeCount, winRate, edgeScore, marketFocus,
        scanned: true, lastScanned: new Date(),
        ...(pseudonym ? { pseudonym } : {}),
        ...(profileImage ? { profileImage } : {}),
      },
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

  leaderboard(limit = 50) {
    return this.prisma.pmWallet.findMany({
      where: { scanned: true },
      orderBy: { edgeScore: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
    });
  }

  async getWallet(addressRaw: string) {
    const address = String(addressRaw || '').toLowerCase();
    const existing = await this.prisma.pmWallet.findUnique({ where: { address } });
    if (existing?.scanned) return existing;
    return this.scanWallet(address);
  }

  async stats() {
    const [total, scanned] = await Promise.all([
      this.prisma.pmWallet.count(),
      this.prisma.pmWallet.count({ where: { scanned: true } }),
    ]);
    return { total, scanned };
  }

  /** Autonomous loop: discover new wallets + scan a small stale batch, gently. */
  @Interval('quant-autodiscover', 5 * 60 * 1000)
  async autoTick() {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const { discovered } = await this.discover(200);
      // Scan a bigger batch while the bank is still cold, then settle to a gentle pace.
      const scannedCount = await this.prisma.pmWallet.count({ where: { scanned: true } });
      const take = scannedCount < 80 ? 25 : 8;
      const batch = await this.prisma.pmWallet.findMany({
        where: { OR: [{ scanned: false }, { lastScanned: { lt: new Date(Date.now() - 6 * 3600 * 1000) } }] },
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
