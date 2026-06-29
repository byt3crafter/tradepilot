import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
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

  constructor(private readonly prisma: PrismaService) {}

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
  async fundingScan(exchange = 'binance', minVolUsd = 10_000_000) {
    const FEE_DRAG = 6; // ~%/yr round-trip cost estimate (open+close both legs, periodically)
    let rates: any[] = [];
    try { rates = await this.adapter(exchange).getFundingRates(); } catch (e: any) {
      this.logger.warn(`fundingScan ${exchange}: ${e?.message}`);
      return { exchange, opportunities: [], scannedAt: Date.now(), error: 'feed unavailable' };
    }
    const liquid = rates.filter((r) => r.volume24hUsd >= minVolUsd);
    const opps = liquid
      .map((r) => {
        const positive = r.fundingRate >= 0;
        const netAnnualPct = +(Math.abs(r.annualizedPct) - FEE_DRAG).toFixed(1);
        return {
          symbol: r.symbol,
          base: r.base,
          fundingPct8h: +(r.fundingRate * 100).toFixed(4),
          annualizedPct: r.annualizedPct,
          netAnnualPct,
          markPrice: r.markPrice,
          volume24hUsd: Math.round(r.volume24hUsd),
          // the delta-neutral play:
          action: positive
            ? `LONG ${r.base} spot + SHORT ${r.symbol} perp → collect funding`
            : `SHORT ${r.base} + LONG ${r.symbol} perp → collect funding`,
          side: positive ? 'cash-and-carry' : 'reverse-carry',
        };
      })
      .filter((o) => o.netAnnualPct > 5) // only meaningfully profitable after fees
      .sort((a, b) => b.netAnnualPct - a.netAnnualPct)
      .slice(0, 30);
    return { exchange, opportunities: opps, count: opps.length, scannedAt: Date.now() };
  }
}
